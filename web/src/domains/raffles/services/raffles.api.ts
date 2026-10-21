import { http } from '@/shared/lib/http'
import type { NumbersPage, RaffleDetail, RaffleSummary } from '../types'

export const rafflesApi = {
  list: () => http<RaffleSummary[]>('/raffles'),
  get: (slug: string) => http<RaffleDetail>(`/raffles/${encodeURIComponent(slug)}`),
  numbers: (slug: string, from: number, size: number) =>
    http<NumbersPage>(`/raffles/${encodeURIComponent(slug)}/numbers?from=${from}&size=${size}`),
}
