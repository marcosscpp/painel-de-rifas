import { Link, Outlet } from 'react-router'
import { env } from '@/shared/config/env'

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold text-emerald-700">
            {env.appName}
          </Link>
          <Link to="/meus-numeros" className="text-sm font-medium text-gray-700 hover:text-emerald-700">
            Meus números
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t bg-white py-4 text-center text-xs text-gray-500">
        Sorteios pela Loteria Federal.
      </footer>
    </div>
  )
}
