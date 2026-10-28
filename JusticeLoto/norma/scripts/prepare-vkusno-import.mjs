import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

export function parseAverage(value) {
  const text = clean(value)
  if (/^[-—–]+$/.test(text)) return 0
  const numbers = text.match(/\d+(?:[.,]\d+)?/g)?.map((item) => Number(item.replace(',', '.'))) ?? []
  if (!numbers.length || numbers.some((item) => !Number.isFinite(item))) return null
  return numbers.reduce((sum, item) => sum + item, 0) / numbers.length
}

export function parseEnergyKcal(value) {
  const variants = clean(value).split(/\s+или\s+/i).map((part) => {
    const sides = part.split('/')
    if (sides.length === 1) return parseAverage(sides[0])
    const kj = parseAverage(sides[0])
    const kcal = parseAverage(sides.slice(1).join('/'))
    if (kj === null || kcal === null) return null
    return Math.min(kj, kcal)
  }).filter((item) => item !== null)
  if (!variants.length) return null
  return variants.reduce((sum, item) => sum + item, 0) / variants.length
}

function productName(rawName) {
  let name = clean(rawName)
    .replace(/\s+по желанию покупателя.*$/i, '')
    .replace(/\s+По желанию покупателя.*$/i, '')
    .split('/')[0]
    .trim()
    .replace(/\s+\d+(?:[.,]\d+)?\s*г$/i, '')
    .replace(/^Молочный составной продукт\s+/i, '')
  if (/^Изделия кулинарные креветки/i.test(name)) name = 'Креветки в панировке'
  if (/^Макарони:/i.test(name)) name = 'Макарони ассорти'
  return name
}

function emojiFor(name) {
  const value = name.toLowerCase()
  if (/ролл/.test(value)) return '🌯'
  if (/картофель|оладушек/.test(value)) return '🍟'
  if (/салат|морковные|яблочные дольки/.test(value)) return '🥗'
  if (/кофе|эспрессо|американо|капучино|латте|раф|флэт|фраппе|матча|бамбл/.test(value)) return '☕'
  if (/коктейль молочный|молочный коктейль/.test(value)) return '🥛'
  if (/чай|бабл-ти/.test(value)) return '🫖'
  if (/кола|лимон|апельсин|сок|лимонад|санрайз|физз|вода|тоник/.test(value)) return '🥤'
  if (/мороженое/.test(value)) return '🍦'
  if (/кревет|шримп/.test(value)) return '🍤'
  if (/наггетс|стрипс|крылышки|чикен|снэк бокс|бокс/.test(value)) return '🍗'
  if (/соус|кетчуп|горчица|масло|топпинг|сироп|джем|мед/.test(value)) return '🥫'
  if (/бургер|гранд|биг хит|биг спешиал|панини|маффин|чизбургер|гамбургер|чиабатта|фреш/.test(value)) return '🍔'
  if (/пирог|пирож|торт|чизкейк|тарт|капкейк|круассан|печенье|пончик|макарони|муравейник|творожник|улитка|пастилки|мусс|орешки|рулетики|блины|сырники/.test(value)) return '🍰'
  if (/омлет|яичница|тост|завтрак/.test(value)) return '🍳'
  return '🍽️'
}

const round = (value) => Math.round(value * 100) / 100

export function tableToProducts(table) {
  const rows = table.data
  if (!Array.isArray(rows) || rows.length < 3) return []
  const header = rows[0].map(clean)
  const labels = rows[1].map((cell) => clean(cell).toLowerCase())
  const proteinColumn = labels.findIndex((cell) => cell.startsWith('белки'))
  const fatColumn = labels.findIndex((cell) => cell.startsWith('жиры'))
  const carbsColumn = labels.findIndex((cell) => cell.startsWith('углеводы'))
  const energyColumn = labels.findIndex((cell) => cell.startsWith('энерг'))
  if ([proteinColumn, fatColumn, carbsColumn, energyColumn].some((index) => index < 0)) return []

  const weightColumn = header.findIndex((cell) => /^(Вес \(г\)|Объем \(мл\))/.test(cell))
  const portionColumn = header.findIndex((cell) => cell === 'Порция')
  const isVolume = header.some((cell) => cell.startsWith('Объем (мл)'))
  const basisText = header.join(' ').toLowerCase()
  const basis = basisText.includes('на 10 мл') ? '10 ml' : basisText.includes('на 100') ? '100' : 'serving'
  const baseName = productName(header[0])
  if (!baseName) return []

  const textCells = rows.flat().map(clean).filter(Boolean)
  const composition = textCells.filter((cell) => /состав|готовится|жарится|жарятся/i.test(cell) && cell.length > 40).join('\n').slice(0, 20_000)
  const allergens = textCells.filter((cell) => /^Аллергены:/i.test(cell)).join('\n').slice(0, 4000)
  const products = []

  for (let rowIndex = 2; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    const protein = parseAverage(row[proteinColumn])
    const fat = parseAverage(row[fatColumn])
    const carbs = parseAverage(row[carbsColumn])
    const calories = parseEnergyKcal(row[energyColumn])
    if ([protein, fat, carbs, calories].some((value) => value === null)) continue

    const headerServing = weightColumn >= 0 ? parseAverage(header[weightColumn].replace(/^(Вес \(г\)|Объем \(мл\))\s*/i, '')) : null
    const rowServing = weightColumn >= 0 ? parseAverage(row[weightColumn]) : null
    const servingGrams = rowServing ?? headerServing
    if (!servingGrams || servingGrams <= 0) continue
    const factor = basis === '100' ? 1 : basis === '10 ml' ? 10 : 100 / servingGrams
    const portion = portionColumn >= 0 ? clean(row[portionColumn]) : ''
    if (portionColumn >= 0 && !portion) continue
    const name = portion ? `${baseName} — ${portion.toLowerCase()}` : baseName
    const sourceId = `vkusno-p${table.page}-t${table.table_index}-r${rowIndex}`
    products.push({
      id: `vkusno-${createHash('sha256').update(sourceId).digest('hex').slice(0, 20)}`,
      source: 'local',
      sourceId,
      name,
      nameRu: name,
      category: 'Fast Foods',
      brand: 'Вкусно — и точка',
      servingGrams,
      nutrients: {
        calories: round(calories * factor),
        protein: round(protein * factor),
        fat: round(fat * factor),
        carbs: round(carbs * factor),
      },
      note: `Официальные данные · порция ${servingGrams} ${isVolume ? 'мл' : 'г'}`,
      raw: {
        emoji: emojiFor(baseName),
        composition,
        allergens,
        page: table.page,
        portion: portion || null,
        nutritionBasis: basis,
        defaultGrams: servingGrams,
        sourceName: clean(header[0]),
        official: true,
      },
    })
  }
  return products
}

export function prepareProducts(tables) {
  const unique = new Map()
  for (const table of tables) {
    for (const product of tableToProducts(table)) {
      const key = product.name.toLowerCase().replace(/[«»"']/g, '').replace(/\s+/g, ' ')
      if (!unique.has(key)) unique.set(key, product)
    }
  }
  return [...unique.values()]
}

async function main() {
  const root = new URL('../', import.meta.url)
  const input = JSON.parse(await readFile(new URL('artifacts/vkusno-import/tables.json', root), 'utf8'))
  const products = prepareProducts(input.data.tables)
  await writeFile(new URL('server/vkusno-data.json', root), `${JSON.stringify(products, null, 2)}\n`)
  console.log(`Подготовлено ${products.length} уникальных позиций из ${input.data.tables.length} таблиц`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main()
