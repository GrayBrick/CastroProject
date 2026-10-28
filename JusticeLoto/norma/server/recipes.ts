import { randomUUID } from 'node:crypto'
import type { Recipe, RecipeDraft } from '../src/types'
import { pool } from './db'

function validText(value: unknown, max: number) { return String(value ?? '').trim().slice(0, max) }

export function parseRecipeDraft(payload: unknown): RecipeDraft {
  const value = payload as Partial<RecipeDraft>
  const name = validText(value?.name, 180)
  if (!name) throw new Error('У рецепта должно быть название')
  const ingredients = (Array.isArray(value?.ingredients) ? value.ingredients : []).slice(0, 30).map((item) => ({
    product: item?.product,
    grams: Number(item?.grams),
  }))
  if (!ingredients.length || ingredients.some((item) => !item.product?.id || !Number.isFinite(item.grams) || item.grams <= 0 || item.grams > 5000)) {
    throw new Error('Добавьте ингредиенты и укажите массу от 0 до 5000 г')
  }
  const unique = new Set(ingredients.map((item) => item.product.id))
  if (unique.size !== ingredients.length) throw new Error('Один продукт нельзя добавить дважды')
  return {
    name,
    description: validText(value.description, 2000),
    instructions: validText(value.instructions, 10000),
    emoji: validText(value.emoji, 16) || '🍲',
    ingredients: ingredients.map((item) => ({ product: { id: String(item.product.id) }, grams: Math.round(item.grams * 10) / 10 })) as RecipeDraft['ingredients'],
  }
}

export async function listRecipes(userId: number): Promise<Recipe[]> {
  const result = await pool.query(`SELECT r.*,coalesce((
    SELECT json_agg(json_build_object('grams',i.grams::float8,'product',json_build_object(
      'id',p.id,'name',coalesce(p.name_ru,p.name),'category',p.category,'note',coalesce(p.note,''),
      'emoji',coalesce(p.raw->>'emoji','🍽️'),'source',p.source,'barcode',p.barcode,
      'imageUrl',p.image_url,'servingGrams',p.serving_grams::float8,
      'nutrients',coalesce((SELECT json_object_agg(n.nutrient_key,n.amount) FROM product_nutrients n WHERE n.product_id=p.id),'{}')
    )) ORDER BY i.position) FROM recipe_ingredients i JOIN products p ON p.id=i.product_id WHERE i.recipe_id=r.id
  ),'[]') ingredients FROM recipes r WHERE r.user_id=$1 ORDER BY r.updated_at DESC`, [userId])
  return result.rows.map((row) => ({
    id: String(row.id), name: String(row.name), description: String(row.description), instructions: String(row.instructions),
    emoji: String(row.emoji), favorite: Boolean(row.favorite), ingredients: row.ingredients,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }))
}

export async function saveRecipe(userId: number, payload: unknown, recipeId?: string) {
  const draft = parseRecipeDraft(payload)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const productIds = draft.ingredients.map((item) => item.product.id)
    const existing = await client.query('SELECT id FROM products WHERE id=ANY($1::text[])', [productIds])
    if (existing.rowCount !== new Set(productIds).size) throw new Error('Некоторые ингредиенты больше не доступны в каталоге')
    const id = recipeId ?? randomUUID()
    const favorite = Boolean((payload as { favorite?: unknown })?.favorite)
    const result = await client.query(`INSERT INTO recipes(id,user_id,name,description,instructions,emoji,favorite)
      VALUES($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,instructions=EXCLUDED.instructions,
      emoji=EXCLUDED.emoji,favorite=EXCLUDED.favorite,updated_at=now() WHERE recipes.user_id=$2
      RETURNING id`, [id, userId, draft.name, draft.description, draft.instructions, draft.emoji, favorite])
    if (!result.rowCount) throw new Error('Рецепт не найден')
    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id=$1', [id])
    for (let index = 0; index < draft.ingredients.length; index++) {
      const item = draft.ingredients[index]
      await client.query('INSERT INTO recipe_ingredients(recipe_id,product_id,grams,position) VALUES($1,$2,$3,$4)', [id, item.product.id, item.grams, index])
    }
    await client.query('COMMIT')
    return (await listRecipes(userId)).find((recipe) => recipe.id === id) ?? null
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}

export async function deleteRecipe(userId: number, recipeId: string) {
  const result = await pool.query('DELETE FROM recipes WHERE id=$1 AND user_id=$2', [recipeId, userId])
  return Boolean(result.rowCount)
}
