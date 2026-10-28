import { useState } from 'react'
import { Check, LoaderCircle, Plus, Save } from 'lucide-react'
import { recipeToProduct } from '../recipes'
import type { ChatRecipe, Product, Recipe, RecipeDraft } from '../types'
import NumericInput from './NumericInput'

export default function ChatRecipeCard({ recipe, onSave, onAdd }: {
  recipe: ChatRecipe
  onSave: (draft: RecipeDraft) => Promise<Recipe>
  onAdd: (product: Product, grams: number) => void
}) {
  const [saved, setSaved] = useState<Recipe | null>(null)
  const [grams, setGrams] = useState(Math.round(recipe.suggestedGrams))
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')
  const product = recipeToProduct(saved ?? { ...recipe, id: 'draft' })
  const save = async () => {
    if (saved) return saved
    setLoading(true); setError('')
    try { const result = await onSave(recipe); setSaved(result); return result }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить рецепт'); throw reason }
    finally { setLoading(false) }
  }
  const add = async () => {
    if (grams <= 0 || added) return
    try { const stored = await save(); onAdd(recipeToProduct(stored), grams); setAdded(true) } catch { /* Error is shown inside the card. */ }
  }
  return <article className="chat-recipe-card"><div className="chat-recipe-heading"><span>{recipe.emoji}</span><div><strong>{recipe.name}</strong><small>{recipe.ingredients.length} ингредиентов · {Math.round((product.nutrients.calories ?? 0) * grams / 100)} ккал в порции</small></div></div>
    {recipe.description && <p>{recipe.description}</p>}
    <div className="chat-recipe-ingredients">{recipe.ingredients.map((item) => <span key={item.product.id}>{item.product.name} · {Math.round(item.grams)} г</span>)}</div>
    <div className="chat-food-actions"><label><NumericInput ariaLabel={`Порция рецепта: ${recipe.name}`} max={5000} value={grams} onValue={setGrams} /><span>г</span></label><button onClick={() => void add()} disabled={loading || added || grams <= 0}>{added ? <Check size={16} /> : <Plus size={16} />}{added ? 'Добавлено' : 'В дневник'}</button></div>
    <button className="recipe-save-chat" onClick={() => { void save().catch(() => undefined) }} disabled={loading || !!saved}>{loading ? <LoaderCircle className="spin" size={15} /> : saved ? <Check size={15} /> : <Save size={15} />}{saved ? 'Рецепт сохранён' : 'Только сохранить рецепт'}</button>
    {error && <small className="form-error">{error}</small>}</article>
}
