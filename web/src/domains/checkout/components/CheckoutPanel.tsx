import { type FormEvent, useState } from 'react'
import { LightningIcon, ShieldCheckIcon, UserCheckIcon } from '@phosphor-icons/react'
import { Button, Checkbox, Spinner } from '@/shared/components'
import { useBuyerLogout, useBuyerSession } from '../hooks/useBuyer'
import { useCheckoutSettings } from '../hooks/useOrder'
import type { BuyerDraft, BuyerInput } from '../types'
import { BuyerForm } from './BuyerForm'
import { BuyerLookupForm } from './BuyerLookupForm'

type Props = {
  draft: BuyerDraft
  onDraftChange: (d: BuyerDraft) => void
  submitLabel: string
  submitting: boolean
  // buyer undefined = comprar como o comprador já identificado neste navegador
  onSubmit: (buyer?: BuyerInput) => void
  onCancel: () => void
}

// Conteúdo do modal de checkout, como no Wesley Alemão:
// - quem já é conhecido vê "Comprando como Maria · Trocar" e compra em um clique;
// - quem é novo preenche o cadastro;
// - "Já comprei antes" identifica por celular + CPF.
export function CheckoutPanel({ draft, onDraftChange, submitLabel, submitting, onSubmit, onCancel }: Props) {
  const session = useBuyerSession()
  const logout = useBuyerLogout()
  const minAge = useCheckoutSettings().data?.minBuyerAge ?? 18
  const [view, setView] = useState<'form' | 'lookup'>('form')
  const [accepted, setAccepted] = useState(false)

  if (session.isLoading) {
    return (
      <div className="flex justify-center py-8 text-watercourse-700">
        <Spinner className="size-6" />
      </div>
    )
  }

  const buyer = session.data
  if (buyer) {
    const submit = (e: FormEvent) => {
      e.preventDefault()
      onSubmit()
    }
    return (
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-watercourse-200 bg-watercourse-50 p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <UserCheckIcon className="size-5 shrink-0 text-watercourse-700" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-grey-600">Comprando como</p>
              <p className="truncate text-sm font-bold text-charcoal-900">
                {buyer.name} <span className="font-normal text-slate-grey-600">· {buyer.phone}</span>
              </p>
            </div>
          </div>
          <Button type="button" variant="ghost" className="shrink-0 text-xs" loading={logout.isPending} onClick={() => logout.mutate()}>
            Trocar
          </Button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-slate-grey-600">
          <ShieldCheckIcon weight="fill" className="size-3.5 text-watercourse-700" />
          Seus dados já estão salvos. Os números ficam no seu cadastro.
        </p>
        <Checkbox
          boxed
          required
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          label={`Declaro ter ${minAge} anos ou mais e que li e concordo com o regulamento da campanha.`}
        />
        <Button type="submit" variant="buy" loading={submitting} className="py-3.5 text-base">
          <LightningIcon weight="fill" className="size-4.5" />
          {submitLabel}
        </Button>
      </form>
    )
  }

  if (view === 'lookup') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-grey-700">Informe o celular e o CPF que você usou na primeira compra.</p>
        <BuyerLookupForm onFound={() => setView('form')} onCancel={() => setView('form')} />
      </div>
    )
  }

  return (
    <BuyerForm
      value={draft}
      onChange={onDraftChange}
      submitLabel={submitLabel}
      submitting={submitting}
      onSubmit={onSubmit}
      onCancel={onCancel}
      onHaveAccount={() => setView('lookup')}
    />
  )
}
