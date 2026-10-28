import type { BodyMetrics, ChatFood, ChatMessage, ChatRecipe, FoodEntry, Nutrients, Product, Task, UserProfile } from '../types'

export type PhotoItem = {
  product: Product
  recognizedName: string
  confidence: number
  estimatedGrams: number
}

export type PhotoAnalysis = {
  kind: 'food' | 'body'
  items: PhotoItem[]
  unrecognized: string[]
  bodyMetrics?: Partial<BodyMetrics>
}

export type CoachContext = {
  date: string
  totals: Nutrients
  goals: Nutrients
  entries: FoodEntry[]
  tasks: Task[]
  profile: UserProfile
}

const MAX_PHOTO_EDGE = 1280
const JPEG_QUALITY = 0.82

/** Keeps recognition detail while avoiding multi-megabyte camera uploads. */
export async function prepareFoodPhoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Выберите изображение в формате JPEG, PNG или WebP.')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Не удалось открыть изображение. Выберите другое фото.')
  }

  try {
    const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is unavailable')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob) throw new Error('JPEG encoding failed')
    const name = file.name.replace(/\.[^.]+$/, '') || 'food'
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    throw new Error('Браузер не смог подготовить фото. Попробуйте другое изображение.')
  } finally {
    bitmap.close()
  }
}

async function responseError(response: Response, service: 'photo' | 'chat'): Promise<Error> {
  let serverMessage = ''
  try {
    const body = await response.json() as { error?: unknown }
    if (typeof body.error === 'string') serverMessage = body.error
  } catch {
    // A proxy or server can return a non-JSON error page.
  }
  if (response.status === 422 && serverMessage) return new Error(serverMessage)
  if (response.status === 400) return new Error(serverMessage || 'Сервер не принял запрос. Проверьте данные и повторите.')
  if (response.status === 401) return new Error('Сессия истекла. Войдите в профиль ещё раз.')
  if (response.status === 413) return new Error('Фото слишком большое. Выберите снимок меньшего размера.')
  if (response.status === 429) return new Error('Слишком много запросов. Подождите немного и повторите.')
  const message = service === 'photo' ? 'Распознавание фото временно недоступно.' : 'Помощник временно недоступен.'
  return new Error(`${message} Попробуйте ещё раз.`)
}

async function parseResponse<T>(response: Response): Promise<T> {
  try {
    return await response.json() as T
  } catch {
    throw new Error('Сервер вернул некорректный ответ. Попробуйте ещё раз.')
  }
}

/** The API key stays on the server; only a compressed image is uploaded. */
export async function analyzeFoodPhoto(image: File): Promise<PhotoAnalysis> {
  const prepared = await prepareFoodPhoto(image)
  const form = new FormData()
  form.append('image', prepared)
  let response: Response
  try {
    response = await fetch('/api/kimi/analyze-food', { method: 'POST', body: form })
  } catch {
    throw new Error('Нет связи с сервером. Проверьте интернет и повторите попытку.')
  }
  if (!response.ok) throw await responseError(response, 'photo')
  const result = await parseResponse<PhotoAnalysis>(response)
  if (result.kind === 'body' && result.bodyMetrics && Object.keys(result.bodyMetrics).length) return { kind: 'body', bodyMetrics: result.bodyMetrics, items: [], unrecognized: [] }
  if (!Array.isArray(result.items) || !result.items.length || result.items.some((item) => !item.product?.id)) {
    throw new Error('Сервер не нашёл продукты в каталоге. Выберите их вручную.')
  }
  return { kind: 'food', items: result.items, unrecognized: Array.isArray(result.unrecognized) ? result.unrecognized : [] }
}

/** Sends only the current day's nutrition/workout context, never the API key. */
export async function askCoach(messages: ChatMessage[], context: CoachContext): Promise<{ text: string, food?: ChatFood, foods: ChatFood[], recipes: ChatRecipe[] }> {
  let response: Response
  try {
    response = await fetch('/api/kimi/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        context,
        language: 'ru',
        instruction: 'Учитывай съеденную еду, остаток нормы и тренировки. Не ставь диагнозы.',
      }),
    })
  } catch {
    throw new Error('Нет связи с сервером. Проверьте интернет и повторите попытку.')
  }
  if (!response.ok) throw await responseError(response, 'chat')
  const result = await parseResponse<{ text?: string, food?: ChatFood, foods?: ChatFood[], recipes?: ChatRecipe[] }>(response)
  if (!result.text?.trim()) throw new Error('Помощник вернул пустой ответ. Попробуйте ещё раз.')
  const legacyFood = result.food?.product?.id ? [result.food] : []
  const foods = (Array.isArray(result.foods) ? result.foods : legacyFood).filter((item) => item?.product?.id).slice(0, 12)
  const recipes = (Array.isArray(result.recipes) ? result.recipes : []).filter((item) => item?.ingredients?.length).slice(0, 3)
  return { text: result.text, food: foods[0], foods, recipes }
}
