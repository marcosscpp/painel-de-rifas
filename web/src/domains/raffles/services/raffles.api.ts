import { http } from '@/shared/lib/http'
import type { RaffleDetail, RaffleSummary } from '../types'

export const rafflesApi = {
  list: () => http<RaffleSummary[]>('/raffles'),
  get: (slug: string) => http<RaffleDetail>(`/raffles/${encodeURIComponent(slug)}`),
}
