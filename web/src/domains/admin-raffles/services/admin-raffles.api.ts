import { http, upload } from '@/shared/lib/http'
import type { Paginated, RaffleStatus } from '@/shared/types'
import type { AdminRaffle, AdminRaffleListItem, PrizeInput, RaffleAction, RaffleInput } from '../types'

export type ListParams = { status?: RaffleStatus; q?: string; page?: number }

const qs = (p: ListParams) => {
  const s = new URLSearchParams()
  if (p.status) s.set('status', p.status)
  if (p.q) s.set('q', p.q)
  if (p.page) s.set('page', String(p.page))
  const str = s.toString()
  return str ? `?${str}` : ''
}

export const adminRafflesApi = {
  list: (p: ListParams) => http<Paginated<AdminRaffleListItem>>(`/admin/raffles${qs(p)}`),
  get: (id: string) => http<AdminRaffle>(`/admin/raffles/${id}`),
  create: (input: RaffleInput) => http<AdminRaffle>('/admin/raffles', { method: 'POST', body: input }),
  update: (id: string, input: Partial<RaffleInput>) =>
    http<AdminRaffle>(`/admin/raffles/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => http<void>(`/admin/raffles/${id}`, { method: 'DELETE' }),
  setPackages: (id: string, items: Array<{ quantity: number; highlighted: boolean }>) =>
    http<AdminRaffle>(`/admin/raffles/${id}/packages`, { method: 'PUT', body: { items } }),
  uploadCover: (id: string, file: File) => upload<AdminRaffle>(`/admin/raffles/${id}/cover`, file),
  transition: (id: string, action: RaffleAction) =>
    http<AdminRaffle>(`/admin/raffles/${id}/${action}`, { method: 'POST' }),

  createPrize: (raffleId: string, input: PrizeInput) =>
    http<AdminRaffle>(`/admin/raffles/${raffleId}/prizes`, { method: 'POST', body: input }),
  updatePrize: (id: string, input: Partial<PrizeInput>) =>
    http<AdminRaffle>(`/admin/prizes/${id}`, { method: 'PATCH', body: input }),
  removePrize: (id: string) => http<AdminRaffle>(`/admin/prizes/${id}`, { method: 'DELETE' }),
  addPrizeImage: (prizeId: string, file: File) => upload<AdminRaffle>(`/admin/prizes/${prizeId}/images`, file),
  removePrizeImage: (imageId: string) => http<AdminRaffle>(`/admin/prize-images/${imageId}`, { method: 'DELETE' }),
}
