import { ChartLineUpIcon } from '@phosphor-icons/react'
import { EmptyState, PageHeader } from '@/shared/components'

// Vendas, faturamento e progresso de cada rifa.
export function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral de vendas, faturamento e progresso das campanhas" />
      <EmptyState
        icon={<ChartLineUpIcon weight="duotone" className="size-7" />}
        title="Em construção"
        description="Vendas, faturamento e progresso de cada rifa."
      />
    </>
  )
}
