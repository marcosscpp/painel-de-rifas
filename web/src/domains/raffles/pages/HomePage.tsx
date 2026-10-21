import { Alert, EmptyState, FullPageSpinner, PageHeader } from '@/shared/components'
import { RaffleCard } from '../components/RaffleCard'
import { useRaffles } from '../hooks/useRaffles'

export function HomePage() {
  const { data, isLoading, error } = useRaffles()

  return (
    <>
      <PageHeader title="Rifas" />
      {isLoading && <FullPageSpinner />}
      {error && <Alert tone="error">Não foi possível carregar as rifas. Tente de novo em instantes.</Alert>}
      {data && data.length === 0 && <EmptyState title="Nenhuma rifa no momento" description="Volte em breve." />}
      {data && data.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <RaffleCard key={r.slug} raffle={r} />
          ))}
        </div>
      )}
    </>
  )
}
