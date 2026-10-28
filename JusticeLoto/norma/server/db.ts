import pg from 'pg'
import { readFile } from 'node:fs/promises'
import { nutrientMap } from '../src/nutrients'
import { categoryInRussian, localizeProductName, productEmoji, searchTextForProduct } from './localization'

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://norma:norma@127.0.0.1:5432/norma',
  max: 10,
  idleTimeoutMillis: 30_000,
})

export async function migrate() {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
  await pool.query(schema)
}

export async function saveProduct(product: {
  id: string, source: string, sourceId?: string, barcode?: string, name: string, nameRu?: string,
  category?: string, brand?: string, imageUrl?: string, note?: string, servingGrams?: number,
  nutrients: Record<string, number>, raw?: unknown,
}) {
  const nameRu = product.nameRu ?? localizeProductName(product.name)
  const originalName = product.raw && typeof product.raw === 'object' && 'originalName' in product.raw && typeof product.raw.originalName === 'string' ? product.raw.originalName : undefined
  const searchText = searchTextForProduct(product.name, nameRu, product.category, originalName)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`INSERT INTO products(id,source,source_id,barcode,name,name_ru,search_text,category,brand,image_url,note,serving_grams,raw)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT(id) DO UPDATE SET barcode=EXCLUDED.barcode,name=EXCLUDED.name,name_ru=EXCLUDED.name_ru,search_text=EXCLUDED.search_text,
      category=EXCLUDED.category,brand=EXCLUDED.brand,image_url=EXCLUDED.image_url,note=EXCLUDED.note,
      serving_grams=EXCLUDED.serving_grams,raw=EXCLUDED.raw,updated_at=now()`,
      [product.id, product.source, product.sourceId ?? null, product.barcode ?? null, product.name, nameRu, searchText,
        product.category ?? null, product.brand ?? null, product.imageUrl ?? null, product.note ?? null,
        product.servingGrams ?? null, product.raw ? JSON.stringify(product.raw) : null])
    await client.query('DELETE FROM product_nutrients WHERE product_id=$1', [product.id])
    const entries = Object.entries(product.nutrients).filter(([, value]) => Number.isFinite(value))
    for (let index = 0; index < entries.length; index += 50) {
      const batch = entries.slice(index, index + 50)
      const values = batch.flatMap(([key, value]) => [product.id, key, value, nutrientMap.get(key)?.unit ?? 'г'])
      const tuples = batch.map((_, i) => `($${i * 4 + 1},$${i * 4 + 2},$${i * 4 + 3},$${i * 4 + 4})`).join(',')
      await client.query(`INSERT INTO product_nutrients(product_id,nutrient_key,amount,unit) VALUES${tuples}`, values)
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

function mapProducts(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const originalName = String(row.name)
    const name = String(row.name_ru || localizeProductName(originalName))
    const category = row.category ? String(row.category) : null
    const source = String(row.source) as 'local' | 'usda' | 'openfoodfacts' | 'ai' | 'custom'
    const raw = row.raw && typeof row.raw === 'object' ? row.raw as { emoji?: unknown } : null
    return {
      id: String(row.id), name, category: categoryInRussian(category), emoji: typeof raw?.emoji === 'string' ? raw.emoji : productEmoji(`${originalName} ${name}`, category),
      note: source === 'ai' || source === 'custom' ? String(row.note ?? '') : [row.brand, source === 'usda' ? 'USDA' : source === 'openfoodfacts' ? 'Open Food Facts' : '', source === 'local' ? row.note : ''].filter(Boolean).join(' · '),
      source, barcode: row.barcode ? String(row.barcode) : undefined, imageUrl: row.image_url ? String(row.image_url) : undefined,
      servingGrams: row.serving_grams ? Number(row.serving_grams) : undefined,
      nutrients: row.nutrients as Record<string, number>,
    }
  })
}

export async function readProducts(where: string, params: unknown[], order = '') {
  const result = await pool.query(`SELECT p.*,coalesce(json_object_agg(n.nutrient_key,n.amount) FILTER(WHERE n.nutrient_key IS NOT NULL),'{}') nutrients
    FROM products p LEFT JOIN product_nutrients n ON n.product_id=p.id ${where}
    GROUP BY p.id ${order} LIMIT 30`, params)
  return mapProducts(result.rows)
}

export async function readProductPage(where: string, params: unknown[], order: string, page: number, pageSize = 30, countParams = params, countWhere = where) {
  const limit = params.length + 1
  const offset = params.length + 2
  const [count, result] = await Promise.all([
    pool.query(`SELECT count(*)::int total FROM products p ${countWhere}`, countParams),
    pool.query(`SELECT p.*,coalesce(json_object_agg(n.nutrient_key,n.amount) FILTER(WHERE n.nutrient_key IS NOT NULL),'{}') nutrients
      FROM products p LEFT JOIN product_nutrients n ON n.product_id=p.id ${where}
      GROUP BY p.id ${order} LIMIT $${limit} OFFSET $${offset}`, [...params, pageSize, (page - 1) * pageSize]),
  ])
  const total = Number(count.rows[0].total)
  return { products: mapProducts(result.rows), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export async function listProductCategories() {
  const result = await pool.query(`SELECT category,count(*)::int count FROM products
    WHERE category IS NOT NULL AND category<>'' GROUP BY category ORDER BY count DESC,category`)
  return result.rows.map((row) => ({ id: String(row.category), name: categoryInRussian(row.category), count: row.count }))
}
