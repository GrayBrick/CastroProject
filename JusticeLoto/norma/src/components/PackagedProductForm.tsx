import { useState } from 'react'
import { Camera, Check, LoaderCircle, PackagePlus } from 'lucide-react'
import { createPackagedProduct } from '../lib/api'
import { prepareFoodPhoto } from '../lib/kimi'
import type { Product } from '../types'

function PhotoField({ label, value, onChange }: { label: string, value: File | null, onChange: (file: File) => void }) {
  return <label className={`package-photo-field ${value ? 'ready' : ''}`}>
    {value ? <><Check size={22} /><strong>{label}</strong><span>{value.name}</span></> : <><Camera size={24} /><strong>{label}</strong><span>Фото до 8 МБ</span></>}
    <input type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) onChange(file) }} />
  </label>
}

export default function PackagedProductForm({ barcode, onProduct }: { barcode: string, onProduct: (product: Product) => void }) {
  const [nameImage, setNameImage] = useState<File | null>(null)
  const [nutritionImage, setNutritionImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    if (!nameImage || !nutritionImage || loading) return
    setLoading(true); setError('')
    try {
      const [name, nutrition] = await Promise.all([prepareFoodPhoto(nameImage), prepareFoodPhoto(nutritionImage)])
      onProduct(await createPackagedProduct(barcode, name, nutrition))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось добавить продукт') }
    finally { setLoading(false) }
  }
  return <div className="package-form">
    <div className="package-barcode"><PackagePlus size={22} /><div><strong>Новый продукт</strong><span>Штрихкод {barcode}</span></div></div>
    <p className="profile-explanation">Снимите название и этикетку крупным планом. После проверки продукт сохранится в общем каталоге с этим штрихкодом.</p>
    <div className="package-photo-grid"><PhotoField label="Название" value={nameImage} onChange={setNameImage} /><PhotoField label="Состав и КБЖУ" value={nutritionImage} onChange={setNutritionImage} /></div>
    {error && <div className="request-error" role="alert"><div><strong>Не удалось распознать упаковку</strong><p>{error}</p></div></div>}
    <button className="primary-button" disabled={!nameImage || !nutritionImage || loading} onClick={() => void submit()}>{loading ? <LoaderCircle className="spin" size={18} /> : <PackagePlus size={18} />}{loading ? 'Читаем этикетку и проверяем…' : 'Распознать и сохранить'}</button>
  </div>
}
