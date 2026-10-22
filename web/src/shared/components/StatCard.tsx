import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/shared/utils/cn'
import { Card } from './Card'

type Props = {
  icon: ReactNode
  label: string
  value: string
  hint?: string
  to?: string
  alert?: boolean
}

// Número de destaque do painel (faturamento, pedidos...). Com `to`, vira link para a lista.
export function StatCard({ icon, label, value, hint, to, alert }: Props) {
  const body = (
    <Card
      className={cn(
        'flex h-full flex-col justify-between gap-2 bg-white p-4',
        alert && 'border-warning-300 bg-warning-50',
        to && 'transition hover:border-watercourse-500',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-grey-600">{label}</p>
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl p-2.5',
            alert
              ? 'bg-warning-100 text-warning-700 ring-1 ring-warning-300/60'
              : 'bg-watercourse-50 text-watercourse-700 ring-1 ring-watercourse-200/60',
          )}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="font-wide truncate text-2xl font-extrabold text-charcoal-900">{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-slate-grey-500">{hint}</p>}
      </div>
    </Card>
  )
  return to ? <Link to={to}>{body}</Link> : body
}
