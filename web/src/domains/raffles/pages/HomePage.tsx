import { ArrowRightIcon, ChatCircleDotsIcon } from '@phosphor-icons/react'
import { Alert, CardGridSkeleton, EmptyState } from '@/shared/components'
import { RaffleCard } from '../components/RaffleCard'
import { useRaffles } from '../hooks/useRaffles'

export function HomePage() {
  const { data, isLoading, error } = useRaffles()

  const featured = data?.[0]
  const rest = data ? data.slice(1) : []

  return (
    <div id="campanhas" className="mx-auto flex max-w-2xl flex-col gap-4">
      {isLoading && <CardGridSkeleton count={4} />}
      {error && <Alert tone="error">Não foi possível carregar as rifas. Tente de novo em instantes.</Alert>}

      {data && data.length === 0 && (
        <EmptyState
          title="Nenhuma campanha ativa no momento"
          description="Novos sorteios serão publicados em breve. Volte mais tarde!"
        />
      )}

      {featured && (
        <div className="flex flex-col gap-3">
          {/* Campanha principal em destaque */}
          <RaffleCard raffle={featured} variant="featured" />

          {/* Demais campanhas no formato horizontal da referência */}
          {rest.map((r) => (
            <RaffleCard key={r.slug} raffle={r} variant="compact" />
          ))}
        </div>
      )}

      {/* Card "Dúvidas? Fale com nossa equipe" (igual à referência) */}
      <a
        id="duvidas"
        href="#duvidas"
        className="group mt-2 flex items-center justify-between rounded-2xl border border-cream-200 bg-white p-4 shadow-2xs transition hover:border-anzac-400 hover:shadow-sm"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-watercourse-950 p-3 text-anzac-400 shadow-2xs">
            <ChatCircleDotsIcon className="size-5" />
          </div>
          <div>
            <p className="font-wide text-sm font-extrabold text-charcoal-900">Dúvidas?</p>
            <p className="text-xs text-slate-grey-600">Fale com nossa equipe</p>
          </div>
        </div>
        <ArrowRightIcon
          weight="bold"
          className="size-4.5 text-charcoal-900 transition-transform group-hover:translate-x-1 group-hover:text-watercourse-800"
        />
      </a>
    </div>
  )
}
