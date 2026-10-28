import { nutrientDefinitions } from '../src/nutrients'
import { listProductCategories, pool, readProductPage, readProducts, saveProduct } from './db'
import { normalizeSearchText } from './localization'

const russianQueries: Record<string, string> = {
  'курица': 'chicken', 'куриная': 'chicken', 'куриное': 'chicken', 'грудка': 'chicken breast', 'овсянка': 'oatmeal', 'овес': 'oats',
  'гречка': 'buckwheat', 'греча': 'buckwheat', 'рис': 'rice', 'творог': 'cottage cheese', 'йогурт': 'yogurt', 'кефир': 'kefir',
  'молоко': 'milk', 'сыр': 'cheese', 'яйца': 'egg', 'яйцо': 'egg', 'говядина': 'beef', 'говяжья': 'beef', 'лосось': 'salmon',
  'свинина': 'pork', 'свиной': 'pork', 'свиная': 'pork', 'свиное': 'pork', 'жареная': 'fried', 'жареный': 'fried', 'вареная': 'boiled', 'вареный': 'boiled',
  'банан': 'banana', 'яблоко': 'apple', 'апельсин': 'orange', 'помело': 'pummelo', 'памело': 'pummelo', 'брокколи': 'broccoli', 'шпинат': 'spinach',
  'чечевица': 'lentils', 'авокадо': 'avocado', 'миндаль': 'almonds', 'картофель': 'potato', 'картошка': 'potato', 'хлеб': 'bread',
}

function translateQuery(query: string) {
  const normalized = query.toLowerCase().trim()
  let translated = normalized
  for (const [russian, english] of Object.entries(russianQueries)) translated = translated.replaceAll(russian, english)
  if (translated !== normalized) return translated
  const englishQueries: Record<string, string> = { pummelo: 'помело', 'cottage cheese': 'творог', 'chicken breast': 'куриная грудка' }
  for (const [russian, english] of Object.entries(russianQueries)) englishQueries[english] ??= russian
  for (const [english, russian] of Object.entries(englishQueries).sort((a, b) => b[0].length - a[0].length)) translated = translated.replaceAll(english, russian)
  return translated
}

function validPage(page: number) { return Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1 }

export async function browseProductPage(page = 1, category = '', favoriteIds?: string[]) {
  const params: unknown[] = []
  if (category) params.push(category)
  const categoryClause = category ? ' AND p.category=$1' : ''
  if (favoriteIds) params.push(favoriteIds)
  const favoriteClause = favoriteIds ? ` AND p.id=ANY($${params.length}::text[])` : ''
  return readProductPage(`WHERE true${categoryClause}${favoriteClause}`, params,
    'ORDER BY p.name_ru,p.name,p.id', validPage(page))
}

