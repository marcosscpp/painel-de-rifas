import { CaretDownIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

// Bloco que abre e fecha (acordeão), com <details> nativo: acessível e sem estado.
export function Disclosure({
  title,
  icon,
  aside,
  defaultOpen,
  children,
  className,
}: {
  title: string
  icon?: ReactNode
  aside?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <details
      open={defaultOpen}
      className={cn('group rounded-2xl border border-cream-200 bg-cream-50/95 shadow-[0_2px_12px_-4px_rgba(35,35,35,0.06)]', className)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3.5 select-none [&::-webkit-details-marker]:hidden">
        {icon && <span className="text-watercourse-700">{icon}</span>}
        <span className="font-wide flex-1 text-sm font-bold text-charcoal-900">{title}</span>
        {aside}
        <CaretDownIcon weight="bold" className="size-4 text-slate-grey-500 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-cream-200 px-4 py-3.5">{children}</div>
    </details>
  )
}
