import { useQuery } from '@tanstack/react-query'
import { env } from '@/shared/config/env'
import { http } from '@/shared/lib/http'

// O que GET /settings/public devolve: configurações do admin + dados do checkout.
export type PublicSettings = {
  siteName: string
  pixFeeCents: number
  reservationMinutes: number
  minBuyerAge: number
  supportWhatsapp: string
  whatsappGroupUrl: string
  instagramUrl: string
  cpfRequired: boolean
  gateway: string
}

export const siteSettingsKey = ['site-settings'] as const

export function useSiteSettings() {
  return useQuery({
    queryKey: siteSettingsKey,
    queryFn: () => http<PublicSettings>('/settings/public'),
    staleTime: 5 * 60_000,
  })
}

// Nome configurado pelo admin; VITE_APP_NAME só enquanto carrega ou se a API falhar.
export function useSiteName() {
  return useSiteSettings().data?.siteName || env.appName
}
