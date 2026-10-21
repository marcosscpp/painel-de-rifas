import type { ReactNode } from 'react'
import { TicketIcon } from '@phosphor-icons/react'

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-cream-300 bg-cream-50/60 px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-anzac-200 bg-anzac-50 text-anzac-600 shadow-2xs">
        {icon ?? <TicketIcon weight="duotone" className="size-7" />}
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="font-wide text-lg font-bold text-charcoal-900">{title}</p>
        {description && <p className="max-w-md text-sm text-slate-grey-600">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
