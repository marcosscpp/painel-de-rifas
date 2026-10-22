import type { FormEvent } from 'react'
import { ArrowLeftIcon, LightningIcon, MapPinIcon, UserCircleIcon } from '@phosphor-icons/react'
import { Button, Input } from '@/shared/components'
import { dateInputToIso, maskCpfInput, maskDateInput, maskPhoneInput } from '@/shared/utils/format'
import { AddressFields } from './AddressFields'
import { useCheckoutSettings } from '../hooks/useOrder'
import type { BuyerDraft, BuyerInput } from '../types'

type Props = {
  value: BuyerDraft
  onChange: (v: BuyerDraft) => void
  submitLabel: string
  submitting: boolean
  onSubmit: (buyer: BuyerInput) => void
  onCancel?: () => void
  cancelLabel?: string
  onHaveAccount?: () => void
  haveAccountLabel?: string
  // Texto do aceite: no checkout fala do regulamento da campanha, no cadastro dos termos do site.
  acceptText?: (minAge: number) => string
}

const digits = (v: string) => v.replace(/\D/g, '')

// Cadastro do comprador, com os mesmos campos do Wesley Alemão. Sem senha: celular + CPF
// identificam a pessoa. Controlado por fora para não perder o que foi digitado se ela fechar o modal.
export function BuyerForm({
  value,
  onChange,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
  cancelLabel = 'Voltar para as cotas',
  onHaveAccount,
  haveAccountLabel = 'Já comprei antes',
  acceptText = (age) => `Ao concluir, declaro ter ${age} anos ou mais e que li e concordo com o regulamento da campanha.`,
}: Props) {
  const set = (patch: Partial<BuyerDraft>) => onChange({ ...value, ...patch })
  const minAge = useCheckoutSettings().data?.minBuyerAge ?? 18

  // Erros só depois de digitar o suficiente, para não brigar com quem ainda está preenchendo.
  const phone = digits(value.phone)
  const phoneConfirm = digits(value.phoneConfirm)
  const phoneError = phone.length > 0 && phone.length < 10 ? 'Celular incompleto' : undefined
  const confirmError =
    phoneConfirm.length >= 10 && phoneConfirm !== phone ? 'Os dois celulares não são iguais' : undefined
  const cpfError = digits(value.cpf).length > 0 && digits(value.cpf).length < 11 ? 'CPF incompleto' : undefined
  const birthIso = dateInputToIso(value.birthDate)
  const birthError = value.birthDate.length === 10 && !birthIso ? 'Data inválida' : undefined
  const nameError =
    value.name.trim().length > 3 && value.name.trim().split(/\s+/).length < 2 ? 'Informe nome e sobrenome' : undefined

  const blocked = !!(phoneError || confirmError || cpfError || birthError || nameError)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (blocked || !birthIso) return
    const a = value.address
    onSubmit({
      name: value.name.trim(),
      ...(value.showSocialName && value.socialName.trim() && { socialName: value.socialName.trim() }),
      phone,
      phoneConfirm,
      cpf: digits(value.cpf),
      birthDate: birthIso,
      email: value.email.trim(),
      ...(value.wantsAddress && {
        address: {
          zipCode: digits(a.zipCode),
          street: a.street,
          number: a.number,
          district: a.district,
          city: a.city,
          state: a.state,
          ...(a.complement && { complement: a.complement }),
          ...(a.reference && { reference: a.reference }),
        },
      }),
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <div>
        <Input
          label="Nome completo"
          required
          maxLength={80}
          autoComplete="name"
          placeholder="Informe seu nome e sobrenome"
          value={value.name}
          error={nameError}
          onChange={(e) => set({ name: e.target.value })}
        />
        {!value.showSocialName && (
          <button
            type="button"
            onClick={() => set({ showSocialName: true })}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-grey-600 hover:text-watercourse-800"
          >
            <UserCircleIcon className="size-3.5" />
            Informar o nome social
          </button>
        )}
      </div>
      {value.showSocialName && (
        <Input
          label="Nome social (opcional)"
          maxLength={80}
          placeholder="Como você prefere ser chamado"
          value={value.socialName}
          onChange={(e) => set({ socialName: e.target.value })}
        />
      )}

      <Input
        label="E-mail"
        type="email"
        required
        autoComplete="email"
        placeholder="voce@exemplo.com"
        value={value.email}
        onChange={(e) => set({ email: e.target.value })}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Celular"
          required
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(11) 98765-4321"
          value={value.phone}
          error={phoneError}
          onChange={(e) => set({ phone: maskPhoneInput(e.target.value) })}
        />
        <Input
          label="Confirme o celular"
          required
          inputMode="tel"
          autoComplete="off"
          onPaste={(e) => e.preventDefault()} // obriga a digitar de novo: é a conferência
          value={value.phoneConfirm}
          error={confirmError}
          onChange={(e) => set({ phoneConfirm: maskPhoneInput(e.target.value) })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Data de nascimento"
          required
          inputMode="numeric"
          autoComplete="bday"
          placeholder="dd/mm/aaaa"
          value={value.birthDate}
          error={birthError}
          hint={`Maiores de ${minAge} anos`}
          onChange={(e) => set({ birthDate: maskDateInput(e.target.value) })}
        />
        <Input
          label="CPF"
          required
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={value.cpf}
          error={cpfError}
          onChange={(e) => set({ cpf: maskCpfInput(e.target.value) })}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-charcoal-900">
        <input
          type="checkbox"
          checked={value.wantsAddress}
          onChange={(e) => set({ wantsAddress: e.target.checked })}
          className="size-4 accent-watercourse-800"
        />
        <MapPinIcon className="size-4 text-watercourse-700" />
        Desejo informar o meu endereço
      </label>

      {value.wantsAddress && <AddressFields value={value.address} onChange={(address) => set({ address })} />}

      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-cream-200 bg-cream-100/70 p-3 text-xs text-slate-grey-700">
        <input
          type="checkbox"
          required
          checked={value.accepted}
          onChange={(e) => set({ accepted: e.target.checked })}
          className="mt-0.5 size-4 accent-watercourse-800"
        />
        <span>{acceptText(minAge)}</span>
      </label>
      <Button type="submit" variant="buy" loading={submitting} disabled={blocked} className="py-3.5 text-base">
        <LightningIcon weight="fill" className="size-4.5" />
        {submitLabel}
      </Button>
      {onHaveAccount && (
        <Button type="button" variant="ghost" onClick={onHaveAccount}>
          {haveAccountLabel}
        </Button>
      )}
      {onCancel && (
        <Button type="button" variant="ghost" onClick={onCancel} className="text-xs">
          <ArrowLeftIcon weight="bold" className="size-4" />
          {cancelLabel}
        </Button>
      )}
    </form>
  )
}
