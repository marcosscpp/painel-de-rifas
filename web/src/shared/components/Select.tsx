import { type ReactNode, type SelectHTMLAttributes, useId } from 'react'
import { CaretDownIcon } from '@phosphor-icons/react'
import { cn } from '@/shared/utils/cn'
import { FieldWrap, fieldControlBase } from './Field'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  options: SelectOption[]
  wrapperClassName?: string
}

export function Select({
  label,
  error,
  hint,
  leftIcon,
  options,
  wrapperClassName,
  className,
  id,
  ...rest
}: SelectProps) {
  const auto = useId()
  const fieldId = id ?? auto

  const selectElement = (
    <div className="relative flex items-center">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3.5 flex items-center text-slate-grey-500">
          {leftIcon}
        </span>
      )}
      <select
        {...rest}
        id={fieldId}
        aria-invalid={!!error}
        className={cn(
          fieldControlBase,
          'cursor-pointer appearance-none bg-cream-50 pr-10',
          Boolean(leftIcon) && 'pl-10',
          error ? 'border-error-500 focus:border-error-600 focus:ring-error-500/30' : 'border-cream-300',
          className,
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3.5 flex items-center text-slate-grey-600">
        <CaretDownIcon weight="bold" className="size-4" />
      </span>
    </div>
  )

  if (!label && !error && !hint) {
    return selectElement
  }

  return (
    <FieldWrap label={label} error={error} hint={hint} id={fieldId} className={wrapperClassName}>
      {selectElement}
    </FieldWrap>
  )
}
