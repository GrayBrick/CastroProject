import 'dotenv/config'
import { pool } from './db'
import { canonicalProductCategory, hasEnglishProductText, isUnavailableOrInvalidProduct } from './catalog-rules'

const apply = process.argv.includes('--apply')
type Row = {
  id: string, name: string, name_ru: string | null, category: string | null, brand: string | null,
  source: string, official: boolean, nutrient_count: number,
}

const result = await pool.query(`SELECT p.id,p.name,p.name_ru,p.category,p.brand,p.source,
  coalesce(p.raw->>'official','false')='true' official,count(n.nutrient_key)::int nutrient_count
  FROM products p LEFT JOIN product_nutrients n ON n.product_id=p.id GROUP BY p.id ORDER BY p.id`)
const products = result.rows as Row[]
const removable = products.filter((product) => hasEnglishProductText({ ...product, nameRu: product.name_ru }) || isUnavailableOrInvalidProduct({ ...product, nameRu: product.name_ru }))
const removableIds = new Set(removable.map((product) => product.id))
const kept = products.filter((product) => !removableIds.has(product.id))
const categoryChanges = kept.map((product) => ({
  id: product.id,
  from: product.category,
  to: canonicalProductCategory({ ...product, nameRu: product.name_ru }),
})).filter((change) => change.from !== change.to)

const groups = new Map<string, Row[]>()
for (const product of kept) {
  const key = (product.name_ru || product.name).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
  const group = groups.get(key) ?? []
  group.push(product)
  groups.set(key, group)
}
const sourceRank = (product: Row) => product.official ? 0 : product.source === 'local' ? 1 : product.source === 'openfoodfacts' ? 2 : product.source === 'ai' ? 3 : 4
const duplicateMap = new Map<string, string>()
for (const group of groups.values()) {
  if (group.length < 2) continue
  group.sort((a, b) => sourceRank(a) - sourceRank(b) || b.nutrient_count - a.nutrient_count || a.id.localeCompare(b.id))
  for (const loser of group.slice(1)) duplicateMap.set(loser.id, group[0].id)
}

console.log(`Всего: ${products.length}; к удалению: ${removable.length}; дублей к объединению: ${duplicateMap.size}; категорий к изменению: ${categoryChanges.length}`)
console.log('Примеры удаления:', removable.slice(0, 12).map((product) => `${product.id} · ${product.name_ru || product.name}`).join('\n'))
console.log('Изменения категорий:', categoryChanges.map((change) => `${change.id}: ${change.from} → ${change.to}`).join('\n'))
if (!apply) {
  console.log('Это предварительный просмотр. Для применения после резервной копии используйте --apply.')
  await pool.end()
} else {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('CREATE TEMP TABLE cleanup_remove_ids(id TEXT PRIMARY KEY) ON COMMIT DROP')
    for (let index = 0; index < removable.length; index += 500) {
      const batch = removable.slice(index, index + 500)
      await client.query(`INSERT INTO cleanup_remove_ids(id) VALUES${batch.map((_, i) => `($${i + 1})`).join(',')}`, batch.map((product) => product.id))
    }
    await client.query('UPDATE diary_entries d SET product_id=NULL FROM cleanup_remove_ids r WHERE d.product_id=r.id')
    await client.query('DELETE FROM products p USING cleanup_remove_ids r WHERE p.id=r.id')

    for (const change of categoryChanges) await client.query('UPDATE products SET category=$2,updated_at=now() WHERE id=$1', [change.id, change.to])
    await client.query('CREATE TEMP TABLE cleanup_duplicate_map(id TEXT PRIMARY KEY,keep_id TEXT NOT NULL) ON COMMIT DROP')
    const duplicates = [...duplicateMap.entries()]
    for (let index = 0; index < duplicates.length; index += 500) {
      const batch = duplicates.slice(index, index + 500)
      const values = batch.flatMap(([id, keepId]) => [id, keepId])
      await client.query(`INSERT INTO cleanup_duplicate_map(id,keep_id) VALUES${batch.map((_, i) => `($${i * 2 + 1},$${i * 2 + 2})`).join(',')}`, values)
    }
    await client.query('UPDATE diary_entries d SET product_id=m.keep_id FROM cleanup_duplicate_map m WHERE d.product_id=m.id')
    await client.query('INSERT INTO favorites(user_id,product_id) SELECT f.user_id,m.keep_id FROM favorites f JOIN cleanup_duplicate_map m ON m.id=f.product_id ON CONFLICT DO NOTHING')
    await client.query(`INSERT INTO user_product_portions(user_id,product_id,grams,updated_at)
      SELECT p.user_id,m.keep_id,p.grams,p.updated_at FROM user_product_portions p JOIN cleanup_duplicate_map m ON m.id=p.product_id
      ON CONFLICT(user_id,product_id) DO NOTHING`)
    await client.query('DELETE FROM products p USING cleanup_duplicate_map m WHERE p.id=m.id')
    await client.query('ANALYZE products; ANALYZE product_nutrients')
    await client.query('COMMIT')
    const remaining = await pool.query('SELECT count(*)::int count FROM products')
    console.log(`Очистка завершена. Осталось продуктов: ${remaining.rows[0].count}`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}
