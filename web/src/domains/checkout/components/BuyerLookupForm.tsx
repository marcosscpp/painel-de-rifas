import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { z } from 'zod'
import { Alert, Button, MaskedInput } from '@/shared/components'
import { useZodForm } from '@/shared/hooks/useZodForm'
import { zCpf, zPhone } from '@/shared/lib/validators'
import { maskCpfInput, maskPhoneInput } from '@/shared/utils/format'
import { useBuyerLookup } from '../hooks/useBuyer'

type Props = {
  onFound: () => void
  onCancel?: () => void
  cancelLabel?: string
  submitLabel?: string
}

const schema = z.object({ phone: zPhone, cpf: zCpf })

// Identifica quem já comprou: celular + CPF do mesmo cadastro (sem senha).
export function BuyerLookupForm({ onFound, onCancel, cancelLabel = 'Fazer cadastro', submitLabel = 'Continuar' }: Props) {
  const lookup = useBuyerLookup()
  const { control, handleSubmit } = useZodForm(schema, { defaultValues: { phone: '', cpf: '' } })

  return (
    <form onSubmit={handleSubmit((v) => lookup.mutate(v, { onSuccess: onFound }))} noValidate className="flex flex-col gap-3.5">
      <MaskedInput
        control={control}
        name="phone"
        mask={maskPhoneInput}
        label="Celular"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="(11) 98765-4321"
      />
      <MaskedInput control={control} name="cpf" mask={maskCpfInput} label="CPF" inputMode="numeric" placeholder="000.000.000-00" />
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
