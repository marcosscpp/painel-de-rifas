import { type FormEvent, useState } from 'react'
import { FloppyDiskIcon } from '@phosphor-icons/react'
import { Alert, Button, DateTimeField, Input, Select, Textarea } from '@/shared/components'
import type { SaleMode } from '@/shared/types'
import { centsToInput, formatCents, isoToLocalInput, localInputToIso, parseMoneyToCents } from '@/shared/utils/format'
import { isLotteryDay, nextLotteryDraws } from '@/shared/utils/dates'
import type { AdminRaffle, RaffleInput } from '../types'

// O admin decide como a rifa vende; o comprador não escolhe.
const saleModes = [
  { value: 'QUANTITY', label: 'Roleta: comprador escolhe a quantidade, números aleatórios' },
  { value: 'PICK', label: 'Grade: comprador escolhe os números' },
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
    saleMode: (raffle?.saleMode ?? 'QUANTITY') as SaleMode,
    totalNumbers: String(raffle?.totalNumbers ?? 10000),
    price: centsToInput(raffle?.priceCents ?? null),
    minPerOrder: String(raffle?.minPerOrder ?? 1),
    maxPerOrder: String(raffle?.maxPerOrder ?? 500),
    endsAt: isoToLocalInput(raffle?.endsAt),
    drawDate: isoToLocalInput(raffle?.drawDate),
  })
  const [localError, setLocalError] = useState<string>()
  const setValue = (k: keyof typeof f) => (value: string) => setF((s) => ({ ...s, [k]: value }))
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }))

  const priceCents = parseMoneyToCents(f.price)
  const total = Number(f.totalNumbers)

  // Fim das vendas antes do sorteio; o sorteio usa o resultado da Loteria Federal (quarta e sábado).
  const dateError =
    f.endsAt && f.drawDate && new Date(f.endsAt) > new Date(f.drawDate)
      ? 'O fim das vendas precisa ser antes do sorteio.'
      : undefined
  const drawHint =
    f.drawDate && !isLotteryDay(f.drawDate)
      ? 'Atenção: a Loteria Federal sorteia às quartas e aos sábados, às 19h.'
      : 'Opcional. Use o dia de um concurso da Loteria Federal.'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (priceCents === null || priceCents <= 0) return setLocalError('Preço inválido. Exemplo: 1,99')
    if (dateError) return setLocalError(dateError)
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
        <DateTimeField
          label="Fim das vendas"
          value={f.endsAt}
          onChange={setValue('endsAt')}
          defaultTime="18:00"
          hint="Opcional. Depois disso a rifa para de vender."
          error={dateError}
        />
        <DateTimeField
          label="Data do sorteio"
          value={f.drawDate}
          onChange={setValue('drawDate')}
          hint={drawHint}
          presets={nextLotteryDraws()}
        />
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
