import { UsersIcon } from '@phosphor-icons/react'
import { EmptyState, PageHeader } from '@/shared/components'

// Busca por telefone ou CPF, compras e números de cada um.
export function AdminBuyersPage() {
  return (
    <>
      <PageHeader title="Compradores" subtitle="Consulte participantes por telefone ou CPF e histórico de cotas" />
      <EmptyState
        icon={<UsersIcon weight="duotone" className="size-7" />}
        title="Em construção"
        description="Busca por telefone ou CPF, compras e números de cada um."
      />
    </>
  )
}
