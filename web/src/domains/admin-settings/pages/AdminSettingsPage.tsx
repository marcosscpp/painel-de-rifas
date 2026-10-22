import { FloppyDiskIcon, InstagramLogoIcon, WhatsappLogoIcon } from '@phosphor-icons/react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { Alert, Button, Card, FullPageSpinner, Input, PageHeader, Select } from '@/shared/components'
import { centsToInput, formatCents, maskPhoneInput, parseMoneyToCents } from '@/shared/utils/format'
import { useAdminSettings, useSaveSettings } from '../hooks/useSettings'
import type { SiteSettings } from '../types'

const ages = [16, 17, 18, 19, 20, 21].map((n) => ({ value: String(n), label: `${n} anos` }))

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
  const [f, setF] = useState({
    siteName: initial.siteName,
    pixFee: centsToInput(initial.pixFeeCents),
    reservationMinutes: String(initial.reservationMinutes),
    minBuyerAge: String(initial.minBuyerAge),
    supportWhatsapp: maskPhoneInput(initial.supportWhatsapp),
    whatsappGroupUrl: initial.whatsappGroupUrl,
    instagramUrl: initial.instagramUrl,
  })
  const [saved, setSaved] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    setSaved(false)
    setF((s) => ({ ...s, [k]: k === 'supportWhatsapp' ? maskPhoneInput(e.target.value) : e.target.value }))
  }
  const feeCents = f.pixFee.trim() === '' ? 0 : parseMoneyToCents(f.pixFee)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (feeCents === null) return
    save.mutate(
      {
        siteName: f.siteName,
        pixFeeCents: feeCents,
        reservationMinutes: Number(f.reservationMinutes),
        minBuyerAge: Number(f.minBuyerAge),
        supportWhatsapp: f.supportWhatsapp.replace(/\D/g, ''),
        whatsappGroupUrl: f.whatsappGroupUrl,
        instagramUrl: f.instagramUrl,
      },
      { onSuccess: () => setSaved(true) },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Section title="Site" description="Nome mostrado no título das páginas e nos avisos.">
        <Input label="Nome do site" required minLength={2} maxLength={40} value={f.siteName} onChange={set('siteName')} />
      </Section>

      <Section title="Checkout" description="Valem para os próximos pedidos. Pedidos já criados mantêm o que foi combinado.">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="Taxa do Pix por pedido (R$)"
            inputMode="decimal"
            placeholder="1,99"
            value={f.pixFee}
            onChange={set('pixFee')}
            error={feeCents === null ? 'Valor inválido. Exemplo: 1,99' : undefined}
            hint={feeCents ? `O comprador paga ${formatCents(feeCents)} a mais em cada pedido` : 'Sem taxa para o comprador'}
          />
          <Input
            label="Tempo para pagar (minutos)"
            type="number"
            min={5}
            max={60}
            required
            value={f.reservationMinutes}
            onChange={set('reservationMinutes')}
            hint="Depois disso os números voltam para a venda (5 a 60)"
          />
          <Select label="Idade mínima do comprador" options={ages} value={f.minBuyerAge} onChange={set('minBuyerAge')} />
        </div>
      </Section>

      <Section title="Contato" description="Aparecem para o comprador no site e depois da compra. Deixe vazio para esconder.">
        <Input
          label="WhatsApp de suporte"
          inputMode="tel"
          placeholder="(11) 98765-4321"
          leftIcon={<WhatsappLogoIcon className="size-4" />}
          value={f.supportWhatsapp}
          onChange={set('supportWhatsapp')}
        />
        <Input
          label="Link do grupo de WhatsApp"
          type="url"
          placeholder="https://chat.whatsapp.com/..."
          leftIcon={<WhatsappLogoIcon className="size-4" />}
          value={f.whatsappGroupUrl}
          onChange={set('whatsappGroupUrl')}
        />
        <Input
          label="Instagram"
          type="url"
          placeholder="https://instagram.com/..."
          leftIcon={<InstagramLogoIcon className="size-4" />}
          value={f.instagramUrl}
          onChange={set('instagramUrl')}
        />
      </Section>

      {save.error && <Alert tone="error">{save.error.message}</Alert>}
      {saved && <Alert tone="success">Configurações salvas.</Alert>}
      <Button type="submit" loading={save.isPending} disabled={feeCents === null} className="self-start">
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
