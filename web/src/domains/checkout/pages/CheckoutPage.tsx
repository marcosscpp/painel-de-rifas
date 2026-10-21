import { ClockCountdownIcon, PhoneIcon, QrCodeIcon, ReceiptIcon, TicketIcon, UserIcon } from '@phosphor-icons/react'
import { Link, useParams } from 'react-router'
import { Alert, Card, FullPageSpinner, PageHeader } from '@/shared/components'
import { useCountdown } from '@/shared/hooks/useCountdown'
import { ApiError } from '@/shared/lib/http'
import { formatCents } from '@/shared/utils/format'
import { OrderNumbers } from '../components/OrderNumbers'
import { useOrder } from '../hooks/useOrder'

export function CheckoutPage() {
  const { orderId } = useParams()
  const { data: order, isLoading, error } = useOrder(orderId)
  const countdown = useCountdown(order?.status === 'PENDING' ? order.expiresAt : null)

  if (isLoading) return <FullPageSpinner />
  if (error || !order) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400)
    return <Alert tone="error">{notFound ? 'Pedido não encontrado.' : 'Não foi possível carregar o pedido.'}</Alert>
  }

  // Contagem chegou a zero antes do servidor avisar: trata como expirado na tela.
  const expired = order.status === 'EXPIRED' || (order.status === 'PENDING' && countdown.seconds === 0)

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <PageHeader title="Resumo do seu pedido" subtitle="Confira os detalhes da reserva e o status do pagamento" />

      <Card className="flex items-center gap-4 p-4">
        {order.raffle.cover ? (
          <img src={order.raffle.cover.thumb} alt="" className="h-16 w-24 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="royal-gradient flex h-16 w-24 shrink-0 items-center justify-center rounded-xl text-anzac-300">
            <TicketIcon weight="duotone" className="size-7" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            to={`/rifa/${order.raffle.slug}`}
            className="font-wide block truncate font-bold text-charcoal-900 hover:text-watercourse-800"
          >
            {order.raffle.title}
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-grey-600">
            <span className="inline-flex items-center gap-1">
              <UserIcon weight="duotone" className="size-3.5 text-watercourse-700" />
              {order.buyer.name}
            </span>
            <span className="inline-flex items-center gap-1">
              <PhoneIcon weight="duotone" className="size-3.5 text-watercourse-700" />
              {order.buyer.phone}
            </span>
          </div>
        </div>
      </Card>

      {order.status === 'PAID' && (
        <Alert tone="success">Pagamento confirmado! Seus números estão garantidos. Boa sorte!</Alert>
      )}
      {expired && (
        <Alert tone="warning">
          O tempo para pagar acabou e os números voltaram para a venda.{' '}
          <Link to={`/rifa/${order.raffle.slug}`} className="font-bold underline">
            Comprar de novo
          </Link>
        </Alert>
      )}
      {order.status === 'CANCELED' && <Alert tone="warning">Pedido cancelado.</Alert>}

      {order.status === 'PENDING' && !expired && (
        <Card className="overflow-hidden border-anzac-300 p-0 text-center">
          <div className="royal-gradient flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold tracking-wider text-anzac-300 uppercase">
            <ClockCountdownIcon weight="duotone" className="size-4.5" />
            Reserva ativa — Pague via Pix para confirmar
          </div>
          <div className="flex flex-col items-center gap-4 p-6">
            <div>
              <p className="text-xs font-medium text-slate-grey-600">Tempo restante para pagamento</p>
              <p className="mt-1 font-mono text-4xl font-extrabold text-watercourse-800" aria-live="polite">
                {countdown.label}
              </p>
            </div>
            <div className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cream-300 bg-cream-100/70 p-4 text-xs text-slate-grey-600">
              <QrCodeIcon weight="duotone" className="size-12 text-watercourse-700" />
              <span>QR Code do Pix aparece aqui (próxima etapa)</span>
            </div>
            <p className="text-xs text-slate-grey-600">A confirmação aparece nesta tela automaticamente.</p>
          </div>
        </Card>
      )}

      {order.numbers.length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-2">
            <TicketIcon weight="duotone" className="size-5 text-watercourse-700" />
            <h2 className="font-wide font-bold text-charcoal-900">
              {order.status === 'PAID' ? 'Seus números' : 'Números reservados'} ({order.numbers.length})
            </h2>
          </div>
          <OrderNumbers numbers={order.numbers} total={order.raffle.totalNumbers} />
        </Card>
      )}

      <Card className="flex flex-col gap-2 p-5 text-sm">
        <div className="mb-1 flex items-center gap-2 border-b border-cream-200 pb-2 font-wide font-bold text-charcoal-900">
          <ReceiptIcon weight="duotone" className="size-5 text-anzac-600" />
          Detalhamento financeiro
        </div>
        <div className="flex justify-between">
          <span className="text-slate-grey-600">
            {order.quantity} × {formatCents(order.raffle.priceCents)}
          </span>
          <span className="font-medium text-charcoal-900">{formatCents(order.subtotalCents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-grey-600">Taxa de processamento Pix</span>
          <span className="font-medium text-charcoal-900">{formatCents(order.feeCents)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-cream-200 pt-3 text-base font-extrabold text-watercourse-900">
          <span>Total</span>
          <span>{formatCents(order.totalCents)}</span>
        </div>
      </Card>
    </div>
  )
}
