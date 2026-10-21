import { type InputHTMLAttributes, type ReactNode, useId } from 'react'
import { cn } from '@/shared/utils/cn'
import { FieldWrap, fieldControlBase } from './Field'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightAdornment?: ReactNode
  wrapperClassName?: string
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightAdornment,
  wrapperClassName,
  className,
  id,
  ...rest
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  const inputElement = (
    <div className="relative flex items-center">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3.5 flex items-center text-slate-grey-500">
          {leftIcon}
        </span>
      )}
      <input
        {...rest}
        id={inputId}
        aria-invalid={!!error}
        className={cn(
          fieldControlBase,
          leftIcon && 'pl-10',
          rightAdornment && 'pr-10',
          error ? 'border-error-500 focus:border-error-600 focus:ring-error-500/30' : 'border-cream-300',
          className,
        )}
      />
      {rightAdornment && (
        <span className="absolute right-3 flex items-center text-slate-grey-500">{rightAdornment}</span>
      )}
    </div>
  )

  if (!label && !error && !hint) {
    return inputElement
  }

  return (
    <FieldWrap label={label} error={error} hint={hint} id={inputId} className={wrapperClassName}>
      {inputElement}
    </FieldWrap>
  )
}
