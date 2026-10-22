import { useState } from 'react'
import {
  ArrowSquareOutIcon,
  ChartBarIcon,
  GearSixIcon,
  ListIcon,
  ReceiptIcon,
  SignOutIcon,
  SquaresFourIcon,
  TicketIcon,
  TrophyIcon,
  UsersIcon,
  XIcon,
} from '@phosphor-icons/react'
import { Link, NavLink, Outlet } from 'react-router'
import { useLogout, useSession } from '@/domains/auth'
import { BrandMark, Spinner } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

const nav = [
  { to: '/admin', label: 'Dashboard', icon: SquaresFourIcon, end: true },
  { to: '/admin/rifas', label: 'Rifas', icon: TicketIcon },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ReceiptIcon },
  { to: '/admin/compradores', label: 'Compradores', icon: UsersIcon },
  { to: '/admin/sorteios', label: 'Sorteios', icon: TrophyIcon },
  { to: '/admin/relatorios', label: 'Relatórios', icon: ChartBarIcon },
  { to: '/admin/configuracoes', label: 'Configurações', icon: GearSixIcon },
]

export function AdminLayout() {
  const { data: user } = useSession()
  const logout = useLogout()
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarContent = (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-watercourse-800/80 px-5 py-4">
        <BrandMark tone="dark" />
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1.5 text-cream-200 hover:bg-watercourse-900 md:hidden"
          aria-label="Fechar menu"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition',
                  isActive
                    ? 'gold-gradient font-bold text-charcoal-950 shadow-sm ring-1 ring-anzac-300/80'
                    : 'font-medium text-cream-100/80 hover:bg-watercourse-900 hover:text-cream-50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon weight={isActive ? 'fill' : 'regular'} className="size-5 shrink-0" />
                  {item.label}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Rodapé unificado: perfil + ações rápidas (Ver loja / Sair) */}
      <div className="shrink-0 border-t border-watercourse-800/80 p-3">
        <div className="rounded-2xl border border-watercourse-800/90 bg-watercourse-900/55 p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-watercourse-800 font-wide text-sm font-bold text-anzac-300 ring-1 ring-anzac-400/35">
              {user?.name?.charAt(0).toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-cream-50">{user?.name ?? 'Administrador'}</p>
              <p className="truncate text-[11px] text-cream-200/60">{user?.email}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-watercourse-800/80 pt-2.5">
            <Link
              to="/"
              target="_blank"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-watercourse-700/80 bg-watercourse-800/60 px-2.5 py-1.5 text-xs font-semibold text-cream-100 transition hover:border-anzac-400/50 hover:bg-watercourse-800 hover:text-anzac-300"
            >
              <ArrowSquareOutIcon weight="bold" className="size-3.5" />
              Ver loja
            </Link>

            <button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-error-500/35 bg-error-500/15 px-2.5 py-1.5 text-xs font-semibold text-error-300 transition hover:border-error-500 hover:bg-error-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {logout.isPending ? <Spinner className="size-3.5" /> : <SignOutIcon weight="bold" className="size-3.5" />}
              Sair
            </button>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-cream-100 md:flex-row">
      {/* Topbar Mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-watercourse-800 bg-watercourse-950 px-4 py-3 text-cream-50 md:hidden">
        <BrandMark tone="dark" size="sm" />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-watercourse-800 bg-watercourse-900 px-3 py-1.5 text-xs font-semibold text-anzac-300"
        >
          <ListIcon className="size-4" />
          Menu
        </button>
      </header>

      {/* Drawer Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-charcoal-950/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex h-dvh w-64 flex-col overflow-hidden bg-watercourse-950 text-cream-50 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col self-start overflow-hidden border-r border-watercourse-900 bg-watercourse-950 text-cream-50 md:flex">
        {sidebarContent}
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
