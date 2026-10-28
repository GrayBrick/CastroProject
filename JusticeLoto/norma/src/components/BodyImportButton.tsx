import { useRef, useState } from 'react'
import { FileScan, LoaderCircle } from 'lucide-react'
import { importBodyDocument } from '../lib/api'
import type { BodyMetrics } from '../types'

export default function BodyImportButton({ onMetrics }: { onMetrics: (metrics: Partial<BodyMetrics>) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const upload = async (file?: File) => {
    if (!file || loading) return
    setLoading(true); setError('')
    try { onMetrics(await importBodyDocument(file)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось прочитать документ') }
    finally { setLoading(false); if (input.current) input.current.value = '' }
  }
  return <div className="body-import"><button type="button" className="secondary-button" onClick={() => input.current?.click()} disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <FileScan size={18} />}{loading ? 'Читаем показатели…' : 'Импорт InBody · фото или PDF'}</button>
    <input ref={input} className="photo-file-input" type="file" accept="image/*,.pdf,application/pdf" onChange={(event) => void upload(event.target.files?.[0])} />
    {error && <p className="form-error">{error}</p>}</div>
}
