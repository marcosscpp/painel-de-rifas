import { cn } from '@/shared/utils/cn'

type Props = { percent: number; label?: string; tone?: 'light' | 'dark' }

// Barra de progresso com gradiente Royal Teal -> Antique Gold.
export function ProgressBar({ percent, label, tone = 'light' }: Props) {
  const value = Math.max(0, Math.min(100, percent))
  return (
    <div>
      <div
        className={cn(
          'h-3 w-full overflow-hidden rounded-full',
          tone === 'dark' ? 'bg-white/15' : 'bg-cream-200/90 inset-ring inset-ring-cream-300/60',
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700',
            tone === 'dark'
              ? 'bg-gradient-to-r from-anzac-500 via-anzac-400 to-anzac-300'
              : 'bg-gradient-to-r from-watercourse-800 via-watercourse-600 to-anzac-400',
          )}
          style={{ width: `${Math.max(value, value > 0 ? 3 : 0)}%` }}
        />
      </div>
      {label && (
        <p className={cn('mt-1.5 text-xs font-medium', tone === 'dark' ? 'text-cream-100/80' : 'text-slate-grey-600')}>
          {label}
        </p>
      )}
    </div>
  )
}
