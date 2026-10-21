import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { EmptyState, PageHeader } from '@/shared/components'

// Consulta das compras e números pelo telefone.
export function MyNumbersPage() {
  return (
    <>
      <PageHeader title="Meus números" subtitle="Consulte seus pedidos e bilhetes adquiridos pelo telefone" />
      <EmptyState
        icon={<MagnifyingGlassIcon weight="duotone" className="size-7" />}
        title="Em construção"
        description="Consulta das compras e números pelo telefone."
      />
    </>
  )
}
