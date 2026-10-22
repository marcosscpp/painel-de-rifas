import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export type FieldWrapProps = {
  label?: string
  error?: string
  hint?: string
  id: string
  className?: string
  children: ReactNode
}

export function FieldWrap({ label, error, hint, id, className, children }: FieldWrapProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-charcoal-900">
          {label}
        </label>
      )}
      {children}
      <FieldMessage error={error} hint={hint} />
    </div>
  )
}

export function FieldMessage({ error, hint }: { error?: string; hint?: string }) {
  if (error) return <span className="text-xs font-medium text-error-600">{error}</span>
  return hint ? <span className="text-xs text-slate-grey-600">{hint}</span> : null
}
