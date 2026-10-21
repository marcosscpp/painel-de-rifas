import { useState } from 'react'
import { FloppyDiskIcon, PlusIcon, SparkleIcon, TrashIcon } from '@phosphor-icons/react'
import { Alert, Button, Input } from '@/shared/components'
import { formatCents } from '@/shared/utils/format'
import { useRaffleMutation } from '../hooks/useAdminRaffles'
import { adminRafflesApi } from '../services/admin-raffles.api'
import type { AdminRaffle } from '../types'

type Row = { quantity: string; highlighted: boolean }

// Pacotes promocionais ("+10", "+50"): atalhos de quantidade na página da rifa.
export function PackagesEditor({ raffle }: { raffle: AdminRaffle }) {
  const finished = raffle.status === 'CLOSED' || raffle.status === 'DRAWN'
  const [rows, setRows] = useState<Row[]>(() =>
    raffle.packages.map((p) => ({ quantity: String(p.quantity), highlighted: p.highlighted })),
  )
  const save = useRaffleMutation((items: Row[]) =>
    adminRafflesApi.setPackages(
      raffle.id,
      items.map((r) => ({ quantity: Number(r.quantity), highlighted: r.highlighted })),
    ),
  )

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 && (
        <p className="text-sm text-slate-grey-600">Nenhum pacote. O comprador digita a quantidade.</p>
      )}
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-cream-200 bg-cream-100/60 p-3"
        >
          <Input
            type="number"
            min={raffle.minPerOrder}
            max={raffle.maxPerOrder}
            aria-label="Quantidade do pacote"
            placeholder="Qtd."
            className="w-28 bg-white py-2 font-mono font-bold"
            value={r.quantity}
            disabled={finished}
            onChange={(e) => update(i, { quantity: e.target.value })}
          />
          <span className="w-28 text-sm font-semibold text-watercourse-800">
            {Number(r.quantity) > 0 ? formatCents(Number(r.quantity) * raffle.priceCents) : '-'}
          </span>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-charcoal-900">
            <input
              type="checkbox"
              checked={r.highlighted}
              disabled={finished}
              className="size-4 accent-anzac-500"
              onChange={(e) => update(i, { highlighted: e.target.checked })}
            />
            <SparkleIcon weight="fill" className="size-4 text-anzac-500" />
            Destaque
          </label>
          <Button
            type="button"
            variant="ghost"
            className="ml-auto text-error-600 hover:bg-error-50"
            disabled={finished}
            onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
          >
            <TrashIcon className="size-4" />
            Remover
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          disabled={finished || rows.length >= 12}
          onClick={() => setRows((rs) => [...rs, { quantity: '', highlighted: false }])}
        >
          <PlusIcon weight="bold" className="size-4" />
          Adicionar pacote
        </Button>
        <Button type="button" loading={save.isPending} disabled={finished} onClick={() => save.mutate(rows)}>
          <FloppyDiskIcon weight="bold" className="size-4" />
          Salvar pacotes
        </Button>
      </div>
      {save.isSuccess && !save.isPending && <Alert tone="success">Pacotes salvos.</Alert>}
      {save.error && <Alert tone="error">{save.error.message}</Alert>}
    </div>
  )
}
