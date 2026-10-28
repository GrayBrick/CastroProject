import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseAverage, parseEnergyKcal, prepareProducts, tableToProducts } from './prepare-vkusno-import.mjs'

const input = JSON.parse(await readFile(new URL('../artifacts/vkusno-import/tables.json', import.meta.url), 'utf8'))
const tables = input.data.tables
const table = (page, index) => tables.find((item) => item.page === page && item.table_index === index)

test('Растровые и альтернативные значения усредняются', () => {
  assert.equal(parseAverage('5,9 – 7,0'), 6.45)
  assert.equal(parseAverage('15 или 25'), 20)
  assert.equal(parseAverage('-'), 0)
  assert.equal(parseEnergyKcal('356 / 1500'), 356)
  assert.equal(parseEnergyKcal('1183 - 1201 / 285 – 289'), 287)
  assert.equal(parseEnergyKcal('1570 / 380 или 480 / 550'), 430)
})

test('Чизбургер пересчитывается с официальной порции на 100 г', () => {
  const [product] = tableToProducts(table(1, 0))
  assert.equal(product.name, 'Чизбургер')
  assert.equal(product.servingGrams, 109)
  assert.equal(product.nutrients.calories, 266.97)
  assert.equal(product.nutrients.protein, 12.84)
  assert.equal(product.nutrients.fat, 10.09)
  assert.equal(product.nutrients.carbs, 30.28)
  assert.equal(product.category, 'Fast Foods')
  assert.equal(product.raw.official, true)
})

test('Каждый размер наггетсов становится отдельной позицией', () => {
  const products = tableToProducts(table(6, 0))
  assert.deepEqual(products.map((item) => item.name), ['Наггетсы — 4 шт', 'Наггетсы — 6 шт', 'Наггетсы — 9 шт', 'Наггетсы — 18 шт'])
  assert.deepEqual(products.map((item) => item.servingGrams), [72, 108, 162, 324])
  assert.equal(products[0].nutrients.calories, 248.61)
})

test('Значения на 100 г и на 10 мл нормализуются без искажения', () => {
  const [sauce] = tableToProducts(table(30, 6))
  assert.equal(sauce.nutrients.calories, 120)
  const [oil] = tableToProducts(table(33, 4))
  assert.equal(oil.nutrients.calories, 820)
  assert.equal(oil.nutrients.fat, 91.3)
})

test('Готовый набор не содержит служебных ингредиентов и повторов названий', () => {
  const products = prepareProducts(tables)
  assert.ok(products.length > 200)
  assert.ok(products.some((item) => item.name === 'Биг Хит'))
  assert.ok(products.some((item) => item.name === 'Чикен Премьер'))
  assert.ok(products.some((item) => item.name === 'Картофель Фри — большая'))
  assert.ok(!products.some((item) => item.name.startsWith('Аллергены')))
  assert.ok(!products.some((item) => item.name === 'Лепешка для сэндвичей'))
  assert.equal(new Set(products.map((item) => item.name.toLowerCase())).size, products.length)
})
