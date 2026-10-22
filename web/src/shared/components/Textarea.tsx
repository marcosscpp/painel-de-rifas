import { type ComponentProps, useId } from 'react'
import { cn } from '@/shared/utils/cn'
import { FieldWrap } from './Field'
import { type FieldSize, fieldControl } from './field-styles'

export type TextareaProps = ComponentProps<'textarea'> & {
  label?: string
  error?: string
  hint?: string
  size?: FieldSize
  wrapperClassName?: string
}

export function Textarea({ label, error, hint, size = 'md', wrapperClassName, className, id, ...rest }: TextareaProps) {
  const auto = useId()
  const fieldId = id ?? auto

  const textareaElement = (
    <textarea {...rest} id={fieldId} aria-invalid={!!error} className={cn(fieldControl(size, error), className)} />
  )

  return (
    <FieldWrap label={label} error={error} hint={hint} id={fieldId} className={wrapperClassName}>
      {textareaElement}
    </FieldWrap>
  )
}
