import { type FormEvent, useState } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import { Alert, Button, Input, Select } from '@/shared/components'
import type { PrizeKind } from '@/shared/types'
import { prizeKinds } from '../constants'
import { useRaffleMutation } from '../hooks/useAdminRaffles'
import { adminRafflesApi } from '../services/admin-raffles.api'
import type { AdminRaffle, PrizeInput } from '../types'
import { PrizeCard } from './PrizeCard'

export function PrizesEditor({ raffle }: { raffle: AdminRaffle }) {
  const finished = raffle.status === 'CLOSED' || raffle.status === 'DRAWN'
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<PrizeKind>('ITEM')
  const create = useRaffleMutation((input: PrizeInput) => adminRafflesApi.createPrize(raffle.id, input))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate({ title, kind }, { onSuccess: () => setTitle('') })
  }

  return (
    <div className="flex flex-col gap-4">
      {raffle.prizes.map((p) => (
        <PrizeCard key={p.id} raffle={raffle} prize={p} />
      ))}

      {!finished && (
        <form
          onSubmit={submit}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-cream-300 bg-cream-100/70 p-4"
        >
          <div className="min-w-56 flex-1">
            <Input
              label="Novo prêmio"
              required
              minLength={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Onix 0km"
            />
          </div>
          <div className="w-56">
            <Select
              label="Tipo"
              options={prizeKinds}
              value={kind}
              onChange={(e) => setKind(e.target.value as PrizeKind)}
            />
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
