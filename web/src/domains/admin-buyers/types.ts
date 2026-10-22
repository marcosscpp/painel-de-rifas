import type { MyOrder } from '@/domains/checkout'
import type { AdminAddress } from '@/domains/admin-orders'

export type AdminBuyerListItem = {
  id: string
  name: string
  phone: string | null
  cpf: string | null
  email: string | null
  city: string | null
  state: string | null
  createdAt: string
  paidOrders: number
  paidNumbers: number
  spentCents: number
}

export type AdminBuyerDetail = {
  id: string
  name: string
  socialName: string | null
  phone: string | null
  cpf: string | null
  email: string | null
  birthDate: string | null
  createdAt: string
  address: AdminAddress | null
  orders: MyOrder[]
}
