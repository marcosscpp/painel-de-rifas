import { WhatsappLogoIcon } from '@phosphor-icons/react'
import { InfoList } from '@/shared/components'
import { formatCpf, formatDate } from '@/shared/utils/format'
import type { AdminOrderDetail } from '../types'

export const formatPhone = (d: string | null) =>
  d ? d.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : ''

export const whatsappUrl = (d: string) => `https://wa.me/55${d}`

// Dados completos do comprador (só o admin vê CPF e endereço sem máscara).
export function BuyerInfo({ buyer }: { buyer: AdminOrderDetail['buyer'] }) {
  const a = buyer.address
  return (
    <InfoList
      items={[
        { label: 'Nome', value: buyer.name },
        { label: 'Nome social', value: buyer.socialName },
        {
          label: 'Celular',
          value: buyer.phone && (
            <a
              href={whatsappUrl(buyer.phone)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-watercourse-800 hover:underline"
            >
              <WhatsappLogoIcon weight="fill" className="size-4" />
              {formatPhone(buyer.phone)}
            </a>
          ),
        },
        { label: 'CPF', value: formatCpf(buyer.cpf) },
        { label: 'E-mail', value: buyer.email },
        { label: 'Nascimento', value: buyer.birthDate && formatDate(buyer.birthDate) },
        {
          label: 'Endereço',
          value:
            a &&
            `${a.street}, ${a.number}${a.complement ? ` (${a.complement})` : ''} · ${a.district} · ${a.city}/${a.state} · CEP ${a.zipCode.replace(/^(\d{5})(\d{3})$/, '$1-$2')}`,
        },
        { label: 'Referência', value: a?.reference },
      ]}
    />
  )
}
