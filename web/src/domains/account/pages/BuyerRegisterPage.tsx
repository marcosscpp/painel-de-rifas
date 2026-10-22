import { UserPlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { BuyerForm, emptyBuyer, useBuyerRegister, useBuyerSession } from '@/domains/checkout'
import { Alert, FullPageSpinner } from '@/shared/components'
import { AuthShell } from '../components/AuthShell'
import { safeNext } from '../nav'

// Cadastro fora do checkout, com os mesmos campos do Wesley Alemão. Já entra ao concluir.
export function BuyerRegisterPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const session = useBuyerSession()
  const register = useBuyerRegister()
  const [draft, setDraft] = useState(emptyBuyer)

  if (session.isLoading) return <FullPageSpinner />
  if (session.data) return <Navigate to={next} replace />

  return (
    <AuthShell
      title="Cadastrar"
      subtitle="Crie sua conta para comprar e acompanhar seus números"
      icon={<UserPlusIcon weight="bold" className="size-5" />}
      footer={
        <>
          Já tem cadastro?{' '}
          <Link to={`/entrar?next=${encodeURIComponent(next)}`} className="font-bold text-watercourse-800 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        {register.error && <Alert tone="error">{register.error.message}</Alert>}
        <BuyerForm
          value={draft}
          onChange={setDraft}
          submitLabel="Criar conta"
          submitting={register.isPending}
          onSubmit={(buyer) => register.mutate(buyer, { onSuccess: () => navigate(next, { replace: true }) })}
          acceptText={(age) => `Declaro ter ${age} anos ou mais e concordo com os termos de uso e a política de privacidade.`}
        />
      </div>
    </AuthShell>
  )
}
