import 'dotenv/config'
import { migrate, pool } from './db'

const apply = process.argv.includes('--apply')
const macroCte = `WITH macro AS (
  SELECT p.id,p.name,p.name_ru,p.category,count(n.nutrient_key)::int nutrient_count,
    coalesce(sum(n.amount) FILTER(WHERE n.nutrient_key IN('calories','protein','fat','carbs') AND n.amount>0),0) macro_sum
  FROM products p LEFT JOIN product_nutrients n ON n.product_id=p.id
  GROUP BY p.id
)`
const obviousZero = `(
  name ~* '(^|[^a-z])(water|ice|salt|vinegar|coffee|tea)([^a-z]|$)'
  OR name_ru ~* '(^|[^а-яё])(вода|лед|лёд|соль|уксус|кофе|чай)([^а-яё]|$)'
  OR category='Spices and Herbs'
)`

async function preview() {
  const zero = await pool.query(`${macroCte} SELECT id,name_ru,nutrient_count FROM macro
    WHERE macro_sum=0 AND NOT ${obviousZero} ORDER BY nutrient_count,id`)
  const duplicates = await pool.query(`WITH names AS (
    SELECT lower(translate(regexp_replace(trim(coalesce(name_ru,name)),'\\s+',' ','g'),'ё','е')) key,
      count(*)::int copies,array_agg(name_ru ORDER BY id) names
    FROM products GROUP BY 1 HAVING count(*)>1
  ) SELECT count(*)::int groups,coalesce(sum(copies-1),0)::int rows,
    coalesce(sum(copies-1),0)::int removable FROM names`)
  const examples = await pool.query(`WITH names AS (
    SELECT lower(translate(regexp_replace(trim(coalesce(name_ru,name)),'\\s+',' ','g'),'ё','е')) key,
      count(*)::int copies,min(name_ru) name
    FROM products GROUP BY 1 HAVING count(*)>1
  ) SELECT name,copies FROM names ORDER BY copies DESC,name LIMIT 20`)
  console.log(`Zero-macro candidates: ${zero.rowCount}`)
  console.log(zero.rows.slice(0, 20).map((row) => `  ${row.id} · ${row.name_ru} · ${row.nutrient_count} nutrients`).join('\n'))
  console.log(`Duplicate groups: ${duplicates.rows[0].groups}; duplicate rows: ${duplicates.rows[0].rows}`)
  console.log(examples.rows.map((row) => `  ${row.copies} × ${row.name}`).join('\n'))
  console.log('Preview only. Run with --apply after a database backup to delete and merge records.')
}

async function cleanup() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`CREATE TEMP TABLE cleanup_zero_ids ON COMMIT DROP AS ${macroCte}
      SELECT id FROM macro WHERE macro_sum=0 AND NOT ${obviousZero}`)
    const zero = await client.query('SELECT count(*)::int count FROM cleanup_zero_ids')
    await client.query(`UPDATE diary_entries d SET product_id=NULL FROM cleanup_zero_ids z WHERE d.product_id=z.id`)
    await client.query('DELETE FROM products p USING cleanup_zero_ids z WHERE p.id=z.id')

    await client.query(`CREATE TEMP TABLE cleanup_duplicate_map ON COMMIT DROP AS
      WITH stats AS (
        SELECT p.id,lower(translate(regexp_replace(trim(coalesce(p.name_ru,p.name)),'\\s+',' ','g'),'ё','е')) key,
          count(n.nutrient_key)::int nutrient_count,
          count(n.nutrient_key) FILTER(WHERE n.nutrient_key IN('calories','protein','fat','carbs'))::int macro_fields
        FROM products p LEFT JOIN product_nutrients n ON n.product_id=p.id GROUP BY p.id
      ), ranked AS (
        SELECT id,key,row_number() OVER(PARTITION BY key ORDER BY macro_fields DESC,nutrient_count DESC,id) place
        FROM stats
      )
      SELECT loser.id,keeper.id keep_id FROM ranked loser
      JOIN ranked keeper ON keeper.key=loser.key AND keeper.place=1 WHERE loser.place>1`)
    const duplicates = await client.query('SELECT count(*)::int count FROM cleanup_duplicate_map')
    await client.query(`UPDATE diary_entries d SET product_id=m.keep_id FROM cleanup_duplicate_map m WHERE d.product_id=m.id`)
    await client.query(`INSERT INTO favorites(user_id,product_id)
      SELECT f.user_id,m.keep_id FROM favorites f JOIN cleanup_duplicate_map m ON m.id=f.product_id ON CONFLICT DO NOTHING`)
    await client.query('DELETE FROM products p USING cleanup_duplicate_map m WHERE p.id=m.id')
    await client.query('ANALYZE products')
    await client.query('COMMIT')
    console.log(`Cleanup committed: ${zero.rows[0].count} zero-macro products deleted, ${duplicates.rows[0].count} duplicates merged.`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

await migrate()
try {
  if (apply) await cleanup()
  else await preview()
} finally {
  await pool.end()
}
