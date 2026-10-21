import { EmptyState, PageHeader } from '@/shared/components'

// Galeria do prêmio, regulamento, compra por quantidade ou escolhendo números.
export function RafflePage() {
  return (
    <>
      <PageHeader title="Rifa" />
      <EmptyState title="Em construção" description="Galeria do prêmio, regulamento, compra por quantidade ou escolhendo números." />
    </>
  )
}
