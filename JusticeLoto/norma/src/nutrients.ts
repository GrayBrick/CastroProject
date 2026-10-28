import type { Nutrients, UserProfile } from './types'

export type NutrientGroup = 'Основные' | 'Витамины' | 'Минералы' | 'Аминокислоты' | 'Жирные кислоты' | 'Прочие'
export type NutrientDefinition = {
  key: string
  name: string
  unit: 'г' | 'мг' | 'мкг' | 'ккал'
  group: NutrientGroup
  usdaNames?: string[]
}

const d = (key: string, name: string, unit: NutrientDefinition['unit'], group: NutrientGroup, usdaNames: string[] = []): NutrientDefinition => ({ key, name, unit, group, usdaNames })

/** 90 канонических полей. Значения хранятся на 100 г; мкг в API нормализуются в мг. */
export const nutrientDefinitions: NutrientDefinition[] = [
  d('calories', 'Энергия', 'ккал', 'Основные', ['Energy', 'Energy (Atwater General Factors)']),
  d('protein', 'Белки', 'г', 'Основные', ['Protein']), d('fat', 'Жиры', 'г', 'Основные', ['Total lipid (fat)']),
  d('carbs', 'Углеводы', 'г', 'Основные', ['Carbohydrate, by difference']), d('fiber', 'Клетчатка', 'г', 'Основные', ['Fiber, total dietary']),
  d('sugars', 'Сахара', 'г', 'Основные', ['Sugars, total including NLEA', 'Sugars, total']), d('addedSugars', 'Добавленный сахар', 'г', 'Основные', ['Sugars, added']),
  d('water', 'Вода', 'г', 'Основные', ['Water']),
  d('vitaminA', 'Витамин A (RAE)', 'мкг', 'Витамины', ['Vitamin A, RAE']), d('vitaminD', 'Витамин D', 'мкг', 'Витамины', ['Vitamin D (D2 + D3)']),
  d('vitaminD2', 'Витамин D2', 'мкг', 'Витамины', ['Vitamin D2 (ergocalciferol)']), d('vitaminD3', 'Витамин D3', 'мкг', 'Витамины', ['Vitamin D3 (cholecalciferol)']),
  d('vitaminE', 'Витамин E', 'мг', 'Витамины', ['Vitamin E (alpha-tocopherol)']), d('vitaminK', 'Витамин K', 'мкг', 'Витамины', ['Vitamin K (phylloquinone)']),
  d('vitaminC', 'Витамин C', 'мг', 'Витамины', ['Vitamin C, total ascorbic acid']), d('vitaminB1', 'Витамин B1', 'мг', 'Витамины', ['Thiamin']),
  d('vitaminB2', 'Витамин B2', 'мг', 'Витамины', ['Riboflavin']), d('vitaminB3', 'Витамин B3', 'мг', 'Витамины', ['Niacin']),
  d('vitaminB4', 'Холин', 'мг', 'Витамины', ['Choline, total']), d('vitaminB5', 'Витамин B5', 'мг', 'Витамины', ['Pantothenic acid']),
  d('vitaminB6', 'Витамин B6', 'мг', 'Витамины', ['Vitamin B-6']), d('vitaminB7', 'Биотин', 'мкг', 'Витамины', ['Biotin']),
  d('vitaminB9', 'Фолат (DFE)', 'мкг', 'Витамины', ['Folate, DFE', 'Folate, total']), d('vitaminB12', 'Витамин B12', 'мкг', 'Витамины', ['Vitamin B-12']),
  d('betaCarotene', 'Бета-каротин', 'мкг', 'Витамины', ['Carotene, beta']), d('alphaCarotene', 'Альфа-каротин', 'мкг', 'Витамины', ['Carotene, alpha']),
  d('lycopene', 'Ликопин', 'мкг', 'Витамины', ['Lycopene']), d('lutein', 'Лютеин и зеаксантин', 'мкг', 'Витамины', ['Lutein + zeaxanthin']),
  d('calcium', 'Кальций', 'мг', 'Минералы', ['Calcium, Ca']), d('iron', 'Железо', 'мг', 'Минералы', ['Iron, Fe']),
  d('magnesium', 'Магний', 'мг', 'Минералы', ['Magnesium, Mg']), d('phosphorus', 'Фосфор', 'мг', 'Минералы', ['Phosphorus, P']),
  d('potassium', 'Калий', 'мг', 'Минералы', ['Potassium, K']), d('sodium', 'Натрий', 'мг', 'Минералы', ['Sodium, Na']),
  d('zinc', 'Цинк', 'мг', 'Минералы', ['Zinc, Zn']), d('copper', 'Медь', 'мг', 'Минералы', ['Copper, Cu']),
  d('manganese', 'Марганец', 'мг', 'Минералы', ['Manganese, Mn']), d('selenium', 'Селен', 'мкг', 'Минералы', ['Selenium, Se']),
  d('fluoride', 'Фтор', 'мкг', 'Минералы', ['Fluoride, F']), d('iodine', 'Йод', 'мкг', 'Минералы', ['Iodine, I']), d('chromium', 'Хром', 'мкг', 'Минералы', ['Chromium, Cr']),
  d('histidine', 'Гистидин', 'г', 'Аминокислоты', ['Histidine']), d('isoleucine', 'Изолейцин', 'г', 'Аминокислоты', ['Isoleucine']),
  d('leucine', 'Лейцин', 'г', 'Аминокислоты', ['Leucine']), d('lysine', 'Лизин', 'г', 'Аминокислоты', ['Lysine']),
  d('methionine', 'Метионин', 'г', 'Аминокислоты', ['Methionine']), d('phenylalanine', 'Фенилаланин', 'г', 'Аминокислоты', ['Phenylalanine']),
  d('threonine', 'Треонин', 'г', 'Аминокислоты', ['Threonine']), d('tryptophan', 'Триптофан', 'г', 'Аминокислоты', ['Tryptophan']),
  d('valine', 'Валин', 'г', 'Аминокислоты', ['Valine']), d('arginine', 'Аргинин', 'г', 'Аминокислоты', ['Arginine']),
  d('alanine', 'Аланин', 'г', 'Аминокислоты', ['Alanine']), d('asparticAcid', 'Аспарагиновая кислота', 'г', 'Аминокислоты', ['Aspartic acid']),
  d('glutamicAcid', 'Глутаминовая кислота', 'г', 'Аминокислоты', ['Glutamic acid']), d('glycine', 'Глицин', 'г', 'Аминокислоты', ['Glycine']),
  d('proline', 'Пролин', 'г', 'Аминокислоты', ['Proline']), d('serine', 'Серин', 'г', 'Аминокислоты', ['Serine']),
  d('tyrosine', 'Тирозин', 'г', 'Аминокислоты', ['Tyrosine']), d('cysteine', 'Цистеин', 'г', 'Аминокислоты', ['Cystine', 'Cysteine']),
  d('saturatedFat', 'Насыщенные жиры', 'г', 'Жирные кислоты', ['Fatty acids, total saturated']),
  d('monounsaturatedFat', 'Мононенасыщенные жиры', 'г', 'Жирные кислоты', ['Fatty acids, total monounsaturated']),
  d('polyunsaturatedFat', 'Полиненасыщенные жиры', 'г', 'Жирные кислоты', ['Fatty acids, total polyunsaturated']),
  d('transFat', 'Трансжиры', 'г', 'Жирные кислоты', ['Fatty acids, total trans']), d('cholesterol', 'Холестерин', 'мг', 'Жирные кислоты', ['Cholesterol']),
  d('omega3', 'Омега-3', 'г', 'Жирные кислоты'), d('omega6', 'Омега-6', 'г', 'Жирные кислоты'),
  d('ala', 'Альфа-линоленовая (ALA)', 'г', 'Жирные кислоты', ['18:3 n-3 c,c,c (ALA)']), d('epa', 'Эйкозапентаеновая (EPA)', 'г', 'Жирные кислоты', ['20:5 n-3 (EPA)']),
  d('dha', 'Докозагексаеновая (DHA)', 'г', 'Жирные кислоты', ['22:6 n-3 (DHA)']), d('linoleicAcid', 'Линолевая', 'г', 'Жирные кислоты', ['18:2 n-6 c,c']),
  d('arachidonicAcid', 'Арахидоновая', 'г', 'Жирные кислоты', ['20:4 undifferentiated']), d('oleicAcid', 'Олеиновая', 'г', 'Жирные кислоты', ['18:1 c', '18:1 undifferentiated']),
  d('palmiticAcid', 'Пальмитиновая', 'г', 'Жирные кислоты', ['16:0']), d('stearicAcid', 'Стеариновая', 'г', 'Жирные кислоты', ['18:0']),
  d('myristicAcid', 'Миристиновая', 'г', 'Жирные кислоты', ['14:0']), d('caprylicAcid', 'Каприловая', 'г', 'Жирные кислоты', ['8:0']),
  d('capricAcid', 'Каприновая', 'г', 'Жирные кислоты', ['10:0']), d('nervonicAcid', 'Нервоновая', 'г', 'Жирные кислоты', ['24:1 c']),
  d('behenicAcid', 'Бегеновая', 'г', 'Жирные кислоты', ['22:0']), d('arachidicAcid', 'Арахиновая', 'г', 'Жирные кислоты', ['20:0']),
  d('lignocericAcid', 'Лигноцериновая', 'г', 'Жирные кислоты', ['24:0']), d('palmitoleicAcid', 'Пальмитолеиновая', 'г', 'Жирные кислоты', ['16:1 c']),
  d('vaccenicAcid', 'Вакценовая', 'г', 'Жирные кислоты', ['18:1-11 t (18:1t n-7)']), d('gondoicAcid', 'Гондоиновая', 'г', 'Жирные кислоты', ['20:1']),
  d('erucicAcid', 'Эруковая', 'г', 'Жирные кислоты', ['22:1 c']), d('cla', 'Конъюгированная линолевая', 'г', 'Жирные кислоты', ['18:2 CLAs']),
  d('butyricAcid', 'Масляная', 'г', 'Жирные кислоты', ['4:0']), d('caproicAcid', 'Капроновая', 'г', 'Жирные кислоты', ['6:0']), d('lauricAcid', 'Лауриновая', 'г', 'Жирные кислоты', ['12:0']),
  d('caffeine', 'Кофеин', 'мг', 'Прочие', ['Caffeine']), d('theobromine', 'Теобромин', 'мг', 'Прочие', ['Theobromine']), d('alcohol', 'Этиловый спирт', 'г', 'Прочие', ['Alcohol, ethyl']),
]

