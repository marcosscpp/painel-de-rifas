import type { FormEvent } from 'react'
import { ArrowLeftIcon, LightningIcon } from '@phosphor-icons/react'
import { Button, Input } from '@/shared/components'
import { maskCpfInput, maskPhoneInput } from '@/shared/utils/format'
import type { BuyerDraft, BuyerInput } from '../types'

type Props = {
  value: BuyerDraft
  onChange: (v: BuyerDraft) => void
  submitLabel: string
  submitting: boolean
  onSubmit: (buyer: BuyerInput) => void
  onCancel: () => void
}

// Dados do comprador. Sem senha: o telefone identifica as compras (consulta em "Meus números").
// Controlado por fora para não perder o que foi digitado se o comprador voltar e trocar os números.
export function BuyerForm({ value, onChange, submitLabel, submitting, onSubmit, onCancel }: Props) {
  const set = (patch: Partial<BuyerDraft>) => onChange({ ...value, ...patch })
  const phoneDigits = value.phone.replace(/\D/g, '')
  const phoneError = phoneDigits.length > 0 && phoneDigits.length < 10 ? 'Telefone incompleto' : undefined

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const cpf = value.cpf.replace(/\D/g, '')
    onSubmit({ name: value.name, phone: phoneDigits, ...(cpf && { cpf }) })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5 border-t border-cream-200 pt-3">
      <Input
        label="Nome completo"
        required
        minLength={3}
        maxLength={80}
        autoComplete="name"
        placeholder="Seu nome e sobrenome"
        value={value.name}
        onChange={(e) => set({ name: e.target.value })}
      />
      <Input
        label="WhatsApp / celular"
        required
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="(11) 98765-4321"
        value={value.phone}
        error={phoneError}
        onChange={(e) => set({ phone: maskPhoneInput(e.target.value) })}
      />
      <Input
        label="CPF (opcional)"
        inputMode="numeric"
        placeholder="000.000.000-00"
        value={value.cpf}
        onChange={(e) => set({ cpf: maskCpfInput(e.target.value) })}
      />
      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-cream-200 bg-cream-100/70 p-3 text-xs text-slate-grey-700">
        <input
          type="checkbox"
          required
          checked={value.accepted}
          onChange={(e) => set({ accepted: e.target.checked })}
          className="mt-0.5 size-4 accent-watercourse-800"
        />
        <span>Declaro que tenho 18 anos ou mais e concordo com o regulamento da campanha.</span>
      </label>
      <Button type="submit" variant="buy" loading={submitting} disabled={!!phoneError} className="py-3.5 text-base">
        <LightningIcon weight="fill" className="size-4.5" />
        {submitLabel}
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        <ArrowLeftIcon weight="bold" className="size-4" />
        Voltar para as cotas
      </Button>
    </form>
  )
}
