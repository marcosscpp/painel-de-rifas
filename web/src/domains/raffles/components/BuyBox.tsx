import { useRef, useState } from 'react'
import {
  LightningIcon,
  MinusIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparkleIcon,
  TicketIcon,
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { type BuyerDraft, type BuyerInput, BuyerForm, emptyBuyer, useCreateOrder } from '@/domains/checkout'
import { Alert, Button, Card, Input, Modal } from '@/shared/components'
import { ApiError } from '@/shared/lib/http'
import { cn } from '@/shared/utils/cn'
import { formatCents, padNumber } from '@/shared/utils/format'
import type { RaffleDetail } from '../types'

export type BuyMode = 'quantity' | 'pick'

type Props = {
  raffle: RaffleDetail
  mode: BuyMode // definido pelo admin na rifa
  selected: Set<number>
  onDeselect: (numbers: number[]) => void
}

export function BuyBox({ raffle, mode, selected, onDeselect }: Props) {
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const initial = raffle.packages.find((p) => p.highlighted)?.quantity ?? raffle.minPerOrder
  const [qty, setQty] = useState(initial)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [notice, setNotice] = useState<string>()
  const [buyer, setBuyer] = useState<BuyerDraft>(emptyBuyer)
  // Chave de idempotência da tentativa atual: reenviar (clique duplo, rede caindo) não duplica o pedido.
  const attemptKey = useRef<string | null>(null)

  const clamp = (n: number) =>
    Math.max(raffle.minPerOrder, Math.min(raffle.maxPerOrder, raffle.progress.available, n || 0))
  const count = mode === 'pick' ? selected.size : qty

  if (raffle.status !== 'ACTIVE') {
    const msg = raffle.status === 'PAUSED' ? 'Vendas pausadas no momento.' : 'Vendas encerradas.'
    return <Alert tone="warning">{msg}</Alert>
  }
  if (raffle.progress.available === 0) {
    return <Alert tone="warning">Todos os números foram reservados ou vendidos.</Alert>
  }

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
            setCheckoutOpen(false)
            setNotice(
              `Os números ${taken.map((n) => padNumber(n, raffle.totalNumbers)).join(', ')} acabaram de ser reservados por outra pessoa. Escolha outros.`,
            )
          }
        },
      },
    )
  }

  return (
    <Card className="overflow-hidden border-cream-300 p-0 shadow-md">
      {/* Cabeçalho Royal Teal */}
      <div className="royal-gradient flex items-center justify-between px-5 py-4 text-cream-50">
        <div className="flex items-center gap-2">
          <TicketIcon weight="duotone" className="size-5 text-anzac-400" />
          <span className="font-wide text-sm font-bold">Garanta suas cotas</span>
        </div>
        <span className="rounded-lg border border-anzac-400/30 bg-watercourse-950/50 px-2.5 py-1 text-xs font-bold text-anzac-300">
          {formatCents(raffle.priceCents)} / cota
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {mode === 'quantity' && (
          <>
            {raffle.packages.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {raffle.packages.map((p) => {
                  const active = qty === p.quantity
                  return (
                    <button
                      key={p.quantity}
                      type="button"
                      onClick={() => setQty(clamp(p.quantity))}
                      className={cn(
                        'relative cursor-pointer rounded-xl border px-2 pb-2.5 pt-3.5 text-center transition',
                        active
                          ? 'border-watercourse-800 bg-watercourse-50 text-watercourse-900 ring-2 ring-watercourse-700/30'
                          : p.highlighted
                            ? 'border-anzac-400 bg-anzac-50/70 text-charcoal-900 hover:border-anzac-500'
                            : 'border-cream-300 bg-white text-charcoal-900 hover:border-anzac-400',
                      )}
                    >
                      {p.highlighted && (
                        <span className="gold-gradient absolute -top-2.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold text-charcoal-950 shadow-2xs">
                          <SparkleIcon weight="fill" className="size-2.5" />
                          Popular
                        </span>
                      )}
                      <span className="font-wide block text-base font-extrabold">+{p.quantity}</span>
                      <span className="block text-[11px] text-slate-grey-600">cotas</span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                aria-label="Menos"
                className="size-11 p-0"
                onClick={() => setQty((q) => clamp(q - 1))}
              >
                <MinusIcon weight="bold" className="size-4" />
              </Button>
              <Input
                type="number"
                aria-label="Quantidade de números"
                className="w-28 bg-white px-3 py-2 text-center font-mono text-lg font-bold"
                value={qty}
                min={raffle.minPerOrder}
                max={raffle.maxPerOrder}
                onChange={(e) => setQty(Number(e.target.value))}
                onBlur={() => setQty((q) => clamp(q))}
              />
              <Button
                type="button"
                variant="secondary"
                aria-label="Mais"
                className="size-11 p-0"
                onClick={() => setQty((q) => clamp(q + 1))}
              >
                <PlusIcon weight="bold" className="size-4" />
              </Button>
            </div>
          </>
        )}

        {mode === 'pick' && (
          <div className="rounded-xl border border-cream-200 bg-cream-100/70 p-3 text-center text-sm text-slate-grey-700">
            {selected.size ? (
              <span className="font-semibold text-watercourse-800">
                {selected.size} número(s) selecionado(s) na grade
              </span>
            ) : (
              `Escolha seus números na grade ao lado (até ${raffle.maxPerOrder}).`
            )}
          </div>
        )}

        <div className="rounded-2xl border border-cream-200 bg-cream-100/80 p-4 text-center">
          <p className="text-xs font-medium text-slate-grey-600">
            {count} × {formatCents(raffle.priceCents)}
          </p>
          <p className="font-wide mt-0.5 text-3xl font-extrabold text-charcoal-900">
            {formatCents(count * raffle.priceCents)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-watercourse-800">
            <LightningIcon weight="fill" className="size-3.5 text-anzac-500" />
            Reserva imediata · + taxa do Pix no pagamento
          </p>
        </div>

        {notice && <Alert tone="warning">{notice}</Alert>}

        <Button
          type="button"
          variant="buy"
          disabled={!valid}
          className="py-3.5 text-base"
          onClick={() => {
            setNotice(undefined)
            setCheckoutOpen(true)
          }}
        >
          <TicketIcon weight="bold" className="size-5" />
          {mode === 'pick' && !selected.size ? 'Selecione os números' : 'Continuar para reserva'}
        </Button>

        <Modal
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          busy={createOrder.isPending}
          title="Checkout"
          footer={
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-grey-600">
              <ShieldCheckIcon weight="fill" className="size-4 text-watercourse-700" />
              Compra <strong className="text-charcoal-900">100% segura</strong> via Pix
            </p>
          }
        >
          <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-cream-200 bg-cream-100/70 p-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-grey-600">Você está adquirindo</p>
              <p className="font-wide truncate text-sm font-bold text-charcoal-900">{raffle.title}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-slate-grey-600">{count} {count === 1 ? 'número' : 'números'}</p>
              <p className="font-wide text-base font-extrabold text-watercourse-900">{formatCents(count * raffle.priceCents)}</p>
            </div>
          </div>
          {createOrder.error && !(createOrder.error instanceof ApiError && createOrder.error.status === 409 && notice) && (
            <div className="mb-3">
              <Alert tone="error">{createOrder.error.message}</Alert>
            </div>
          )}
          <BuyerForm
            value={buyer}
            onChange={setBuyer}
            submitLabel={`Reservar e pagar ${formatCents(count * raffle.priceCents)}`}
            submitting={createOrder.isPending}
            onSubmit={buy}
            onCancel={() => setCheckoutOpen(false)}
          />
        </Modal>
      </div>
    </Card>
  )
}
