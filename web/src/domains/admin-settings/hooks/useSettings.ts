import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type PublicSettings, siteSettingsKey } from '@/shared/hooks/useSiteSettings'
import { http } from '@/shared/lib/http'
import type { SiteSettings } from '../types'

const key = ['admin-settings'] as const

export function useAdminSettings() {
  return useQuery({ queryKey: key, queryFn: () => http<SiteSettings>('/admin/settings') })
}

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<SiteSettings>) => http<SiteSettings>('/admin/settings', { method: 'PUT', body: input }),
    onSuccess: (s) => {
      qc.setQueryData(key, s)
      // /settings/public tem cache HTTP de 30s: refazer a busca traria o valor antigo, então atualiza direto.
      qc.setQueryData<PublicSettings>(siteSettingsKey, (old) => old && { ...old, ...s })
    },
  })
}
