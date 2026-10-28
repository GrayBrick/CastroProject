import { useEffect, useRef, useState } from 'react'
import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { Barcode, Camera, Images, LoaderCircle, Search } from 'lucide-react'
import { lookupBarcode } from '../lib/api'
import type { Product } from '../types'

export default function BarcodeScanner({ onProduct, onMissing }: { onProduct: (product: Product) => void, onMissing: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const controls = useRef<IScannerControls | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => { controls.current?.stop(); BrowserCodeReader.releaseAllStreams() }, [])

  const find = async (value: string) => {
    const normalized = value.replace(/\D/g, '')
    if (normalized.length < 8 || loading) return
    setCode(normalized); setLoading(true); setError('')
    try {
      const product = await lookupBarcode(normalized)
      controls.current?.stop(); setCameraActive(false); onProduct(product)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось найти продукт') }
    finally { setLoading(false) }
  }

  const startCamera = async () => {
    if (!video.current) return
    setError('')
    try {
      const reader = new BrowserMultiFormatReader()
      controls.current = await reader.decodeFromVideoDevice(undefined, video.current, (result) => {
        if (result) find(result.getText())
      })
      setCameraActive(true)
    } catch { setError('Камера недоступна. Разрешите доступ или введите код вручную.') }
  }
  const startCameraRef = useRef(startCamera)
  startCameraRef.current = startCamera
  useEffect(() => {
    const timer = window.setTimeout(() => { void startCameraRef.current() }, 100)
    return () => window.clearTimeout(timer)
  }, [])

  return <div className="barcode-scanner">
    <div className={`barcode-video ${cameraActive ? 'active' : ''}`}>
      <video ref={video} muted playsInline />
      {!cameraActive && <div className="barcode-placeholder"><Barcode size={40} /><span>Наведите камеру на EAN‑13, EAN‑8 или UPC</span></div>}
      <div className="scan-line" />
    </div>
    {!cameraActive && <button className="secondary-button camera-start" onClick={startCamera}><Camera size={17} /> Повторить открытие камеры</button>}
    <form className="barcode-manual" onSubmit={(event) => { event.preventDefault(); find(code) }}>
      <label className="field-label">Или введите числа под штрихкодом
        <div className="barcode-input"><input className="text-input" inputMode="numeric" value={code} placeholder="4607025392113"
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 14))} />
          <button type="submit" disabled={code.length < 8 || loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}</button></div>
      </label>
    </form>
    {loading && <p className="scanner-status">Ищем продукт в локальном кэше и Open Food Facts…</p>}
    {error && <div className="form-error">{error}</div>}
    {error && code.length >= 8 && <button className="secondary-button package-create-button" onClick={() => { controls.current?.stop(); onMissing(code) }}><Images size={18} /> Добавить по фото названия и состава</button>}
    <p className="scanner-note">Состав упакованных продуктов зависит от данных производителя. Перед добавлением сверьте порцию и этикетку.</p>
  </div>
}
