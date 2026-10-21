import { NavLink, Outlet } from 'react-router'
import { useLogout, useSession } from '@/domains/auth'
import { Button } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

const nav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/rifas', label: 'Rifas' },
  { to: '/admin/pedidos', label: 'Pedidos' },
  { to: '/admin/compradores', label: 'Compradores' },
  { to: '/admin/sorteios', label: 'Sorteios' },
  { to: '/admin/configuracoes', label: 'Configurações' },
]

export function AdminLayout() {
  const { data: user } = useSession()
  const logout = useLogout()

  return (
    <div className="flex min-h-dvh bg-gray-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-white md:flex">
        <div className="px-5 py-4 text-lg font-bold text-emerald-700">Painel</div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-100',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-4 text-sm">
          <p className="truncate text-gray-700">{user?.name}</p>
          <Button variant="ghost" className="mt-2 w-full" loading={logout.isPending} onClick={() => logout.mutate()}>
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
