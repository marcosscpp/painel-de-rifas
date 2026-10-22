import { http } from '@/shared/lib/http'
import type { AddressInput, BuyerAccount, BuyerInput, BuyerProfile, MyOrder, ProfileInput } from '../types'

export const buyerApi = {
  me: () => http<{ buyer: BuyerProfile | null }>('/buyer/me'),
  lookup: (phone: string, cpf: string) =>
    http<{ buyer: BuyerProfile }>('/buyer/lookup', { method: 'POST', body: { phone, cpf } }),
  register: (buyer: BuyerInput) => http<{ buyer: BuyerProfile }>('/buyer/register', { method: 'POST', body: buyer }),
  profile: () => http<{ profile: BuyerAccount }>('/buyer/profile'),
  updateProfile: (input: ProfileInput) =>
    http<{ profile: BuyerAccount }>('/buyer/profile', { method: 'PATCH', body: input }),
  logout: () => http<void>('/buyer/logout', { method: 'POST' }),
  orders: () => http<{ buyer: BuyerProfile; orders: MyOrder[] }>('/buyer/orders'),
  cep: (cep: string) => http<Omit<AddressInput, 'number' | 'complement' | 'reference'>>(`/geo/cep/${cep}`),
}
