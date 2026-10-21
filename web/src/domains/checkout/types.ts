import type { ImageUrls } from '@/shared/types'

export type OrderStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELED'

export type Order = {
  id: string
  status: OrderStatus
  quantity: number
  subtotalCents: number
  feeCents: number
  totalCents: number
  expiresAt: string
  paidAt: string | null
  createdAt: string
  refundRequired: boolean
  numbers: number[]
  buyer: { name: string; phone: string | null }
  raffle: { slug: string; title: string; totalNumbers: number; priceCents: number; cover: ImageUrls | null }
  payment: OrderPayment | null
}

// QR Code e copia e cola só vêm enquanto o pedido está pendente.
export type OrderPayment = {
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'REFUNDED'
  pixCopyPaste: string | null
  pixQrCodeBase64: string | null
  canSimulate: boolean // só com o gateway de teste, fora de produção
}

export type CheckoutSettings = { cpfRequired: boolean; pixFeeCents: number; reservationMinutes: number }

export type BuyerInput = { name: string; phone: string; cpf?: string }

export type CreateOrderInput = {
  raffleSlug: string
  quantity?: number
  numbers?: number[]
  buyer: BuyerInput
  idempotencyKey: string
}

// O que está sendo digitado no formulário do comprador.
export type BuyerDraft = { name: string; phone: string; cpf: string; accepted: boolean }
