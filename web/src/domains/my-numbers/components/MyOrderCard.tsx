import { ArrowRightIcon, TicketIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import type { MyOrder } from '@/domains/checkout'
import { Badge, type BadgeTone, Card } from '@/shared/components'
import { useCountdown } from '@/shared/hooks/useCountdown'
import { formatCents, formatDateTime, padNumber } from '@/shared/utils/format'

const statusInfo: Record<MyOrder['status'], { label: string; tone: BadgeTone }> = {
  PAID: { label: 'Pago', tone: 'teal' },
  PENDING: { label: 'Aguardando pagamento', tone: 'warning' },
  EXPIRED: { label: 'Expirado', tone: 'neutral' },
  CANCELED: { label: 'Cancelado', tone: 'neutral' },
}

export function MyOrderCard({ order }: { order: MyOrder }) {
  const s = statusInfo[order.status]
  const left = useCountdown(order.status === 'PENDING' ? order.expiresAt : null)
  const pending = order.status === 'PENDING' && left.seconds > 0

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        {order.raffle.cover ? (
          <img src={order.raffle.cover.thumb} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="royal-gradient flex h-14 w-20 shrink-0 items-center justify-center rounded-lg text-anzac-300">
            <TicketIcon weight="duotone" className="size-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link to={`/rifa/${order.raffle.slug}`} className="font-wide block truncate font-bold text-charcoal-900 hover:text-watercourse-800">
            {order.raffle.title}
          </Link>
          <p className="text-xs text-slate-grey-600">
            {formatDateTime(order.createdAt)} · {order.quantity} {order.quantity === 1 ? 'número' : 'números'} ·{' '}
            {formatCents(order.totalCents)}
          </p>
          {order.raffle.drawDate && (
            <p className="text-xs text-slate-grey-600">Sorteio em {formatDateTime(order.raffle.drawDate)}</p>
          )}
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
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

      {pending && (
        <Link
          to={`/pedido/${order.id}`}
          className="inline-flex items-center gap-1 self-start text-sm font-bold text-watercourse-800 hover:underline"
        >
          Pagar agora
          <ArrowRightIcon weight="bold" className="size-4" />
        </Link>
      )}
    </Card>
  )
}
