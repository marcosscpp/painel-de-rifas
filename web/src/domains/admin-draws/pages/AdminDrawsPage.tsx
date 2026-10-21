import { EmptyState, PageHeader } from '@/shared/components'

// Resultado da Loteria Federal e publicação do ganhador.
export function AdminDrawsPage() {
  return (
    <>
      <PageHeader title="Sorteios" />
      <EmptyState title="Em construção" description="Resultado da Loteria Federal e publicação do ganhador." />
    </>
  )
}
