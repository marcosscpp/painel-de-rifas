import { EmptyState, PageHeader } from '@/shared/components'

// Vendas, faturamento e progresso de cada rifa.
export function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <EmptyState title="Em construção" description="Vendas, faturamento e progresso de cada rifa." />
    </>
  )
}
