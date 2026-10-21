import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        'rounded-2xl border border-cream-200 bg-cream-50/95 p-4 shadow-[0_2px_12px_-4px_rgba(35,35,35,0.06)]',
        className,
      )}
    />
  )
}
