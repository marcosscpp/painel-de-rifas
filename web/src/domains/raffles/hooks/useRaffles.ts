import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSocketEvent, useSocketRoom } from '@/shared/hooks/useSocket'
import type { RaffleProgress } from '@/shared/types'
import { rafflesApi } from '../services/raffles.api'
import type { NumbersEvent, NumbersPage, RaffleDetail, RaffleSummary } from '../types'

export const GRID_PAGE = 500

const keys = {
  list: ['raffles'] as const,
  detail: (slug: string) => ['raffles', slug] as const,
  numbers: (slug: string, from: number) => ['raffles', slug, 'numbers', from] as const,
}

// Lista com progresso: a cada 30 s (o tempo real fica na página de cada rifa).
export function useRaffles() {
  return useQuery({ queryKey: keys.list, queryFn: rafflesApi.list, refetchInterval: 30_000 })
}

export function useRaffle(slug: string | undefined) {
  return useQuery({
    queryKey: keys.detail(slug ?? ''),
    queryFn: () => rafflesApi.get(slug!),
    enabled: !!slug,
    refetchInterval: 60_000,
  })
}

export function useNumbersPage(slug: string, from: number, enabled: boolean) {
  return useQuery({
    queryKey: keys.numbers(slug, from),
    queryFn: () => rafflesApi.numbers(slug, from, GRID_PAGE),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000, // eventos do socket mantêm a página em dia
  })
}

// Entra na sala da rifa e aplica os eventos direto no cache: progresso e grade
// mudam na tela de todo mundo sem recarregar.
export function useRaffleLive(slug: string | undefined) {
  const qc = useQueryClient()
  useSocketRoom('raffle:join', slug ? { slug } : null, 'raffle:leave')

  useSocketEvent<{ slug?: string }>('raffle:refresh', (e) => {
    if (e.slug === slug && slug) void qc.invalidateQueries({ queryKey: keys.detail(slug) })
  })

  useSocketEvent<{ slug: string; progress: RaffleProgress }>('raffle:progress', (e) => {
    if (e.slug !== slug) return
    qc.setQueryData<RaffleDetail>(keys.detail(slug), (r) => (r ? { ...r, progress: e.progress } : r))
    qc.setQueryData<RaffleSummary[]>(keys.list, (l) => l?.map((r) => (r.slug === slug ? { ...r, progress: e.progress } : r)))
  })

  useSocketEvent<NumbersEvent>('raffle:numbers', (e) => {
    if (e.slug !== slug) return
    const code = e.status === 'AVAILABLE' ? '0' : e.status === 'RESERVED' ? '1' : '2'
    const byPage = new Map<number, number[]>()
    for (const n of e.numbers) {
      const from = Math.floor(n / GRID_PAGE) * GRID_PAGE
      byPage.set(from, [...(byPage.get(from) ?? []), n])
    }
    for (const [from, nums] of byPage) {
      qc.setQueryData<NumbersPage>(keys.numbers(slug, from), (p) => {
        if (!p) return p
        const chars = p.statuses.split('')
        for (const n of nums) if (n - p.from < chars.length) chars[n - p.from] = code
        return { ...p, statuses: chars.join('') }
      })
    }
  })
}
