import 'dotenv/config'
import { pool, migrate } from './db'
import { localizeProductName, searchTextForProduct } from './localization'

type ProductRow = { id: string, name: string, category: string | null }
type LocalizedRow = { id: string, nameRu: string, searchText: string }

async function flush(batch: LocalizedRow[]) {
  if (!batch.length) return
  await pool.query(`UPDATE products p SET name_ru=v.name_ru,search_text=v.search_text,updated_at=now()
    FROM (SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(id text,name_ru text,search_text text)) v
    WHERE p.id=v.id`, [JSON.stringify(batch.map((item) => ({ id: item.id, name_ru: item.nameRu, search_text: item.searchText })))])
  batch.length = 0
}

await migrate()
const result = await pool.query<ProductRow>('SELECT id,name,category FROM products ORDER BY id')
const batch: LocalizedRow[] = []
let changed = 0
let cyrillic = 0
try {
  for (const product of result.rows) {
    const nameRu = localizeProductName(product.name)
    if (nameRu !== product.name) changed++
    if (/[а-яё]/i.test(nameRu)) cyrillic++
    batch.push({ id: product.id, nameRu, searchText: searchTextForProduct(product.name, nameRu, product.category) })
    if (batch.length >= 500) await flush(batch)
    if ((changed + 1) % 5000 === 0) console.log(`${changed + 1} products processed`)
  }
  await flush(batch)
  await pool.query('ANALYZE products')
  console.log(`Localization complete: ${result.rowCount} products, ${changed} translated names, ${cyrillic} names contain Cyrillic`)
} finally {
  await pool.end()
}
