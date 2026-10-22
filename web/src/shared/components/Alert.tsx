import type { ReactNode } from 'react'
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon } from '@phosphor-icons/react'
import { cn } from '@/shared/utils/cn'

const tones = {
  error: {
    box: 'border-error-200 bg-error-50 text-error-900',
    icon: WarningCircleIcon,
    iconColor: 'text-error-600',
  },
  info: {
    box: 'border-watercourse-200 bg-watercourse-50/70 text-watercourse-900',
    icon: InfoIcon,
    iconColor: 'text-watercourse-700',
  },
  success: {
    box: 'border-watercourse-300 bg-watercourse-50 text-watercourse-900',
    icon: CheckCircleIcon,
    iconColor: 'text-watercourse-600',
  },
  warning: {
    box: 'border-warning-300 bg-warning-50 text-warning-900',
    icon: WarningIcon,
    iconColor: 'text-warning-600',
  },
}

export function Alert({ tone = 'info', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  const t = tones[tone]
  const Icon = t.icon
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium', t.box)}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', t.iconColor)} />
      <div className="min-w-0 flex-1 whitespace-pre-line">{children}</div>
    </div>
  )
}
