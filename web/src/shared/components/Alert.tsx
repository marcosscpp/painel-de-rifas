import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

const tones = {
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
}

export function Alert({ tone = 'info', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('whitespace-pre-line rounded-lg border px-4 py-3 text-sm', tones[tone])}>
      {children}
    </div>
  )
}
