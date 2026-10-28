export type CatalogRuleProduct = {
  id: string
  name: string
  nameRu?: string | null
  category?: string | null
  brand?: string | null
}

export function hasEnglishProductText(product: CatalogRuleProduct) {
  return [product.name, product.nameRu, product.brand].some((value) => typeof value === 'string' && /[A-Za-z]/.test(value))
}

export function isUnavailableOrInvalidProduct(product: CatalogRuleProduct) {
  const value = `${product.name} ${product.nameRu ?? ''} ${product.brand ?? ''}`.toLowerCase()
  if (/mcdonald|макдоналд|макдональд|\bkfc\b|кфс|starbucks|старбакс/i.test(value)) return true
  if (/чек[- ]?пакет|комбо/i.test(value)) return true
  return false
}

const categoryMap: Record<string, string> = {
  'Алкоголь': 'Алкогольные напитки',
  'Безалкогольные напитки': 'Напитки',
  'Горячие блюда': 'Готовые блюда',
  'Крупы': 'Крупы и каши',
  'Молочное': 'Молочные продукты и яйца',
  'Молочные продукты': 'Молочные продукты и яйца',
  'Мучные изделия': 'Готовые блюда',
  'Мясные изделия': 'Мясо и птица',
  'Мясо и субпродукты': 'Мясо и птица',
  'Овощные блюда': 'Готовые блюда',
  'Перекус': 'Орехи и семена',
  'Полуфабрикаты': 'Готовые блюда',
  'Ферментированные овощи': 'Овощи',
  'Яйца': 'Молочные продукты и яйца',
}

export function canonicalProductCategory(product: CatalogRuleProduct) {
  const name = (product.nameRu ?? product.name).toLowerCase()
  const category = product.category ?? 'Продукты'
  if (category === 'Fast Foods') return category
  if (/авокадо/.test(name)) return 'Фрукты'
  if (/яйц|яичн/.test(name)) return 'Молочные продукты и яйца'
  if (/лосось|сёмга|семга|тунец|рыба|кревет/.test(name)) return 'Рыба и морепродукты'
  if (category === 'Белок') return 'Мясо и птица'
  return categoryMap[category] ?? category
}
