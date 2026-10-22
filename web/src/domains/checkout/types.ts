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
  buyer: { name: string; phone: string | null; cpf: string | null }
  raffle: {
    slug: string
    title: string
    totalNumbers: number
    priceCents: number
    drawDate: string | null
    cover: ImageUrls | null
  }
  payment: OrderPayment | null
}

// QR Code e copia e cola só vêm enquanto o pedido está pendente.
export type OrderPayment = {
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'REFUNDED'
  pixCopyPaste: string | null
  pixQrCodeBase64: string | null
  canSimulate: boolean // só com o gateway de teste, fora de produção
}

export type CheckoutSettings = { cpfRequired: boolean; pixFeeCents: number; reservationMinutes: number; minBuyerAge: number }

export type AddressInput = {
  zipCode: string
  street: string
  number: string
  district: string
  city: string
  state: string
  complement?: string
  reference?: string
}

// Mesmos campos do cadastro do Wesley Alemão. Opcionais: nome social e endereço.
export type BuyerInput = {
  name: string
  socialName?: string
  phone: string
  phoneConfirm: string
  cpf: string
  birthDate: string // AAAA-MM-DD
  email: string
  address?: AddressInput
}

// Comprador lembrado neste navegador ("Comprando como...").
export type BuyerProfile = { name: string; phone: string | null }

export type MyOrder = {
  id: string
  status: OrderStatus
  quantity: number
  totalCents: number
  createdAt: string
  expiresAt: string
  paidAt: string | null
  refundRequired: boolean
  numbers: number[]
  raffle: {
    slug: string
    title: string
    status: string
    drawDate: string | null
    totalNumbers: number
    cover: ImageUrls | null
  }
}

export type CreateOrderInput = {
  raffleSlug: string
  quantity?: number
  numbers?: number[]
  buyer?: BuyerInput // sem dados: compra como o comprador da sessão
  idempotencyKey: string
}

// O que está sendo digitado no formulário do comprador.
export type BuyerDraft = {
  name: string
  socialName: string
  showSocialName: boolean
  email: string
  phone: string
  phoneConfirm: string
  birthDate: string // dd/mm/aaaa como digitado
  cpf: string
  wantsAddress: boolean
  address: Required<AddressInput>
  accepted: boolean
}

// "Meus dados": o cadastro completo, com celular e CPF mascarados.
export type BuyerAccount = {
  name: string
  socialName: string | null
  firstName: string
  email: string | null
  phone: string | null
  cpf: string | null
  birthDate: string | null
  address: (AddressInput & { complement: string | null; reference: string | null }) | null
  createdAt: string
}

export type ProfileInput = {
  name?: string
  socialName?: string
  email?: string
  address?: AddressInput | null
}
