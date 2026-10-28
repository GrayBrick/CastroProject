const base = (process.env.NORMA_API_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '')
const failures = []
let slowest = { query: '', ms: 0 }

async function get(path) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(25000) })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.error ?? 'request failed'}`)
  return body
}

const queries = [
  ['помело', /помело/i], ['памело', /помело/i], ['pummelo', /помело/i],
  ['свиная лопатка', /свинин|свиная/i, /лопатк/i], ['свинина жареная', /свин/i, /жарен/i],
  ['жаренная свинина', /свин/i, /жарен/i], ['жареная свинино', /свин/i, /жарен/i],
  ['говяжья вырезка', /говядин|говяж/i, /вырезк/i], ['куриная грудка', /курин|куриц/i, /грудк/i],
  ['курица', /куриц|курин/i], ['индейка', /индейк/i], ['pork', /свин/i], ['fried pork', /свин/i, /жарен/i],
  ['творог', /творог/i], ['творожок', /творог/i], ['cottage cheese', /творог/i],
  ['банан', /банан/i], ['яблоко', /яблок/i], ['апельсин', /апельсин/i], ['грейпфрут', /грейпфрут/i],
  ['мандарин', /мандарин/i], ['лимон', /лимон/i], ['клубника', /клубник/i], ['черника', /голубик|черник/i],
  ['картошка', /картоф|картош/i], ['греча', /греч/i], ['овсянка', /овсян|овёс|овес/i], ['рис', /рис/i],
  ['киноа', /киноа/i], ['чечевица', /чечевиц/i], ['нут', /нут/i], ['миндаль', /миндал/i],
  ['грецкий орех', /грецк/i], ['лосось', /лосось/i], ['сёмга', /лосось|сёмг/i], ['тунец', /тунец/i],
  ['треска', /треск/i], ['креветки', /кревет/i], ['яйца', /яйц|яич/i], ['молоко', /молок/i],
  ['сыр', /сыр/i], ['йогурт', /йогурт/i], ['кефир', /кефир/i], ['помидор', /помидор|томат/i],
  ['огурец', /огур/i], ['брокколи', /брокколи/i], ['шпинат', /шпинат/i], ['хлеб', /хлеб/i],
]

for (const [query, ...patterns] of queries) {
  const started = Date.now()
  try {
    const result = await get(`/api/products?q=${encodeURIComponent(query)}&page=1`)
    const ms = Date.now() - started
    if (ms > slowest.ms) slowest = { query, ms }
    const problems = []
    if (!result.total || !result.products?.length) problems.push('нет результатов')
    if (result.products?.length > 30) problems.push('больше 30 строк на странице')
    for (const pattern of patterns) if (!result.products?.some((product) => pattern.test(product.name))) problems.push(`не найдено ${pattern}`)
    const names = (result.products ?? []).map((product) => product.name.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е'))
    if (new Set(names).size !== names.length) problems.push('повторяющиеся названия на странице')
    if (problems.length) throw new Error(problems.join('; '))
    console.log(`PASS ${query} · ${result.total} · ${ms} ms`)
  } catch (error) {
    failures.push(`${query}: ${error.message}`)
    console.error(`FAIL ${query}: ${error.message}`)
  }
}

try {
  const { categories } = await get('/api/product-categories')
  if (!categories?.length) throw new Error('пустой список категорий')
  const meat = categories.find((category) => category.id === 'Мясо и птица')
  if (!meat) throw new Error('нет объединённой категории «Мясо и птица»')
  const filtered = await get(`/api/products?q=${encodeURIComponent('свиная лопатка')}&category=${encodeURIComponent(meat.id)}`)
  if (!filtered.products.length || filtered.products.some((product) => product.category !== 'Мясо и птица')) throw new Error('фильтр категории работает неверно')
  console.log(`PASS категория Мясо и птица · ${filtered.total} результатов`)

  const first = await get(`/api/products?q=${encodeURIComponent('молоко')}&page=1`)
  const second = await get(`/api/products?q=${encodeURIComponent('молоко')}&page=2`)
  if (first.totalPages < 2 || second.page !== 2 || !second.products.length) throw new Error('вторая страница недоступна')
  if (first.products.some((product) => second.products.some((other) => other.id === product.id))) throw new Error('страницы пересекаются')
  const names = [...first.products, ...second.products].map((product) => product.name.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е'))
  if (new Set(names).size !== names.length) throw new Error('на соседних страницах есть дубли названий')
  console.log(`PASS пагинация · страницы 1 и 2, всего ${first.totalPages}`)
} catch (error) {
  failures.push(`categories/pagination: ${error.message}`)
  console.error(`FAIL categories/pagination: ${error.message}`)
}

console.log(`\nСамый медленный запрос: ${slowest.query} · ${slowest.ms} ms`)
if (failures.length) {
  console.error(`\n${failures.length} проверок не пройдено:\n${failures.map((item) => `- ${item}`).join('\n')}`)
  process.exit(1)
}
console.log(`\n${queries.length + 2} поисковых и каталожных сценариев успешно проверено.`)
