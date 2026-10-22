import { env } from '@/shared/config/env'
import { http } from '@/shared/lib/http'
import type { Paginated } from '@/shared/types'
import { toQuery } from '@/shared/utils/query'
import type { AdminOrderDetail, AdminOrderListItem, AdminOrdersFilters, RaffleOption } from '../types'

export const adminOrdersApi = {
  list: (f: AdminOrdersFilters) => http<Paginated<AdminOrderListItem>>(`/admin/orders${toQuery(f)}`),
  get: (id: string) => http<AdminOrderDetail>(`/admin/orders/${id}`),
  cancel: (id: string) => http<AdminOrderDetail>(`/admin/orders/${id}/cancel`, { method: 'POST' }),
  markRefunded: (id: string) => http<AdminOrderDetail>(`/admin/orders/${id}/refunded`, { method: 'POST' }),
  // Download direto pelo navegador (o cookie da sessão vai junto).
  exportUrl: ({ page: _p, pageSize: _s, ...f }: AdminOrdersFilters) => `${env.apiBase}/admin/orders/export.csv${toQuery(f)}`,
  raffles: async (): Promise<RaffleOption[]> =>
    (await http<Paginated<RaffleOption>>('/admin/raffles?pageSize=50')).items.map(({ id, title }) => ({ id, title })),
}
