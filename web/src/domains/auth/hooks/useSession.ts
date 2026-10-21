import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { ApiError } from '@/shared/lib/http'
import { authApi } from '../services/auth.api'

export const sessionKey = ['session'] as const

// Usuário logado ou null. 401 não é erro aqui: só significa "sem sessão".
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: () =>
      authApi.me().catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) return null
        throw e
      }),
    staleTime: 5 * 60_000,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => qc.setQueryData(sessionKey, user),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      qc.clear() // limpa dados do painel em cache
      qc.setQueryData(sessionKey, null)
      navigate('/admin/login', { replace: true })
    },
  })
}
