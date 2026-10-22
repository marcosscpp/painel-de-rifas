import { formatCents } from '@/shared/utils/format'
import type { Dashboard } from '../types'

// Faturamento por dia nos últimos 30 dias. Dias sem venda aparecem como barra vazia.
export function RevenueChart({ daily }: { daily: Dashboard['daily'] }) {
  const byDay = new Map(daily.map((d) => [d.day, d]))
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { key, label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, ...byDay.get(key) }
  })
  const max = Math.max(1, ...days.map((d) => d.revenueCents ?? 0))

  return (
    <div>
      <div className="flex h-40 items-end gap-1" role="img" aria-label="Faturamento por dia nos últimos 30 dias">
        {days.map((d) => {
          const v = d.revenueCents ?? 0
          return (
            <div key={d.key} className="group relative flex h-full flex-1 items-end">
              <div
                className={v ? 'w-full rounded-t bg-watercourse-700 group-hover:bg-anzac-500' : 'w-full rounded-t bg-cream-200'}
                style={{ height: `${Math.max(v ? 4 : 2, (v / max) * 100)}%` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-charcoal-900 px-2 py-1 text-[11px] text-cream-50 group-hover:block">
                {d.label}: {formatCents(v)} · {d.orders ?? 0} pedidos
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-grey-500">
        <span>{days[0].label}</span>
        <span>hoje</span>
      </div>
    </div>
  )
}
