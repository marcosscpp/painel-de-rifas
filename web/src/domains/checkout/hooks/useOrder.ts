import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSiteSettings } from '@/shared/hooks/useSiteSettings'
import { useSocketEvent, useSocketRoom } from '@/shared/hooks/useSocket'
import { ordersApi } from '../services/orders.api'

export const orderKey = (id: string) => ['orders', id] as const

// Pedido com atualização ao vivo: quando o status muda no servidor (pago, expirado), recarrega.
export function useOrder(id: string | undefined) {
  const qc = useQueryClient()
  useSocketRoom('order:join', id ? { orderId: id } : null)
  useSocketEvent<{ orderId: string; status: string }>('order:status', (e) => {
    if (e.orderId === id) void qc.invalidateQueries({ queryKey: orderKey(id) })
  })

  return useQuery({
    queryKey: orderKey(id ?? ''),
    queryFn: () => ordersApi.get(id!),
    enabled: !!id,
    // Garantia caso o socket caia: confere de tempos em tempos enquanto aguarda.
    refetchInterval: (q) => (q.state.data?.status === 'PENDING' ? 20_000 : false),
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: (order) => {
      qc.setQueryData(orderKey(order.id), order)
      // A compra com cadastro passa a lembrar do comprador; "Meus números" muda.
      void qc.invalidateQueries({ queryKey: ['buyer-session'] })
      void qc.invalidateQueries({ queryKey: ['buyer-orders'] })
    },
  })
}

export function useSimulatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ordersApi.simulatePayment,
    onSuccess: ({ order }) => qc.setQueryData(orderKey(order.id), order),
  })
}

// Regras do checkout que vêm do servidor (ex.: CPF obrigatório com o Asaas).
export function useCheckoutSettings() {
  return useSiteSettings()
}
