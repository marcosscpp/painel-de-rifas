import { http } from '@/shared/lib/http'
import type { AddressInput, BuyerProfile, MyOrder } from '../types'

export const buyerApi = {
  me: () => http<{ buyer: BuyerProfile | null }>('/buyer/me'),
  lookup: (phone: string, cpf: string) =>
    http<{ buyer: BuyerProfile }>('/buyer/lookup', { method: 'POST', body: { phone, cpf } }),
  logout: () => http<void>('/buyer/logout', { method: 'POST' }),
  orders: () => http<{ buyer: BuyerProfile; orders: MyOrder[] }>('/buyer/orders'),
  cep: (cep: string) => http<Omit<AddressInput, 'number' | 'complement' | 'reference'>>(`/geo/cep/${cep}`),
}
