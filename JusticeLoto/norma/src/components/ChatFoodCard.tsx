import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import NumericInput from './NumericInput'
import type { ChatFood, Product } from '../types'

export default function ChatFoodCard({ food, preferredGrams, onAdd }: { food: ChatFood, preferredGrams?: number, onAdd: (product: Product, grams: number) => void }) {
  const [grams, setGrams] = useState(Math.max(10, Math.round(preferredGrams ?? food.suggestedGrams ?? 100)))
  const [added, setAdded] = useState(false)
  const { product } = food
  const add = () => {
    if (grams <= 0 || added) return
    onAdd(product, grams)
    setAdded(true)
  }
  return <div className="chat-food-card">
    <div className="chat-food-product"><div className="food-emoji">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : product.emoji}</div><div><strong>{product.name}</strong><span>{product.category} · {Math.round((product.nutrients.calories ?? 0) * grams / 100)} ккал</span></div></div>
    {product.source === 'ai' && <small className="chat-food-estimate">Новый продукт · состав оценён ИИ на 100 г</small>}
    <div className="chat-food-actions"><label><NumericInput ariaLabel={`Масса: ${product.name}`} integer max={2000} value={grams} onValue={setGrams} /><span>г</span></label><button type="button" onClick={add} disabled={grams <= 0 || added}>{added ? <Check size={16} /> : <Plus size={16} />}{added ? 'Добавлено' : 'Добавить'}</button></div>
  </div>
}
