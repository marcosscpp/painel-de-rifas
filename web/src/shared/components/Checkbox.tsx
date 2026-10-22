import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { FieldMessage } from './Field'

type Props = Omit<ComponentProps<'input'>, 'type'> & {
  label: ReactNode
  icon?: ReactNode
  error?: string
  // Caixa com fundo, para aceites de termos e regulamento.
  boxed?: boolean
  wrapperClassName?: string
}

export function Checkbox({ label, icon, error, boxed, wrapperClassName, className, disabled, ...rest }: Props) {
  return (
    <div className={cn('flex flex-col gap-1', wrapperClassName)}>
      <label
        className={cn(
          'flex gap-2.5',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          boxed
            ? 'items-start rounded-xl border border-cream-200 bg-cream-100/70 p-3 text-xs text-slate-grey-700'
            : 'items-center text-sm font-medium text-charcoal-900',
        )}
      >
        <input
          {...rest}
          type="checkbox"
          disabled={disabled}
          aria-invalid={!!error}
          className={cn(
            'size-4 shrink-0 cursor-[inherit] rounded accent-watercourse-800 outline-none focus-visible:ring-2 focus-visible:ring-anzac-400/45 focus-visible:ring-offset-1',
            boxed && 'mt-0.5',
            className,
          )}
        />
        {icon}
        <span>{label}</span>
      </label>
      <FieldMessage error={error} />
    </div>
  )
}
