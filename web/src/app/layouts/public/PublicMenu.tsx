import {
  HeadsetIcon,
  HouseIcon,
  IdentificationCardIcon,
  MegaphoneIcon,
  NewspaperIcon,
  SignInIcon,
  SignOutIcon,
  SparkleIcon,
  TicketIcon,
  TrophyIcon,
  UserPlusIcon,
  XIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router'
import { useBuyerLogout, useBuyerSession } from '@/domains/checkout'
import { BrandMark } from '@/shared/components'
import { useSiteSettings } from '@/shared/hooks/useSiteSettings'
import { whatsappUrl } from '@/shared/utils/format'
import { MenuItem, MenuSection } from './nav-items'

// Menu de tela cheia (referência: "Olá, Nome" + atalhos e seções Principal / Minha conta / Comunidade).
export function PublicMenu({ onClose }: { onClose: () => void }) {
  const buyer = useBuyerSession().data
  const logout = useBuyerLogout()
  const support = useSiteSettings().data?.supportWhatsapp

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-watercourse-950 text-cream-50">
      <div className="border-b border-watercourse-800/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3.5">
          <div className="size-9" />
          <BrandMark tone="dark" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-watercourse-800 bg-watercourse-900/70 text-cream-100 transition hover:border-anzac-400 hover:text-anzac-300"
          >
            <XIcon weight="bold" className="size-4.5" />
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
        {buyer ? (
          <div className="flex items-center gap-3 rounded-2xl border border-watercourse-800 bg-watercourse-900/55 p-5 shadow-lg">
            <span className="gold-gradient flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-charcoal-950">
              {buyer.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="font-wide text-base font-bold">Olá, {buyer.name}</p>
              {buyer.phone && <p className="text-xs text-cream-200/75">{buyer.phone}</p>}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-watercourse-800 bg-watercourse-900/55 p-5 shadow-lg">
            <h2 className="font-wide text-base font-bold text-cream-50">Entre para acompanhar seus números</h2>
            <p className="mt-1 text-xs text-cream-200/75">Consulte compras, números e prêmios em um só lugar.</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                to="/entrar"
                onClick={onClose}
                className="gold-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-charcoal-950 shadow-xs transition hover:brightness-105"
              >
                <SignInIcon weight="bold" className="size-4" />
                Entrar
              </Link>
              <Link
                to="/cadastrar"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl border border-watercourse-700 bg-watercourse-900 px-4 py-2.5 text-xs font-semibold text-cream-100 transition hover:border-anzac-400 hover:text-anzac-300"
              >
                <UserPlusIcon weight="bold" className="size-4" />
                Cadastrar
              </Link>
            </div>
          </div>
        )}

        <MenuSection title="Principal">
          <MenuItem to="/" icon={HouseIcon} label="Início" onClick={onClose} />
          <MenuItem href="/#campanhas" icon={TicketIcon} label="Campanhas" onClick={onClose} />
          <MenuItem href="/#ganhadores" icon={TrophyIcon} label="Ganhadores" onClick={onClose} />
        </MenuSection>

        {buyer && (
          <MenuSection title="Minha conta">
            <MenuItem to="/meus-numeros" icon={SparkleIcon} label="Minhas compras" onClick={onClose} />
            <MenuItem to="/minha-conta" icon={IdentificationCardIcon} label="Meus dados" onClick={onClose} />
            <MenuItem
              icon={SignOutIcon}
              label="Sair"
              onClick={() => {
                logout.mutate()
                onClose()
              }}
            />
          </MenuSection>
        )}

        <MenuSection title="Comunidade">
          <MenuItem href="#duvidas" icon={MegaphoneIcon} label="Avisos oficiais" onClick={onClose} />
          <MenuItem href="#duvidas" icon={NewspaperIcon} label="Artigos e novidades" onClick={onClose} />
          <MenuItem
            href={support ? whatsappUrl(support) : '#duvidas'}
            external={!!support}
            icon={HeadsetIcon}
            label="Suporte"
            onClick={onClose}
          />
        </MenuSection>

        <div className="space-y-1.5 pt-2">
          <p className="px-1 text-[11px] font-bold tracking-wider text-cream-200/50 uppercase">Legal</p>
          <p className="px-1 text-xs text-cream-200/75">Termos · Privacidade · Cookies</p>
        </div>
      </div>
    </div>
  )
}
