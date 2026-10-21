import type { ReactNode } from 'react'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  useDocumentTitle(title)
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-cream-200 pb-4">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="h-6 w-1.5 rounded-full bg-anzac-400" />
          <h1 className="font-wide text-2xl font-extrabold tracking-tight text-charcoal-900 sm:text-3xl">{title}</h1>
        </div>
        {subtitle && <p className="mt-1 pl-4 text-sm text-slate-grey-600">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}
