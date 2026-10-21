import { EmptyState, PageHeader } from '@/shared/components'

// Criar, editar, pausar e encerrar rifas.
export function AdminRafflesPage() {
  return (
    <>
      <PageHeader title="Rifas" />
      <EmptyState title="Em construção" description="Criar, editar, pausar e encerrar rifas." />
    </>
  )
}
