import { ArrowRightIcon, CalendarBlankIcon, TicketIcon, TrophyIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { ProgressBar, RaffleStatusBadge } from '@/shared/components'
import { formatCents, formatDateTime } from '@/shared/utils/format'
import type { RaffleSummary } from '../types'

export function RaffleCard({ raffle }: { raffle: RaffleSummary }) {
  return (
    <Link
      to={`/rifa/${raffle.slug}`}
      className="ticket group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-cream-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-anzac-400 hover:shadow-md"
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
            <TicketIcon weight="duotone" className="size-12 -rotate-12" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <RaffleStatusBadge status={raffle.status} />
        </div>
        {raffle.mainPrize && (
          <div className="absolute inset-x-3 bottom-3">
            <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-lg border border-anzac-400/40 bg-charcoal-950/80 px-2.5 py-1 text-xs font-semibold text-anzac-300 backdrop-blur-xs">
              <TrophyIcon weight="fill" className="size-3.5 shrink-0 text-anzac-400" />
              <span className="truncate">{raffle.mainPrize}</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4 pb-3">
        <div className="space-y-1.5">
          <h2 className="font-wide line-clamp-2 text-base font-extrabold text-charcoal-900 transition-colors group-hover:text-watercourse-800">
            {raffle.title}
          </h2>
          {raffle.drawDate && (
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-grey-600">
              <CalendarBlankIcon weight="duotone" className="size-3.5 text-watercourse-700" />
              Sorteio: {formatDateTime(raffle.drawDate)}
            </p>
          )}
        </div>

        <ProgressBar percent={raffle.progress.percent} label={`${raffle.progress.percent}% das cotas vendidas`} />
      </div>

      <div className="perforation mx-3" />

      {/* Canhoto do bilhete (altura ~72px alinhada com --cut: 76px) */}
      <div className="flex h-[72px] items-center justify-between bg-cream-100/70 px-4">
        <div>
          <span className="block text-[11px] font-medium text-slate-grey-600">Valor por cota</span>
          <span className="font-wide text-lg font-extrabold text-watercourse-800">{formatCents(raffle.priceCents)}</span>
        </div>
        <span className="gold-gradient inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-charcoal-950 shadow-2xs transition group-hover:brightness-105">
          Participar
          <ArrowRightIcon weight="bold" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}
