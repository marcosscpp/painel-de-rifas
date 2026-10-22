import { FloppyDiskIcon, InstagramLogoIcon, WhatsappLogoIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { z } from 'zod'
import { Alert, Button, Card, FullPageSpinner, Input, MaskedInput, PageHeader, Select } from '@/shared/components'
import { useZodForm } from '@/shared/hooks/useZodForm'
import { onlyDigits, zIntString, zOptionalHttps } from '@/shared/lib/validators'
import { centsToInput, formatCents, maskPhoneInput, parseMoneyToCents } from '@/shared/utils/format'
import { useAdminSettings, useSaveSettings } from '../hooks/useSettings'
import type { SiteSettings } from '../types'

const ages = [16, 17, 18, 19, 20, 21].map((n) => ({ value: String(n), label: `${n} anos` }))

const schema = z
  .object({
    siteName: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(40, 'Até 40 caracteres'),
    // Taxa vazia = sem taxa para o comprador; até R$ 20.
    pixFee: z.string().refine((v) => {
      const c = v.trim() === '' ? 0 : parseMoneyToCents(v)
      return c !== null && c <= 2000
    }, 'Valor de R$ 0,00 a R$ 20,00'),
    reservationMinutes: zIntString(5, 60, 'De 5 a 60 minutos'),
    minBuyerAge: zIntString(16, 21, 'De 16 a 21 anos'),
    supportWhatsapp: z
      .string()
      .transform(onlyDigits)
      .refine((d) => d === '' || (d.length >= 10 && d.length <= 13), 'DDD + número'),
    whatsappGroupUrl: zOptionalHttps('O link precisa começar com https://'),
    instagramUrl: zOptionalHttps('O link precisa começar com https://'),
  })
  .transform(({ pixFee, ...v }): SiteSettings => ({ ...v, pixFeeCents: pixFee.trim() === '' ? 0 : (parseMoneyToCents(pixFee) ?? 0) }))

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="grid gap-4 bg-white p-5 md:grid-cols-[14rem_1fr]">
      <div>
        <h2 className="font-wide font-bold text-charcoal-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-grey-600">{description}</p>
      </div>
      <div className="flex flex-col gap-3.5">{children}</div>
    </Card>
  )
}

function SettingsForm({ initial }: { initial: SiteSettings }) {
  const save = useSaveSettings()
  const {
    control,
    register,
    watch,
    reset,
    getValues,
    handleSubmit,
    formState: { errors, isDirty },
  } = useZodForm(schema, {
    defaultValues: {
      siteName: initial.siteName,
      pixFee: centsToInput(initial.pixFeeCents),
      reservationMinutes: String(initial.reservationMinutes),
      minBuyerAge: String(initial.minBuyerAge),
      supportWhatsapp: maskPhoneInput(initial.supportWhatsapp),
      whatsappGroupUrl: initial.whatsappGroupUrl,
      instagramUrl: initial.instagramUrl,
    },
  })
  const pixFee = watch('pixFee')
  const feeCents = pixFee.trim() === '' ? 0 : parseMoneyToCents(pixFee)

  return (
    <form
      onSubmit={handleSubmit((input) => save.mutate(input, { onSuccess: () => reset(getValues()) }))}
      noValidate
      className="flex flex-col gap-4"
    >
      <Section title="Site" description="Nome mostrado no título das páginas e nos avisos.">
        <Input label="Nome do site" maxLength={40} error={errors.siteName?.message} {...register('siteName')} />
      </Section>

      <Section title="Checkout" description="Valem para os próximos pedidos. Pedidos já criados mantêm o que foi combinado.">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="Taxa do Pix por pedido (R$)"
            inputMode="decimal"
            placeholder="1,99"
            error={errors.pixFee?.message}
            hint={feeCents ? `O comprador paga ${formatCents(feeCents)} a mais em cada pedido` : 'Sem taxa para o comprador'}
            {...register('pixFee')}
          />
          <Input
            label="Tempo para pagar (minutos)"
            type="number"
            error={errors.reservationMinutes?.message}
            hint="Depois disso os números voltam para a venda (5 a 60)"
            {...register('reservationMinutes')}
          />
          <Select label="Idade mínima do comprador" options={ages} {...register('minBuyerAge')} />
        </div>
      </Section>

      <Section title="Contato" description="Aparecem para o comprador no site e depois da compra. Deixe vazio para esconder.">
        <MaskedInput
          control={control}
          name="supportWhatsapp"
          mask={maskPhoneInput}
          label="WhatsApp de suporte"
          inputMode="tel"
          placeholder="(11) 98765-4321"
          leftIcon={<WhatsappLogoIcon className="size-4" />}
        />
        <Input
          label="Link do grupo de WhatsApp"
          type="url"
          placeholder="https://chat.whatsapp.com/..."
          leftIcon={<WhatsappLogoIcon className="size-4" />}
          error={errors.whatsappGroupUrl?.message}
          {...register('whatsappGroupUrl')}
        />
        <Input
          label="Instagram"
          type="url"
          placeholder="https://instagram.com/..."
          leftIcon={<InstagramLogoIcon className="size-4" />}
          error={errors.instagramUrl?.message}
          {...register('instagramUrl')}
        />
      </Section>

      {save.error && <Alert tone="error">{save.error.message}</Alert>}
      {save.isSuccess && !isDirty && <Alert tone="success">Configurações salvas.</Alert>}
      <Button type="submit" loading={save.isPending} className="self-start">
        <FloppyDiskIcon weight="bold" className="size-4" />
        Salvar configurações
      </Button>
    </form>
  )
}

export function AdminSettingsPage() {
  const { data, isLoading, error } = useAdminSettings()
  return (
    <>
      <PageHeader title="Configurações" subtitle="Regras do checkout e contatos do site" />
      {isLoading && <FullPageSpinner />}
      {error && <Alert tone="error">{error.message}</Alert>}
      {data && <SettingsForm initial={data} />}
    </>
  )
}
