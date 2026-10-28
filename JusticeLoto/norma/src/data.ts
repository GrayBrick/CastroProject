import type { FoodEntry, Nutrients, Product, Task } from './types'
import { formatNutrient } from './nutrients'

export const todayISO = () => new Date().toLocaleDateString('en-CA')

export const n = (calories: number, protein: number, fat: number, carbs: number, fiber: number, vitaminA: number, vitaminC: number, vitaminD: number, vitaminB12: number, calcium: number, iron: number, magnesium: number, potassium: number, zinc: number, extra: Nutrients = {}): Nutrients => ({
  calories, protein, fat, carbs, fiber,
  vitaminA: vitaminA * 1000, vitaminC, vitaminD: vitaminD * 1000, vitaminB12: vitaminB12 * 1000,
  calcium, iron, magnesium, potassium, zinc, ...extra,
})

export const products: Product[] = [
  { id: 'oat', name: 'Овсянка', category: 'Крупы', emoji: '🥣', note: 'Овсяные хлопья, сухие', source: 'local', nutrients: n(352, 12.3, 6.1, 59.5, 8, 0, 0, 0, 0, 52, 3.6, 116, 362, 2.6, { sugars: 1, phosphorus: 410, manganese: 3.6, vitaminB1: 0.46, vitaminB9: 32, saturatedFat: 1.1, polyunsaturatedFat: 2.3, leucine: 0.98, lysine: 0.7, valine: 0.82 }) },
  { id: 'yogurt', name: 'Греческий йогурт', category: 'Молочное', emoji: '🥛', note: 'Натуральный, 2% жирности', source: 'local', nutrients: n(73, 9.9, 2, 3.9, 0, 0.02, 0, 0.001, 0.00075, 110, 0.1, 11, 141, 0.5, { sugars: 3.5, phosphorus: 135, vitaminB2: 0.25, saturatedFat: 1.2, leucine: 1.02, lysine: 0.83 }) },
  { id: 'chicken', name: 'Куриная грудка', category: 'Белок', emoji: '🍗', note: 'Филе без кожи, запечённое', source: 'local', nutrients: n(165, 31, 3.6, 0, 0, 0.009, 0, 0.0001, 0.0003, 15, 1, 29, 256, 1, { phosphorus: 220, selenium: 27.6, vitaminB3: 14.8, vitaminB6: 0.9, cholesterol: 85, saturatedFat: 1, monounsaturatedFat: 1.2, polyunsaturatedFat: 0.8, histidine: 0.96, isoleucine: 1.64, leucine: 2.33, lysine: 2.63, methionine: 0.86, phenylalanine: 1.23, threonine: 1.31, tryptophan: 0.36, valine: 1.54, arginine: 1.87, alanine: 1.69, asparticAcid: 2.77, glutamicAcid: 4.65, glycine: 1.52, proline: 1.28, serine: 1.07, tyrosine: 1.05, cysteine: 0.4 }) },
  { id: 'buckwheat', name: 'Гречка отварная', category: 'Крупы', emoji: '🌾', note: 'Без масла и соли', source: 'local', nutrients: n(110, 4.2, 1.1, 21.3, 2.8, 0, 0, 0, 0, 7, 0.8, 51, 88, 0.6, { manganese: 0.4, phosphorus: 70, vitaminB3: 0.9 }) },
  { id: 'salmon', name: 'Лосось', category: 'Белок', emoji: '🐟', note: 'Запечённое филе', source: 'local', nutrients: n(208, 20, 13, 0, 0, 0.05, 0, 0.011, 0.0032, 12, 0.8, 29, 363, 0.6, { selenium: 36.5, phosphorus: 250, vitaminB3: 8, vitaminB6: 0.8, cholesterol: 55, saturatedFat: 3.1, monounsaturatedFat: 3.8, polyunsaturatedFat: 3.9, omega3: 2.2, epa: 0.69, dha: 1.1, leucine: 1.6, lysine: 1.8 }) },
  { id: 'eggs', name: 'Яйца', category: 'Белок', emoji: '🍳', note: 'Куриные, варёные', source: 'local', nutrients: n(155, 13, 11, 1.1, 0, 0.16, 0, 0.002, 0.0011, 50, 1.2, 10, 126, 1, { selenium: 30.8, phosphorus: 198, vitaminB2: 0.5, vitaminB4: 294, cholesterol: 373, saturatedFat: 3.3, leucine: 1.09, lysine: 0.91 }) },
  { id: 'banana', name: 'Банан', category: 'Фрукты', emoji: '🍌', note: 'Спелый, без кожуры', source: 'local', nutrients: n(89, 1.1, 0.3, 22.8, 2.6, 0.003, 8.7, 0, 0, 5, 0.3, 27, 358, 0.2, { sugars: 12.2, vitaminB6: 0.4, manganese: 0.3 }) },
  { id: 'apple', name: 'Яблоко', category: 'Фрукты', emoji: '🍎', note: 'Свежий, с кожурой', source: 'local', nutrients: n(52, 0.3, 0.2, 13.8, 2.4, 0.003, 4.6, 0, 0, 6, 0.1, 5, 107, 0, { sugars: 10.4 }) },
  { id: 'orange', name: 'Апельсин', category: 'Фрукты', emoji: '🍊', note: 'Свежий, без кожуры', source: 'local', nutrients: n(47, 0.9, 0.1, 11.8, 2.4, 0.011, 53.2, 0, 0, 40, 0.1, 10, 181, 0.1, { sugars: 9.4, vitaminB9: 30 }) },
  { id: 'cottage', name: 'Творог 5%', category: 'Молочное', emoji: '🧀', note: 'Классический, 5% жирности', source: 'local', nutrients: n(121, 17.2, 5, 1.8, 0, 0.04, 0, 0.0001, 0.001, 121, 0.4, 23, 112, 0.4, { phosphorus: 220, vitaminB2: 0.3, selenium: 15, saturatedFat: 3 }) },
  { id: 'beef', name: 'Говядина', category: 'Белок', emoji: '🥩', note: 'Постная, отварная', source: 'local', nutrients: n(187, 28, 7.8, 0, 0, 0, 0, 0.0003, 0.0026, 9, 2.6, 21, 318, 6.3, { vitaminB3: 5.5, phosphorus: 190, selenium: 25, saturatedFat: 3, cholesterol: 80, leucine: 2.2, lysine: 2.4 }) },
  { id: 'lentils', name: 'Чечевица', category: 'Крупы', emoji: '🫘', note: 'Отварная, без соли', source: 'local', nutrients: n(116, 9, 0.4, 20, 7.9, 0, 1.5, 0, 0, 19, 3.3, 36, 369, 1.3, { vitaminB9: 181, phosphorus: 180, manganese: 0.5, copper: 0.25 }) },
  { id: 'avocado', name: 'Авокадо', category: 'Овощи', emoji: '🥑', note: 'Спелый, без кожуры', source: 'local', nutrients: n(160, 2, 14.7, 8.5, 6.7, 0.007, 10, 0, 0, 12, 0.6, 29, 485, 0.6, { vitaminB9: 81, vitaminE: 2.1, vitaminK: 21, monounsaturatedFat: 9.8, oleicAcid: 8.8 }) },
  { id: 'broccoli', name: 'Брокколи', category: 'Овощи', emoji: '🥦', note: 'Отварная, без соли', source: 'local', nutrients: n(35, 2.4, 0.4, 7.2, 3.3, 0.077, 64.9, 0, 0, 40, 0.7, 21, 293, 0.5, { vitaminK: 108, vitaminB9: 108, phosphorus: 67 }) },
  { id: 'spinach', name: 'Шпинат', category: 'Овощи', emoji: '🥬', note: 'Свежие листья', source: 'local', nutrients: n(23, 2.9, 0.4, 3.6, 2.2, 0.469, 28.1, 0, 0, 99, 2.7, 79, 558, 0.5, { vitaminK: 483, vitaminB9: 194, manganese: 0.9, betaCarotene: 5626, lutein: 12198 }) },
  { id: 'nuts', name: 'Миндаль', category: 'Перекус', emoji: '🥜', note: 'Сырой, без соли', source: 'local', nutrients: n(579, 21.2, 49.9, 21.6, 12.5, 0, 0, 0, 0, 269, 3.7, 270, 733, 3.1, { vitaminE: 25.6, vitaminB2: 1.1, phosphorus: 481, copper: 1, manganese: 2.2, monounsaturatedFat: 31.5 }) },
  { id: 'rice', name: 'Бурый рис', category: 'Крупы', emoji: '🍚', note: 'Отварной, без соли', source: 'local', nutrients: n(123, 2.7, 1, 25.6, 1.6, 0, 0, 0, 0, 3, 0.6, 44, 86, 0.6, { manganese: 0.9, selenium: 10, phosphorus: 103 }) },
  { id: 'kefir', name: 'Кефир 1%', category: 'Молочное', emoji: '🥛', note: 'Натуральный, 1% жирности', source: 'local', nutrients: n(40, 3, 1, 4, 0, 0.02, 0.5, 0.0001, 0.0004, 120, 0.1, 12, 150, 0.4, { phosphorus: 95, vitaminB2: 0.17, saturatedFat: 0.6 }) },
]

