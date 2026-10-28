import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'csv-parse'
import { nutrientDefinitions } from '../src/nutrients'
import { migrate, pool } from './db'
import { localizeProductName, searchTextForProduct } from './localization'

const directory = process.env.USDA_CSV_DIR ?? ''
if (!directory) throw new Error('Укажите USDA_CSV_DIR с распакованными CSV FoodData Central')

async function rows(filename: string) {
  return fs.createReadStream(path.join(directory, filename)).pipe(parse({ columns: true, skip_empty_lines: true, relax_column_count: true }))
}

type CsvRow = Record<string, string>

const categoryMap = new Map<string, string>()

async function flushProducts(batch: CsvRow[]) {
  if (!batch.length) return
  const values = batch.flatMap((row) => {
    const category = categoryMap.get(row.food_category_id) ?? null
    const nameRu = localizeProductName(row.description)
    return [`usda-${row.fdc_id}`, 'usda', row.fdc_id, row.description, nameRu, searchTextForProduct(row.description, nameRu, category), category]
  })
  const tuples = batch.map((_, i) => `($${i * 7 + 1},$${i * 7 + 2},$${i * 7 + 3},$${i * 7 + 4},$${i * 7 + 5},$${i * 7 + 6},$${i * 7 + 7})`).join(',')
  await pool.query(`INSERT INTO products(id,source,source_id,name,name_ru,search_text,category) VALUES${tuples}
    ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,name_ru=EXCLUDED.name_ru,search_text=EXCLUDED.search_text,category=EXCLUDED.category,updated_at=now()`, values)
  batch.length = 0
}

type NutrientValue = [productId: string, key: string, amount: number, unit: string]

async function flushNutrients(batch: NutrientValue[]) {
  if (!batch.length) return
  const unique = [...new Map(batch.map((item) => [`${item[0]}:${item[1]}`, item])).values()]
  const values = unique.flatMap((item) => item)
  const tuples = unique.map((_, i) => `($${i * 4 + 1},$${i * 4 + 2},$${i * 4 + 3},$${i * 4 + 4})`).join(',')
  await pool.query(`INSERT INTO product_nutrients(product_id,nutrient_key,amount,unit) VALUES${tuples}
    ON CONFLICT(product_id,nutrient_key) DO UPDATE SET amount=EXCLUDED.amount,unit=EXCLUDED.unit`, values)
  batch.length = 0
}

function targetUnit(key: string) { return nutrientDefinitions.find((item) => item.key === key)?.unit }
function normalize(value: number, source: string, target: string) {
  const mg = source.toLowerCase() === 'g' ? value * 1000 : ['ug', 'µg'].includes(source.toLowerCase()) ? value / 1000 : value
  if (target === 'ккал') return source.toUpperCase() === 'KJ' ? value / 4.184 : value
  return target === 'г' ? mg / 1000 : target === 'мкг' ? mg * 1000 : mg
}

await migrate()
await pool.query("INSERT INTO sync_runs(source,release,status) VALUES('usda',$1,'running')", [process.env.USDA_RELEASE ?? 'unknown'])
try {
  console.log('1/5: food categories')
  for await (const row of await rows('food_category.csv')) categoryMap.set(row.id, row.description)

  console.log('2/5: products')
  const productBatch: CsvRow[] = []
  for await (const row of await rows('food.csv')) {
    productBatch.push(row)
    if (productBatch.length >= 500) await flushProducts(productBatch)
  }
  await flushProducts(productBatch)

  console.log('3/5: nutrient dictionary')
  const nutrientMap = new Map<string, { key: string, unit: string }>()
  for await (const row of await rows('nutrient.csv')) {
    const definition = nutrientDefinitions.find((item) => item.usdaNames?.includes(row.name))
    if (definition) nutrientMap.set(row.id, { key: definition.key, unit: row.unit_name })
  }

  console.log('4/5: nutrient values')
  const nutrientBatch: NutrientValue[] = []
  let count = 0
  let skippedNegative = 0
  for await (const row of await rows('food_nutrient.csv')) {
    const nutrient = nutrientMap.get(row.nutrient_id)
    if (!nutrient) continue
    const target = targetUnit(nutrient.key)
    if (!target) continue
    const amount = normalize(Number(row.amount), nutrient.unit, target)
    if (!Number.isFinite(amount)) continue
    if (amount < 0) {
      skippedNegative++
      continue
    }
    nutrientBatch.push([`usda-${row.fdc_id}`, nutrient.key, amount, target])
    if (nutrientBatch.length >= 500) await flushNutrients(nutrientBatch)
    if (++count % 10000 === 0) console.log(`${count} values`)
  }
  await flushNutrients(nutrientBatch)
  console.log(`${count} nutrient values imported; ${skippedNegative} negative values skipped`)

  console.log('5/5: branded food and barcodes')
  if (fs.existsSync(path.join(directory, 'branded_food.csv'))) {
    for await (const row of await rows('branded_food.csv')) {
      await pool.query(`UPDATE products SET barcode=nullif($2,''),brand=nullif($3,''),note=nullif($4,''),serving_grams=nullif($5,'')::numeric WHERE id=$1`,
        [`usda-${row.fdc_id}`, row.gtin_upc, row.brand_owner, row.ingredients, row.serving_size])
    }
  }
  await pool.query('ANALYZE products; ANALYZE product_nutrients')
  await pool.query("UPDATE sync_runs SET status='done',finished_at=now() WHERE status='running' AND source='usda'")
  console.log('USDA import complete')
} catch (error) {
  await pool.query("UPDATE sync_runs SET status='failed',finished_at=now(),error=$1 WHERE status='running' AND source='usda'", [String(error)])
  throw error
} finally { await pool.end() }
