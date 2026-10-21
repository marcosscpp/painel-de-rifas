import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'
import { Spinner } from './Spinner'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'buy' | 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
}

// "buy" (Antique Gold / Anzac) destaca as ações de compra e pagamento;
// "primary" usa o Royal Teal (Watercourse) característico da marca.
const variants = {
  buy: 'gold-gradient text-charcoal-950 font-bold font-wide hover:brightness-105 active:brightness-95 shadow-[0_2px_0_var(--color-anzac-700)] border border-anzac-300/60',
  primary:
    'bg-watercourse-800 text-cream-50 font-semibold hover:bg-watercourse-700 active:bg-watercourse-900 shadow-xs',
  secondary:
    'border border-cream-300 bg-cream-50 text-charcoal-900 font-medium hover:border-watercourse-700 hover:bg-white shadow-2xs',
  danger: 'bg-error-600 text-white font-semibold hover:bg-error-700 active:bg-error-800 shadow-xs',
  ghost: 'text-slate-grey-700 font-medium hover:bg-cream-200/70 hover:text-charcoal-900',
}

export function Button({ variant = 'primary', loading, disabled, className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}
