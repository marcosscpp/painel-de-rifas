import { InstagramLogoIcon, UsersThreeIcon, WhatsappLogoIcon } from '@phosphor-icons/react'
import { useSiteSettings } from '@/shared/hooks/useSiteSettings'
import { cn } from '@/shared/utils/cn'
import { whatsappUrl } from '@/shared/utils/format'

type Props = { tone?: 'light' | 'card'; className?: string }

// Contatos que o admin preenche em Configurações. Some sozinho quando nenhum foi preenchido.
export function ContactLinks({ tone = 'light', className }: Props) {
  const s = useSiteSettings().data
  if (!s) return null
  const links = [
    s.supportWhatsapp && { href: whatsappUrl(s.supportWhatsapp), icon: WhatsappLogoIcon, label: 'Suporte no WhatsApp' },
    s.whatsappGroupUrl && { href: s.whatsappGroupUrl, icon: UsersThreeIcon, label: 'Grupo no WhatsApp' },
    s.instagramUrl && { href: s.instagramUrl, icon: InstagramLogoIcon, label: 'Instagram' },
  ].filter(Boolean) as { href: string; icon: typeof WhatsappLogoIcon; label: string }[]
  if (links.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-2.5', className)}>
      {links.map(({ href, icon: Icon, label }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition',
            tone === 'card'
              ? 'border-watercourse-200 bg-watercourse-50 text-watercourse-900 hover:border-watercourse-400'
              : 'border-watercourse-200/80 bg-white text-watercourse-900 hover:border-anzac-400 hover:text-anzac-700',
          )}
        >
          <Icon weight="fill" className="size-4" />
          {label}
        </a>
      ))}
    </div>
  )
}
