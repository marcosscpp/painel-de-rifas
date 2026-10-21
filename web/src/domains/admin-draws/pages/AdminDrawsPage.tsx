import { TrophyIcon } from '@phosphor-icons/react'
import { EmptyState, PageHeader } from '@/shared/components'

// Resultado da Loteria Federal e publicação do ganhador.
export function AdminDrawsPage() {
  return (
    <>
      <PageHeader title="Sorteios" subtitle="Apuração pela Loteria Federal e publicação dos ganhadores" />
      <EmptyState
        icon={<TrophyIcon weight="duotone" className="size-7" />}
        title="Em construção"
        description="Resultado da Loteria Federal e publicação do ganhador."
      />
    </>
  )
}
