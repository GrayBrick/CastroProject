import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { migrate, pool, saveProduct } from './db'

type ImportedProduct = Parameters<typeof saveProduct>[0]
const readProducts = async (file: string) => JSON.parse(await readFile(new URL(`./data/${file}`, import.meta.url), 'utf8')) as ImportedProduct[]
const products = [...await readProducts('curated-russian-products.json'), ...await readProducts('curated-sr-products.json')]

async function mergeDuplicates(product: ImportedProduct) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const duplicates = await client.query(`SELECT id FROM products
      WHERE id<>$1 AND lower(replace(coalesce(nullif(name_ru,''),name),'ё','е'))=lower(replace($2,'ё','е')) FOR UPDATE`, [product.id, product.nameRu ?? product.name])
    for (const row of duplicates.rows) {
      const oldId = String(row.id)
      await client.query('UPDATE diary_entries SET product_id=$1 WHERE product_id=$2', [product.id, oldId])
      await client.query(`INSERT INTO favorites(user_id,product_id) SELECT user_id,$1 FROM favorites WHERE product_id=$2
        ON CONFLICT DO NOTHING`, [product.id, oldId])
      await client.query(`INSERT INTO user_product_portions(user_id,product_id,grams,updated_at) SELECT user_id,$1,grams,updated_at FROM user_product_portions WHERE product_id=$2
        ON CONFLICT DO NOTHING`, [product.id, oldId])
      await client.query(`INSERT INTO recipe_ingredients(recipe_id,product_id,grams,position) SELECT recipe_id,$1,grams,position FROM recipe_ingredients WHERE product_id=$2
        ON CONFLICT(recipe_id,product_id) DO UPDATE SET grams=recipe_ingredients.grams+EXCLUDED.grams`, [product.id, oldId])
      await client.query('DELETE FROM favorites WHERE product_id=$1', [oldId])
      await client.query('DELETE FROM user_product_portions WHERE product_id=$1', [oldId])
      await client.query('DELETE FROM recipe_ingredients WHERE product_id=$1', [oldId])
      await client.query('DELETE FROM products WHERE id=$1', [oldId])
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

await migrate()
for (const product of products) {
  if (/[A-Za-z]/.test(`${product.name} ${product.nameRu ?? ''} ${product.brand ?? ''}`)) throw new Error(`Латиница в карточке ${product.id}`)
  await saveProduct(product)
  await mergeDuplicates(product)
}
await pool.query('ANALYZE products; ANALYZE product_nutrients')
console.log(`Импортировано проверенных русскоязычных продуктов: ${products.length}`)
await pool.end()
