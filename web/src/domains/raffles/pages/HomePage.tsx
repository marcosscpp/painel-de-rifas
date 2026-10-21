import { CheckCircleIcon, LightningIcon, SparkleIcon, TicketIcon, TrophyIcon } from '@phosphor-icons/react'
import { Alert, EmptyState, FullPageSpinner } from '@/shared/components'
import { RaffleCard } from '../components/RaffleCard'
import { useRaffles } from '../hooks/useRaffles'

export function HomePage() {
  const { data, isLoading, error } = useRaffles()

  return (
    <div className="flex flex-col gap-8">
      {/* Hero Banner Royal Teal & Antique Gold */}
      <section className="royal-gradient relative overflow-hidden rounded-3xl border border-anzac-400/30 px-6 py-8 text-cream-50 shadow-lg sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full bg-anzac-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 size-56 rounded-full bg-watercourse-400/10 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-anzac-400/40 bg-anzac-400/15 px-3 py-1 text-xs font-bold tracking-wider text-anzac-300 uppercase">
              <SparkleIcon weight="fill" className="size-3.5 text-anzac-400" />
              Campanhas Oficiais · Loteria Federal
            </span>
            <h1 className="font-display text-2xl font-bold tracking-wide text-cream-50 sm:text-4xl">
              Escolha sua campanha e concorra a prêmios exclusivos
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-cream-100/80 sm:text-base">
              Participe em segundos com reserva imediata de cotas e confirmação automática via Pix.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:w-auto lg:grid-cols-1">
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-watercourse-950/45 px-3.5 py-2.5 backdrop-blur-xs">
              <TicketIcon weight="duotone" className="size-5 shrink-0 text-anzac-400" />
              <span className="text-xs font-semibold text-cream-100">1. Escolha seus bilhetes</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-watercourse-950/45 px-3.5 py-2.5 backdrop-blur-xs">
              <LightningIcon weight="duotone" className="size-5 shrink-0 text-anzac-400" />
              <span className="text-xs font-semibold text-cream-100">2. Pague via Pix na hora</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-watercourse-950/45 px-3.5 py-2.5 backdrop-blur-xs">
              <CheckCircleIcon weight="duotone" className="size-5 shrink-0 text-anzac-400" />
              <span className="text-xs font-semibold text-cream-100">3. Concorra pela Federal</span>
            </div>
          </div>
        </div>
      </section>

      {/* Lista de Campanhas */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b border-cream-200 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-watercourse-800 text-anzac-300 shadow-2xs">
              <TrophyIcon weight="duotone" className="size-4.5" />
            </span>
            <div>
              <h2 className="font-wide text-xl font-extrabold text-charcoal-900">Campanhas disponíveis</h2>
              <p className="text-xs text-slate-grey-600">Garanta suas cotas antes do encerramento</p>
            </div>
          </div>
          {data && data.length > 0 && (
            <span className="rounded-full border border-cream-300 bg-cream-50 px-3 py-1 text-xs font-semibold text-slate-grey-700">
              {data.length} {data.length === 1 ? 'campanha' : 'campanhas'}
            </span>
          )}
        </div>

        {isLoading && <FullPageSpinner />}
        {error && <Alert tone="error">Não foi possível carregar as rifas. Tente de novo em instantes.</Alert>}
        {data && data.length === 0 && (
          <EmptyState
            title="Nenhuma campanha ativa no momento"
            description="Novos sorteios serão publicados em breve. Volte mais tarde!"
          />
        )}
        {data && data.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((r) => (
              <RaffleCard key={r.slug} raffle={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
