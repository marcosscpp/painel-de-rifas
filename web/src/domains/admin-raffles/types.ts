import type { ImageUrls, PrizeKind, RaffleProgress, RaffleStatus, SaleMode } from '@/shared/types'

export type AdminRaffleListItem = {
  id: string
  slug: string
  title: string
  status: RaffleStatus
  featured: boolean
  saleMode: SaleMode
  totalNumbers: number
  priceCents: number
  drawDate: string | null
  createdAt: string
  publishedAt: string | null
  cover: ImageUrls | null
  progress: RaffleProgress
}

export type AdminPrizeImage = ImageUrls & { id: string; position: number }

export type AdminPrize = {
  id: string
  position: number
  title: string
  description: string
  kind: PrizeKind
  valueCents: number | null
  images: AdminPrizeImage[]
}

export type AdminPackage = { id: string; quantity: number; highlighted: boolean; position: number }

export type AdminRaffle = {
  id: string
  slug: string
  title: string
  description: string
  rules: string
  status: RaffleStatus
  featured: boolean
  saleMode: SaleMode
  totalNumbers: number
  priceCents: number
  minPerOrder: number
  maxPerOrder: number
  startsAt: string | null
  endsAt: string | null
  drawDate: string | null
  publishedAt: string | null
  cover: ImageUrls | null
  progress: RaffleProgress
  packages: AdminPackage[]
  prizes: AdminPrize[]
}

export type RaffleInput = {
  title: string
  slug?: string
  description: string
  rules?: string
  saleMode: SaleMode
  totalNumbers: number
  priceCents: number
  minPerOrder?: number
  maxPerOrder?: number
  startsAt?: string | null
  endsAt?: string | null
  drawDate?: string | null
}

export type PrizeInput = {
  title: string
  description?: string
  kind: PrizeKind
  valueCents?: number | null
}

export type RaffleAction = 'publish' | 'pause' | 'resume' | 'close'