export async function searchProductPage(query: string, page = 1, category = '', favoriteIds?: string[]) {
  if (favoriteIds && !favoriteIds.length) return { products: [], total: 0, page: 1, pageSize: 30, totalPages: 1 }
  if (!query.trim()) return browseProductPage(page, category, favoriteIds)
  const russian = normalizeSearchText(query)
  const english = translateQuery(russian)
  const params: unknown[] = [`%${russian}%`, russian, `%${english}%`, english]
  if (category) params.push(category)
  const categoryClause = category ? ` AND p.category=$${params.length}` : ''
  if (favoriteIds) params.push(favoriteIds)
  const favoriteClause = favoriteIds ? ` AND p.id=ANY($${params.length}::text[])` : ''
  const order = `ORDER BY (
    greatest(similarity(coalesce(p.name_ru,''),$2),similarity(p.search_text,$2),similarity(p.name,$4))+
    5*ts_rank(to_tsvector('russian',p.search_text),websearch_to_tsquery('russian',$2))+
    least(count(n.nutrient_key)/240.0,0.25)+
    CASE WHEN p.raw->>'official'='true' THEN 0.4 ELSE 0 END+
    CASE WHEN coalesce(p.name_ru,'') ILIKE $2||'%' OR p.name ILIKE $4||'%' THEN 0.2 ELSE 0 END+
    CASE WHEN coalesce(p.name_ru,'') ILIKE $2||',%' OR p.name ILIKE $4||',%' THEN 0.15 ELSE 0 END
  ) DESC,p.name_ru,p.name,p.id`
  const currentPage = validPage(page)
  const countParams: unknown[] = [`%${russian}%`, russian, `%${english}%`]
  if (category) countParams.push(category)
  const countCategoryClause = category ? ` AND p.category=$${countParams.length}` : ''
  if (favoriteIds) countParams.push(favoriteIds)
  const countFavoriteClause = favoriteIds ? ` AND p.id=ANY($${countParams.length}::text[])` : ''
  const countWhere = `WHERE (p.name_ru ILIKE $1 OR p.name ILIKE $3 OR p.search_text % $2
    OR to_tsvector('russian',p.search_text) @@ websearch_to_tsquery('russian',$2))${countCategoryClause}${countFavoriteClause}`
  const products = await readProductPage(`WHERE (p.name_ru ILIKE $1 OR p.name ILIKE $3 OR p.search_text % $2
    OR to_tsvector('russian',p.search_text) @@ websearch_to_tsquery('russian',$2))${categoryClause}${favoriteClause}`, params, order, currentPage, 30, countParams, countWhere)
  if (products.total >= 12) return products

  // Expensive per-token typo matching is a fallback, not a filter for every catalog search.
  const fuzzyParams: unknown[] = [russian]
  if (category) fuzzyParams.push(category)
  const fuzzyCategoryClause = category ? ` AND p.category=$${fuzzyParams.length}` : ''
  if (favoriteIds) fuzzyParams.push(favoriteIds)
  const fuzzyFavoriteClause = favoriteIds ? ` AND p.id=ANY($${fuzzyParams.length}::text[])` : ''
  const fuzzyOrder = `ORDER BY (
    greatest(similarity(coalesce(p.name_ru,''),$1),similarity(p.search_text,$1))+
    5*ts_rank(to_tsvector('russian',p.search_text),websearch_to_tsquery('russian',$1))+
    least(count(n.nutrient_key)/240.0,0.25)+
    CASE WHEN p.raw->>'official'='true' THEN 0.4 ELSE 0 END+
    CASE WHEN coalesce(p.name_ru,'') ILIKE $1||'%' THEN 0.2 ELSE 0 END+
    CASE WHEN coalesce(p.name_ru,'') ILIKE $1||',%' THEN 0.15 ELSE 0 END
  ) DESC,p.name_ru,p.name,p.id`
  const fuzzy = await readProductPage(`WHERE length($1::text)>2
    AND EXISTS(SELECT 1 FROM unnest(string_to_array($1::text,' ')) token WHERE length(token)>2)
    AND NOT EXISTS(SELECT 1 FROM unnest(string_to_array($1::text,' ')) token
      WHERE length(token)>2 AND word_similarity(token,p.search_text)<0.4)${fuzzyCategoryClause}${fuzzyFavoriteClause}`, fuzzyParams, fuzzyOrder, currentPage)
  return fuzzy.total >= products.total ? fuzzy : products
}

export async function searchProducts(query: string) {
  return (await searchProductPage(query)).products
}

export async function productCategories() { return listProductCategories() }

function normalizeUnit(value: number, sourceUnit: string, targetUnit: string) {
  if (targetUnit === 'ккал' && sourceUnit.toLowerCase().includes('kj')) return value / 4.184
  const unit = sourceUnit.toLowerCase()
  const inMg = unit === 'g' || unit === 'г' ? value * 1000 : unit === 'ug' || unit === 'µg' || unit === 'mcg' || unit === 'мкг' ? value / 1000 : value
  if (targetUnit === 'г') return inMg / 1000
  if (targetUnit === 'мкг') return inMg * 1000
  return inMg
}

export function mapUsdaNutrients(items: Array<{ nutrientName?: string, nutrient?: { name?: string, unitName?: string }, unitName?: string, value?: number, amount?: number }>) {
  const nutrients: Record<string, number> = {}
  for (const item of items) {
    const name = item.nutrientName ?? item.nutrient?.name
    const value = item.value ?? item.amount
    if (!name || typeof value !== 'number') continue
    const definition = nutrientDefinitions.find((candidate) => candidate.usdaNames?.includes(name))
    if (!definition) continue
    const current = nutrients[definition.key]
    const normalized = normalizeUnit(value, item.unitName ?? item.nutrient?.unitName ?? '', definition.unit)
    // Prefer specific D3/D2 and energy values over duplicated aggregate records.
    if (current === undefined || name === 'Energy') nutrients[definition.key] = Math.round(normalized * 10000) / 10000
  }
  return nutrients
}

