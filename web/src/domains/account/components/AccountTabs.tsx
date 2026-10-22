import { IdentificationCardIcon, TicketIcon } from '@phosphor-icons/react'
import { NavTabs } from '@/shared/components'

// Abas da área do comprador (no Wesley: Campanhas / Minhas compras / Carteira / Afiliados).
export function AccountTabs() {
  return (
    <NavTabs
      className="mb-5"
      items={[
        { value: 'numeros', to: '/meus-numeros', label: 'Minhas compras', icon: <TicketIcon weight="duotone" className="size-4" /> },
        { value: 'dados', to: '/minha-conta', label: 'Meus dados', icon: <IdentificationCardIcon weight="duotone" className="size-4" /> },
      ]}
    />
  )
}
