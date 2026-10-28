import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate, pool } from './db'
import { logout, me, requestCode, requireAuth, verifyCode, type AuthedRequest } from './auth'
import { cacheProduct, productByBarcode, productCategories, searchProductPage } from './products'
import { analyzeImage, askAssistant } from './vision'
import { saveAiUsage, type AiRequestKind, type AiUsage } from './ai-usage'
import { products as localProducts } from '../src/data'
import { createProductFromPackage } from './barcode-product'
import { importBodyMetrics } from './body-composition'
import { deleteRecipe, listRecipes, saveRecipe } from './recipes'

const app = express()
const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)) })
const documentUpload = multer({ limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(null, /^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.mimetype)) })
app.disable('x-powered-by')
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=()')
  next()
})
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1')
  res.json({ ok: true, database: 'postgresql' })
})
app.post('/api/auth/request-code', requestCode)
app.post('/api/auth/verify', verifyCode)
app.post('/api/auth/logout', logout)
app.get('/api/auth/me', requireAuth, me)

app.get('/api/product-categories', async (_req, res) => {
  res.json({ categories: await productCategories() })
})
app.get('/api/products', async (req, res) => {
  const query = String(req.query.q ?? '').trim()
  const page = Number(req.query.page ?? 1)
  const category = String(req.query.category ?? '').slice(0, 200)
  const favoriteIds = typeof req.query.favorites === 'string'
    ? [...new Set(req.query.favorites.split(',').map((id) => id.trim()).filter(Boolean))].slice(0, 500)
    : undefined
  res.json(await searchProductPage(query, page, category, favoriteIds))
})
app.get('/api/products/barcode/:code', async (req, res) => {
  const barcode = String(req.params.code).replace(/\D/g, '')
  if (barcode.length < 8 || barcode.length > 14) return res.status(400).json({ error: 'Некорректный штрихкод' })
  const product = await productByBarcode(barcode)
  if (!product) return res.status(404).json({ error: 'Продукт не найден. Добавьте его вручную.' })
  res.json({ product })
})
app.post('/api/products/barcode/:code/package', requireAuth, upload.fields([{ name: 'nameImage', maxCount: 1 }, { name: 'nutritionImage', maxCount: 1 }]), async (req: AuthedRequest, res) => {
  const barcode = String(req.params.code).replace(/\D/g, '')
  const files = req.files as { nameImage?: Express.Multer.File[], nutritionImage?: Express.Multer.File[] }
  const nameImage = files?.nameImage?.[0]
  const nutritionImage = files?.nutritionImage?.[0]
  if (barcode.length < 8 || barcode.length > 14 || !nameImage || !nutritionImage) return res.status(400).json({ error: 'Нужны штрихкод и два фото: название и состав' })
  const result = await createProductFromPackage(barcode, nameImage.buffer, nutritionImage.buffer, nameImage.mimetype)
  await recordUsage(req.userId, 'photo', result.usage)
  await recordUsage(req.userId, 'photo', result.enrichmentUsage)
  res.status(201).json({ product: result.product })
})
app.post('/api/body-composition/import', requireAuth, documentUpload.single('document'), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'Загрузите фото JPEG, PNG, WebP или PDF до 8 МБ' })
  const result = await importBodyMetrics(req.file.buffer, req.file.mimetype)
  if (!result) return res.status(503).json({ error: 'Распознавание документов не настроено' })
  await recordUsage(req.userId, 'photo', result.usage)
  if (!Object.keys(result.metrics).length) return res.status(422).json({ error: 'Не удалось найти показатели состава тела в документе' })
  res.json(result.metrics)
})
app.get('/api/recipes', requireAuth, async (req: AuthedRequest, res) => res.json({ recipes: await listRecipes(req.userId!) }))
app.post('/api/recipes', requireAuth, async (req: AuthedRequest, res) => res.status(201).json({ recipe: await saveRecipe(req.userId!, req.body) }))
app.put('/api/recipes/:id', requireAuth, async (req: AuthedRequest, res) => res.json({ recipe: await saveRecipe(req.userId!, req.body, String(req.params.id)) }))
app.delete('/api/recipes/:id', requireAuth, async (req: AuthedRequest, res) => {
  if (!await deleteRecipe(req.userId!, String(req.params.id))) return res.status(404).json({ error: 'Рецепт не найден' })
  res.json({ ok: true })
})
async function recordUsage(userId: number | undefined, kind: AiRequestKind, usage: AiUsage | null) {
  if (!usage) return
  try {
    await saveAiUsage(userId, kind, usage)
  } catch (error) {
    console.error('AI usage logging failed:', error instanceof Error ? error.message : error)
  }
}

