import { EmptyState, PageHeader } from '@/shared/components'

// Pedidos com filtros por rifa e status do Pix, e exportação.
export function AdminOrdersPage() {
  return (
    <>
      <PageHeader title="Pedidos" />
      <EmptyState title="Em construção" description="Pedidos com filtros por rifa e status do Pix, e exportação." />
    </>
  )
}
