import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { searchServerProducts } from '../lib/api'
import { recipeNutrients, recipeTotalGrams } from '../recipes'
import type { ChatRecipe, Product, Recipe, RecipeDraft, RecipeIngredient } from '../types'
import NumericInput from './NumericInput'

export default function RecipeEditor({ initial, onSave, onDelete }: {
  initial?: Recipe | ChatRecipe | null
  onSave: (draft: RecipeDraft & { id?: string, favorite?: boolean }) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [instructions, setInstructions] = useState(initial?.instructions ?? '')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🍲')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(initial?.ingredients ?? [])
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const id = initial && 'createdAt' in initial ? initial.id : undefined
  const favorite = initial && 'favorite' in initial ? initial.favorite : false
  const totalGrams = recipeTotalGrams({ ingredients })
  const nutrients = useMemo(() => recipeNutrients(ingredients), [ingredients])

  useEffect(() => {
    if (!query.trim()) { setFound([]); return }
    let active = true
    const timer = setTimeout(() => {
      setSearching(true)
      void searchServerProducts(query).then((result) => { if (active) setFound(result?.products ?? []) }).finally(() => { if (active) setSearching(false) })
    }, 350)
    return () => { active = false; clearTimeout(timer) }
  }, [query])

  const addIngredient = (product: Product) => {
    if (ingredients.some((item) => item.product.id === product.id)) return
    setIngredients((current) => [...current, { product, grams: product.servingGrams ?? 100 }])
    setQuery(''); setFound([])
  }
  const save = async () => {
    if (!name.trim() || !ingredients.length || ingredients.some((item) => item.grams <= 0)) return
    setSaving(true); setError('')
    try { await onSave({ id, favorite, name: name.trim(), description: description.trim(), instructions: instructions.trim(), emoji, ingredients }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить рецепт') }
    finally { setSaving(false) }
  }
  return <div className="recipe-editor">
    <div className="recipe-title-row"><label className="emoji-picker"><span className="sr-only">Эмодзи рецепта</span><select value={emoji} onChange={(event) => setEmoji(event.target.value)}>{['🍲','🥗','🍝','🍛','🥣','🍳','🥘','🍰'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field-label">Название рецепта<input className="text-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, утренняя каша" maxLength={180} autoFocus /></label></div>
    <label className="field-label">Описание<textarea className="text-input recipe-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Вкус, порции, заметки" maxLength={2000} /></label>
    <label className="field-label">Как готовить<textarea className="text-input recipe-instructions" value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Шаги приготовления" maxLength={10000} /></label>
    <div className="recipe-search"><div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти ингредиент в каталоге" />{query && <button onClick={() => setQuery('')} aria-label="Очистить"><X size={16} /></button>}</div>
      {(found.length > 0 || searching) && <div className="recipe-search-results">{searching ? <LoaderCircle className="spin" size={20} /> : found.map((product) => <button key={product.id} onClick={() => addIngredient(product)}><span>{product.emoji}</span><div><strong>{product.name}</strong><small>{Math.round(product.nutrients.calories ?? 0)} ккал / 100 г</small></div><Plus size={17} /></button>)}</div>}</div>
    <div className="recipe-ingredients"><div className="section-title"><h3>Ингредиенты</h3><span>{ingredients.length}</span></div>{ingredients.map((item, index) => <div className="recipe-ingredient" key={item.product.id}>
      <span className="food-emoji">{item.product.emoji}</span><div><strong>{item.product.name}</strong><small>{Math.round((item.product.nutrients.calories ?? 0) * item.grams / 100)} ккал</small></div>
      <label><NumericInput ariaLabel={`Масса: ${item.product.name}`} max={5000} value={item.grams} onValue={(grams) => setIngredients((current) => current.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, grams } : candidate))} /><span>г</span></label>
      <button className="icon-button" onClick={() => setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Убрать ${item.product.name}`}><Trash2 size={16} /></button></div>)}
      {!ingredients.length && <p className="empty-profile">Найдите и добавьте первый ингредиент.</p>}</div>
    {ingredients.length > 0 && <div className="recipe-summary"><span>Готовый рецепт · {Math.round(totalGrams)} г</span><strong>{Math.round((nutrients.calories ?? 0) * totalGrams / 100)} ккал</strong><small>На 100 г: Б {(nutrients.protein ?? 0).toFixed(1)} · Ж {(nutrients.fat ?? 0).toFixed(1)} · У {(nutrients.carbs ?? 0).toFixed(1)}</small></div>}
    {error && <div className="form-error">{error}</div>}
    <button className="primary-button" disabled={!name.trim() || !ingredients.length || ingredients.some((item) => item.grams <= 0) || saving} onClick={() => void save()}>{saving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}{id ? 'Сохранить изменения' : 'Сохранить рецепт'}</button>
    {onDelete && <button className="logout-button" onClick={() => { if (window.confirm('Удалить этот рецепт?')) void onDelete() }}><Trash2 size={16} /> Удалить рецепт</button>}
  </div>
}
