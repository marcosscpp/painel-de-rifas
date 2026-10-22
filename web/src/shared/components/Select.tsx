import { type ReactNode, type ComponentProps, useId } from 'react'
import { CaretDownIcon } from '@phosphor-icons/react'
import { cn } from '@/shared/utils/cn'
import { FieldWrap, fieldControlBase } from './Field'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type SelectProps = ComponentProps<'select'> & {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  leftIcon?: ReactNode
  wrapperClassName?: string
}

export function Select({
  label,
  error,
  hint,
  options,
  leftIcon,
  wrapperClassName,
  className,
  id,
  ...rest
}: SelectProps) {
  const auto = useId()
  const fieldId = id ?? auto

  const selectElement = (
    <div className="group relative flex items-center">
      {leftIcon && (
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-grey-400 transition-colors group-focus-within:text-watercourse-700">
          {leftIcon}
        </span>
      )}
      <select
        {...rest}
        id={fieldId}
        aria-invalid={!!error}
        className={cn(
          fieldControlBase,
          'cursor-pointer appearance-none bg-white pr-11',
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
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg bg-cream-200/65 p-2 text-slate-grey-600 transition group-hover:bg-anzac-100 group-hover:text-watercourse-800"
      >
        <CaretDownIcon weight="bold" className="size-3" />
      </span>
    </div>
  )

  return (
    <FieldWrap label={label} error={error} hint={hint} id={fieldId} className={wrapperClassName}>
      {selectElement}
    </FieldWrap>
  )
}
