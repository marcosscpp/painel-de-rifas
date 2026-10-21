import { EmptyState, PageHeader } from '@/shared/components'

// Busca por telefone ou CPF, compras e números de cada um.
export function AdminBuyersPage() {
  return (
    <>
      <PageHeader title="Compradores" />
      <EmptyState title="Em construção" description="Busca por telefone ou CPF, compras e números de cada um." />
    </>
  )
}