app.post('/api/kimi/analyze-food', requireAuth, upload.single('image'), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'Нужно изображение JPEG, PNG или WebP до 8 МБ' })
  const response = await analyzeImage(req.file.buffer, req.file.mimetype)
  if (!response) return res.status(503).json({ error: 'Распознавание пока не настроено' })
  await recordUsage(req.userId, 'photo', response.usage)
  for (const usage of response.enrichmentUsages) await recordUsage(req.userId, 'photo', usage)
  const { result } = response
  if (result.kind === 'body' && Object.keys(result.bodyMetrics ?? {}).length) return res.json(result)
  if (!result.items.length) return res.status(422).json({ error: `Не удалось найти распознанные продукты в каталоге${result.unrecognized.length ? `: ${result.unrecognized.join(', ')}` : ''}. Выберите их вручную.` })
  res.json(result)
})
app.post('/api/kimi/chat', requireAuth, async (req: AuthedRequest, res) => {
  const response = await askAssistant(req.body.messages ?? [], req.body.context ?? {})
  if (!response) return res.status(503).json({ error: 'Ассистент не настроен' })
  await recordUsage(req.userId, 'chat', response.usage)
  for (const usage of response.enrichmentUsages) await recordUsage(req.userId, 'chat', usage)
  res.json({ text: response.text, food: response.food, foods: response.foods, recipes: response.recipes })
})

app.get('/api/ai-usage', requireAuth, async (req: AuthedRequest, res) => {
  const [summary, recent] = await Promise.all([
    pool.query(`SELECT kind,count(*)::int requests,
      coalesce(sum(prompt_tokens),0)::bigint prompt_tokens,
      coalesce(sum(completion_tokens),0)::bigint completion_tokens,
      coalesce(sum(total_tokens),0)::bigint total_tokens,
      coalesce(sum(total_cost_usd),0)::float8 total_cost_usd,
      coalesce(avg(total_cost_usd),0)::float8 average_cost_usd
      FROM ai_usage WHERE user_id=$1 GROUP BY kind ORDER BY kind`, [req.userId]),
    pool.query(`SELECT id,kind,model,prompt_tokens,completion_tokens,total_tokens,cached_tokens,
      cache_write_tokens,cache_write_1h_tokens,input_cost_usd::float8,output_cost_usd::float8,
      cache_cost_usd::float8,total_cost_usd::float8,created_at
      FROM ai_usage WHERE user_id=$1 ORDER BY id DESC LIMIT 100`, [req.userId]),
  ])
  res.json({ summary: summary.rows, recent: recent.rows })
})

app.get('/api/state', requireAuth, async (req: AuthedRequest, res) => {
  const [profile, entries, tasks, favorites, favoriteNutrients, messages, productPortions, recipes] = await Promise.all([
    pool.query('SELECT * FROM users WHERE id=$1', [req.userId]),
    pool.query('SELECT * FROM diary_entries WHERE user_id=$1 ORDER BY eaten_at DESC LIMIT 1000', [req.userId]),
    pool.query('SELECT * FROM tasks WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1000', [req.userId]),
    pool.query('SELECT f.product_id FROM favorites f JOIN products p ON p.id=f.product_id WHERE f.user_id=$1', [req.userId]),
    pool.query('SELECT nutrient_key FROM favorite_nutrients WHERE user_id=$1', [req.userId]),
    pool.query('SELECT * FROM assistant_messages WHERE user_id=$1 ORDER BY id DESC LIMIT 50', [req.userId]),
    pool.query('SELECT product_id,grams FROM user_product_portions WHERE user_id=$1', [req.userId]),
    listRecipes(req.userId!),
  ])
  const row = profile.rows[0]
  const optionalNumber = (value: unknown) => value === null || value === undefined ? undefined : Number(value)
  res.json({
    profile: row.birth_year ? { birthYear: row.birth_year, weight: Number(row.weight_kg), height: row.height_cm, sex: row.sex, activity: row.activity, goal: row.goal,
      bodyFatPercent: optionalNumber(row.body_fat_percent), skeletalMuscleKg: optionalNumber(row.skeletal_muscle_kg), leanBodyMassKg: optionalNumber(row.lean_body_mass_kg),
      bodyWaterPercent: optionalNumber(row.body_water_percent), visceralFatLevel: optionalNumber(row.visceral_fat_level) } : null,
    entries: entries.rows.map((item) => ({ id: item.id, productId: item.product_id ?? item.product_snapshot?.id ?? '', productSnapshot: item.product_snapshot, grams: Number(item.grams), meal: item.meal, time: item.eaten_at.toISOString().slice(11, 16), date: item.day.toISOString().slice(0, 10) })),
    tasks: tasks.rows.map((item) => ({ id: item.id, title: item.title, description: item.description, category: item.category, date: item.day?.toISOString().slice(0, 10) ?? null, startTime: item.start_time?.slice(0, 5) ?? null, endTime: item.end_time?.slice(0, 5) ?? null, repeat: item.repeat_days, done: item.done, createdAt: item.created_at })),
    favorites: favorites.rows.map((item) => item.product_id), recipes,
    favoriteNutrients: favoriteNutrients.rows.map((item) => item.nutrient_key),
    messages: messages.rows.reverse().map((item) => ({ id: String(item.id), role: item.role, text: item.text, food: item.food ?? undefined, foods: item.foods ?? undefined, recipes: item.recipes ?? undefined })),
    productPortions: Object.fromEntries(productPortions.rows.map((item) => [item.product_id, Number(item.grams)])),
  })
})

