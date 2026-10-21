import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export type BadgeTone = 'teal' | 'gold' | 'warning' | 'error' | 'neutral' | 'dark'

const toneStyles: Record<BadgeTone, { box: string; dot: string }> = {
  teal: {
    box: 'bg-watercourse-100/90 text-watercourse-900 ring-1 ring-inset ring-watercourse-600/30',
    dot: 'bg-watercourse-600',
  },
  gold: {
    box: 'gold-gradient text-charcoal-950 ring-1 ring-inset ring-anzac-600/35 shadow-2xs',
    dot: 'bg-charcoal-950',
  },
  warning: {
    box: 'bg-warning-100/90 text-warning-900 ring-1 ring-inset ring-warning-500/40',
    dot: 'bg-warning-500',
  },
  error: {
    box: 'bg-error-100/80 text-error-900 ring-1 ring-inset ring-error-500/30',
    dot: 'bg-error-600',
  },
  neutral: {
    box: 'bg-slate-grey-100 text-slate-grey-800 ring-1 ring-inset ring-slate-grey-300/90',
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
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold tracking-tight whitespace-nowrap shadow-2xs',
        t.box,
        className,
      )}
      {...rest}
    >
      {dot && (
        <span className="relative flex size-2 shrink-0">
          {pulse && (
            <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', t.dot)} />
          )}
          <span className={cn('relative inline-flex size-2 rounded-full', t.dot)} />
        </span>
      )}
      {icon && <span className="flex shrink-0 items-center">{icon}</span>}
      {children}
    </span>
  )
}
