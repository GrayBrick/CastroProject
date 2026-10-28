import { PDFParse } from 'pdf-parse'
import type { BodyMetrics } from '../src/types'
import { extractAiUsage, type AiUsage } from './ai-usage'

export type BodyImportResult = { metrics: Partial<BodyMetrics>, usage: AiUsage | null }

export function bodyWaterPercentFromText(text: string, weight?: number) {
  if (!weight || weight <= 0) return undefined
  const match = text.match(/(?:Вода|Total Body Water)\s*[\r\n ]*(\d+(?:[.,]\d+)?)\s*(?:л|l)(?=\s|$|[.,;])/i)
  if (!match) return undefined
  const liters = Number(match[1].replace(',', '.'))
  const percent = liters / weight * 100
  return Number.isFinite(percent) && percent >= 20 && percent <= 85 ? Math.round(percent * 10) / 10 : undefined
}

export function parseBodyMetrics(payload: unknown): Partial<BodyMetrics> {
  const value = payload as Record<string, unknown>
  const limits: Record<keyof BodyMetrics, [number, number]> = {
    weight: [35, 300], height: [120, 230], bodyFatPercent: [2, 75], skeletalMuscleKg: [5, 100],
    leanBodyMassKg: [15, 250], bodyWaterPercent: [20, 85], visceralFatLevel: [1, 30],
  }
  const result: Partial<BodyMetrics> = {}
  for (const [key, [min, max]] of Object.entries(limits) as Array<[keyof BodyMetrics, [number, number]]>) {
    const raw = value[key]
    if (raw === undefined || raw === null || raw === '') continue
    const number = Number(raw)
    if (Number.isFinite(number) && number >= min && number <= max) result[key] = Math.round(number * 100) / 100
  }
  if (result.weight && result.bodyFatPercent && !result.leanBodyMassKg) {
    // This identity is explicit arithmetic, not an inferred body measurement.
    result.leanBodyMassKg = Math.round(result.weight * (1 - result.bodyFatPercent / 100) * 100) / 100
  }
  if (result.weight && result.leanBodyMassKg && (result.leanBodyMassKg >= result.weight || result.leanBodyMassKg < result.weight * 0.2)) delete result.leanBodyMassKg
  return result
}

async function extractWithAi(content: Array<Record<string, unknown>>, vision: boolean) {
  if (!process.env.MOONSHOT_API_KEY) return null
  const model = vision ? process.env.MOONSHOT_VISION_MODEL ?? 'kimi-k3' : process.env.MOONSHOT_TEXT_MODEL ?? 'kimi-k2.6'
  const generation = !vision && model.startsWith('kimi-k2')
    ? { thinking: { type: 'disabled' }, max_tokens: 1200 }
    : { reasoning_effort: 'low', max_completion_tokens: 1200 }
  const response = await fetch(`${process.env.MOONSHOT_BASE_URL ?? 'https://api.moonshot.ai/v1'}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MOONSHOT_API_KEY}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Извлеки из отчёта InBody или другого анализа состава тела только явно напечатанные показатели. Не вычисляй и не догадывайся. weight и skeletalMuscleKg/leanBodyMassKg — кг, height — см, bodyFatPercent/bodyWaterPercent — проценты, visceralFatLevel — уровень. Вода в литрах не подходит для bodyWaterPercent: пропусти её, если процент не указан. Если это не отчёт о составе тела, верни пустой объект. Строго JSON: {"weight":70.7,"height":179,"bodyFatPercent":10.4,"skeletalMuscleKg":36.2,"leanBodyMassKg":63.3,"bodyWaterPercent":65.8,"visceralFatLevel":2}. Неизвестные поля не включай.' }, ...content] }],
      response_format: { type: 'json_object' }, ...generation,
    }), signal: AbortSignal.timeout(45_000),
  })
  if (!response.ok) throw new Error(`Body import AI: ${response.status}`)
  const body = await response.json()
  return { metrics: parseBodyMetrics(JSON.parse(body.choices?.[0]?.message?.content ?? '{}')), usage: extractAiUsage(body, response.headers) }
}

export async function importBodyMetrics(buffer: Buffer, mime: string): Promise<BodyImportResult | null> {
  if (mime === 'application/pdf') {
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      const text = result.text.trim().slice(0, 40_000)
      if (!text) throw new Error('В PDF нет текстового слоя. Загрузите фото отчёта.')
      const imported = await extractWithAi([{ type: 'text', text }], false)
      if (imported && !imported.metrics.bodyWaterPercent) imported.metrics.bodyWaterPercent = bodyWaterPercentFromText(text, imported.metrics.weight)
      return imported
    } finally { await parser.destroy() }
  }
  return extractWithAi([{ type: 'image_url', image_url: { url: `data:${mime};base64,${buffer.toString('base64')}` } }], true)
}
