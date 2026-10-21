import { GearSixIcon } from '@phosphor-icons/react'
import { EmptyState, PageHeader } from '@/shared/components'

// Taxa do Pix, tempo de reserva, logo e cores.
export function AdminSettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" subtitle="Ajustes de gateway Pix, tempo de expiração e personalização" />
      <EmptyState
        icon={<GearSixIcon weight="duotone" className="size-7" />}
        title="Em construção"
        description="Taxa do Pix, tempo de reserva, logo e cores."
      />
    </>
  )
}
