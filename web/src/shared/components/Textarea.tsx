import { type ComponentProps, useId } from 'react'
import { cn } from '@/shared/utils/cn'
import { FieldWrap, fieldControlBase } from './Field'

export type TextareaProps = ComponentProps<'textarea'> & {
  label?: string
  error?: string
  hint?: string
  wrapperClassName?: string
}

export function Textarea({ label, error, hint, wrapperClassName, className, id, ...rest }: TextareaProps) {
  const auto = useId()
  const fieldId = id ?? auto

  const textareaElement = (
    <textarea
      {...rest}
      id={fieldId}
      aria-invalid={!!error}
      className={cn(
        fieldControlBase,
        error ? 'border-error-500 focus:border-error-600 focus:ring-error-500/30' : 'border-cream-300',
        className,
      )}
    />
  )

  return (
    <FieldWrap label={label} error={error} hint={hint} id={fieldId} className={wrapperClassName}>
      {textareaElement}
    </FieldWrap>
  )
}
