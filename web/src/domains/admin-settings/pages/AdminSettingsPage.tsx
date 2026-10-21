import { EmptyState, PageHeader } from '@/shared/components'

// Taxa do Pix, tempo de reserva, logo e cores.
export function AdminSettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" />
      <EmptyState title="Em construção" description="Taxa do Pix, tempo de reserva, logo e cores." />
    </>
  )
}