app.put('/api/state', requireAuth, async (req: AuthedRequest, res) => {
  const { profile, entries = [], tasks = [], favorites = [], favoriteNutrients = [], messages = [], productPortions = {} } = req.body
  if (entries.length > 2000 || tasks.length > 2000 || messages.length > 100 || favoriteNutrients.length > 100 || Object.keys(productPortions).length > 5000) return res.status(413).json({ error: 'Слишком большое состояние' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (profile) await client.query(`UPDATE users SET birth_year=$2,weight_kg=$3,height_cm=$4,sex=$5,activity=$6,goal=$7,
      body_fat_percent=$8,skeletal_muscle_kg=$9,lean_body_mass_kg=$10,body_water_percent=$11,visceral_fat_level=$12,updated_at=now() WHERE id=$1`,
      [req.userId, profile.birthYear, profile.weight, profile.height, profile.sex, profile.activity, profile.goal,
      profile.bodyFatPercent ?? null, profile.skeletalMuscleKg ?? null, profile.leanBodyMassKg ?? null, profile.bodyWaterPercent ?? null, profile.visceralFatLevel ?? null])
    await client.query('DELETE FROM diary_entries WHERE user_id=$1', [req.userId])
    for (const item of entries) await client.query(`INSERT INTO diary_entries(user_id,product_id,product_snapshot,grams,meal,eaten_at,day)
      VALUES($1,(SELECT id FROM products WHERE id=$2),$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`, [req.userId, item.productId,
      item.productSnapshot ?? {}, item.grams, item.meal, `${item.date}T${item.time}:00`, item.date])
    await client.query('DELETE FROM tasks WHERE user_id=$1', [req.userId])
    for (const item of tasks) await client.query(`INSERT INTO tasks(user_id,title,description,category,day,start_time,end_time,repeat_days,done,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [req.userId, String(item.title).slice(0, 300), String(item.description ?? '').slice(0, 5000), item.category,
      item.date, item.startTime, item.endTime, item.repeat ?? [], item.done, item.createdAt ?? new Date()])
    await client.query('DELETE FROM favorites WHERE user_id=$1', [req.userId])
    for (const productId of favorites) await client.query(`INSERT INTO favorites(user_id,product_id)
      SELECT $1,$2 WHERE EXISTS(SELECT 1 FROM products WHERE id=$2) ON CONFLICT DO NOTHING`, [req.userId, productId])
    await client.query('DELETE FROM user_product_portions WHERE user_id=$1', [req.userId])
    for (const [productId, rawGrams] of Object.entries(productPortions)) {
      const grams = Number(rawGrams)
      if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) continue
      await client.query(`INSERT INTO user_product_portions(user_id,product_id,grams,updated_at)
        SELECT $1,$2,$3,now() WHERE EXISTS(SELECT 1 FROM products WHERE id=$2) ON CONFLICT DO NOTHING`, [req.userId, productId, grams])
    }
    await client.query('DELETE FROM favorite_nutrients WHERE user_id=$1', [req.userId])
    for (const nutrientKey of new Set<string>(favoriteNutrients.map((key: unknown) => String(key)))) await client.query('INSERT INTO favorite_nutrients(user_id,nutrient_key) VALUES($1,$2) ON CONFLICT DO NOTHING', [req.userId, nutrientKey.slice(0, 64)])
    await client.query('DELETE FROM assistant_messages WHERE user_id=$1', [req.userId])
    for (const item of messages.slice(-50)) await client.query('INSERT INTO assistant_messages(user_id,role,text,food,foods,recipes) VALUES($1,$2,$3,$4,$5,$6)', [req.userId, item.role, String(item.text).slice(0, 10000), item.food ? JSON.stringify(item.food) : null, item.foods?.length ? JSON.stringify(item.foods) : null, item.recipes?.length ? JSON.stringify(item.recipes) : null])
    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
})

app.use('/api', (_req, res) => res.status(404).json({ error: 'Маршрут не найден' }))
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  void _next
  console.error(error.message)
  res.status(500).json({ error: 'Внутренняя ошибка сервера' })
})

const directory = path.dirname(fileURLToPath(import.meta.url))
if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(directory, '../dist')
  app.use(express.static(dist, { maxAge: '1h' }))
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const port = Number(process.env.PORT ?? 3001)
async function start() {
  await migrate()
  // Seed an empty development database once; never reintroduce records removed from a curated catalog.
  const catalog = await pool.query('SELECT count(*)::int count FROM products')
  if (catalog.rows[0].count === 0) for (const product of localProducts) await cacheProduct(product)
  app.listen(port, '0.0.0.0', () => console.log(`Norma API: http://0.0.0.0:${port}`))
}
start().catch((error) => { console.error('Database startup failed:', error); process.exit(1) })
