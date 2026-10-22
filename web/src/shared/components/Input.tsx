import { type ComponentProps, type ReactNode, useId } from 'react'
import { cn } from '@/shared/utils/cn'
import { FieldWrap } from './Field'
import { type FieldSize, fieldControl, fieldIcon } from './field-styles'

export type InputProps = Omit<ComponentProps<'input'>, 'size'> & {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightAdornment?: ReactNode
  size?: FieldSize
  // Largura e espaçamento ficam no invólucro: classes de tamanho no className não pegam.
  wrapperClassName?: string
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightAdornment,
  size = 'md',
  wrapperClassName,
  className,
  id,
  ...rest
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  const inputElement = (
    <div className="group relative flex items-center">
      {leftIcon && <span className={fieldIcon}>{leftIcon}</span>}
      <input
        {...rest}
        id={inputId}
        aria-invalid={!!error}
        className={cn(
          fieldControl(size, error),
          Boolean(leftIcon) && 'pl-10',
          Boolean(rightAdornment) && 'pr-10',
          className,
        )}
      />
      {rightAdornment && (
        <span className="absolute right-3 flex items-center text-slate-grey-500">{rightAdornment}</span>
      )}
    </div>
  )

  // Sempre com o mesmo invólucro: se a estrutura mudasse quando o erro aparece, o <input>
  // seria recriado e a pessoa perderia o foco no meio da digitação.
  return (
    <FieldWrap label={label} error={error} hint={hint} id={inputId} className={wrapperClassName}>
      {inputElement}
    </FieldWrap>
  )
}
