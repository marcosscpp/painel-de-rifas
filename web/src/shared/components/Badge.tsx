import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export type BadgeTone = 'teal' | 'gold' | 'warning' | 'error' | 'neutral' | 'dark'

const toneStyles: Record<BadgeTone, { box: string; dot: string }> = {
  teal: {
    box: 'bg-watercourse-50 text-watercourse-800 ring-1 ring-inset ring-watercourse-600/25',
    dot: 'bg-watercourse-600',
  },
  gold: {
    box: 'bg-anzac-100/90 text-anzac-900 ring-1 ring-inset ring-anzac-500/40',
    dot: 'bg-anzac-600',
  },
  warning: {
    box: 'bg-warning-50 text-warning-800 ring-1 ring-inset ring-warning-500/30',
    dot: 'bg-warning-500',
  },
  error: {
    box: 'bg-error-50 text-error-800 ring-1 ring-inset ring-error-500/25',
    dot: 'bg-error-600',
  },
  neutral: {
    box: 'bg-slate-grey-100 text-slate-grey-700 ring-1 ring-inset ring-slate-grey-300/80',
    dot: 'bg-slate-grey-500',
  },
  dark: {
    box: 'bg-charcoal-900 text-cream-50 ring-1 ring-inset ring-charcoal-700',
    dot: 'bg-anzac-400',
  },
}

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone
  icon?: ReactNode
  dot?: boolean
  pulse?: boolean
}

export function Badge({ tone = 'neutral', icon, dot, pulse, className, children, ...rest }: BadgeProps) {
  const t = toneStyles[tone]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs leading-none font-semibold whitespace-nowrap',
        t.box,
        className,
      )}
      {...rest}
    >
      {dot && (
        <span className="relative flex size-1.5 shrink-0">
          {pulse && (
            <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', t.dot)} />
          )}
          <span className={cn('relative inline-flex size-1.5 rounded-full', t.dot)} />
        </span>
      )}
      {icon && <span className="flex shrink-0 items-center justify-center">{icon}</span>}
      {children}
    </span>
  )
}
