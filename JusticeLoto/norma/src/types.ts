/** Канонические единицы: г / мг / мкг на 100 г продукта. */
export type Nutrients = Record<string, number>

export type Product = {
  id: string
  name: string
  category: string
  emoji: string
  nutrients: Nutrients
  note: string
  source?: 'local' | 'usda' | 'openfoodfacts' | 'ai' | 'custom' | 'recipe'
  barcode?: string
  imageUrl?: string
  servingGrams?: number
  recipeId?: string
}

export type RecipeIngredient = {
  product: Product
  grams: number
}

export type Recipe = {
  id: string
  name: string
  description: string
  instructions: string
  emoji: string
  favorite: boolean
  ingredients: RecipeIngredient[]
  createdAt: string
  updatedAt: string
}

export type RecipeDraft = {
  name: string
  description: string
  instructions: string
  emoji: string
  ingredients: RecipeIngredient[]
}

export type ChatRecipe = RecipeDraft & { suggestedGrams: number }

export type Meal = 'Завтрак' | 'Обед' | 'Ужин' | 'Перекус'

export type FoodEntry = {
  id: string
  productId: string
  productSnapshot?: Product
  grams: number
  meal: Meal
  time: string
  date: string
}

export type Task = {
  id: string
  title: string
  description: string
  date: string | null
  startTime: string | null
  endTime: string | null
  category: string
  done: boolean
  repeat: number[]
  createdAt: string
}

export type ChatFood = {
  product: Product
  suggestedGrams: number
}

export type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
  food?: ChatFood
  foods?: ChatFood[]
  recipes?: ChatRecipe[]
}

export type UserProfile = {
  birthYear: number
  weight: number
  height: number
  sex: 'male' | 'female'
  activity: 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete'
  goal: 'lose' | 'maintain' | 'gain'
  bodyFatPercent?: number
  skeletalMuscleKg?: number
  leanBodyMassKg?: number
  bodyWaterPercent?: number
  visceralFatLevel?: number
}

export type BodyMetrics = Pick<UserProfile, 'weight' | 'height' | 'bodyFatPercent' | 'skeletalMuscleKg' | 'leanBodyMassKg' | 'bodyWaterPercent' | 'visceralFatLevel'>
