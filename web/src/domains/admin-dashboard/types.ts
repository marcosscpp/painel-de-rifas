import type { ImageUrls, RaffleStatus } from '@/shared/types'

export type Dashboard = {
  revenueCents: number
  feesCents: number
  paidOrders: number
  pendingOrders: number
  expiredOrders: number
  refundsPending: number
  buyers: number
  today: { revenueCents: number; orders: number }
  daily: Array<{ day: string; revenueCents: number; orders: number }>
  raffles: Array<{
    id: string
    title: string
    slug: string
    status: RaffleStatus
    drawDate: string | null
    totalNumbers: number
    paid: number
    reserved: number
    percent: number
    revenueCents: number
    paidOrders: number
    cover: ImageUrls | null
  }>
}
