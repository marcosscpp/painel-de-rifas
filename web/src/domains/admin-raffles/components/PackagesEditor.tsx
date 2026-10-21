import { useState } from 'react'
import { Alert, Button } from '@/shared/components'
import { formatCents } from '@/shared/utils/format'
import { adminRafflesApi } from '../services/admin-raffles.api'
import { useRaffleMutation } from '../hooks/useAdminRaffles'
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
      {rows.length === 0 && <p className="text-sm text-gray-500">Nenhum pacote. O comprador digita a quantidade.</p>}
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={raffle.minPerOrder}
            max={raffle.maxPerOrder}
            aria-label="Quantidade do pacote"
            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={r.quantity}
            disabled={finished}
            onChange={(e) => update(i, { quantity: e.target.value })}
          />
          <span className="w-28 text-sm text-gray-600">
            {Number(r.quantity) > 0 ? formatCents(Number(r.quantity) * raffle.priceCents) : '-'}
          </span>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={r.highlighted}
              disabled={finished}
              onChange={(e) => update(i, { highlighted: e.target.checked })}
            />
            Destaque
          </label>
          <Button type="button" variant="ghost" disabled={finished} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
            Remover
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={finished || rows.length >= 12}
          onClick={() => setRows((rs) => [...rs, { quantity: '', highlighted: false }])}
        >
          Adicionar pacote
        </Button>
        <Button type="button" loading={save.isPending} disabled={finished} onClick={() => save.mutate(rows)}>
          Salvar pacotes
        </Button>
      </div>
      {save.isSuccess && !save.isPending && <Alert tone="success">Pacotes salvos.</Alert>}
      {save.error && <Alert tone="error">{save.error.message}</Alert>}
    </div>
  )
}