export const nutrientMap = new Map(nutrientDefinitions.map((item) => [item.key, item]))

/** Короткие обозначения для компактных значков; полные названия остаются в подписях. */
export const nutrientShortNames: Record<string, string> = {
  calories: 'ккал', protein: 'Б', fat: 'Ж', carbs: 'У', fiber: 'Кл', sugars: 'Сах', addedSugars: 'ДС', water: 'H₂O',
  vitaminA: 'A', vitaminD: 'D', vitaminD2: 'D2', vitaminD3: 'D3', vitaminE: 'E', vitaminK: 'K', vitaminC: 'C',
  vitaminB1: 'B1', vitaminB2: 'B2', vitaminB3: 'B3', vitaminB4: 'B4', vitaminB5: 'B5', vitaminB6: 'B6',
  vitaminB7: 'B7', vitaminB9: 'B9', vitaminB12: 'B12', betaCarotene: 'β-кар', alphaCarotene: 'α-кар', lycopene: 'Лик', lutein: 'Л+З',
  calcium: 'Ca', iron: 'Fe', magnesium: 'Mg', phosphorus: 'P', potassium: 'K', sodium: 'Na', zinc: 'Zn', copper: 'Cu',
  manganese: 'Mn', selenium: 'Se', fluoride: 'F', iodine: 'I', chromium: 'Cr',
  histidine: 'His', isoleucine: 'Ile', leucine: 'Leu', lysine: 'Lys', methionine: 'Met', phenylalanine: 'Phe',
  threonine: 'Thr', tryptophan: 'Trp', valine: 'Val', arginine: 'Arg', alanine: 'Ala', asparticAcid: 'Asp',
  glutamicAcid: 'Glu', glycine: 'Gly', proline: 'Pro', serine: 'Ser', tyrosine: 'Tyr', cysteine: 'Cys',
  saturatedFat: 'НЖК', monounsaturatedFat: 'МНЖК', polyunsaturatedFat: 'ПНЖК', transFat: 'ТЖ', cholesterol: 'Хол',
  omega3: 'Ω3', omega6: 'Ω6', ala: 'ALA', epa: 'EPA', dha: 'DHA', linoleicAcid: '18:2', arachidonicAcid: '20:4',
  oleicAcid: '18:1', palmiticAcid: '16:0', stearicAcid: '18:0', myristicAcid: '14:0', caprylicAcid: '8:0',
  capricAcid: '10:0', nervonicAcid: '24:1', behenicAcid: '22:0', arachidicAcid: '20:0', lignocericAcid: '24:0',
  palmitoleicAcid: '16:1', vaccenicAcid: '18:1t', gondoicAcid: '20:1', erucicAcid: '22:1', cla: 'CLA',
  butyricAcid: '4:0', caproicAcid: '6:0', lauricAcid: '12:0', caffeine: 'Коф', theobromine: 'Тео', alcohol: 'EtOH',
}

