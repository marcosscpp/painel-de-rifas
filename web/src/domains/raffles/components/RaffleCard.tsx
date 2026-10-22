import { ArrowRightIcon, CalendarBlankIcon, TicketIcon, TrophyIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { ProgressBar, RaffleStatusBadge } from '@/shared/components'
import { formatCents, formatDateTime } from '@/shared/utils/format'
import type { RaffleSummary } from '../types'

type Props = {
  raffle: RaffleSummary
  variant?: 'featured' | 'compact'
}

export function RaffleCard({ raffle, variant = 'compact' }: Props) {
  if (variant === 'featured') {
    return (
      <Link
        to={`/rifa/${raffle.slug}`}
        className="group flex flex-col overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-sm transition-all hover:border-anzac-400 hover:shadow-md"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-watercourse-950">
          {raffle.cover ? (
            <img
              src={raffle.cover.thumb}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="royal-gradient flex h-full w-full items-center justify-center text-anzac-400/50">
              <TicketIcon className="size-14 -rotate-12" />
            </div>
          )}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <RaffleStatusBadge status={raffle.status} />
            <span className="rounded-lg border border-white/15 bg-charcoal-950/75 px-2.5 py-1 font-mono text-xs font-bold text-anzac-300 backdrop-blur-xs">
              {formatCents(raffle.priceCents)} / cota
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="font-wide text-lg font-extrabold text-charcoal-900 uppercase transition-colors group-hover:text-watercourse-800 sm:text-xl">
                {raffle.title}
              </h2>
              {raffle.mainPrize && (
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-grey-600 uppercase">
                  <TrophyIcon weight="fill" className="size-3.5 text-anzac-500" />
                  {raffle.mainPrize}
                </p>
              )}
            </div>

            <span className="gold-gradient inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold text-charcoal-950 shadow-2xs transition group-hover:brightness-105">
              Participar
              <ArrowRightIcon weight="bold" className="size-3.5" />
            </span>
          </div>

          <ProgressBar percent={raffle.progress.percent} label={`${raffle.progress.percent}% das cotas vendidas`} />

          {raffle.drawDate && (
            <div className="flex items-center gap-1.5 text-xs text-slate-grey-500">
              <CalendarBlankIcon className="size-3.5 text-watercourse-700" />
              <span>Sorteio: {formatDateTime(raffle.drawDate)}</span>
            </div>
          )}
        </div>
      </Link>
    )
  }

  // Estilo horizontal compacto (idêntico à lista da referência Wesley Alemão)
  return (
    <Link
      to={`/rifa/${raffle.slug}`}
      className="group flex items-center gap-3.5 rounded-2xl border border-cream-200 bg-white p-3 shadow-2xs transition-all hover:border-anzac-400 hover:shadow-sm"
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-watercourse-950 sm:size-24">
        {raffle.cover ? (
          <img
            src={raffle.cover.thumb}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="royal-gradient flex h-full w-full items-center justify-center text-anzac-400/50">
            <TicketIcon className="size-8 -rotate-12" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <RaffleStatusBadge status={raffle.status} />
          <span className="rounded-lg border border-cream-200 bg-cream-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-grey-700">
            {formatCents(raffle.priceCents)} / cota
          </span>
        </div>

        <h3 className="font-wide truncate text-sm font-extrabold text-charcoal-900 uppercase transition-colors group-hover:text-watercourse-800 sm:text-base">
          {raffle.title}
        </h3>

        {raffle.mainPrize && (
          <p className="truncate text-xs font-medium text-slate-grey-600 uppercase">{raffle.mainPrize}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-0.5 text-xs text-slate-grey-500">
          {raffle.drawDate ? (
            <span className="inline-flex items-center gap-1">
              <CalendarBlankIcon className="size-3.5 text-slate-grey-400" />
              {formatDateTime(raffle.drawDate)}
            </span>
          ) : (
            <span>Loteria Federal</span>
          )}
          <span className="font-mono text-[11px] font-bold text-watercourse-800">{raffle.progress.percent}%</span>
        </div>
      </div>
    </Link>
  )
}
