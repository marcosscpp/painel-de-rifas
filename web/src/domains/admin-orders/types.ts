import type { OrderStatus } from '@/domains/checkout'

export type AdminOrdersFilters = {
  status?: OrderStatus
  raffleId?: string
  q?: string
  refundPending?: boolean
  page: number
  pageSize: number
}

export type AdminOrderListItem = {
  id: string
  status: OrderStatus
  quantity: number
  totalCents: number
  createdAt: string
  paidAt: string | null
  refundRequired: boolean
  refundedAt: string | null
  buyer: { id: string; name: string; phone: string | null }
  raffle: { id: string; title: string; slug: string }
}

export type AdminAddress = {
  zipCode: string
  street: string
  number: string
  district: string
  city: string
  state: string
  complement: string | null
  reference: string | null
}

export type AdminOrderDetail = {
  id: string
  status: OrderStatus
  quantity: number
  subtotalCents: number
  feeCents: number
  totalCents: number
  createdAt: string
  expiresAt: string
  paidAt: string | null
  refundRequired: boolean
  refundedAt: string | null
  numbers: number[]
  numbersReleased: boolean // expirado/cancelado: números voltaram para a venda
  raffle: { id: string; title: string; slug: string; totalNumbers: number }
  payment: {
    provider: string
    providerChargeId: string | null
    status: string
    confirmedAt: string | null
    amountCents: number
  } | null
  buyer: {
    id: string
    name: string
    socialName: string | null
    phone: string | null
    cpf: string | null
    email: string | null
    birthDate: string | null
    address: AdminAddress | null
  }
}

export type RaffleOption = { id: string; title: string }