export function nutrientShortName(key: string) {
  return nutrientShortNames[key] ?? nutrientMap.get(key)?.name.replace('Витамин ', '') ?? key
}

const benefits: Record<string, string> = {
  calories: 'Энергия для организма и активности', protein: 'Мышцы, ферменты и восстановление', fat: 'Гормоны, клетки и усвоение витаминов',
  carbs: 'Основной источник быстрой энергии', fiber: 'Пищеварение и чувство сытости', sugars: 'Общее количество сахаров',
  addedSugars: 'Сахар, добавленный при обработке', water: 'Водный баланс организма',
  vitaminA: 'Зрение, кожа и иммунитет', vitaminD: 'Кости и усвоение кальция', vitaminD2: 'Одна из форм витамина D',
  vitaminD3: 'Активная форма витамина D', vitaminE: 'Антиоксидантная защита клеток', vitaminK: 'Свертывание крови и кости',
  vitaminC: 'Иммунитет, кожа и антиоксиданты', vitaminB1: 'Энергетический обмен и нервы', vitaminB2: 'Энергия и здоровье кожи',
  vitaminB3: 'Обмен энергии и нервная система', vitaminB4: 'Мозг, печень и нервные импульсы', vitaminB5: 'Обмен питательных веществ',
  vitaminB6: 'Обмен белка и нервная система', vitaminB7: 'Кожа, волосы и обмен веществ', vitaminB9: 'Клетки и формирование крови',
  vitaminB12: 'Нервы и образование крови', calcium: 'Кости, зубы и сокращение мышц', iron: 'Перенос кислорода и энергия',
  magnesium: 'Мышцы, нервы и обмен энергии', phosphorus: 'Кости и энергетический обмен', potassium: 'Давление, нервы и мышцы',
  sodium: 'Водный баланс и нервные импульсы', zinc: 'Иммунитет и восстановление тканей', copper: 'Кровь и соединительная ткань',
  manganese: 'Ферменты и здоровье костей', selenium: 'Антиоксиданты и щитовидная железа', fluoride: 'Прочность зубной эмали',
  iodine: 'Гормоны щитовидной железы', chromium: 'Обмен глюкозы', saturatedFat: 'Желательно ограничивать избыток',
}

