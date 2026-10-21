import { EmptyState, PageHeader } from '@/shared/components'

// Dados da rifa, pacotes, prêmios e imagens.
export function AdminRaffleFormPage() {
  return (
    <>
      <PageHeader title="Rifa" />
      <EmptyState title="Em construção" description="Dados da rifa, pacotes, prêmios e imagens." />
    </>
  )
}
