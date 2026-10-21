import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { type BuyerDraft, type BuyerInput, BuyerForm, emptyBuyer, useCreateOrder } from '@/domains/checkout'
import { Alert, Button, Card } from '@/shared/components'
import { ApiError } from '@/shared/lib/http'
import { cn } from '@/shared/utils/cn'
import { formatCents, padNumber } from '@/shared/utils/format'
import type { RaffleDetail } from '../types'

export type BuyMode = 'quantity' | 'pick'

type Props = {
  raffle: RaffleDetail
  mode: BuyMode
  onModeChange: (m: BuyMode) => void
  selected: Set<number>
  onDeselect: (numbers: number[]) => void
}

export function BuyBox({ raffle, mode, onModeChange, selected, onDeselect }: Props) {
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const initial = raffle.packages.find((p) => p.highlighted)?.quantity ?? raffle.minPerOrder
  const [qty, setQty] = useState(initial)
  const [step, setStep] = useState<'choose' | 'buyer'>('choose')
  const [notice, setNotice] = useState<string>()
  const [buyer, setBuyer] = useState<BuyerDraft>(emptyBuyer)
  // Chave de idempotência da tentativa atual: reenviar (clique duplo, rede caindo) não duplica o pedido.
  const attemptKey = useRef<string | null>(null)

  const clamp = (n: number) => Math.max(raffle.minPerOrder, Math.min(raffle.maxPerOrder, raffle.progress.available, n || 0))
  const count = mode === 'pick' ? selected.size : qty
  const canPick = raffle.saleMode !== 'QUANTITY'
  const canQty = raffle.saleMode !== 'PICK'

  if (raffle.status !== 'ACTIVE') {
    const msg = raffle.status === 'PAUSED' ? 'Vendas pausadas no momento.' : 'Vendas encerradas.'
    return <Alert tone="warning">{msg}</Alert>
  }
  if (raffle.progress.available === 0) return <Alert tone="warning">Todos os números foram reservados ou vendidos.</Alert>

  const valid = count >= raffle.minPerOrder && count <= raffle.maxPerOrder

  const buy = (input: BuyerInput) => {
    attemptKey.current ??= crypto.randomUUID()
    setNotice(undefined)
    createOrder.mutate(
      {
        raffleSlug: raffle.slug,
        ...(mode === 'pick' ? { numbers: [...selected].sort((a, b) => a - b) } : { quantity: qty }),
        buyer: input,
        idempotencyKey: attemptKey.current,
      },
      {
        onSuccess: (order) => {
          attemptKey.current = null
          navigate(`/pedido/${order.id}`)
        },
        onError: (err) => {
          // Números escolhidos que alguém reservou antes: tira da seleção e avisa.
          const taken = err instanceof ApiError ? (err.details as { unavailable?: number[] } | null)?.unavailable : undefined
          if (taken?.length) {
            attemptKey.current = null
            onDeselect(taken)
            setStep('choose')
            setNotice(
              `Os números ${taken.map((n) => padNumber(n, raffle.totalNumbers)).join(', ')} acabaram de ser reservados por outra pessoa. Escolha outros.`,
            )
          }
        },
      },
    )
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      {canPick && canQty && step === 'choose' && (
        <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm font-medium">
          {(['quantity', 'pick'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={cn('rounded-md py-2', mode === m ? 'bg-white shadow-sm' : 'text-gray-600')}
            >
              {m === 'quantity' ? 'Aleatórios' : 'Escolher números'}
            </button>
          ))}
        </div>
      )}

      {step === 'choose' && mode === 'quantity' && (
        <>
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
        </>
      )}

      {step === 'choose' && mode === 'pick' && (
        <p className="text-center text-sm text-gray-600">
          {selected.size
            ? `${selected.size} número(s) selecionado(s) na grade`
            : `Escolha seus números na grade (até ${raffle.maxPerOrder}).`}
        </p>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-600">
          {count} × {formatCents(raffle.priceCents)}
        </p>
        <p className="text-2xl font-bold text-gray-900">{formatCents(count * raffle.priceCents)}</p>
        <p className="text-xs text-gray-500">+ taxa do Pix no pagamento</p>
      </div>

      {notice && <Alert tone="warning">{notice}</Alert>}

      {step === 'choose' ? (
        <Button type="button" disabled={!valid} className="py-3 text-base" onClick={() => setStep('buyer')}>
          {mode === 'pick' && !selected.size ? 'Selecione os números' : 'Continuar'}
        </Button>
      ) : (
        <>
          {createOrder.error && !(createOrder.error instanceof ApiError && createOrder.error.status === 409 && notice) && (
            <Alert tone="error">{createOrder.error.message}</Alert>
          )}
          <BuyerForm
            value={buyer}
            onChange={setBuyer}
            submitLabel={`Reservar e pagar ${formatCents(count * raffle.priceCents)}`}
            submitting={createOrder.isPending}
            onSubmit={buy}
            onCancel={() => setStep('choose')}
          />
        </>
      )}
    </Card>
  )
}
