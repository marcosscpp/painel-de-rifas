import { useState } from 'react'
import { Alert, Button, Card } from '@/shared/components'
import { cn } from '@/shared/utils/cn'
import { formatCents } from '@/shared/utils/format'
import type { RaffleDetail } from '../types'

// Escolha da quantidade. O botão de compra liga na etapa de pedidos + Pix.
export function BuyBox({ raffle }: { raffle: RaffleDetail }) {
  const initial = raffle.packages.find((p) => p.highlighted)?.quantity ?? raffle.minPerOrder
  const [qty, setQty] = useState(initial)
  const clamp = (n: number) => Math.max(raffle.minPerOrder, Math.min(raffle.maxPerOrder, raffle.progress.available, n || 0))

  if (raffle.status !== 'ACTIVE') {
    const msg = raffle.status === 'PAUSED' ? 'Vendas pausadas no momento.' : 'Vendas encerradas.'
    return <Alert tone="warning">{msg}</Alert>
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      {raffle.packages.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {raffle.packages.map((p) => (
            <button
              key={p.quantity}
              type="button"
              onClick={() => setQty(clamp(p.quantity))}
              className={cn(
                'relative rounded-lg border px-2 pb-2 pt-3 text-center text-sm font-semibold transition',
                qty === p.quantity ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-300 hover:border-emerald-400',
              )}
            >
              {p.highlighted && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-2 text-[10px] leading-4 text-white">
                  Mais escolhido
                </span>
              )}
              +{p.quantity}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <Button type="button" variant="secondary" aria-label="Menos" onClick={() => setQty((q) => clamp(q - 1))}>
          −
        </Button>
        <input
          type="number"
          aria-label="Quantidade de números"
          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-semibold"
          value={qty}
          min={raffle.minPerOrder}
          max={raffle.maxPerOrder}
          onChange={(e) => setQty(Number(e.target.value))}
          onBlur={() => setQty((q) => clamp(q))}
        />
        <Button type="button" variant="secondary" aria-label="Mais" onClick={() => setQty((q) => clamp(q + 1))}>
          +
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600">Total</p>
        <p className="text-2xl font-bold text-gray-900">{formatCents(qty * raffle.priceCents)}</p>
        <p className="text-xs text-gray-500">+ taxa do Pix no pagamento</p>
      </div>

      <Button type="button" disabled className="py-3 text-base">
        Comprar (em breve)
      </Button>
    </Card>
  )
}
