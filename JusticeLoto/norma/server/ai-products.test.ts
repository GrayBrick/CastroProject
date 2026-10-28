import test from 'node:test'
import assert from 'node:assert/strict'
import { blockedProductReason, parseAiProductPayload, parseProductAdmission, validateProductCandidate } from './ai-products'
import { extractExplicitFood, parseAssistantFoods, preserveListedBrandNames } from './vision'

test('AI product keeps known nutrients, category and emoji', () => {
  const product = parseAiProductPayload({
    name: 'Помело', category: 'Фрукты', emoji: '🍊',
    nutrients: { calories: 38, protein: 0.8, fat: 0, carbs: 9.6, vitaminC: 61, unknownField: 999 },
  }, 'помело')
  assert.equal(product.name, 'Помело')
  assert.equal(product.category, 'Фрукты')
  assert.equal(product.emoji, '🍊')
  assert.equal(product.nutrients.vitaminC, 61)
  assert.equal(product.nutrients.unknownField, undefined)
  assert.match(product.id, /^ai-[a-f0-9]{20}$/)
})

test('AI product identifiers are stable and macros are bounded', () => {
  const payload = { name: 'Тест', category: 'Блюда', emoji: '🍽️', nutrients: { calories: 5000, protein: 120, fat: 130, carbs: 20 } }
  const first = parseAiProductPayload(payload, 'Тест')
  const second = parseAiProductPayload(payload, 'Тест')
  assert.equal(first.id, second.id)
  assert.equal(first.nutrients.calories, 1000)
  assert.equal(first.nutrients.protein, 100)
  assert.equal(first.nutrients.fat, 100)
})

test('AI product without complete macros is rejected', () => {
  assert.throws(() => parseAiProductPayload({ name: 'Неполный продукт', nutrients: { calories: 100 } }, 'Неполный продукт'), /macro profile/)
})

test('Explicit food wording overrides potentially incorrect model extraction', () => {
  assert.deepEqual(extractExplicitFood('Я сегодня ещё съел 120 г рамбутана'), { productName: 'рамбутана', estimatedGrams: 120 })
  assert.deepEqual(extractExplicitFood('Добавь гречку 150,5 г в дневник'), { productName: 'гречку', estimatedGrams: 150.5 })
  assert.deepEqual(extractExplicitFood('Я выпил кофе'), { productName: 'кофе', estimatedGrams: undefined })
})

test('Recipe discussions do not produce explicit food cards', () => {
  assert.equal(extractExplicitFood('Как приготовить гречку с овощами?'), null)
  assert.equal(extractExplicitFood('Добавь еду'), null)
})

test('Composite requests require decomposition while standardized products stay whole', () => {
  assert.equal(extractExplicitFood('Я съел бургер, картошку фри и колу'), null)
  assert.equal(extractExplicitFood('Добавь салат Цезарь 300 г'), null)
  assert.deepEqual(extractExplicitFood('Добавь Биг Хит'), { productName: 'Биг Хит', estimatedGrams: undefined })
})

test('Assistant response keeps separate foods and portion masses', () => {
  assert.deepEqual(parseAssistantFoods({ foods: [
    { productName: 'Биг Хит', estimatedGrams: 220 },
    { productName: 'Картошка фри', estimatedGrams: 120 },
    { productName: 'Кола', estimatedGrams: 400 },
  ] }), [
    { productName: 'Биг Хит', estimatedGrams: 220 },
    { productName: 'Картошка фри', estimatedGrams: 120 },
    { productName: 'Кола', estimatedGrams: 400 },
  ])
  assert.deepEqual(parseAssistantFoods({ food: { productName: 'Рамбутан', estimatedGrams: 120 } }), [{ productName: 'Рамбутан', estimatedGrams: 120 }])
  assert.deepEqual(parseAssistantFoods({ foods: [] }), [])
})

test('Exact brand names survive generic model substitutions in a food list', () => {
  const foods = preserveListedBrandNames([
    { productName: 'Биг Хит', estimatedGrams: 220 },
    { productName: 'Картошка фри', estimatedGrams: 120 },
    { productName: 'Куриная грудка в панировке', estimatedGrams: 220 },
  ], 'Я съел Биг Хит, картошку фри 120 г и Чикен Премьер')
  assert.deepEqual(foods.map((item) => item.productName), ['Биг Хит', 'Картошка фри', 'Чикен Премьер'])
  assert.deepEqual(foods.map((item) => item.estimatedGrams), [220, 120, 220])
})

test('Clearly unacceptable and non-food candidates are rejected before AI generation', () => {
  assert.ok(blockedProductReason('мозги обезьяны'))
  assert.ok(blockedProductReason('Обезьяньи мозги'))
  assert.ok(blockedProductReason('человеческое мясо'))
  assert.ok(blockedProductReason('стекло'))
  assert.equal(blockedProductReason('Рамбутан'), null)
  assert.equal(blockedProductReason('Помело'), null)
})

test('Admission parser fails closed for malformed or uncertain answers', () => {
  assert.equal(parseProductAdmission({ allowed: true, reason: 'Реальный фрукт' }).allowed, true)
  assert.equal(parseProductAdmission({ allowed: false, reason: 'Выдуманный продукт' }).allowed, false)
  assert.equal(parseProductAdmission({ allowed: 'true' }).allowed, false)
  assert.equal(parseProductAdmission({}).allowed, false)
})

test('AI validation accepts identifiable food and rejects unverifiable names', async (t) => {
  const originalKey = process.env.MOONSHOT_API_KEY
  const originalFetch = globalThis.fetch
  let allowed = true
  process.env.MOONSHOT_API_KEY = 'test-key'
  globalThis.fetch = async () => new Response(JSON.stringify({
    id: 'validation-request', model: 'kimi-k2.6',
    usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
    choices: [{ message: { content: JSON.stringify({ allowed, reason: allowed ? 'Известный продукт' : 'Не удалось подтвердить' }) } }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  t.after(() => {
    if (originalKey === undefined) delete process.env.MOONSHOT_API_KEY
    else process.env.MOONSHOT_API_KEY = originalKey
    globalThis.fetch = originalFetch
  })

  const fruit = await validateProductCandidate('Рамбутан')
  assert.equal(fruit.allowed, true)
  assert.equal(fruit.usage?.totalTokens, 110)
  allowed = false
  const invented = await validateProductCandidate('Зубробулькс из облаков')
  assert.equal(invented.allowed, false)
  const nonFood = await validateProductCandidate('Пластик')
  assert.equal(nonFood.allowed, false)
})
