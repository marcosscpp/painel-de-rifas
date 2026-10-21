import { type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useId } from 'react'
import { cn } from '@/shared/utils/cn'

const control =
  'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-500'

type Wrap = { label: string; error?: string; hint?: string; id: string; children: ReactNode }

function FieldWrap({ label, error, hint, id, children }: Wrap) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : (
        hint && <span className="text-xs text-gray-500">{hint}</span>
      )}
    </div>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string }

export function Textarea({ label, error, hint, className, id, ...rest }: TextareaProps) {
  const auto = useId()
  const fieldId = id ?? auto
  return (
    <FieldWrap label={label} error={error} hint={hint} id={fieldId}>
      <textarea {...rest} id={fieldId} className={cn(control, error ? 'border-red-500' : 'border-gray-300', className)} />
    </FieldWrap>
  )
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
  hint?: string
  options: Array<{ value: string; label: string }>
}

export function Select({ label, error, hint, options, className, id, ...rest }: SelectProps) {
  const auto = useId()
  const fieldId = id ?? auto
  return (
    <FieldWrap label={label} error={error} hint={hint} id={fieldId}>
      <select {...rest} id={fieldId} className={cn(control, 'bg-white', error ? 'border-red-500' : 'border-gray-300', className)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  )
}
