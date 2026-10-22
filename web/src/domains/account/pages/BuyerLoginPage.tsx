import { SignInIcon } from '@phosphor-icons/react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { BuyerLookupForm, useBuyerSession } from '@/domains/checkout'
import { FullPageSpinner } from '@/shared/components'
import { AuthShell } from '../components/AuthShell'
import { safeNext } from '../nav'

// Entrar sem senha: celular + CPF do cadastro (o site lembra a pessoa por 90 dias).
export function BuyerLoginPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const session = useBuyerSession()

  if (session.isLoading) return <FullPageSpinner />
  if (session.data) return <Navigate to={next} replace />

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acompanhe suas compras e seus números"
      icon={<SignInIcon weight="bold" className="size-5" />}
      footer={
        <>
          Ainda não tem cadastro?{' '}
          <Link to={`/cadastrar?next=${encodeURIComponent(next)}`} className="font-bold text-watercourse-800 hover:underline">
            Cadastre-se
          </Link>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-grey-700">Informe o celular e o CPF usados no cadastro ou na compra.</p>
      <BuyerLookupForm onFound={() => navigate(next, { replace: true })} submitLabel="Entrar" />
    </AuthShell>
  )
}
