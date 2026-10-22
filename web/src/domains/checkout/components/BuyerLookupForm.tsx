import { type FormEvent, useState } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { Alert, Button, Input } from '@/shared/components'
import { maskCpfInput, maskPhoneInput } from '@/shared/utils/format'
import { useBuyerLookup } from '../hooks/useBuyer'

type Props = {
  onFound: () => void
  onCancel?: () => void
  cancelLabel?: string
  submitLabel?: string
}

// Identifica quem já comprou: celular + CPF do mesmo cadastro (sem senha).
export function BuyerLookupForm({ onFound, onCancel, cancelLabel = 'Fazer cadastro', submitLabel = 'Continuar' }: Props) {
  const lookup = useBuyerLookup()
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    lookup.mutate({ phone: phone.replace(/\D/g, ''), cpf: cpf.replace(/\D/g, '') }, { onSuccess: onFound })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <Input
        label="Celular"
        required
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="(11) 98765-4321"
        value={phone}
        onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
      />
      <Input
        label="CPF"
        required
        inputMode="numeric"
        placeholder="000.000.000-00"
        value={cpf}
        onChange={(e) => setCpf(maskCpfInput(e.target.value))}
      />
      {lookup.error && <Alert tone="error">{lookup.error.message}</Alert>}
      <Button type="submit" variant="primary" loading={lookup.isPending} className="py-3">
        <MagnifyingGlassIcon weight="bold" className="size-4" />
        {submitLabel}
      </Button>
      {onCancel && (
        <Button type="button" variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
    </form>
  )
}
