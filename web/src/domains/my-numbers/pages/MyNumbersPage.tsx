import { EmptyState, PageHeader } from '@/shared/components'

// Consulta das compras e números pelo telefone.
export function MyNumbersPage() {
  return (
    <>
      <PageHeader title="Meus números" />
      <EmptyState title="Em construção" description="Consulta das compras e números pelo telefone." />
    </>
  )
}
