import { Link, useParams } from 'react-router'
import { Alert, Card, FullPageSpinner, ProgressBar, RaffleStatusBadge } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { ApiError } from '@/shared/lib/http'
import { formatCents, formatDateTime, formatInt } from '@/shared/utils/format'
import { BuyBox } from '../components/BuyBox'
import { PrizeGallery } from '../components/PrizeGallery'
import { useRaffle } from '../hooks/useRaffles'

export function RafflePage() {
  const { slug } = useParams()
  const { data: raffle, isLoading, error } = useRaffle(slug)
  useDocumentTitle(raffle?.title)

  if (isLoading) return <FullPageSpinner />
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-gray-700">Rifa não encontrada.</p>
        <Link to="/" className="text-emerald-700 underline">
          Ver rifas abertas
        </Link>
      </div>
    )
  }
  if (error || !raffle) return <Alert tone="error">Não foi possível carregar a rifa. Tente de novo em instantes.</Alert>

  const p = raffle.progress
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        {raffle.cover && <img src={raffle.cover.full} alt="" className="aspect-video w-full rounded-xl object-cover" />}

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{raffle.title}</h1>
            <RaffleStatusBadge status={raffle.status} />
          </div>
          <p className="text-xl font-bold text-emerald-700">
            {formatCents(raffle.priceCents)} <span className="text-sm font-normal text-gray-500">por número</span>
          </p>
          <ProgressBar percent={p.percent} label={`${p.percent}% vendido · ${formatInt(p.available)} números disponíveis`} />
          {raffle.drawDate && <p className="text-sm text-gray-600">Sorteio pela Loteria Federal em {formatDateTime(raffle.drawDate)}</p>}
        </div>

        {raffle.result && (
          <Alert tone="success">
            Resultado: número {raffle.result.winningNumber} (concurso {raffle.result.lotteryContest} da Loteria Federal)
          </Alert>
        )}

        <Card className="p-5">
          <h2 className="mb-2 font-semibold text-gray-900">Descrição</h2>
          <p className="whitespace-pre-line text-sm text-gray-700">{raffle.description}</p>
        </Card>

        {raffle.prizes.length > 0 && (
          <Card className="flex flex-col gap-6 p-5">
            <h2 className="font-semibold text-gray-900">Prêmios</h2>
            {raffle.prizes.map((prize) => (
              <PrizeGallery key={prize.position} prize={prize} />
            ))}
          </Card>
        )}

        {raffle.rules && (
          <Card className="p-5">
            <details>
              <summary className="cursor-pointer font-semibold text-gray-900">Regulamento</summary>
              <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{raffle.rules}</p>
            </details>
          </Card>
        )}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <BuyBox raffle={raffle} />
      </aside>
    </div>
  )
}
