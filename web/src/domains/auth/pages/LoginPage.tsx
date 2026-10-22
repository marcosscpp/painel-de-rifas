import { LockKeyIcon } from '@phosphor-icons/react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { BrandMark, Card, FullPageSpinner } from '@/shared/components'
import { env } from '@/shared/config/env'
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
    <main className="flex min-h-dvh items-center justify-center bg-cream-100 p-4">
      <Card className="w-full max-w-md overflow-hidden border-cream-300 p-0 shadow-lg">
        <div className="royal-gradient flex flex-col items-center gap-3 px-6 py-7 text-center text-cream-50">
          <BrandMark name={env.appName} subtitle="Acesso Restrito" tone="dark" />
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-anzac-400/35 bg-watercourse-950/50 px-3 py-1 text-xs font-semibold text-anzac-300">
            <LockKeyIcon className="size-3.5" />
            Painel Administrativo
          </div>
        </div>
        <div className="p-6 sm:p-7">
          <LoginForm onSuccess={() => navigate(from, { replace: true })} />
        </div>
      </Card>
    </main>
  )
}
