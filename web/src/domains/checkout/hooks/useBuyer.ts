import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buyerApi } from '../services/buyer.api'

export const buyerKey = ['buyer-session'] as const
export const myOrdersKey = ['buyer-orders'] as const

// Comprador lembrado neste navegador (cookie httpOnly; o JS só vê nome e celular mascarado).
export function useBuyerSession() {
  return useQuery({ queryKey: buyerKey, queryFn: async () => (await buyerApi.me()).buyer, staleTime: 5 * 60_000 })
}

// "Já comprei antes": celular + CPF do mesmo cadastro.
export function useBuyerLookup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ phone, cpf }: { phone: string; cpf: string }) => buyerApi.lookup(phone, cpf),
    onSuccess: ({ buyer }) => {
      qc.setQueryData(buyerKey, buyer)
      void qc.invalidateQueries({ queryKey: myOrdersKey })
    },
  })
}

export function useBuyerLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: buyerApi.logout,
    onSettled: () => {
      qc.setQueryData(buyerKey, null)
      qc.removeQueries({ queryKey: myOrdersKey })
    },
  })
}

export function useMyOrders(enabled: boolean) {
  return useQuery({ queryKey: myOrdersKey, queryFn: buyerApi.orders, enabled, refetchInterval: 30_000 })
}
