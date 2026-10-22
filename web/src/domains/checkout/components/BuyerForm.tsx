import { useEffect } from 'react'
import { FormProvider } from 'react-hook-form'
import { ArrowLeftIcon, LightningIcon, MapPinIcon, UserCircleIcon } from '@phosphor-icons/react'
import { Button, Input, MaskedInput } from '@/shared/components'
import { useZodForm } from '@/shared/hooks/useZodForm'
import { maskCpfInput, maskDateInput, maskPhoneInput } from '@/shared/utils/format'
import { useCheckoutSettings } from '../hooks/useOrder'
import { buyerSchema } from '../schemas'
import type { BuyerDraft, BuyerInput } from '../types'
import { AddressFields } from './AddressFields'

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

// Cadastro do comprador, com os mesmos campos do Wesley Alemão. Sem senha: celular + CPF
// identificam a pessoa. O rascunho sobe para quem chama, para não perder o que foi digitado
// se ela fechar o modal. Validação no schema (Zod) via React Hook Form.
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
  const minAge = useCheckoutSettings().data?.minBuyerAge ?? 18
  const form = useZodForm(buyerSchema(minAge), { defaultValues: value })
  const {
    control,
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = form
  const showSocialName = watch('showSocialName')
  const wantsAddress = watch('wantsAddress')

  useEffect(() => {
    const sub = watch((v) => onChange(v as BuyerDraft))
    return () => sub.unsubscribe()
  }, [watch, onChange])

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3.5">
        <div>
          <Input
            label="Nome completo"
            maxLength={80}
            autoComplete="name"
            placeholder="Informe seu nome e sobrenome"
            error={errors.name?.message}
            {...register('name')}
          />
          {!showSocialName && (
            <button
              type="button"
              onClick={() => form.setValue('showSocialName', true)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-grey-600 hover:text-watercourse-800"
            >
              <UserCircleIcon className="size-3.5" />
              Informar o nome social
            </button>
          )}
        </div>
        {showSocialName && (
          <Input
            label="Nome social (opcional)"
            maxLength={80}
            placeholder="Como você prefere ser chamado"
            error={errors.socialName?.message}
            {...register('socialName')}
          />
        )}

        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="grid grid-cols-2 gap-3">
          <MaskedInput
            control={control}
            name="phone"
            mask={maskPhoneInput}
            label="Celular"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(11) 98765-4321"
          />
          <MaskedInput
            control={control}
            name="phoneConfirm"
            mask={maskPhoneInput}
            label="Confirme o celular"
            inputMode="tel"
            autoComplete="off"
            onPaste={(e) => e.preventDefault()} // obriga a digitar de novo: é a conferência
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MaskedInput
            control={control}
            name="birthDate"
            mask={maskDateInput}
            label="Data de nascimento"
            inputMode="numeric"
            autoComplete="bday"
            placeholder="dd/mm/aaaa"
            hint={`Maiores de ${minAge} anos`}
          />
          <MaskedInput control={control} name="cpf" mask={maskCpfInput} label="CPF" inputMode="numeric" placeholder="000.000.000-00" />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-charcoal-900">
          <input type="checkbox" className="size-4 accent-watercourse-800" {...register('wantsAddress')} />
          <MapPinIcon className="size-4 text-watercourse-700" />
          Desejo informar o meu endereço
        </label>

        {wantsAddress && <AddressFields />}

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-cream-200 bg-cream-100/70 p-3 text-xs text-slate-grey-700">
            <input type="checkbox" className="mt-0.5 size-4 accent-watercourse-800" {...register('accepted')} />
            <span>{acceptText(minAge)}</span>
          </label>
          {errors.accepted && <p className="mt-1 text-xs font-medium text-error-600">{errors.accepted.message}</p>}
        </div>
        <Button type="submit" variant="buy" loading={submitting} className="py-3.5 text-base">
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
    </FormProvider>
  )
}
