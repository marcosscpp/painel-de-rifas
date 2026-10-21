import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'
import { Card } from './Card'

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Carregando..."
      className={cn('animate-pulse rounded-xl bg-cream-200/90', className)}
      {...rest}
    />
  )
}

export function RaffleCardSkeleton() {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-cream-200 bg-white p-3 shadow-2xs">
      <Skeleton className="size-20 shrink-0 rounded-xl sm:size-24" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-lg" />
          <Skeleton className="h-5 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
        <Skeleton className="aspect-video w-full rounded-none" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
      </div>
      {Array.from({ length: Math.max(0, count - 1) }).map((_, i) => (
        <RaffleCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function RaffleDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden p-0">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-16 w-28 rounded-2xl" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        </Card>
        <Card className="space-y-3 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      </div>
      <Card className="h-96 space-y-4 p-5">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </Card>
    </div>
  )
}

export function CheckoutSkeleton() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Card className="flex items-center gap-4 p-4">
        <Skeleton className="h-16 w-24 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Card>
      <Card className="flex flex-col items-center gap-4 p-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="size-48 rounded-2xl" />
        <Skeleton className="h-4 w-56" />
      </Card>
    </div>
  )
}
