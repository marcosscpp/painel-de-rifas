import { PlusIcon } from '@phosphor-icons/react'
import { z } from 'zod'
import { Alert, Button, Input, Select } from '@/shared/components'
import { useZodForm } from '@/shared/hooks/useZodForm'
import { prizeKinds } from '../constants'
import { useRaffleMutation } from '../hooks/useAdminRaffles'
import { adminRafflesApi } from '../services/admin-raffles.api'
import type { AdminRaffle, PrizeInput } from '../types'
import { PrizeCard } from './PrizeCard'

const newPrizeSchema = z.object({
  title: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(120),
  kind: z.enum(['ITEM', 'MONEY']),
})

export function PrizesEditor({ raffle }: { raffle: AdminRaffle }) {
  const finished = raffle.status === 'CLOSED' || raffle.status === 'DRAWN'
  const create = useRaffleMutation((input: PrizeInput) => adminRafflesApi.createPrize(raffle.id, input))
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm(newPrizeSchema, { defaultValues: { title: '', kind: 'ITEM' } })

  const submit = handleSubmit((input) => create.mutate(input, { onSuccess: () => reset({ title: '', kind: input.kind }) }))

  return (
    <div className="flex flex-col gap-4">
      {raffle.prizes.map((p) => (
        <PrizeCard key={p.id} raffle={raffle} prize={p} />
      ))}

      {!finished && (
        <form
          onSubmit={submit}
          noValidate
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-cream-300 bg-cream-100/70 p-4"
        >
          <div className="min-w-56 flex-1">
            <Input label="Novo prêmio" placeholder="Ex.: Onix 0km" error={errors.title?.message} {...register('title')} />
          </div>
          <div className="w-56">
            <Select label="Tipo" options={prizeKinds} {...register('kind')} />
          </div>
          <Button type="submit" loading={create.isPending}>
            <PlusIcon weight="bold" className="size-4" />
            Adicionar
          </Button>
        </form>
      )}
      {create.error && <Alert tone="error">{create.error.message}</Alert>}
    </div>
  )
}
