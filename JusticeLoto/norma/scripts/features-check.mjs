import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const artifacts = path.join(root, 'artifacts', 'features-check')
await mkdir(artifacts, { recursive: true })
const server = spawn(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', '7100', '--strictPort'], { stdio: 'pipe' })
let browser
const checks = []
const check = (name) => { checks.push(name); console.log(`PASS ${name}`) }
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const products = [
  { id: 'buckwheat', name: 'Гречка варёная', category: 'Крупы', emoji: '🌾', note: 'Проверочный продукт', source: 'usda', nutrients: { calories: 80, protein: 3, fat: 0.6, carbs: 16, magnesium: 51 } },
  { id: 'banana', name: 'Банан', category: 'Фрукты', emoji: '🍌', note: 'Проверочный продукт', source: 'usda', nutrients: { calories: 89, protein: 1.1, fat: 0.3, carbs: 22.8, potassium: 358 } },
]
let recipeSequence = 0

try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Vite startup timeout')), 20000)
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Local:')) { clearTimeout(timeout); resolve() }
    })
    server.stderr.on('data', (data) => console.error(data.toString()))
    server.on('error', reject)
    server.on('exit', (code) => { if (code) reject(new Error(`Vite exited with ${code}`)) })
  })
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.route('**/api/products?*', async (route) => {
    const query = (new URL(route.request().url()).searchParams.get('q') ?? '').toLowerCase()
    const found = products.filter((product) => product.name.toLowerCase().includes(query))
    await route.fulfill(json({ products: found, total: found.length, page: 1, pageSize: 30, totalPages: 1 }))
  })
  await page.route('**/api/product-categories', (route) => route.fulfill(json({ categories: [] })))
  await page.route('**/api/recipes', async (route) => {
    if (route.request().method() !== 'POST') return route.fulfill(json({ recipes: [] }))
    const draft = route.request().postDataJSON()
    const recipe = { ...draft, id: `test-recipe-${++recipeSequence}`, favorite: false, createdAt: new Date().toISOString() }
    await route.fulfill(json({ recipe }, 201))
  })
  await page.route('**/api/recipes/*', (route) => {
    if (route.request().method() === 'PUT') return route.fulfill(json({ recipe: route.request().postDataJSON() }))
    return route.fulfill(json({ ok: true }))
  })
  await page.route('**/api/kimi/chat', (route) => route.fulfill(json({
    text: 'Разложил приготовленное блюдо на ингредиенты.',
    recipes: [{ name: 'Гречка с бананом', description: 'Домашний завтрак', instructions: 'Смешать перед подачей.', emoji: '🥣', suggestedGrams: 300, ingredients: [
      { product: products[0], grams: 200 }, { product: products[1], grams: 100 },
    ] }],
  })))
  await page.route('**/api/body-composition/import', (route) => route.fulfill(json({ weight: 70.7, height: 179, bodyFatPercent: 10.4, skeletalMuscleKg: 36.2, leanBodyMassKg: 63.3, bodyWaterPercent: 65.8, visceralFatLevel: 2 })))
  await page.route('**/api/products/barcode/**', async (route) => {
    if (route.request().url().endsWith('/package')) {
      return route.fulfill(json({ product: { id: 'custom-4690123456789', name: 'Творожок клубничный', category: 'Молочные продукты', emoji: '🥛', note: 'Данные с этикетки', source: 'custom', barcode: '4690123456789', servingGrams: 100, nutrients: { calories: 121, protein: 8, fat: 4.2, carbs: 13, calcium: 120 } } }, 201))
    }
    await route.fulfill(json({ error: 'Продукт не найден. Добавьте его вручную.' }, 404))
  })
  await page.route('**/api/state', (route) => route.fulfill(json(route.request().method() === 'PUT' ? { ok: true } : { profile: null, entries: [], tasks: [], favorites: [], favoriteNutrients: [], messages: [], productPortions: {}, recipes: [] })))

  await page.goto('http://127.0.0.1:7100/', { waitUntil: 'networkidle' })
  await page.getByPlaceholder('+7 917 513-33-15').fill('89175133315')
  await page.getByRole('button', { name: 'Продолжить' }).click()
  await page.getByPlaceholder('••••').fill('2410')
  await page.getByRole('heading', { name: 'Твой баланс' }).waitFor()

  await page.locator('.bottom-nav').getByRole('button', { name: 'Питание' }).click()
  await page.getByRole('button', { name: 'Создать рецепт' }).click()
  await page.getByLabel('Название рецепта').fill('Утренняя гречка')
  await page.getByLabel('Описание', { exact: true }).fill('Личный рецепт для проверки')
  await page.getByLabel('Как готовить').fill('Сварить гречку и добавить банан.')
  const ingredientSearch = page.getByPlaceholder('Найти ингредиент в каталоге')
  await ingredientSearch.fill('гречка')
  await page.locator('.recipe-search-results button').filter({ hasText: 'Гречка варёная' }).click()
  await ingredientSearch.fill('банан')
  await page.locator('.recipe-search-results button').filter({ hasText: 'Банан' }).click()
  await page.getByLabel('Масса: Гречка варёная').fill('200')
  await page.getByRole('button', { name: 'Сохранить рецепт', exact: true }).click()
  const recipeRow = page.locator('.product-row').filter({ hasText: 'Утренняя гречка' })
  await recipeRow.waitFor()
  await recipeRow.locator('.product-main').click()
  await page.getByLabel('Порция, граммы').fill('150')
  const scaled = await page.locator('.recipe-portion-ingredients').innerText()
  if (!scaled.includes('Гречка варёная') || !scaled.includes('100 г') || !scaled.includes('Банан') || !scaled.includes('50 г')) throw new Error(`Ингредиенты не масштабируются: ${scaled}`)
  await page.screenshot({ path: path.join(artifacts, 'recipe-portion.png'), fullPage: true })
  await page.getByRole('button', { name: 'Добавить в обед' }).click()
  await recipeRow.getByRole('button', { name: 'Избранное' }).click()
  await page.locator('.segmented').getByRole('button', { name: /Избранное/ }).click()
  await page.locator('.product-row').filter({ hasText: 'Утренняя гречка' }).waitFor()
  check('Личный рецепт: ингредиенты, сохранение, избранное и пропорциональная порция')

  await page.locator('.bottom-nav').getByRole('button', { name: 'Помощник' }).click()
  await page.getByPlaceholder('Спроси про еду или тренировку…').fill('Я приготовил гречку с бананом')
  await page.getByPlaceholder('Спроси про еду или тренировку…').press('Enter')
  const chatRecipe = page.locator('.chat-recipe-card').filter({ hasText: 'Гречка с бананом' })
  await chatRecipe.waitFor()
  await chatRecipe.getByRole('button', { name: 'Только сохранить рецепт' }).click()
  await chatRecipe.getByRole('button', { name: 'Рецепт сохранён' }).waitFor()
  await chatRecipe.getByLabel('Порция рецепта: Гречка с бананом').fill('150')
  await chatRecipe.getByRole('button', { name: 'В дневник' }).click()
  await chatRecipe.getByRole('button', { name: 'Добавлено' }).waitFor()
  await page.locator('.bottom-nav').getByRole('button', { name: 'Сегодня' }).click()
  await page.getByRole('button', { name: 'Изменить Гречка с бананом' }).waitFor()
  check('Чат сохраняет приготовленное блюдо как рецепт и добавляет его в дневник')

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Быстро добавить еду' }).click()
  await page.getByRole('button', { name: 'Сканировать штрихкод' }).click()
  await page.getByPlaceholder('4607025392113').fill('4690123456789')
  await page.locator('.barcode-input button').click()
  await page.getByRole('button', { name: 'Добавить по фото названия и состава' }).click()
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  const imagePath = path.join(artifacts, 'package.png')
  await writeFile(imagePath, png)
  const packageInputs = page.locator('.package-photo-field input')
  await packageInputs.nth(0).setInputFiles(imagePath)
  await packageInputs.nth(1).setInputFiles(imagePath)
  await page.getByRole('button', { name: 'Распознать и сохранить' }).click()
  await page.getByRole('dialog', { name: 'Творожок клубничный' }).waitFor()
  if (await page.getByLabel('Порция, граммы').inputValue() !== '100') throw new Error('Порция нового упакованного продукта не подставилась')
  check('Неизвестный штрихкод: два фото, сохранение продукта и открытие порции')

  await page.getByRole('button', { name: 'Закрыть' }).click()
  await page.getByRole('button', { name: 'Личный профиль' }).click()
  const pdfPath = path.join(artifacts, 'inbody-test.pdf')
  await writeFile(pdfPath, Buffer.from('%PDF-1.4\nПроверочный документ\n'))
  await page.locator('.body-import input[type=file]').setInputFiles(pdfPath)
  await page.getByLabel('Жир, %').waitFor()
  const values = await page.locator('.body-metrics').evaluate((section) => Object.fromEntries([...section.querySelectorAll('label')].map((label) => [label.childNodes[0].textContent, label.querySelector('input')?.value])))
  const expected = { 'Жир, %': '10.4', 'Мышцы, кг': '36.2', 'Безжировая масса, кг': '63.3', 'Вода, %': '65.8', 'Уровень висцерального жира': '2' }
  for (const [key, value] of Object.entries(expected)) if (values[key] !== value) throw new Error(`Неверный показатель ${key}: ${values[key]}`)
  if (await page.getByLabel('Вес, кг').inputValue() !== '70.7' || await page.getByLabel('Рост, см').inputValue() !== '179') throw new Error('Вес или рост из InBody не импортированы')
  await page.getByText('Кэтч–МакАрдл + активность', { exact: true }).waitFor()
  await page.screenshot({ path: path.join(artifacts, 'body-profile.png'), fullPage: true })
  check('Импорт InBody заполняет показатели и включает формулу Кэтч–МакАрдла')

  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`)
  console.log(`\n${checks.length} новых сценария успешно проверено.`)
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
