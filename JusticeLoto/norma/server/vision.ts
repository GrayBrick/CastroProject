import { findOrCreateProduct } from './ai-products'
import { extractAiUsage } from './ai-usage'
import { normalizeSearchText } from './localization'
import { parseBodyMetrics } from './body-composition'

/** A single explicit food and its grams take priority over model extraction. */
export function extractExplicitFood(text: string) {
  const match = text.match(/(?:^|[^\p{L}])(?:съел(?:а)?|выпил(?:а)?|добавь(?:те)?)\s+([^.!?;\n]+)/iu)
  if (!match) return null
  const clause = match[1]
  const gramsMatch = clause.match(/(\d+(?:[.,]\d+)?)\s*(?:г|гр|грамм(?:а|ов)?)(?![\p{L}])/iu)
  const productName = clause
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:г|гр|грамм(?:а|ов)?)(?![\p{L}])/giu, ' ')
    .replace(/^(?:(?:ещ[её]|сегодня|мне|еду|продукт)\s+)+/iu, '')
    .replace(/\s+(?:в\s+(?:дневник|рацион)|пожалуйста)\s*$/giu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
  if (!productName || /^(?:еду|продукт|пищу)$/iu.test(productName)) return null
  // Composite requests must be decomposed by the model, never collapsed into one card.
  if (/,|\s+(?:и|с)\s+|салат|комбо|пицц|омлет|яичниц/iu.test(productName)) return null
  return { productName, estimatedGrams: gramsMatch ? Number(gramsMatch[1].replace(',', '.')) : undefined }
}

export function parseAssistantFoods(payload: unknown) {
  const value = payload as { foods?: unknown, food?: unknown }
  const rawFoods = Array.isArray(value?.foods) ? value.foods : value?.food ? [value.food] : []
  return rawFoods.slice(0, 12).map((item) => {
    const food = item as { productName?: unknown, estimatedGrams?: unknown }
    return {
      productName: String(food?.productName ?? '').trim().slice(0, 180),
      estimatedGrams: Math.max(10, Math.min(2000, Number(food?.estimatedGrams) || 100)),
    }
  }).filter((item) => item.productName)
}

export function isExactBrandName(name: string) {
  return /^(?!Салат\s|Суп\s|Пицца\s|Комбо\s)[\p{Lu}][\p{Ll}'’-]+(?:\s+[\p{Lu}][\p{Ll}'’-]+)+$/u.test(name)
}

/** Restores exact multi-word brand names in a one-to-one food list. */
export function preserveListedBrandNames(foods: ReturnType<typeof parseAssistantFoods>, text: string) {
  const match = text.match(/(?:^|[^\p{L}])(?:съел(?:а)?|выпил(?:а)?|добавь(?:те)?)\s+([^.!?;\n]+)/iu)
  if (!match) return foods
  const names = match[1].replace(/\s+и\s+/giu, ',').split(',').map((part) => part
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:г|гр|грамм(?:а|ов)?)(?![\p{L}])/giu, ' ')
    .replace(/^(?:(?:ещ[её]|сегодня|мне|еду|продукт)\s+)+/iu, '')
    .replace(/\s+(?:в\s+(?:дневник|рацион)|пожалуйста)\s*$/giu, '')
    .replace(/\s+/g, ' ').trim())
  if (names.length !== foods.length) return foods
  return foods.map((food, index) => {
    const name = names[index]
    return isExactBrandName(name) ? { ...food, productName: name } : food
  })
}

