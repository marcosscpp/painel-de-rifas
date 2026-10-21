import type { FormEvent } from 'react'
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
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input
        label="Nome completo"
        required
        minLength={3}
        maxLength={80}
        autoComplete="name"
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
      <label className="flex items-start gap-2 text-xs text-gray-600">
        <input type="checkbox" required checked={value.accepted} onChange={(e) => set({ accepted: e.target.checked })} className="mt-0.5" />
        Tenho 18 anos ou mais e li o regulamento.
      </label>
      <Button type="submit" loading={submitting} disabled={!!phoneError} className="py-3 text-base">
        {submitLabel}
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        Voltar
      </Button>
    </form>
  )
}
