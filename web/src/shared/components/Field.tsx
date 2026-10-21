import type { ReactNode } from 'react'

export const fieldControlBase =
  'w-full rounded-xl border bg-cream-50 px-3.5 py-2.5 text-sm text-charcoal-900 outline-none transition placeholder:text-slate-grey-400 focus:border-watercourse-700 focus:bg-white focus:ring-2 focus:ring-anzac-400/45 disabled:cursor-not-allowed disabled:bg-cream-200/50 disabled:text-slate-grey-500'

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
    <div className={className ?? 'flex flex-col gap-1.5'}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-charcoal-900">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span className="text-xs font-medium text-error-600">{error}</span>
      ) : (
        hint && <span className="text-xs text-slate-grey-600">{hint}</span>
      )}
    </div>
  )
}