/** Vision identifies either food or a body-composition report; catalogue estimates stay marked. */
export async function analyzeImage(buffer: Buffer, mime: string) {
  if (!process.env.MOONSHOT_API_KEY) return null
  const response = await fetch(`${process.env.MOONSHOT_BASE_URL ?? 'https://api.moonshot.ai/v1'}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MOONSHOT_API_KEY}` },
    body: JSON.stringify({
      model: process.env.MOONSHOT_VISION_MODEL ?? 'kimi-k3',
      messages: [{ role: 'user', content: [
        { type: 'text', text: 'Сначала определи тип изображения. Если это отчёт InBody/анализ состава тела, верни kind="body" и только явно напечатанные показатели bodyMetrics: weight/height/skeletalMuscleKg/leanBodyMassKg в кг или см, bodyFatPercent/bodyWaterPercent в процентах, visceralFatLevel. Воду в литрах без процента не включай. Ничего не догадывай. Если это еда, верни kind="food" и ВСЕ отдельные продукты, блюда и напитки в items с русскими name, estimatedGrams и confidence. Яичницу, брокколи и кофе возвращай отдельно, без повторов и без выдумывания КБЖУ. Строго JSON: {"kind":"food","items":[{"name":"Яичница","estimatedGrams":120,"confidence":0.9}]} или {"kind":"body","bodyMetrics":{"weight":70.7,"bodyFatPercent":10.4}}.' },
        { type: 'image_url', image_url: { url: `data:${mime};base64,${buffer.toString('base64')}` } },
      ] }], response_format: { type: 'json_object' }, reasoning_effort: 'low', max_completion_tokens: 1800,
    }), signal: AbortSignal.timeout(45_000),
  })
  if (!response.ok) throw new Error(`Vision API: ${response.status}`)
  const body = await response.json()
  const usage = extractAiUsage(body, response.headers)
  const result = JSON.parse(body.choices?.[0]?.message?.content ?? '{}')
  if (result.kind === 'body') return { result: { kind: 'body', bodyMetrics: parseBodyMetrics(result.bodyMetrics), items: [], unrecognized: [] }, usage, enrichmentUsages: [] }
  const rawItems: Array<{ name?: unknown, confidence?: unknown, estimatedGrams?: unknown }> = Array.isArray(result.items) ? result.items : result.name ? [result] : []
  const detected = rawItems.slice(0, 12).map((item) => ({
    recognizedName: String(item?.name ?? '').trim(), confidence: Math.max(0, Math.min(1, Number(item?.confidence) || 0)),
    estimatedGrams: Math.max(10, Math.min(2000, Number(item?.estimatedGrams) || 150)),
  })).filter((item) => item.recognizedName)
  const analyzed = await Promise.all(detected.map(async (item) => {
    const lookup = item.confidence >= 0.45 ? await findOrCreateProduct(item.recognizedName) : { product: null, usage: null }
    return { ...item, ...lookup }
  }))
  return {
    result: { kind: 'food',
      items: analyzed.filter((item) => item.product !== null).map((item) => ({ recognizedName: item.recognizedName, confidence: item.confidence, estimatedGrams: item.estimatedGrams, product: item.product })),
      unrecognized: analyzed.filter((item) => item.product === null).map((item) => item.recognizedName),
    }, usage, enrichmentUsages: analyzed.map((item) => item.usage).filter((item) => item !== null),
  }
}