export const initialEntries: FoodEntry[] = [
  { id: 'e1', productId: 'oat', grams: 80, meal: 'Завтрак', time: '08:20', date: todayISO() },
  { id: 'e2', productId: 'yogurt', grams: 170, meal: 'Завтрак', time: '08:25', date: todayISO() },
  { id: 'e3', productId: 'banana', grams: 120, meal: 'Перекус', time: '11:10', date: todayISO() },
  { id: 'e4', productId: 'chicken', grams: 140, meal: 'Обед', time: '13:40', date: todayISO() },
  { id: 'e5', productId: 'buckwheat', grams: 180, meal: 'Обед', time: '13:40', date: todayISO() },
  { id: 'e6', productId: 'broccoli', grams: 120, meal: 'Обед', time: '13:45', date: todayISO() },
]

export const initialTasks: Task[] = [
  { id: 't1', title: 'Тренировка · верх тела', description: 'Жим, тяга и упражнения на плечи', date: todayISO(), startTime: '18:30', endTime: '19:30', category: 'Тренировка', done: false, repeat: [1, 3, 5], createdAt: new Date().toISOString() },
  { id: 't2', title: 'Выпить 2 литра воды', description: '', date: todayISO(), startTime: null, endTime: null, category: 'Здоровье', done: false, repeat: [1, 2, 3, 4, 5, 6, 0], createdAt: new Date().toISOString() },
  { id: 't3', title: 'Прогулка после ужина', description: 'Спокойный темп, 30–40 минут', date: todayISO(), startTime: '21:00', endTime: '21:40', category: 'Личное', done: true, repeat: [], createdAt: new Date().toISOString() },
]

export function sumEntries(entries: FoodEntry[]): Nutrients {
  return entries.reduce((total, entry) => {
    const product = entry.productSnapshot ?? products.find((item) => item.id === entry.productId)
    if (!product) return total
    const factor = entry.grams / 100
    Object.entries(product.nutrients).forEach(([key, value]) => { total[key] = (total[key] ?? 0) + value * factor })
    return total
  }, {} as Nutrients)
}

export const formatValue = (key: string, value: number) => formatNutrient(key, value)

export const nutrientNames: Record<string, string> = {
  protein: 'белка', fat: 'жиров', carbs: 'углеводов', fiber: 'клетчатки', vitaminA: 'витамина A', vitaminC: 'витамина C', vitaminD: 'витамина D', vitaminB12: 'витамина B12', calcium: 'кальция', iron: 'железа', magnesium: 'магния', potassium: 'калия', zinc: 'цинка',
}
