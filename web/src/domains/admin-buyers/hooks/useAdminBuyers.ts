import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { http } from '@/shared/lib/http'
import type { Paginated } from '@/shared/types'
import { toQuery } from '@/shared/utils/query'
import type { AdminBuyerDetail, AdminBuyerListItem } from '../types'

export type BuyersParams = { q?: string; page: number; pageSize: number }

export function useAdminBuyers(p: BuyersParams) {
  return useQuery({
    queryKey: ['admin-buyers', 'list', p],
    queryFn: () => http<Paginated<AdminBuyerListItem>>(`/admin/buyers${toQuery(p)}`),
    placeholderData: keepPreviousData,
  })
}

export function useAdminBuyer(id: string | null) {
  return useQuery({
    queryKey: ['admin-buyers', 'detail', id],
    queryFn: () => http<AdminBuyerDetail>(`/admin/buyers/${id}`),
    enabled: !!id,
  })
}
