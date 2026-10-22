import { CheckCircleIcon, ClockCountdownIcon, ReceiptIcon, ShieldWarningIcon, TicketIcon } from '@phosphor-icons/react'
import { Link, useParams } from 'react-router'
import { Alert, Badge, Card, CheckoutSkeleton, CoverThumb, Disclosure, InfoList } from '@/shared/components'
import { useCountdown } from '@/shared/hooks/useCountdown'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { ApiError } from '@/shared/lib/http'
import { formatCents, formatDateTime, formatInt } from '@/shared/utils/format'
import { OrderNumbers } from '../components/OrderNumbers'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { PixPayment } from '../components/PixPayment'
import { useOrder } from '../hooks/useOrder'

// Tela do pedido no formato da referência: cabeçalho escuro com o status, tempo para pagar com
// barra, passos do Pix, card da campanha e "Detalhes da compra" / "Meus números" em acordeão.
export function CheckoutPage() {
  const { orderId } = useParams()
  const { data: order, isLoading, error } = useOrder(orderId)
  const countdown = useCountdown(order?.status === 'PENDING' ? order.expiresAt : null)
  useDocumentTitle('Pedido')

  if (isLoading) return <CheckoutSkeleton />
  if (error || !order) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400)
    return <Alert tone="error">{notFound ? 'Pedido não encontrado.' : 'Não foi possível carregar o pedido.'}</Alert>
  }

  // Contagem chegou a zero antes do servidor avisar: trata como expirado na tela.
  const expired = order.status === 'EXPIRED' || (order.status === 'PENDING' && countdown.seconds === 0)
  const payable = order.status === 'PENDING' && !expired
  const windowSeconds = Math.max(1, (new Date(order.expiresAt).getTime() - new Date(order.createdAt).getTime()) / 1000)
  const timePercent = Math.min(100, (countdown.seconds / windowSeconds) * 100)
  const chances = `${formatInt(order.quantity)} ${order.quantity === 1 ? 'chance' : 'chances'}`

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="royal-gradient overflow-hidden rounded-2xl text-cream-50 shadow-md">
        <div className="flex items-start justify-between gap-3 p-5">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-anzac-300 uppercase">Pedido</p>
            <h1 className="font-wide mt-1 text-xl font-extrabold">
              {order.status === 'PAID'
                ? 'Pagamento confirmado'
                : payable
                  ? 'Aguardando pagamento'
                  : order.status === 'CANCELED'
                    ? 'Pedido cancelado'
                    : 'Pedido expirado'}
            </h1>
          </div>
          <Badge tone="gold" icon={<TicketIcon weight="fill" className="size-3.5" />}>
            {chances}
          </Badge>
        </div>

        {payable && (
          <div className="border-t border-white/10 bg-black/15 px-5 py-4">
            <p className="flex items-center gap-2 text-sm">
              <ClockCountdownIcon weight="duotone" className="size-5 text-anzac-300" />
              Você tem
              <strong className="font-mono text-lg text-anzac-300" aria-live="polite">
                {countdown.label}
              </strong>
              para pagar
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="gold-gradient h-full rounded-full transition-[width] duration-1000" style={{ width: `${timePercent}%` }} />
            </div>
          </div>
        )}
        {order.status === 'PAID' && (
          <div className="flex items-center gap-2 border-t border-white/10 bg-black/15 px-5 py-3 text-sm">
            <CheckCircleIcon weight="fill" className="size-5 text-anzac-300" />
            Seus números estão garantidos. Boa sorte!
          </div>
        )}
      </div>

      {order.refundRequired && (
        <Alert tone="warning">
          Recebemos seu Pix depois que a reserva expirou e algum número já tinha sido vendido. O valor será
          devolvido pela organização.
        </Alert>
      )}
      {expired && !order.refundRequired && (
        <Alert tone="warning">
          O tempo para pagar acabou e os números voltaram para a venda.{' '}
          <Link to={`/rifa/${order.raffle.slug}`} className="font-bold underline">
            Comprar de novo
          </Link>
        </Alert>
      )}

      {payable && (
        <>
          <div className="flex items-start gap-2.5 rounded-xl border border-warning-300 bg-warning-50 px-4 py-3 text-xs text-warning-900">
            <ShieldWarningIcon weight="duotone" className="size-5 shrink-0 text-warning-600" />
            <span>
              Pague somente por esta página. Confira se o recebedor do Pix é a organização da campanha e nunca envie
              dinheiro a pedido de terceiros.
            </span>
          </div>
          <Card className="p-5">
            <PixPayment order={order} />
          </Card>
        </>
      )}

      <Card className="flex items-center gap-4 p-4">
        <CoverThumb cover={order.raffle.cover} size="lg" />
        <div className="min-w-0 flex-1">
          <Link
            to={`/rifa/${order.raffle.slug}`}
            className="font-wide block truncate font-bold text-charcoal-900 hover:text-watercourse-800"
          >
            {order.raffle.title}
          </Link>
          <p className="text-xs text-slate-grey-600">
            {order.raffle.drawDate ? `Sorteio em ${formatDateTime(order.raffle.drawDate)}` : 'Sorteio pela Loteria Federal'}
          </p>
        </div>
      </Card>

      <Disclosure title="Detalhes da compra" icon={<ReceiptIcon weight="duotone" className="size-5" />} defaultOpen>
        <InfoList
          items={[
            { label: 'Comprador', value: order.buyer.name },
            { label: 'CPF', value: order.buyer.cpf },
            { label: 'Telefone', value: order.buyer.phone },
            { label: 'Data', value: formatDateTime(order.createdAt) },
            { label: 'Situação', value: <OrderStatusBadge status={order.status} refundPending={order.refundRequired} /> },
            { label: 'Quantidade', value: `${order.quantity} × ${formatCents(order.raffle.priceCents)}` },
            { label: 'Subtotal', value: formatCents(order.subtotalCents) },
            { label: 'Taxa do Pix', value: formatCents(order.feeCents), hidden: order.feeCents === 0 },
            { label: 'Total', value: <span className="text-base text-watercourse-900">{formatCents(order.totalCents)}</span> },
          ]}
        />
      </Disclosure>

      <Disclosure
        title="Meus números"
        icon={<TicketIcon weight="duotone" className="size-5" />}
        aside={<span className="text-xs font-semibold text-slate-grey-600">{order.numbers.length}</span>}
        defaultOpen={order.status === 'PAID'}
      >
        {order.numbers.length === 0 ? (
          <p className="text-sm text-slate-grey-600">Nenhum número neste pedido.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {payable && <p className="text-xs text-slate-grey-600">Reservados para você. Ficam garantidos depois do pagamento.</p>}
            <OrderNumbers numbers={order.numbers} total={order.raffle.totalNumbers} />
          </div>
        )}
      </Disclosure>

    </div>
  )
}
