import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '@/domains/auth'
import { FullPageSpinner } from '@/shared/components'

// Só esconde telas: a proteção de verdade é a API, que recusa sem sessão de admin.
export function RequireAdmin() {
  const { data: user, isLoading } = useSession()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
