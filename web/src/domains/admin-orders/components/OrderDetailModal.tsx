import { ArrowCounterClockwiseIcon, ArrowSquareOutIcon, XCircleIcon } from '@phosphor-icons/react'
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import { OrderStatusBadge } from '@/domains/checkout'
import { Alert, Button, InfoList, Modal, Spinner } from '@/shared/components'
import { formatCents, formatDateTime, padNumber } from '@/shared/utils/format'
import { useAdminOrder, useCancelOrder, useMarkRefunded } from '../hooks/useAdminOrders'
import { BuyerInfo } from './BuyerInfo'

const paymentStatus: Record<string, string> = {
  PENDING: 'Aguardando',
  CONFIRMED: 'Confirmado',
  EXPIRED: 'Expirado',
  REFUNDED: 'Reembolsado',
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-bold tracking-wider text-slate-grey-500 uppercase">{title}</h3>
      {children}
    </section>
  )
}

// Detalhe do pedido para o admin: comprador completo, números, pagamento e as duas ações manuais.
export function OrderDetailModal({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { data: o, isLoading, error } = useAdminOrder(orderId)
  const cancel = useCancelOrder()
  const refunded = useMarkRefunded()
  const [confirm, setConfirm] = useState<'cancel' | 'refund' | null>(null)
  const action = confirm === 'cancel' ? cancel : refunded

  return (
    <Modal open={!!orderId} onClose={onClose} title="Pedido" className="sm:max-w-2xl">
      {isLoading && (
        <div className="flex justify-center py-10 text-watercourse-700">
          <Spinner className="size-6" />
        </div>
      )}
      {error && <Alert tone="error">{error.message}</Alert>}
      {o && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Link
                to={`/admin/rifas/${o.raffle.id}`}
                className="font-wide inline-flex items-center gap-1 font-bold text-charcoal-900 hover:text-watercourse-800"
              >
                {o.raffle.title}
                <ArrowSquareOutIcon className="size-4" />
              </Link>
              <p className="font-mono text-[11px] text-slate-grey-500">{o.id}</p>
            </div>
            <OrderStatusBadge status={o.status} refundPending={o.refundRequired && !o.refundedAt} />
          </div>

          {o.refundRequired && !o.refundedAt && (
            <Alert tone="warning">
              Pix recebido depois que a reserva expirou e algum número já tinha sido vendido. Devolva{' '}
              {formatCents(o.totalCents)} ao comprador e marque o reembolso como feito.
            </Alert>
          )}
          {o.refundedAt && <Alert tone="success">Reembolso feito em {formatDateTime(o.refundedAt)}.</Alert>}

          <Section title="Valores">
            <InfoList
              items={[
                { label: 'Criado em', value: formatDateTime(o.createdAt) },
                { label: 'Pago em', value: o.paidAt && formatDateTime(o.paidAt) },
                { label: 'Expira em', value: o.status === 'PENDING' && formatDateTime(o.expiresAt) },
                { label: 'Quantidade', value: o.quantity },
                { label: 'Subtotal', value: formatCents(o.subtotalCents) },
                { label: 'Taxa do Pix', value: formatCents(o.feeCents) },
                { label: 'Total', value: formatCents(o.totalCents) },
              ]}
            />
          </Section>

          <Section title="Comprador">
            <BuyerInfo buyer={o.buyer} />
          </Section>

          <Section title={`Números (${o.numbers.length})${o.numbersReleased && o.numbers.length ? ' · voltaram para a venda' : ''}`}>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {o.numbers.map((n) => (
                <span
                  key={n}
                  className={
                    o.numbersReleased
                      ? 'rounded-md border border-cream-300 px-2 py-0.5 font-mono text-xs text-slate-grey-500 line-through'
                      : 'rounded-md border border-watercourse-200 bg-watercourse-50 px-2 py-0.5 font-mono text-xs font-bold text-watercourse-900'
                  }
                >
                  {padNumber(n, o.raffle.totalNumbers)}
                </span>
              ))}
            </div>
          </Section>

          {o.payment && (
            <Section title="Pagamento">
              <InfoList
                items={[
                  { label: 'Gateway', value: o.payment.provider },
                  { label: 'Cobrança', value: <span className="font-mono text-xs">{o.payment.providerChargeId}</span> },
                  { label: 'Status', value: paymentStatus[o.payment.status] ?? o.payment.status },
                  { label: 'Confirmado em', value: o.payment.confirmedAt && formatDateTime(o.payment.confirmedAt) },
                ]}
              />
            </Section>
          )}

          {confirm ? (
            <div className="flex flex-col gap-3 rounded-xl border border-cream-300 bg-cream-100 p-4">
              <p className="text-sm font-semibold text-charcoal-900">
                {confirm === 'cancel'
                  ? `Cancelar o pedido? Os ${o.quantity} números reservados voltam para a venda e o Pix deixa de valer.`
                  : `Confirme só depois de devolver ${formatCents(o.totalCents)} ao comprador. Isso fica registrado no pedido.`}
              </p>
              {action.error && <Alert tone="error">{action.error.message}</Alert>}
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  disabled={action.isPending}
                  onClick={() => {
                    action.reset()
                    setConfirm(null)
                  }}
                >
                  Voltar
                </Button>
                <Button
                  variant={confirm === 'cancel' ? 'danger' : 'primary'}
                  loading={action.isPending}
                  onClick={() => action.mutate(o.id, { onSuccess: () => setConfirm(null) })}
                >
                  {confirm === 'cancel' ? 'Sim, cancelar' : 'Reembolso feito'}
                </Button>
              </div>
            </div>
          ) : (
            (o.status === 'PENDING' || (o.refundRequired && !o.refundedAt)) && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-cream-200 pt-4">
                {o.status === 'PENDING' && (
                  <Button variant="danger" onClick={() => setConfirm('cancel')}>
                    <XCircleIcon weight="bold" className="size-4" />
                    Cancelar pedido
                  </Button>
                )}
                {o.refundRequired && !o.refundedAt && (
                  <Button onClick={() => setConfirm('refund')}>
                    <ArrowCounterClockwiseIcon weight="bold" className="size-4" />
                    Marcar reembolso feito
                  </Button>
                )}
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  )
}
