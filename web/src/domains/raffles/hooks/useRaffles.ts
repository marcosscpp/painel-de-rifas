import { useQuery } from '@tanstack/react-query'
import { rafflesApi } from '../services/raffles.api'

// Progresso muda com as vendas: atualiza a cada 15 s (vira tempo real via socket na etapa de pedidos).
export function useRaffles() {
  return useQuery({ queryKey: ['raffles'], queryFn: rafflesApi.list, refetchInterval: 15_000 })
}

export function useRaffle(slug: string | undefined) {
  return useQuery({
    queryKey: ['raffles', slug],
    queryFn: () => rafflesApi.get(slug!),
    enabled: !!slug,
    refetchInterval: 15_000,
  })
}
