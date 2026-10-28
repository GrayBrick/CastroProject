import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateAiUsageCost, extractAiUsage, type AiUsage } from './ai-usage'

function usage(overrides: Partial<AiUsage> = {}): AiUsage {
  return {
    requestId: 'request-1', model: 'kimi-k3', promptTokens: 10_000, completionTokens: 500,
    totalTokens: 10_500, cachedTokens: 0, cacheWriteTokens: 0, cacheWrite1hTokens: 0, ...overrides,
  }
}

test('K3 cache write is charged instead of regular input, not in addition to it', () => {
  const cost = calculateAiUsageCost(usage({ cacheWriteTokens: 10_000 }))
  assert.ok(cost)
  assert.equal(cost.inputCostUsd, 0)
  assert.equal(cost.cacheCostUsd, 0.03)
  assert.equal(cost.outputCostUsd, 0.0075)
  assert.equal(cost.totalCostUsd, 0.0375)
})

test('K3 splits regular, cached, 5m and 1h input tokens', () => {
  const cost = calculateAiUsageCost(usage({
    promptTokens: 20_000, cachedTokens: 2_000, cacheWriteTokens: 3_000, cacheWrite1hTokens: 4_000,
  }))
  assert.ok(cost)
  assert.equal(cost.inputCostUsd, (11_000 * 3 + 2_000 * 0.30) / 1_000_000)
  assert.equal(cost.cacheCostUsd, (3_000 * 3 + 4_000 * 6) / 1_000_000)
})

test('K2.6 uses its text and cached-input rates', () => {
  const cost = calculateAiUsageCost(usage({ model: 'kimi-k2.6', promptTokens: 3_000, cachedTokens: 1_000 }))
  assert.ok(cost)
  assert.equal(cost.totalCostUsd, (2_000 * 0.95 + 1_000 * 0.16 + 500 * 4) / 1_000_000)
})

test('unknown models keep usage but have no estimated cost', () => {
  assert.equal(calculateAiUsageCost(usage({ model: 'another-model' })), null)
})

test('usage extraction reads cache headers without double counting', () => {
  const parsed = extractAiUsage({
    id: 'chatcmpl-1', model: 'kimi-k3',
    usage: { prompt_tokens: 1000, completion_tokens: 100, total_tokens: 1100, prompt_tokens_details: { cached_tokens: 100, cache_write_tokens: 700 } },
  }, new Headers({ 'Msh-Usage-Cache-Write-Tokens-5m': '500', 'Msh-Usage-Cache-Write-Tokens-1h': '200' }))
  assert.ok(parsed)
  assert.equal(parsed.cacheWriteTokens, 500)
  assert.equal(parsed.cacheWrite1hTokens, 200)
  assert.equal(parsed.cachedTokens, 100)
  assert.equal(parsed.totalTokens, 1100)
})
