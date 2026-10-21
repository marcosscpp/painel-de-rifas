import { Link } from 'react-router'
import { ProgressBar, RaffleStatusBadge } from '@/shared/components'
import { formatCents, formatDateTime } from '@/shared/utils/format'
import type { RaffleSummary } from '../types'

export function RaffleCard({ raffle }: { raffle: RaffleSummary }) {
  return (
    <Link
      to={`/rifa/${raffle.slug}`}
      className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      {raffle.cover ? (
        <img src={raffle.cover.thumb} alt="" loading="lazy" className="aspect-video w-full object-cover" />
      ) : (
        <div className="aspect-video w-full bg-gray-100" />
      )}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-gray-900 group-hover:text-emerald-700">{raffle.title}</h2>
          <RaffleStatusBadge status={raffle.status} />
        </div>
        {raffle.mainPrize && <p className="text-sm text-gray-600">Prêmio: {raffle.mainPrize}</p>}
        <p className="text-lg font-bold text-emerald-700">
          {formatCents(raffle.priceCents)} <span className="text-sm font-normal text-gray-500">por número</span>
        </p>
        <ProgressBar percent={raffle.progress.percent} label={`${raffle.progress.percent}% vendido`} />
        {raffle.drawDate && <p className="text-xs text-gray-500">Sorteio: {formatDateTime(raffle.drawDate)}</p>}
      </div>
    </Link>
  )
}
