import { type FormEvent, useState } from 'react'
import { FloppyDiskIcon } from '@phosphor-icons/react'
import { Alert, Button, Input, Select, Textarea } from '@/shared/components'
import type { SaleMode } from '@/shared/types'
import { centsToInput, formatCents, isoToLocalInput, localInputToIso, parseMoneyToCents } from '@/shared/utils/format'
import type { AdminRaffle, RaffleInput } from '../types'

const saleModes = [
  { value: 'BOTH', label: 'Quantidade e escolha de números' },
  { value: 'QUANTITY', label: 'Só por quantidade (números aleatórios)' },
  { value: 'PICK', label: 'Só escolhendo os números' },
]

type Props = {
  raffle?: AdminRaffle
  submitting: boolean
  error?: string
  submitLabel: string
  onSubmit: (input: RaffleInput) => void
}

export function RaffleDetailsForm({ raffle, submitting, error, submitLabel, onSubmit }: Props) {
  // Depois de publicada, preço, total de números e modo de venda ficam travados (a API também recusa).
  const locked = !!raffle && raffle.status !== 'DRAFT'

  const [f, setF] = useState({
    title: raffle?.title ?? '',
    slug: raffle?.slug ?? '',
    description: raffle?.description ?? '',
    rules: raffle?.rules ?? '',
    saleMode: (raffle?.saleMode ?? 'BOTH') as SaleMode,
    totalNumbers: String(raffle?.totalNumbers ?? 10000),
    price: centsToInput(raffle?.priceCents ?? null),
    minPerOrder: String(raffle?.minPerOrder ?? 1),
    maxPerOrder: String(raffle?.maxPerOrder ?? 500),
    endsAt: isoToLocalInput(raffle?.endsAt),
    drawDate: isoToLocalInput(raffle?.drawDate),
  })
  const [localError, setLocalError] = useState<string>()
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }))

  const priceCents = parseMoneyToCents(f.price)
  const total = Number(f.totalNumbers)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (priceCents === null || priceCents <= 0) return setLocalError('Preço inválido. Exemplo: 1,99')
    setLocalError(undefined)
    onSubmit({
      title: f.title,
      ...(raffle && { slug: f.slug }),
      description: f.description,
      rules: f.rules,
      saleMode: f.saleMode,
      totalNumbers: total,
      priceCents,
      minPerOrder: Number(f.minPerOrder),
      maxPerOrder: Number(f.maxPerOrder),
      endsAt: localInputToIso(f.endsAt),
      drawDate: localInputToIso(f.drawDate),
    })
  }

  const shownError = localError ?? error

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="Título" required minLength={3} maxLength={120} value={f.title} onChange={set('title')} />
      {raffle && (
        <Input
          label="Endereço (slug)"
          value={f.slug}
          onChange={set('slug')}
          disabled={locked}
          hint={`/rifa/${f.slug}`}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
        />
      )}
      <Textarea label="Descrição" required rows={4} maxLength={10000} value={f.description} onChange={set('description')} />
      <Textarea label="Regulamento" rows={6} maxLength={50000} value={f.rules} onChange={set('rules')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Modo de venda" options={saleModes} value={f.saleMode} onChange={set('saleMode')} disabled={locked} />
        <Input
          label="Preço por número (R$)"
          inputMode="decimal"
          required
          placeholder="1,99"
          value={f.price}
          onChange={set('price')}
          disabled={locked}
        />
        <Input
          label="Total de números"
          type="number"
          min={10}
          max={1000000}
          required
          value={f.totalNumbers}
          onChange={set('totalNumbers')}
          disabled={locked}
          hint={
            priceCents && total ? `Arrecadação máxima: ${formatCents(priceCents * total)}` : 'De 10 a 1.000.000'
          }
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Mín. por pedido" type="number" min={1} required value={f.minPerOrder} onChange={set('minPerOrder')} />
          <Input label="Máx. por pedido" type="number" min={1} required value={f.maxPerOrder} onChange={set('maxPerOrder')} />
        </div>
        <Input label="Fim das vendas" type="datetime-local" value={f.endsAt} onChange={set('endsAt')} hint="Opcional" />
        <Input label="Data do sorteio" type="datetime-local" value={f.drawDate} onChange={set('drawDate')} hint="Opcional" />
      </div>

      {locked && (
        <Alert tone="info">Rifa publicada: preço, total de números, modo de venda e endereço não mudam mais.</Alert>
      )}
      {shownError && <Alert tone="error">{shownError}</Alert>}

      <div>
        <Button type="submit" loading={submitting}>
          <FloppyDiskIcon weight="bold" className="size-4" />
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
