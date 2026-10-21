import { useState } from 'react'
import {
  HeadsetIcon,
  HouseIcon,
  LightningIcon,
  ListIcon,
  MegaphoneIcon,
  NewspaperIcon,
  ShieldCheckIcon,
  SignInIcon,
  SparkleIcon,
  TicketIcon,
  TrophyIcon,
  WalletIcon,
  XIcon,
} from '@phosphor-icons/react'
import { Link, NavLink, Outlet } from 'react-router'
import { BrandMark } from '@/shared/components'
import { env } from '@/shared/config/env'
import { cn } from '@/shared/utils/cn'

const currentYear = new Date().getFullYear()

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col bg-cream-100 text-charcoal-900">
      {/* Header Escuro (estilo Wesley Alemão com identidade Royal Teal & Antique Gold) */}
      <header className="sticky top-0 z-30 bg-watercourse-950 text-cream-50 shadow-md">
        {/* Linha superior: Menu Hamburguer | Logo Central | Meus Títulos */}
        <div className="border-b border-watercourse-800/80">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              className="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl text-cream-100 transition hover:bg-watercourse-900 hover:text-anzac-400"
            >
              <ListIcon weight="bold" className="size-6" />
            </button>

            <Link to="/" className="group">
              <BrandMark name={env.appName} tone="dark" />
            </Link>

            <Link
              to="/meus-numeros"
              className="group flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-center transition hover:bg-watercourse-900"
            >
              <TicketIcon weight="duotone" className="size-5 text-cream-100 transition group-hover:text-anzac-400" />
              <span className="text-[11px] font-bold text-anzac-400">Meus números</span>
            </Link>
          </div>
        </div>

        {/* Barra de Abas (Campanhas | Meus números | Ganhadores) */}
        <div className="border-b border-watercourse-900 bg-watercourse-950/95">
          <nav className="mx-auto grid max-w-2xl grid-cols-3 gap-2.5 px-4 py-2.5">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold transition',
                  isActive
                    ? 'border-anzac-400 bg-watercourse-900/90 text-cream-50 shadow-2xs'
                    : 'border-watercourse-800/90 bg-watercourse-900/30 text-cream-200/75 hover:border-watercourse-700 hover:text-cream-50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <SparkleIcon
                    weight={isActive ? 'fill' : 'duotone'}
                    className={cn('size-4', isActive ? 'text-anzac-400' : 'text-cream-200/70')}
                  />
                  <span>Campanhas</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/meus-numeros"
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold transition',
                  isActive
                    ? 'border-anzac-400 bg-watercourse-900/90 text-cream-50 shadow-2xs'
                    : 'border-watercourse-800/90 bg-watercourse-900/30 text-cream-200/75 hover:border-watercourse-700 hover:text-cream-50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <TicketIcon
                    weight={isActive ? 'fill' : 'duotone'}
                    className={cn('size-4', isActive ? 'text-anzac-400' : 'text-cream-200/70')}
                  />
                  <span>Meus números</span>
                </>
              )}
            </NavLink>

            <a
              href="/#campanhas"
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-watercourse-800/90 bg-watercourse-900/30 py-2 text-xs font-semibold text-cream-200/75 transition hover:border-watercourse-700 hover:text-cream-50"
            >
              <WalletIcon weight="duotone" className="size-4 text-cream-200/70" />
              <span>Ganhadores</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Menu Overlay Fullscreen (Idêntico à referência com nossa paleta Royal Teal & Gold) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-watercourse-950 text-cream-50">
          <div className="border-b border-watercourse-800/80">
            <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3.5">
              <div className="size-9" />
              <BrandMark name={env.appName} tone="dark" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar menu"
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-watercourse-800 bg-watercourse-900/70 text-cream-100 transition hover:border-anzac-400 hover:text-anzac-300"
              >
                <XIcon weight="bold" className="size-4.5" />
              </button>
            </div>
          </div>

          <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
            {/* Card de Acesso Rápido */}
            <div className="rounded-2xl border border-watercourse-800 bg-watercourse-900/55 p-5 shadow-lg">
              <h2 className="font-wide text-base font-bold text-cream-50">Entre para acompanhar seus números</h2>
              <p className="mt-1 text-xs text-cream-200/75">
                Consulte compras, bilhetes e prêmios em um só lugar usando seu telefone.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Link
                  to="/meus-numeros"
                  onClick={() => setMenuOpen(false)}
                  className="gold-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-charcoal-950 shadow-xs transition hover:brightness-105"
                >
                  <SignInIcon weight="bold" className="size-4" />
                  Consultar números
                </Link>
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-watercourse-700 bg-watercourse-900 px-4 py-2.5 text-xs font-semibold text-cream-100 transition hover:border-anzac-400 hover:text-anzac-300"
                >
                  Ver campanhas
                </Link>
              </div>
            </div>

            {/* Seção PRINCIPAL */}
            <div className="space-y-2">
              <p className="px-1 text-[11px] font-bold tracking-wider text-cream-200/50 uppercase">Principal</p>
              <div className="flex flex-col gap-2">
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-watercourse-800/90 bg-watercourse-900/40 px-4 py-3.5 text-sm font-semibold text-cream-100 transition hover:border-anzac-400/50 hover:bg-watercourse-900"
                >
                  <HouseIcon weight="duotone" className="size-5 text-anzac-400" />
                  Início
                </Link>
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-watercourse-800/90 bg-watercourse-900/40 px-4 py-3.5 text-sm font-semibold text-cream-100 transition hover:border-anzac-400/50 hover:bg-watercourse-900"
                >
                  <TicketIcon weight="duotone" className="size-5 text-anzac-400" />
                  Campanhas
                </Link>
                <Link
                  to="/meus-numeros"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-watercourse-800/90 bg-watercourse-900/40 px-4 py-3.5 text-sm font-semibold text-cream-100 transition hover:border-anzac-400/50 hover:bg-watercourse-900"
                >
                  <SparkleIcon weight="duotone" className="size-5 text-anzac-400" />
                  Meus números
                </Link>
                <a
                  href="/#campanhas"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-watercourse-800/90 bg-watercourse-900/40 px-4 py-3.5 text-sm font-semibold text-cream-100 transition hover:border-anzac-400/50 hover:bg-watercourse-900"
                >
                  <TrophyIcon weight="duotone" className="size-5 text-anzac-400" />
                  Ganhadores
                </a>
              </div>
            </div>

            {/* Seção COMUNIDADE */}
            <div className="space-y-2">
              <p className="px-1 text-[11px] font-bold tracking-wider text-cream-200/50 uppercase">Comunidade</p>
              <div className="flex flex-col gap-2">
                <a
                  href="#duvidas"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-watercourse-800/90 bg-watercourse-900/40 px-4 py-3.5 text-sm font-semibold text-cream-100 transition hover:border-anzac-400/50 hover:bg-watercourse-900"
                >
                  <MegaphoneIcon weight="duotone" className="size-5 text-anzac-400" />
                  Avisos oficiais
                </a>
                <a
                  href="#duvidas"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-watercourse-800/90 bg-watercourse-900/40 px-4 py-3.5 text-sm font-semibold text-cream-100 transition hover:border-anzac-400/50 hover:bg-watercourse-900"
                >
                  <NewspaperIcon weight="duotone" className="size-5 text-anzac-400" />
                  Artigos e novidades
                </a>
                <a
                  href="#duvidas"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-watercourse-800/90 bg-watercourse-900/40 px-4 py-3.5 text-sm font-semibold text-cream-100 transition hover:border-anzac-400/50 hover:bg-watercourse-900"
                >
                  <HeadsetIcon weight="duotone" className="size-5 text-anzac-400" />
                  Suporte
                </a>
              </div>
            </div>

            {/* Seção LEGAL */}
            <div className="space-y-1.5 pt-2">
              <p className="px-1 text-[11px] font-bold tracking-wider text-cream-200/50 uppercase">Legal</p>
              <p className="px-1 text-xs text-cream-200/75">Termos · Privacidade · Cookies</p>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      {/* Rodapé clean no estilo da referência */}
      <footer className="mx-auto w-full max-w-4xl px-4 pt-4 pb-10 text-center">
        <div className="flex flex-col items-center gap-5">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-cream-300 bg-cream-50 px-4 py-1.5 shadow-2xs">
            <span className="rounded-md bg-charcoal-900 px-2 py-0.5 text-xs font-extrabold text-cream-50">18+</span>
            <span className="text-xs font-medium text-slate-grey-600">Permitido para maiores de 18 anos</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-watercourse-900">
            <span className="inline-flex items-center gap-1.5">
              <TrophyIcon weight="duotone" className="size-5 text-anzac-600" />
              Loteria Federal
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LightningIcon weight="duotone" className="size-5 text-watercourse-700" />
              Pix Automático
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheckIcon weight="duotone" className="size-5 text-watercourse-700" />
              Site 100% Seguro
            </span>
          </div>

          <p className="max-w-3xl text-[11px] leading-relaxed text-slate-grey-500">
            As campanhas e sorteios realizados na plataforma têm apuração baseada nas extrações oficiais da Loteria
            Federal. É proibida a venda de cotas para menores de dezoito anos. Antes de participar, consulte
            previamente o Regulamento e as Condições Gerais na página de cada campanha. Imagens meramente ilustrativas.
          </p>

          <p className="text-xs font-medium text-slate-grey-600">
            {currentYear} {env.appName} © - Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
