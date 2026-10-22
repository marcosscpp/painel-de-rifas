// Configurações editáveis pelo admin (tabela settings, chave "site").
export type SiteSettings = {
  siteName: string
  pixFeeCents: number
  reservationMinutes: number
  minBuyerAge: number
  supportWhatsapp: string
  whatsappGroupUrl: string
  instagramUrl: string
}
