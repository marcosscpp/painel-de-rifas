import { Controller } from 'react-hook-form'
import { FloppyDiskIcon } from '@phosphor-icons/react'
import { Alert, Button, DateTimeField, Input, MaskedInput, Select, Textarea } from '@/shared/components'
import { useZodForm } from '@/shared/hooks/useZodForm'
import { isLotteryDay, nextLotteryDraws } from '@/shared/utils/dates'
import { centsToInput, formatCents, isoToLocalInput, maskDigits, parseMoneyToCents } from '@/shared/utils/format'
import { raffleSchema, type RaffleFormValues } from '../schemas'
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

const toForm = (raffle?: AdminRaffle): RaffleFormValues => ({
  title: raffle?.title ?? '',
  slug: raffle?.slug ?? '',
  description: raffle?.description ?? '',
  rules: raffle?.rules ?? '',
  saleMode: raffle?.saleMode ?? 'QUANTITY',
  totalNumbers: String(raffle?.totalNumbers ?? 10000),
  price: centsToInput(raffle?.priceCents ?? null),
  minPerOrder: String(raffle?.minPerOrder ?? 1),
  maxPerOrder: String(raffle?.maxPerOrder ?? 500),
  endsAt: isoToLocalInput(raffle?.endsAt),
  drawDate: isoToLocalInput(raffle?.drawDate),
})

export function RaffleDetailsForm({ raffle, submitting, error, submitLabel, onSubmit }: Props) {
  // Depois de publicada, preço, total de números e modo de venda ficam travados (a API também recusa).
  const locked = !!raffle && raffle.status !== 'DRAFT'
  const {
    control,
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useZodForm(raffleSchema, { defaultValues: toForm(raffle) })

  const [price, totalNumbers, slug, drawDate] = watch(['price', 'totalNumbers', 'slug', 'drawDate'])
  const priceCents = parseMoneyToCents(price)
  const total = Number(totalNumbers)
  // O sorteio usa o resultado da Loteria Federal (quarta e sábado).
  const drawHint =
    drawDate && !isLotteryDay(drawDate)
      ? 'Atenção: a Loteria Federal sorteia às quartas e aos sábados, às 19h.'
      : 'Opcional. Use o dia de um concurso da Loteria Federal.'

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Input label="Título" maxLength={120} error={errors.title?.message} {...register('title')} />
      {raffle && (
        <Input
          label="Endereço (slug)"
          disabled={locked}
          hint={`/rifa/${slug}`}
          error={errors.slug?.message}
          {...register('slug')}
        />
      )}
      <Textarea label="Descrição" rows={4} maxLength={10000} error={errors.description?.message} {...register('description')} />
      <Textarea label="Regulamento" rows={6} maxLength={50000} error={errors.rules?.message} {...register('rules')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Modo de venda" options={saleModes} disabled={locked} {...register('saleMode')} />
        <Input
          label="Preço por número (R$)"
          inputMode="decimal"
          placeholder="1,99"
          disabled={locked}
          error={errors.price?.message}
          {...register('price')}
        />
        <MaskedInput
          control={control}
          name="totalNumbers"
          mask={maskDigits(7)}
          label="Total de números"
          inputMode="numeric"
          disabled={locked}
          hint={priceCents && total ? `Arrecadação máxima: ${formatCents(priceCents * total)}` : 'De 10 a 1.000.000'}
        />
        <div className="grid grid-cols-2 gap-4">
          <MaskedInput control={control} name="minPerOrder" mask={maskDigits(7)} label="Mín. por pedido" inputMode="numeric" />
          <MaskedInput control={control} name="maxPerOrder" mask={maskDigits(7)} label="Máx. por pedido" inputMode="numeric" />
        </div>
        <Controller
          control={control}
          name="endsAt"
          render={({ field, fieldState }) => (
            <DateTimeField
              label="Fim das vendas"
              value={field.value}
              onChange={field.onChange}
              defaultTime="18:00"
              hint="Opcional. Depois disso a rifa para de vender."
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="drawDate"
          render={({ field }) => (
            <DateTimeField
              label="Data do sorteio"
              value={field.value}
              onChange={field.onChange}
              hint={drawHint}
              presets={nextLotteryDraws()}
            />
          )}
        />
      </div>

      {locked && (
        <Alert tone="info">Rifa publicada: preço, total de números, modo de venda e endereço não mudam mais.</Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <div>
        <Button type="submit" loading={submitting}>
          <FloppyDiskIcon weight="bold" className="size-4" />
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
