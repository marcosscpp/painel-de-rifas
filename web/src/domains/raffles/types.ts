import type { ImageUrls, PrizeKind, RaffleProgress, RaffleStatus, SaleMode } from '@/shared/types'

export type RaffleSummary = {
  slug: string
  title: string
  status: RaffleStatus
  featured: boolean
  priceCents: number
  totalNumbers: number
  drawDate: string | null
  endsAt: string | null
  cover: ImageUrls | null
  mainPrize: string | null
  progress: RaffleProgress
}

export type PublicPrize = {
  position: number
  title: string
  description: string
  kind: PrizeKind
  valueCents: number | null
  images: ImageUrls[]
}

export type RaffleDetail = Omit<RaffleSummary, 'mainPrize'> & {
  description: string
  rules: string
  saleMode: SaleMode
  minPerOrder: number
  maxPerOrder: number
  packages: Array<{ quantity: number; highlighted: boolean; totalCents: number }>
  prizes: PublicPrize[]
  result: RaffleResult | null
}

// Resultado publicado depois do sorteio pela Loteria Federal.
export type RaffleResult = {
  lotteryContest: string | null
  lotteryPrizes: string[]
  winningNumber: number | null
  explanation: string | null
  winnerName: string | null
  drawnAt: string | null
}

// Página da grade: um caractere por número (0 livre, 1 reservado, 2 pago).
export type NumbersPage = { from: number; size: number; total: number; statuses: string }

export type NumbersEvent = { slug: string; status: 'AVAILABLE' | 'RESERVED' | 'PAID'; numbers: number[] }
