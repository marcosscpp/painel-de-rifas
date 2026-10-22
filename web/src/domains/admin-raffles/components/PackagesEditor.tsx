import { useFieldArray } from 'react-hook-form'
import { FloppyDiskIcon, PlusIcon, SparkleIcon, TrashIcon } from '@phosphor-icons/react'
import { Alert, Button, Checkbox, MaskedInput } from '@/shared/components'
import { useZodForm } from '@/shared/hooks/useZodForm'
import { formatCents, maskDigits } from '@/shared/utils/format'
import { useRaffleMutation } from '../hooks/useAdminRaffles'
import { packagesSchema } from '../schemas'
import { adminRafflesApi } from '../services/admin-raffles.api'
import type { AdminRaffle } from '../types'

type Items = Array<{ quantity: number; highlighted: boolean }>

// Pacotes promocionais ("+10", "+50"): atalhos de quantidade na página da rifa.
export function PackagesEditor({ raffle }: { raffle: AdminRaffle }) {
  const finished = raffle.status === 'CLOSED' || raffle.status === 'DRAWN'
  const save = useRaffleMutation((items: Items) => adminRafflesApi.setPackages(raffle.id, items))
  const { control, register, watch, handleSubmit } = useZodForm(packagesSchema(raffle.minPerOrder, raffle.maxPerOrder), {
    defaultValues: { rows: raffle.packages.map((p) => ({ quantity: String(p.quantity), highlighted: p.highlighted })) },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'rows' })
  const rows = watch('rows')

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v.rows))} noValidate className="flex flex-col gap-3">
      {fields.length === 0 && <p className="text-sm text-slate-grey-600">Nenhum pacote. O comprador digita a quantidade.</p>}
      {fields.map((field, i) => {
        const qty = Number(rows[i]?.quantity)
        return (
          <div key={field.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-cream-200 bg-cream-100/60 p-3">
            <MaskedInput
              control={control}
              name={`rows.${i}.quantity`}
              mask={maskDigits(7)}
              inputMode="numeric"
              aria-label="Quantidade do pacote"
              placeholder="Qtd."
              className="font-mono font-bold"
              wrapperClassName="w-28"
              disabled={finished}
            />
            <span className="w-28 text-sm font-semibold text-watercourse-800">
              {qty > 0 ? formatCents(qty * raffle.priceCents) : '-'}
            </span>
            <Checkbox
              label="Destaque"
              icon={<SparkleIcon weight="fill" className="size-4 text-anzac-500" />}
              disabled={finished}
              {...register(`rows.${i}.highlighted`)}
            />
            <Button
              type="button"
              variant="ghost"
              className="ml-auto text-error-600 hover:bg-error-50"
              disabled={finished}
              onClick={() => remove(i)}
            >
              <TrashIcon className="size-4" />
              Remover
            </Button>
          </div>
        )
      })}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          disabled={finished || fields.length >= 12}
          onClick={() => append({ quantity: '', highlighted: false })}
        >
          <PlusIcon weight="bold" className="size-4" />
          Adicionar pacote
        </Button>
        <Button type="submit" loading={save.isPending} disabled={finished}>
          <FloppyDiskIcon weight="bold" className="size-4" />
          Salvar pacotes
        </Button>
      </div>
      {save.isSuccess && !save.isPending && <Alert tone="success">Pacotes salvos.</Alert>}
      {save.error && <Alert tone="error">{save.error.message}</Alert>}
    </form>
  )
}
