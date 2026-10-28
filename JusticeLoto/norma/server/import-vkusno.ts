import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { migrate, pool, saveProduct } from './db'

type ImportedProduct = Parameters<typeof saveProduct>[0]

const products = JSON.parse(await readFile(new URL('./vkusno-data.json', import.meta.url), 'utf8')) as ImportedProduct[]
await migrate()
await pool.query("UPDATE products SET category='Fast Foods' WHERE category='Фастфуд'")
for (const product of products) await saveProduct(product)
await pool.query('ANALYZE products; ANALYZE product_nutrients')
console.log(`Импортировано ${products.length} позиций «Вкусно — и точка» в категорию «Фастфуд»`)
await pool.end()
