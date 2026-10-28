import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateBmr, defaultProfile } from '../src/nutrients'
import { recipeNutrients, recipeToProduct, scaledRecipeIngredients } from '../src/recipes'
import type { Product, Recipe } from '../src/types'
import { parseBodyMetrics } from './body-composition'
import { blockedProductReason } from './ai-products'

const ingredient = (id: string, calories: number, protein: number): Product => ({ id, name: id, category: 'Тест', emoji: '🍽️', note: '', nutrients: { calories, protein, calcium: 10 } })
const recipe: Recipe = {
  id: 'r1', name: 'Тестовый рецепт', description: '', instructions: '', emoji: '🍲', favorite: false,
  ingredients: [{ product: ingredient('a', 100, 10), grams: 200 }, { product: ingredient('b', 200, 20), grams: 100 }],
  createdAt: '', updatedAt: '',
}

test('Рецепт нормализует все нутриенты на 100 г', () => {
  const nutrients = recipeNutrients(recipe.ingredients)
  assert.equal(nutrients.calories, 133.3333)
  assert.equal(nutrients.protein, 13.3333)
  assert.equal(nutrients.calcium, 10)
  assert.equal(recipeToProduct(recipe).servingGrams, 300)
})

test('Масса ингредиентов масштабируется пропорционально порции', () => {
  assert.deepEqual(scaledRecipeIngredients(recipe, 450).map((item) => item.grams), [300, 150])
  assert.deepEqual(scaledRecipeIngredients(recipe, 0).map((item) => item.grams), [0, 0])
})

test('Кэтч–МакАрдл используется только при достоверной безжировой массе', () => {
  const result = calculateBmr({ ...defaultProfile, weight: 70.7, leanBodyMassKg: 63.3 })
  assert.equal(result.formula, 'Кэтч–МакАрдл')
  assert.ok(Math.abs(result.value - 1737.28) < 0.001)
  assert.equal(calculateBmr({ ...defaultProfile, leanBodyMassKg: 500 }).formula, 'Миффлин–Сан Жеор')
})

test('Импорт InBody отбрасывает неправдоподобные и неизвестные значения', () => {
  const result = parseBodyMetrics({ weight: 70.7, bodyFatPercent: 10.4, skeletalMuscleKg: 36.2, bodyWaterPercent: 'нет', visceralFatLevel: 2 })
  assert.equal(result.leanBodyMassKg, 63.35)
  assert.equal(result.skeletalMuscleKg, 36.2)
  assert.equal(result.visceralFatLevel, 2)
  assert.equal(result.bodyWaterPercent, undefined)
})

test('Вода в литрах пересчитывается в процент по явно указанному весу', async () => {
  const { bodyWaterPercentFromText } = await import('./body-composition')
  assert.equal(bodyWaterPercentFromText('Вода \n46.5 л\n< 39.6', 70.7), 65.8)
  assert.equal(bodyWaterPercentFromText('Вода 46.5 л', undefined), undefined)
  assert.equal(bodyWaterPercentFromText('Процент воды не указан', 70.7), undefined)
})

test('Недопустимые названия не попадают в общий каталог', () => {
  assert.ok(blockedProductReason('пиздаболия со вкусом яблока'))
  assert.ok(blockedProductReason('мозги обезьяны'))
  assert.equal(blockedProductReason('Яблочный сок'), null)
})
