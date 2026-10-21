import { type InputHTMLAttributes, useId } from 'react'
import { cn } from '@/shared/utils/cn'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }

export function Input({ label, error, className, id, ...rest }: Props) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        {...rest}
        id={inputId}
        aria-invalid={!!error}
        className={cn(
          'rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500',
          error ? 'border-red-500' : 'border-gray-300',
          className,
        )}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
