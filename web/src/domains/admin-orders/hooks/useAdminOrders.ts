import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminOrdersApi } from '../services/admin-orders.api'
import type { AdminOrderDetail, AdminOrdersFilters } from '../types'

export const adminOrderKeys = {
  all: ['admin-orders'] as const,
  list: (f: AdminOrdersFilters) => ['admin-orders', 'list', f] as const,
  detail: (id: string) => ['admin-orders', 'detail', id] as const,
}

export function useAdminOrders(filters: AdminOrdersFilters) {
  return useQuery({
    queryKey: adminOrderKeys.list(filters),
    queryFn: () => adminOrdersApi.list(filters),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
}

export function useAdminOrder(id: string | null) {
  return useQuery({ queryKey: adminOrderKeys.detail(id ?? ''), queryFn: () => adminOrdersApi.get(id!), enabled: !!id })
}

export function useRaffleOptions() {
  return useQuery({ queryKey: ['admin-raffle-options'], queryFn: adminOrdersApi.raffles, staleTime: 60_000 })
}

// Cancelar e marcar reembolso devolvem o pedido atualizado: atualiza o detalhe e a lista e o painel.
function useOrderAction(fn: (id: string) => Promise<AdminOrderDetail>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (order) => {
      qc.setQueryData(adminOrderKeys.detail(order.id), order)
      void qc.invalidateQueries({ queryKey: ['admin-orders', 'list'] })
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
}

export const useCancelOrder = () => useOrderAction(adminOrdersApi.cancel)
export const useMarkRefunded = () => useOrderAction(adminOrdersApi.markRefunded)