export function nutrientBenefit(key: string) {
  const definition = nutrientMap.get(key)
  return benefits[key] ?? (definition?.group === 'Аминокислоты' ? 'Составная часть белков организма' : definition?.group === 'Жирные кислоты' ? 'Компонент жиров и клеточных мембран' : 'Питательное вещество в составе рациона')
}

export const defaultProfile: UserProfile = {
  birthYear: 1996, weight: 70, height: 175, sex: 'male', activity: 'moderate', goal: 'maintain',
}

export function calculateBmr(profile: UserProfile) {
  const age = Math.max(18, new Date().getFullYear() - profile.birthYear)
  const lean = profile.leanBodyMassKg
  if (lean && lean > 0 && lean < profile.weight) return { value: 370 + 21.6 * lean, formula: 'Кэтч–МакАрдл' as const }
  return { value: 10 * profile.weight + 6.25 * profile.height - 5 * age + (profile.sex === 'male' ? 5 : -161), formula: 'Миффлин–Сан Жеор' as const }
}

export function calculateGoals(profile: UserProfile): Nutrients {
  const age = Math.max(18, new Date().getFullYear() - profile.birthYear)
  const { value: bmr } = calculateBmr(profile)
  const activity = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, athlete: 1.9 }[profile.activity]
  const goalFactor = profile.goal === 'lose' ? 0.85 : profile.goal === 'gain' ? 1.1 : 1
  const calories = Math.max(profile.sex === 'male' ? 1500 : 1200, Math.round(bmr * activity * goalFactor))
  const proteinPerKg = profile.goal === 'maintain' ? (profile.activity === 'sedentary' ? 1 : 1.4) : 1.6
  const protein = Math.round(profile.weight * proteinPerKg)
  const fat = Math.round(calories * 0.3 / 9)
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4))
  return {
    calories, protein, fat, carbs, fiber: 30,
    vitaminA: profile.sex === 'male' ? 900 : 700, vitaminD: 15, vitaminD2: 15, vitaminD3: 15, vitaminE: 15, vitaminK: profile.sex === 'male' ? 120 : 90,
    vitaminC: profile.sex === 'male' ? 90 : 75, vitaminB1: profile.sex === 'male' ? 1.2 : 1.1, vitaminB2: profile.sex === 'male' ? 1.3 : 1.1,
    vitaminB3: profile.sex === 'male' ? 16 : 14, vitaminB4: profile.sex === 'male' ? 550 : 425, vitaminB5: 5, vitaminB6: age > 50 ? 1.7 : 1.3,
    vitaminB7: 30, vitaminB9: 400, vitaminB12: 2.4,
    calcium: 1000, iron: profile.sex === 'male' || age > 50 ? 8 : 18, magnesium: profile.sex === 'male' ? 420 : 320,
    phosphorus: 700, potassium: profile.sex === 'male' ? 3500 : 2600, sodium: 1500, zinc: profile.sex === 'male' ? 11 : 8,
    copper: 0.9, manganese: profile.sex === 'male' ? 2.3 : 1.8, selenium: 55, fluoride: profile.sex === 'male' ? 4000 : 3000,
    iodine: 150, chromium: profile.sex === 'male' ? 35 : 25, saturatedFat: Math.round(calories * 0.1 / 9),
  }
}

export function formatNutrient(key: string, value: number, compact = false) {
  const definition = nutrientMap.get(key)
  if (!definition) return `${value}`
  const digits = value !== 0 && Math.abs(value) < 10 ? 1 : 0
  return `${value.toFixed(digits)}${compact ? '' : ' '}${definition.unit}`
}

export function topNutrients(productNutrients: Nutrients, goals: Nutrients, grams = 100) {
  return nutrientDefinitions
    .filter((definition) => !['Основные', 'Аминокислоты', 'Жирные кислоты', 'Прочие'].includes(definition.group))
    .map((definition) => ({ definition, value: (productNutrients[definition.key] ?? 0) * grams / 100, percent: goals[definition.key] ? (productNutrients[definition.key] ?? 0) * grams / 100 / goals[definition.key] * 100 : 0 }))
    .filter((item) => item.value > 0 && item.percent > 0)
    .sort((a, b) => b.percent - a.percent).slice(0, 3)
}
