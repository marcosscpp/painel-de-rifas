import { useState } from 'react'
import {
  LightningIcon,
  ListIcon,
  ShieldCheckIcon,
  SparkleIcon,
  TicketIcon,
  TrophyIcon,
  WalletIcon,
} from '@phosphor-icons/react'
import { Link, Outlet } from 'react-router'
import { AgeSeal, BrandMark } from '@/shared/components'
import { env } from '@/shared/config/env'
import { AccountButton } from './public/AccountButton'
import { HeaderTab } from './public/nav-items'
import { PublicMenu } from './public/PublicMenu'

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

            <AccountButton />
          </div>
        </div>

        {/* Barra de Abas (Campanhas | Meus números | Ganhadores) */}
        <div className="border-b border-watercourse-900 bg-watercourse-950/95">
          <nav className="mx-auto grid max-w-2xl grid-cols-3 gap-2.5 px-4 py-2.5">
            <HeaderTab to="/" end icon={SparkleIcon} label="Campanhas" />
            <HeaderTab to="/meus-numeros" icon={TicketIcon} label="Meus números" />
            <a
              href="/#ganhadores"
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-watercourse-800/90 bg-watercourse-900/30 py-2 text-xs font-semibold text-cream-200/75 transition hover:border-watercourse-700 hover:text-cream-50"
            >
              <WalletIcon className="size-4 text-cream-200/70" />
              <span>Ganhadores</span>
            </a>
          </nav>
        </div>
      </header>

      {menuOpen && <PublicMenu onClose={() => setMenuOpen(false)} />}

      {/* Conteúdo Principal */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      {/* Rodapé clean no estilo da referência */}
      <footer className="mx-auto w-full max-w-4xl px-4 pt-4 pb-10 text-center">
        <div className="flex flex-col items-center gap-5">
          <AgeSeal age={18} />

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-watercourse-900">
            <span className="inline-flex items-center gap-1.5">
              <TrophyIcon className="size-5 text-anzac-600" />
              Loteria Federal
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LightningIcon className="size-5 text-watercourse-700" />
              Pix Automático
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheckIcon className="size-5 text-watercourse-700" />
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
