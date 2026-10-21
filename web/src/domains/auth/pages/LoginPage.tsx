import { Navigate, useLocation, useNavigate } from 'react-router'
import { Card, FullPageSpinner } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { LoginForm } from '../components/LoginForm'
import { useSession } from '../hooks/useSession'

export function LoginPage() {
  useDocumentTitle('Entrar')
  const { data: user, isLoading } = useSession()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/admin'

  if (isLoading) return <FullPageSpinner />
  if (user?.role === 'ADMIN') return <Navigate to={from} replace />

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-6 text-xl font-bold text-gray-900">Painel administrativo</h1>
        <LoginForm onSuccess={() => navigate(from, { replace: true })} />
      </Card>
    </main>
  )
}
