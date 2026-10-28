import type { ReactNode } from 'react'
import { Flame } from 'lucide-react'
import { formatNutrient, nutrientDefinitions } from '../nutrients'
import type { Nutrients, Product } from '../types'

const macroColors = { protein: '#617b4a', carbs: '#a27860', fat: '#d49a59' }

function RingContent({ children }: { children: ReactNode }) {
  return <div className="ring-content">{children}</div>
}

export function CalorieRing({ totals, goals, flamePulse = 0 }: { totals: Nutrients, goals: Nutrients, flamePulse?: number }) {
  const size = 150
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = radius * 2 * Math.PI
  const parts = [
    { key: 'protein', calories: (totals.protein ?? 0) * 4 },
    { key: 'carbs', calories: (totals.carbs ?? 0) * 4 },
    { key: 'fat', calories: (totals.fat ?? 0) * 9 },
  ]
  const lengths = parts.map((part) => Math.max(0, part.calories) / goals.calories * circumference)
  const scale = Math.min(1, circumference / Math.max(circumference, lengths.reduce((sum, value) => sum + value, 0)))
  let offset = 0
  const segments = parts.map((part, index) => {
    const length = lengths[index] * scale
    const segment = { ...part, length, dashOffset: -offset }
    offset += length
    return segment
  })

  return <div className="progress-ring calorie-ring" style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Калории из белков, углеводов и жиров">
      <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
      {segments.reverse().map((segment) => <circle key={segment.key} data-macro={segment.key} cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke}
        stroke={macroColors[segment.key as keyof typeof macroColors]} strokeDasharray={`${segment.length} ${circumference - segment.length}`} strokeDashoffset={segment.dashOffset} strokeLinecap="round" className="calorie-segment" />)}
    </svg>
    <RingContent><Flame key={flamePulse} className={flamePulse ? 'flame-easter-egg' : undefined} size={18} /><strong>{Math.round(totals.calories ?? 0)}</strong><span>из {goals.calories} ккал</span></RingContent>
  </div>
}

export function MacroRings({ totals, goals, size = 54, children }: { totals: Nutrients, goals: Nutrients, size?: number, children?: ReactNode }) {
  const stroke = size < 70 ? 4 : 6
  const gap = stroke
  const radius = size / 2 - stroke / 2 - 1
  const rings = [
    { key: 'protein', radius },
    { key: 'carbs', radius: radius - gap },
    { key: 'fat', radius: radius - gap * 2 },
  ]
  return <div className="macro-rings" style={{ width: size, height: size }} title="Внешнее кольцо — белки, среднее — углеводы, внутреннее — жиры">
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Заполнение норм белков, углеводов и жиров">
      {rings.map((ring) => {
        const circumference = ring.radius * 2 * Math.PI
        const percent = Math.min(100, Math.max(0, (totals[ring.key] ?? 0) / goals[ring.key] * 100))
        return <g key={ring.key} data-macro-ring={ring.key}>
          <circle className="ring-track" cx={size / 2} cy={size / 2} r={ring.radius} fill="none" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={ring.radius} fill="none" strokeWidth={stroke} stroke={macroColors[ring.key as keyof typeof macroColors]}
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percent / 100)} strokeLinecap="round" className="macro-ring-value" />
        </g>
      })}
    </svg>
    {children ?? <span>Б · У · Ж</span>}
  </div>
}

export function NutrientProfileList({ product, grams, goals, showAll = false }: { product: Product, grams: number, goals: Nutrients, showAll?: boolean }) {
  const items = nutrientDefinitions.map((definition) => {
    const per100 = product.nutrients[definition.key] ?? 0
    const amount = per100 * grams / 100
    const goal = goals[definition.key] ?? 0
    const basePercent = goal > 0 ? per100 / goal * 100 : 0
    const percent = goal > 0 ? amount / goal * 100 : 0
    return { definition, amount, goal, basePercent, percent }
  }).filter((item) => item.amount > 0 && (showAll || item.basePercent >= 1)).sort((a, b) => b.basePercent - a.basePercent)

  if (!items.length) return <div className="empty-profile">{showAll ? 'Для продукта пока нет заполненных нутриентов.' : 'В 100 г продукта нет показателей, составляющих 1% дневной нормы или больше.'}</div>
  return <div className="nutrient-profile-list">{items.map(({ definition, amount, goal, percent }) => <div className="nutrient-profile-row" key={definition.key}>
    <div><span>{definition.name}</span><strong>{formatNutrient(definition.key, amount)}</strong><b>{goal > 0 ? `${Math.round(percent)}% ДН` : 'Норма не задана'}</b></div>
    <div className="nutrient-track" aria-label={goal > 0 ? `${definition.name}: ${Math.round(percent)}% дневной нормы` : `${definition.name}: дневная норма не задана`}><i style={{ width: `${Math.min(100, percent)}%` }} /></div>
  </div>)}</div>
}
