import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export type InfoItem = { label: string; value: ReactNode; hidden?: boolean }

// Lista "rótulo: valor" (detalhes do pedido, dados do comprador). Itens vazios somem.
export function InfoList({ items, className }: { items: InfoItem[]; className?: string }) {
  return (
    <dl className={cn('divide-y divide-cream-200 text-sm', className)}>
      {items
        .filter((i) => !i.hidden && i.value !== null && i.value !== undefined && i.value !== '' && i.value !== false)
        .map((i) => (
          <div key={i.label} className="flex items-start justify-between gap-4 py-2 first:pt-0 last:pb-0">
            <dt className="shrink-0 text-slate-grey-600">{i.label}</dt>
            <dd className="min-w-0 text-right font-semibold break-words text-charcoal-900">{i.value}</dd>
          </div>
        ))}
    </dl>
  )
}