export async function askAssistant(messages: Array<{ role: string, text: string }>, context: unknown) {
  if (!process.env.MOONSHOT_API_KEY) return null
  const model = process.env.MOONSHOT_TEXT_MODEL ?? 'kimi-k2.6'
  const generation = model.startsWith('kimi-k2')
    ? { thinking: { type: 'disabled' }, max_tokens: 4000 }
    : { reasoning_effort: 'low', max_completion_tokens: 4000 }
  const response = await fetch(`${process.env.MOONSHOT_BASE_URL ?? 'https://api.moonshot.ai/v1'}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MOONSHOT_API_KEY}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: `Ты помощник по питанию. Отвечай кратко на русском, используй данные контекста и показатели тела, не ставь диагнозы. Если пользователь ЯВНО просит добавить съеденное, верни foods — массив отдельных позиций с массами. Не объединяй комбо или нестандартное блюдо в одну позицию. Конкретный фирменный или упакованный продукт оставляй целым и копируй название ТОЧНО: Биг Хит, Чикен Премьер, картошка фри и батончик не раскладываются. Домашнее или ресторанное нестандартное блюдо в foods раскладывай на ингредиенты, не создавая общую позицию. Если пользователь сообщает «я приготовил/сделал блюдо из…» или просит СОХРАНИТЬ свой рецепт, вместо foods верни recipes с названием, описанием, способом приготовления, эмодзи, итоговой массой и отдельными ингредиентами с граммами. Не создавай recipe при простой просьбе посоветовать рецепт. При обсуждении тренировок foods и recipes пустые. Не утверждай, что что-то уже добавлено: приложение покажет карточки подтверждения. Строго JSON: {"reply":"Markdown-ответ","foods":[{"productName":"название","estimatedGrams":100}],"recipes":[{"name":"...","description":"...","instructions":"...","emoji":"🍲","suggestedGrams":400,"ingredients":[{"productName":"...","grams":100}]}]}. Контекст: ${JSON.stringify(context)}` },
        ...messages.slice(-12).map((message) => ({ role: message.role, content: message.text })),
      ],
      response_format: { type: 'json_object' }, ...generation,
    }), signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) throw new Error(`Assistant API: ${response.status}`)
  const body = await response.json()
  const result = JSON.parse(body.choices?.[0]?.message?.content ?? '{}')
  const lastUserText = [...messages].reverse().find((message) => message.role === 'user')?.text ?? ''
  const modelFoods = preserveListedBrandNames(parseAssistantFoods(result), lastUserText)
  const explicit = modelFoods.length <= 1 ? extractExplicitFood(lastUserText) : null
  const requestedFoods = explicit
    ? [{ productName: explicit.productName, estimatedGrams: explicit.estimatedGrams ?? modelFoods[0]?.estimatedGrams ?? 100 }]
    : modelFoods
  const candidates = requestedFoods.map((item) => ({ ...item, preserveName: isExactBrandName(item.productName) }))
  const lookups = await Promise.all(candidates.map(async (item) => ({ ...item, ...await findOrCreateProduct(item.productName, { preserveName: item.preserveName }) })))
  const foods = lookups.flatMap((item) => item.product ? [{ product: item.product, suggestedGrams: item.product.servingGrams ?? item.estimatedGrams }] : [])
  const missing = lookups.filter((item) => item.product === null).map((item) => item.productName)
  const rawRecipes = (Array.isArray(result.recipes) ? result.recipes : []).slice(0, 3)
  const recipeLookups = await Promise.all(rawRecipes.map(async (raw: Record<string, unknown>) => {
    const rawIngredients = (Array.isArray(raw.ingredients) ? raw.ingredients : []).slice(0, 30)
    const ingredients = await Promise.all(rawIngredients.map(async (item: Record<string, unknown>) => {
      const productName = String(item?.productName ?? '').trim().slice(0, 180)
      const grams = Number(item?.grams)
      if (!productName || !Number.isFinite(grams) || grams <= 0) return null
      const lookup = await findOrCreateProduct(productName)
      return lookup.product ? { product: lookup.product, grams: Math.min(5000, grams), usage: lookup.usage } : null
    }))
    const valid = ingredients.filter((item) => item !== null)
    if (!valid.length || valid.length !== rawIngredients.length) return { recipe: null, usages: ingredients.flatMap((item) => item?.usage ? [item.usage] : []) }
    return { recipe: {
      name: String(raw.name ?? 'Мой рецепт').trim().slice(0, 180) || 'Мой рецепт', description: String(raw.description ?? '').trim().slice(0, 2000),
      instructions: String(raw.instructions ?? '').trim().slice(0, 10000), emoji: String(raw.emoji ?? '🍲').trim().slice(0, 16) || '🍲',
      ingredients: valid.map(({ product, grams }) => ({ product, grams })),
      suggestedGrams: Math.max(10, Math.min(5000, Number(raw.suggestedGrams) || valid.reduce((sum, item) => sum + item.grams, 0))),
    }, usages: valid.flatMap((item) => item.usage ? [item.usage] : []) }
  }))
  const recipes = recipeLookups.flatMap((item) => item.recipe ? [item.recipe] : [])
  const modelReply = String(result.reply ?? '').trim()
  const modelName = modelFoods[0]?.productName ?? ''
  let reply = recipes.length ? 'Подготовил рецепт. Проверь ингредиенты — его можно сохранить и добавить в дневник.' : foods.length > 1
    ? 'Разделил на отдельные продукты. Проверь массы и добавь нужные позиции в дневник.'
    : explicit && normalizeSearchText(modelName) !== normalizeSearchText(explicit.productName)
      ? `Подготовил карточку «${explicit.productName}». Проверь массу и добавь в дневник.` : modelReply
  if (missing.length) reply = `${foods.length ? 'Подготовил подходящие карточки.\n\n' : ''}Не удалось подготовить: ${missing.join(', ')}. Попробуй найти продукты в каталоге.`
  return {
    text: reply, food: foods[0], foods, recipes,
    usage: extractAiUsage(body, response.headers),
    enrichmentUsages: [...lookups.map((item) => item.usage), ...recipeLookups.flatMap((item) => item.usages)].filter((item) => item !== null),
  }
}
