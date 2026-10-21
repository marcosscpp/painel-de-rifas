import { LightningIcon, LockKeyIcon, ShieldCheckIcon, SparkleIcon, TicketIcon } from '@phosphor-icons/react'
import { Link, NavLink, Outlet } from 'react-router'
import { BrandMark } from '@/shared/components'
import { env } from '@/shared/config/env'
import { cn } from '@/shared/utils/cn'

const currentYear = new Date().getFullYear()

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-cream-100 text-charcoal-900">
      <header className="sticky top-0 z-30 border-b border-cream-200 border-t-2 border-t-anzac-400 bg-cream-50/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="group">
            <BrandMark name={env.appName} subtitle="Loteria Federal" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition sm:inline-flex',
                  isActive
                    ? 'bg-watercourse-50 text-watercourse-800'
                    : 'text-slate-grey-700 hover:bg-cream-200/60 hover:text-charcoal-900',
                )
              }
            >
              <SparkleIcon weight="duotone" className="size-4 text-anzac-500" />
              Campanhas
            </NavLink>

            <NavLink
              to="/meus-numeros"
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition shadow-2xs',
                  isActive
                    ? 'border-watercourse-800 bg-watercourse-800 text-cream-50'
                    : 'border-cream-300 bg-cream-50 text-charcoal-900 hover:border-anzac-400 hover:bg-white',
                )
              }
            >
              <TicketIcon weight="duotone" className="size-4.5 text-anzac-500" />
              <span>Meus números</span>
            </NavLink>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-cream-200 bg-watercourse-950 text-cream-100">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid gap-6 border-b border-watercourse-800/70 pb-6 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-anzac-400/30 bg-watercourse-900 text-anzac-400">
                <ShieldCheckIcon weight="duotone" className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-cream-50">Sorteio Audível</p>
                <p className="text-xs text-cream-200/70">Resultados oficiais pela Loteria Federal</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-anzac-400/30 bg-watercourse-900 text-anzac-400">
                <LightningIcon weight="duotone" className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-cream-50">Baixa Instantânea</p>
                <p className="text-xs text-cream-200/70">Confirmação automática via Pix 24h</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-anzac-400/30 bg-watercourse-900 text-anzac-400">
                <LockKeyIcon weight="duotone" className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-cream-50">Compra Protegida</p>
                <p className="text-xs text-cream-200/70">Seus bilhetes vinculados ao seu telefone</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 text-xs text-cream-200/60 sm:flex-row">
            <BrandMark name={env.appName} tone="dark" size="sm" />
            <p>© {currentYear} {env.appName} · Sorteios baseados na Loteria Federal.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
