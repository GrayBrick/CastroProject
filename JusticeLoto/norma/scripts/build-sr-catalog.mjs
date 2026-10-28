import { readFile, writeFile } from 'node:fs/promises'
import { mapUsdaNutrients } from '../server/products.ts'

const selected = {
  173033: ['Грейпфрут', 'Фрукты', '🍊'],
  169105: ['Мандарин', 'Фрукты', '🍊'],
  174924: ['Белый хлеб', 'Выпечка и хлеб', '🍞'],
  172688: ['Цельнозерновой хлеб', 'Выпечка и хлеб', '🍞'],
  174004: ['Говяжья вырезка запечённая', 'Мясо и птица', '🥩'],
  167887: ['Свиная отбивная жареная', 'Мясо и птица', '🥩'],
}
const archive = JSON.parse(await readFile('artifacts/usda-sr/FoodData_Central_sr_legacy_food_json_2018-04.json', 'utf8'))
const foods = archive.SRLegacyFoods ?? archive
const products = Object.entries(selected).map(([id, translation]) => {
  const food = foods.find((item) => item.fdcId === Number(id))
  if (!food) throw new Error(`В архиве SR Legacy нет карточки ${id}`)
  return {
    id: `usda-${id}`,
    source: 'usda',
    sourceId: id,
    name: translation[0],
    nameRu: translation[0],
    category: translation[1],
    note: 'USDA SR Legacy · лабораторный профиль на 100 г',
    nutrients: mapUsdaNutrients(food.foodNutrients),
    raw: { emoji: translation[2], official: true, verified: true, originalName: food.description },
  }
})
await writeFile('server/data/curated-sr-products.json', JSON.stringify(products, null, 2) + '\n')
console.log(`Подготовлено продуктов SR Legacy: ${products.length}`)
