import { ArrowRightIcon, CalendarBlankIcon, LightningIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { type MyOrder, OrderStatusBadge } from '@/domains/checkout'
import { Card, CoverThumb } from '@/shared/components'
import { useCountdown } from '@/shared/hooks/useCountdown'
import { formatCents, formatDateTime, padNumber } from '@/shared/utils/format'

// Card de uma compra em "Minhas compras": status, números e o atalho para pagar enquanto dá tempo.
export function MyOrderCard({ order }: { order: MyOrder }) {
  const left = useCountdown(order.status === 'PENDING' ? order.expiresAt : null)
  const pending = order.status === 'PENDING' && left.seconds > 0
  const status = order.status === 'PENDING' && !pending ? 'EXPIRED' : order.status

  return (
    <Card className="flex flex-col gap-3 bg-white p-4">
      <div className="flex items-start gap-3">
        <CoverThumb cover={order.raffle.cover} />
        <div className="min-w-0 flex-1">
          <Link to={`/rifa/${order.raffle.slug}`} className="font-wide block truncate font-bold text-charcoal-900 hover:text-watercourse-800">
            {order.raffle.title}
          </Link>
          <p className="text-xs text-slate-grey-600">
            {formatDateTime(order.createdAt)} · {order.quantity} {order.quantity === 1 ? 'número' : 'números'} ·{' '}
            {formatCents(order.totalCents)}
          </p>
          {order.raffle.drawDate && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-grey-600">
              <CalendarBlankIcon className="size-3.5" />
              Sorteio em {formatDateTime(order.raffle.drawDate)}
            </p>
          )}
        </div>
        <OrderStatusBadge status={status} refundPending={order.refundRequired} />
      </div>

      {order.numbers.length > 0 && (
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {order.numbers.map((n) => (
            <span
              key={n}
              className="rounded-md border border-watercourse-200 bg-watercourse-50 px-2 py-0.5 font-mono text-xs font-bold text-watercourse-900"
            >
              {padNumber(n, order.raffle.totalNumbers)}
            </span>
          ))}
        </div>
      )}

      {order.refundRequired && (
        <p className="text-xs text-warning-800">Pix recebido depois do prazo: o valor será devolvido pela organização.</p>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-cream-200 pt-3">
        {pending ? (
          <>
            <span className="text-xs text-warning-800">
              Pague em <strong className="font-mono">{left.label}</strong>
            </span>
            <Link
              to={`/pedido/${order.id}`}
              className="gold-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold text-charcoal-950 shadow-xs hover:brightness-105"
            >
              <LightningIcon weight="fill" className="size-4" />
              Efetuar pagamento
            </Link>
          </>
        ) : (
          <Link
            to={`/pedido/${order.id}`}
            className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-watercourse-800 hover:underline"
          >
            Ver detalhes
            <ArrowRightIcon weight="bold" className="size-3.5" />
          </Link>
        )}
      </div>
    </Card>
  )
}
