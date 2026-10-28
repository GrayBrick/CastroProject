import { useRef, useState } from 'react'

type Props = {
  value: number
  onValue: (value: number) => void
  className?: string
  max?: number
  integer?: boolean
  ariaLabel?: string
}

/** Поле допускает полное стирание; пустое значение превращается в 0 только после blur. */
export default function NumericInput({ value, onValue, className, max = 5000, integer = false, ariaLabel }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  return <input ref={input} className={className} type="text" inputMode={integer ? 'numeric' : 'decimal'} aria-label={ariaLabel}
    value={draft ?? String(value)}
    onFocus={(event) => {
      const element = event.currentTarget
      if (value === 0) setDraft('')
      requestAnimationFrame(() => {
        if (document.activeElement !== element) return
        const allSelected = element.value.length > 0 && element.selectionStart === 0 && element.selectionEnd === element.value.length
        if (!allSelected) element.setSelectionRange(element.value.length, element.value.length)
      })
    }}
    onChange={(event) => {
      const raw = event.target.value.replace(',', '.')
      const pattern = integer ? /^\d*$/ : /^\d*(\.\d{0,2})?$/
      if (!pattern.test(raw)) return
      setDraft(raw)
      onValue(raw === '' || raw === '.' ? 0 : Math.min(max, Number(raw)))
    }}
    onBlur={() => {
      const current = input.current?.value ?? draft ?? String(value)
      const normalized = current === '' || current === '.' ? 0 : Math.min(max, Number(current))
      setDraft(null)
      onValue(normalized)
    }}
  />
}
