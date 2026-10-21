import { ReceiptIcon } from '@phosphor-icons/react'
import { EmptyState, PageHeader } from '@/shared/components'

// Pedidos com filtros por rifa e status do Pix, e exportação.
export function AdminOrdersPage() {
  return (
    <>
      <PageHeader title="Pedidos" subtitle="Acompanhe reservas, confirmações via Pix e exportação de dados" />
      <EmptyState
        icon={<ReceiptIcon weight="duotone" className="size-7" />}
        title="Em construção"
        description="Pedidos com filtros por rifa e status do Pix, e exportação."
      />
    </>
  )
}
