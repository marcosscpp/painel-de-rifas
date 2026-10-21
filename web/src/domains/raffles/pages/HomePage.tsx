import { EmptyState, PageHeader } from '@/shared/components'

// Lista das rifas abertas, com progresso de vendas.
export function HomePage() {
  return (
    <>
      <PageHeader title="Rifas ativas" />
      <EmptyState title="Em construção" description="Lista das rifas abertas, com progresso de vendas." />
    </>
  )
}
