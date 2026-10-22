import { CaretRightIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { BuyerInfo } from '@/domains/admin-orders'
import { OrderStatusBadge } from '@/domains/checkout'
import { Alert, Modal, Spinner } from '@/shared/components'
import { formatCents, formatDate, formatDateTime } from '@/shared/utils/format'
import { useAdminBuyer } from '../hooks/useAdminBuyers'

// Cadastro completo e histórico de compras de um comprador.
export function BuyerDetailModal({ buyerId, onClose }: { buyerId: string | null; onClose: () => void }) {
  const { data: b, isLoading, error } = useAdminBuyer(buyerId)

  return (
    <Modal open={!!buyerId} onClose={onClose} title="Comprador" className="sm:max-w-2xl">
      {isLoading && (
        <div className="flex justify-center py-10 text-watercourse-700">
          <Spinner className="size-6" />
        </div>
      )}
      {error && <Alert tone="error">{error.message}</Alert>}
      {b && (
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold tracking-wider text-slate-grey-500 uppercase">
              Cadastro · cliente desde {formatDate(b.createdAt)}
            </h3>
            <BuyerInfo buyer={b} />
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold tracking-wider text-slate-grey-500 uppercase">Compras ({b.orders.length})</h3>
            {b.orders.length === 0 && <p className="text-sm text-slate-grey-600">Nenhuma compra.</p>}
            <ul className="divide-y divide-cream-200 rounded-xl border border-cream-200 bg-white">
              {b.orders.map((o) => (
                <li key={o.id}>
                  <Link
                    to={`/admin/pedidos?pedido=${o.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-cream-100"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-charcoal-900">{o.raffle.title}</p>
                      <p className="text-xs text-slate-grey-600">
                        {formatDateTime(o.createdAt)} · {o.quantity} números · {formatCents(o.totalCents)}
                      </p>
                    </div>
                    <OrderStatusBadge status={o.status} refundPending={o.refundRequired} />
                    <CaretRightIcon className="size-4 text-slate-grey-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  )
}
