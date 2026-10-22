import { Badge, type BadgeTone } from '@/shared/components'
import type { OrderStatus } from '../types'

export const orderStatusInfo: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  PAID: { label: 'Pago', tone: 'teal' },
  PENDING: { label: 'Aguardando pagamento', tone: 'warning' },
  EXPIRED: { label: 'Expirado', tone: 'neutral' },
  CANCELED: { label: 'Cancelado', tone: 'neutral' },
}

// Status do pedido com a mesma cor em todo lugar (Meus números, pedido, painel).
export function OrderStatusBadge({ status, refundPending }: { status: OrderStatus; refundPending?: boolean }) {
  if (refundPending) return <Badge tone="error" dot>Reembolso pendente</Badge>
  const s = orderStatusInfo[status]
  return (
    <Badge tone={s.tone} dot={status === 'PENDING'} pulse={status === 'PENDING'}>
      {s.label}
    </Badge>
  )
}
