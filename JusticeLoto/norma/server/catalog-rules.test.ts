import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalProductCategory, hasEnglishProductText, isUnavailableOrInvalidProduct } from './catalog-rules'
import { resolveProductCategory } from './ai-products'
import { nutrientDefinitions, nutrientShortName, nutrientShortNames } from '../src/nutrients'

test('Catalog removes English text and unavailable brands', () => {
  assert.equal(hasEnglishProductText({ id: '1', name: 'Big Mac', nameRu: 'Биг Мак' }), true)
  assert.equal(hasEnglishProductText({ id: '2', name: 'Биг Хит', nameRu: 'Биг Хит', brand: 'Вкусно — и точка' }), false)
  assert.equal(isUnavailableOrInvalidProduct({ id: '3', name: 'Макдоналдс бургер' }), true)
  assert.equal(isUnavailableOrInvalidProduct({ id: '4', name: 'Чикен Премьер' }), false)
  assert.equal(isUnavailableOrInvalidProduct({ id: '5', name: 'Чек-пакет' }), true)
})

test('Catalog merges duplicate categories without moving eggs into meat', () => {
  assert.equal(canonicalProductCategory({ id: 'nuts', name: 'Миндаль', category: 'Перекус' }), 'Орехи и семена')
  assert.equal(canonicalProductCategory({ id: 'eggs', name: 'Яйца куриные', category: 'Белок' }), 'Молочные продукты и яйца')
  assert.equal(canonicalProductCategory({ id: 'milk', name: 'Молоко', category: 'Молочное' }), 'Молочные продукты и яйца')
  assert.equal(canonicalProductCategory({ id: 'burger', name: 'Биг Хит', category: 'Fast Foods' }), 'Fast Foods')
  assert.equal(canonicalProductCategory({ id: 'salmon', name: 'Лосось', category: 'Белок' }), 'Рыба и морепродукты')
})

test('AI category resolver reuses existing canonical categories', () => {
  const categories = [{ id: 'Fast Foods', name: 'Фастфуд' }, { id: 'Фрукты', name: 'Фрукты' }]
  assert.equal(resolveProductCategory('Фастфуд', categories), 'Fast Foods')
  assert.equal(resolveProductCategory('Fast Foods', categories), 'Fast Foods')
  assert.equal(resolveProductCategory('фрукты', categories), 'Фрукты')
  assert.equal(resolveProductCategory('Новая категория', categories), 'Новая категория')
})

test('Every nutrient has a compact icon label', () => {
  for (const definition of nutrientDefinitions) {
    assert.ok(nutrientShortNames[definition.key], `Missing short name: ${definition.key}`)
    assert.ok(nutrientShortName(definition.key).length <= 5, `Label is too long: ${definition.key}`)
  }
  assert.equal(nutrientShortName('calcium'), 'Ca')
  assert.equal(nutrientShortName('copper'), 'Cu')
  assert.equal(nutrientShortName('vitaminB12'), 'B12')
})
