import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RaffleResult } from '@/domains/raffles'
import { http } from '@/shared/lib/http'
import type { Paginated } from '@/shared/types'
import type { DrawInput, DrawOutcome, DrawRaffle, FederalResult } from '../types'

export function useDrawRaffles(status: DrawRaffle['status']) {
  return useQuery({
    queryKey: ['admin-draws', status],
    queryFn: async () => (await http<Paginated<DrawRaffle>>(`/admin/raffles?status=${status}&pageSize=50`)).items,
  })
}

// Resultado já publicado: o mesmo que o público vê na página da rifa.
export function usePublishedResult(slug: string) {
  return useQuery({
    queryKey: ['raffle-result', slug],
    queryFn: async () => (await http<{ result: RaffleResult | null }>(`/raffles/${slug}`)).result,
  })
}

// Busca os 5 prêmios de um concurso na Caixa (pela nossa API).
export function useFederalResult() {
  return useMutation({
    mutationFn: (contest: string) => http<FederalResult>(`/admin/lottery/federal/${contest}`),
  })
}

export function useDrawPreview(raffleId: string) {
  return useMutation({
    mutationFn: (input: DrawInput) =>
      http<DrawOutcome>(`/admin/raffles/${raffleId}/draw/preview`, { method: 'POST', body: input }),
  })
}

export function useDrawConfirm(raffleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: DrawInput) => http<DrawOutcome>(`/admin/raffles/${raffleId}/draw`, { method: 'POST', body: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-draws'] })
      void qc.invalidateQueries({ queryKey: ['admin-raffles'] })
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
}
