import { useQuery } from '@tanstack/react-query'
import { http } from '@/shared/lib/http'
import type { Dashboard } from '../types'

// Atualiza sozinho a cada 30 s: o admin acompanha a venda durante a live.
export function useDashboard() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => http<Dashboard>('/admin/dashboard'),
    refetchInterval: 30_000,
  })
}