export async function fetchUsdaProduct(fdcId: string) {
  if (!process.env.USDA_API_KEY) return null
  const response = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(fdcId)}?api_key=${process.env.USDA_API_KEY}`, { signal: AbortSignal.timeout(12_000) })
  if (!response.ok) return null
  const food = await response.json()
  const product = {
    id: `usda-${food.fdcId}`, source: 'usda', sourceId: String(food.fdcId), barcode: food.gtinUpc || undefined,
    name: food.description, category: food.foodCategory || food.brandedFoodCategory, brand: food.brandOwner,
    note: 'USDA FoodData Central', servingGrams: food.servingSize,
    nutrients: mapUsdaNutrients(food.foodNutrients ?? []), raw: food,
  }
  await saveProduct(product)
  return product
}

export async function productByBarcode(barcode: string) {
  const local = await readProducts('WHERE p.barcode=$1', [barcode])
  if (local.length) return local[0]

  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
    headers: { 'User-Agent': process.env.OFF_USER_AGENT ?? 'NormaNutrition/1.0 (local-development)' },
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) return null
  const body = await response.json()
  if (body.status !== 1 || !body.product) return null
  const item = body.product
  const values = item.nutriments ?? {}
  const mapping: Record<string, string> = {
    'energy-kcal_100g': 'calories', proteins_100g: 'protein', fat_100g: 'fat', carbohydrates_100g: 'carbs',
    fiber_100g: 'fiber', sugars_100g: 'sugars', 'added-sugars_100g': 'addedSugars', 'vitamin-a_100g': 'vitaminA',
    'vitamin-c_100g': 'vitaminC', 'vitamin-d_100g': 'vitaminD', 'vitamin-e_100g': 'vitaminE', 'vitamin-k_100g': 'vitaminK',
    'vitamin-b1_100g': 'vitaminB1', 'vitamin-b2_100g': 'vitaminB2', 'vitamin-b6_100g': 'vitaminB6',
    'vitamin-b9_100g': 'vitaminB9', 'vitamin-b12_100g': 'vitaminB12', calcium_100g: 'calcium', iron_100g: 'iron',
    magnesium_100g: 'magnesium', phosphorus_100g: 'phosphorus', potassium_100g: 'potassium', sodium_100g: 'sodium',
    zinc_100g: 'zinc', copper_100g: 'copper', manganese_100g: 'manganese', selenium_100g: 'selenium',
    'saturated-fat_100g': 'saturatedFat', 'monounsaturated-fat_100g': 'monounsaturatedFat',
    'polyunsaturated-fat_100g': 'polyunsaturatedFat', 'trans-fat_100g': 'transFat', cholesterol_100g: 'cholesterol',
  }
  const nutrients: Record<string, number> = {}
  Object.entries(mapping).forEach(([source, target]) => {
    const value = values[source]
    const definition = nutrientDefinitions.find((candidate) => candidate.key === target)
    if (typeof value === 'number' && definition) nutrients[target] = normalizeUnit(value, target === 'calories' ? 'kcal' : 'g', definition.unit)
  })
  const russianName = String(item.product_name_ru ?? '').trim()
  if (!russianName || !/[А-Яа-яЁё]/.test(russianName)) return null
  const product = {
    id: `off-${barcode}`, source: 'openfoodfacts', sourceId: barcode, barcode,
    name: russianName,
    nameRu: russianName, category: 'Упакованные продукты', brand: item.brands,
    imageUrl: item.image_front_small_url, note: 'Open Food Facts · данные производителя и сообщества',
    servingGrams: Number.parseFloat(item.serving_quantity) || undefined, nutrients, raw: item,
  }
  await saveProduct(product)
  return (await readProducts('WHERE p.id=$1', [product.id]))[0]
}

export async function cacheProduct(product: { id: string, name: string, category?: string, note?: string, imageUrl?: string, barcode?: string, nutrients: Record<string, number> }) {
  await saveProduct({ id: product.id, source: 'local', sourceId: product.id, name: product.name, nameRu: product.name,
    category: product.category, note: product.note, imageUrl: product.imageUrl, barcode: product.barcode, nutrients: product.nutrients })
}

export async function allLocalProducts() {
  return readProducts('WHERE true', [], 'ORDER BY p.updated_at DESC')
}

export async function closeProducts() { await pool.end() }
