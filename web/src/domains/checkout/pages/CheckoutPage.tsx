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
      <PageHeader title="Seu pedido" />

      <Card className="flex items-center gap-4 p-4">
        {order.raffle.cover && <img src={order.raffle.cover.thumb} alt="" className="h-16 w-24 rounded-lg object-cover" />}
        <div>
          <Link to={`/rifa/${order.raffle.slug}`} className="font-semibold text-gray-900 hover:text-emerald-700">
            {order.raffle.title}
          </Link>
          <p className="text-sm text-gray-600">
            {order.buyer.name} · {order.buyer.phone}
          </p>
        </div>
      </Card>

      {order.status === 'PAID' && <Alert tone="success">Pagamento confirmado! Seus números estão garantidos. Boa sorte!</Alert>}
      {expired && (
        <Alert tone="warning">
          O tempo para pagar acabou e os números voltaram para a venda.{' '}
          <Link to={`/rifa/${order.raffle.slug}`} className="font-semibold underline">
            Comprar de novo
          </Link>
        </Alert>
      )}
      {order.status === 'CANCELED' && <Alert tone="warning">Pedido cancelado.</Alert>}

      {order.status === 'PENDING' && !expired && (
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-gray-600">Seus números estão reservados por</p>
          <p className="font-mono text-4xl font-bold text-gray-900" aria-live="polite">
            {countdown.label}
          </p>
          <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500">
            QR Code do Pix aparece aqui (próxima etapa)
          </div>
          <p className="text-xs text-gray-500">A confirmação aparece nesta tela automaticamente.</p>
        </Card>
      )}

      {order.numbers.length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-semibold text-gray-900">
            {order.status === 'PAID' ? 'Seus números' : 'Números reservados'} ({order.numbers.length})
          </h2>
          <OrderNumbers numbers={order.numbers} total={order.raffle.totalNumbers} />
        </Card>
      )}

      <Card className="flex flex-col gap-1 p-5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">
            {order.quantity} × {formatCents(order.raffle.priceCents)}
          </span>
          <span>{formatCents(order.subtotalCents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Taxa do Pix</span>
          <span>{formatCents(order.feeCents)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatCents(order.totalCents)}</span>
        </div>
      </Card>
    </div>
  )
}
