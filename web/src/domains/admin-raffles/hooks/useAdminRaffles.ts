import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminRafflesApi, type ListParams } from '../services/admin-raffles.api'
import type { AdminRaffle } from '../types'

export const adminRaffleKeys = {
  all: ['admin-raffles'] as const,
  list: (p: ListParams) => ['admin-raffles', 'list', p] as const,
  detail: (id: string) => ['admin-raffles', 'detail', id] as const,
}

export function useAdminRaffleList(params: ListParams) {
  return useQuery({
    queryKey: adminRaffleKeys.list(params),
    queryFn: () => adminRafflesApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useAdminRaffle(id: string | undefined) {
  return useQuery({
    queryKey: adminRaffleKeys.detail(id ?? ''),
    queryFn: () => adminRafflesApi.get(id!),
    enabled: !!id,
  })
}

// Toda escrita no formulário devolve a rifa completa: atualiza o cache na hora
// e marca a lista como desatualizada.
export function useRaffleMutation<V>(fn: (vars: V) => Promise<AdminRaffle>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (raffle) => {
      qc.setQueryData(adminRaffleKeys.detail(raffle.id), raffle)
      void qc.invalidateQueries({ queryKey: ['admin-raffles', 'list'] })
    },
  })
}

export function useDeleteRaffle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adminRafflesApi.remove,
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: adminRaffleKeys.detail(id) })
      void qc.invalidateQueries({ queryKey: ['admin-raffles', 'list'] })
    },
  })
}
