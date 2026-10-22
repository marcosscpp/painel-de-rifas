import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buyerApi } from '../services/buyer.api'

export const buyerKey = ['buyer-session'] as const
export const myOrdersKey = ['buyer-orders'] as const
export const profileKey = ['buyer-profile'] as const

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

// Tela "Cadastrar": cria a conta e já entra.
export function useBuyerRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: buyerApi.register,
    onSuccess: ({ buyer }) => {
      qc.setQueryData(buyerKey, buyer)
      void qc.invalidateQueries({ queryKey: myOrdersKey })
    },
  })
}

export function useBuyerProfile(enabled: boolean) {
  return useQuery({ queryKey: profileKey, queryFn: async () => (await buyerApi.profile()).profile, enabled })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: buyerApi.updateProfile,
    onSuccess: ({ profile }) => {
      qc.setQueryData(profileKey, profile)
      void qc.invalidateQueries({ queryKey: buyerKey }) // primeiro nome do "Olá, ..."
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
      qc.removeQueries({ queryKey: profileKey })
    },
  })
}

export function useMyOrders(enabled: boolean) {
  return useQuery({ queryKey: myOrdersKey, queryFn: buyerApi.orders, enabled, refetchInterval: 30_000 })
}
