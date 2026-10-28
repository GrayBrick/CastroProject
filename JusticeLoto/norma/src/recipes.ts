import type { Nutrients, Product, Recipe, RecipeDraft, RecipeIngredient } from './types'

export function recipeTotalGrams(recipe: Pick<RecipeDraft, 'ingredients'>) {
  return recipe.ingredients.reduce((sum, ingredient) => sum + Math.max(0, ingredient.grams), 0)
}

/** Aggregates every available nutrient, then normalizes the finished recipe to 100 g. */
export function recipeNutrients(ingredients: RecipeIngredient[]): Nutrients {
  const totalGrams = ingredients.reduce((sum, ingredient) => sum + ingredient.grams, 0)
  if (totalGrams <= 0) return {}
  const totals: Nutrients = {}
  for (const ingredient of ingredients) {
    for (const [key, per100] of Object.entries(ingredient.product.nutrients)) {
      if (Number.isFinite(per100)) totals[key] = (totals[key] ?? 0) + per100 * ingredient.grams / 100
    }
  }
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Math.round(value / totalGrams * 100 * 10_000) / 10_000]))
}

export function recipeToProduct(recipe: Recipe | (RecipeDraft & { id: string, favorite?: boolean })): Product {
  const totalGrams = recipeTotalGrams(recipe)
  return {
    id: `recipe-${recipe.id}`,
    recipeId: recipe.id,
    name: recipe.name,
    category: 'Мои рецепты',
    emoji: recipe.emoji || '🍲',
    note: recipe.description || `${recipe.ingredients.length} ингредиентов · рецепт на ${Math.round(totalGrams)} г`,
    source: 'recipe',
    servingGrams: totalGrams,
    nutrients: recipeNutrients(recipe.ingredients),
  }
}

export function scaledRecipeIngredients(recipe: Recipe | RecipeDraft, selectedGrams: number) {
  const totalGrams = recipeTotalGrams(recipe)
  if (totalGrams <= 0) return []
  return recipe.ingredients.map((ingredient) => ({
    ...ingredient,
    grams: Math.round(ingredient.grams * selectedGrams / totalGrams * 10) / 10,
  }))
}
