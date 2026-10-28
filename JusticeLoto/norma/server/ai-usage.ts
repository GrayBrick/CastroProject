import { pool } from './db'

export type AiRequestKind = 'photo' | 'chat'

export type AiUsage = {
  requestId: string | null
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cachedTokens: number
  cacheWriteTokens: number
  cacheWrite1hTokens: number
}

export type AiUsageCost = {
  inputCostUsd: number
  outputCostUsd: number
  cacheCostUsd: number
  totalCostUsd: number
}

// USD per one million tokens. Unknown models retain token usage with a NULL cost.
const PRICING: Record<string, { input: number, output: number, cachedInput: number, write5m: number, write1h: number }> = {
  'kimi-k3': { input: 3, output: 15, cachedInput: 0.30, write5m: 3, write1h: 6 },
  'kimi-k2.6': { input: 0.95, output: 4, cachedInput: 0.16, write5m: 0, write1h: 0 },
}

function tokenCount(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0
}

export function extractAiUsage(body: unknown, headers: Headers): AiUsage | null {
  const data = body as {
    id?: unknown
    model?: unknown
    usage?: {
      prompt_tokens?: unknown
      completion_tokens?: unknown
      total_tokens?: unknown
      prompt_tokens_details?: { cached_tokens?: unknown, cache_write_tokens?: unknown }
    }
  }
  if (!data?.usage || typeof data.model !== 'string') return null
  const promptTokens = tokenCount(data.usage.prompt_tokens)
  const completionTokens = tokenCount(data.usage.completion_tokens)
  const totalWriteTokens = tokenCount(data.usage.prompt_tokens_details?.cache_write_tokens)
  const cacheWrite1hTokens = tokenCount(headers.get('Msh-Usage-Cache-Write-Tokens-1h'))
  const cacheWriteTokens = headers.has('Msh-Usage-Cache-Write-Tokens-5m')
    ? tokenCount(headers.get('Msh-Usage-Cache-Write-Tokens-5m'))
    : Math.max(0, totalWriteTokens - cacheWrite1hTokens)
  return {
    requestId: typeof data.id === 'string' ? data.id : null,
    model: data.model,
    promptTokens,
    completionTokens,
    totalTokens: tokenCount(data.usage.total_tokens) || promptTokens + completionTokens,
    cachedTokens: tokenCount(data.usage.prompt_tokens_details?.cached_tokens),
    cacheWriteTokens,
    cacheWrite1hTokens,
  }
}

export function calculateAiUsageCost(usage: AiUsage): AiUsageCost | null {
  const rates = PRICING[usage.model]
  if (!rates) return null
  const regularInputTokens = Math.max(0, usage.promptTokens - usage.cachedTokens - usage.cacheWriteTokens - usage.cacheWrite1hTokens)
  const inputCostUsd = (regularInputTokens * rates.input + usage.cachedTokens * rates.cachedInput) / 1_000_000
  const outputCostUsd = usage.completionTokens * rates.output / 1_000_000
  const cacheCostUsd = (usage.cacheWriteTokens * rates.write5m + usage.cacheWrite1hTokens * rates.write1h) / 1_000_000
  return { inputCostUsd, outputCostUsd, cacheCostUsd, totalCostUsd: inputCostUsd + outputCostUsd + cacheCostUsd }
}

export async function saveAiUsage(userId: number | undefined, kind: AiRequestKind, usage: AiUsage) {
  const cost = calculateAiUsageCost(usage)
  await pool.query(`INSERT INTO ai_usage(
    user_id,kind,provider_request_id,model,prompt_tokens,completion_tokens,total_tokens,cached_tokens,
    cache_write_tokens,cache_write_1h_tokens,input_cost_usd,output_cost_usd,cache_cost_usd,total_cost_usd
  ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [
    userId, kind, usage.requestId, usage.model, usage.promptTokens, usage.completionTokens, usage.totalTokens,
    usage.cachedTokens, usage.cacheWriteTokens, usage.cacheWrite1hTokens, cost?.inputCostUsd ?? null,
    cost?.outputCostUsd ?? null, cost?.cacheCostUsd ?? null, cost?.totalCostUsd ?? null,
  ])
}
