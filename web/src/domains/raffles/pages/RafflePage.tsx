import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Alert, Card, FullPageSpinner, ProgressBar, RaffleStatusBadge } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { useSocketEvent } from '@/shared/hooks/useSocket'
import { ApiError } from '@/shared/lib/http'
import { formatCents, formatDateTime, formatInt, padNumber } from '@/shared/utils/format'
import { type BuyMode, BuyBox } from '../components/BuyBox'
import { NumberGrid } from '../components/NumberGrid'
import { PrizeGallery } from '../components/PrizeGallery'
import { useRaffle, useRaffleLive } from '../hooks/useRaffles'
import type { NumbersEvent } from '../types'

export function RafflePage() {
  const { slug } = useParams()
  const { data: raffle, isLoading, error } = useRaffle(slug)
  useRaffleLive(slug)
  useDocumentTitle(raffle?.title)

  const [modeChoice, setMode] = useState<BuyMode | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [lost, setLost] = useState<number[]>([])

  // Alguém reservou um número que estava selecionado aqui: tira da seleção e avisa na hora.
  useSocketEvent<NumbersEvent>('raffle:numbers', (e) => {
    if (e.slug !== slug || e.status === 'AVAILABLE') return
    const taken = e.numbers.filter((n) => selected.has(n))
    if (!taken.length) return
    setSelected((s) => new Set([...s].filter((n) => !taken.includes(n))))
    setLost(taken)
  })

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

  const mode: BuyMode = raffle.saleMode === 'PICK' ? 'pick' : raffle.saleMode === 'QUANTITY' ? 'quantity' : (modeChoice ?? 'quantity')
  const toggle = (n: number) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  const deselect = (nums: number[]) =>
    setSelected((s) => {
      const next = new Set(s)
      nums.forEach((n) => next.delete(n))
      return next
    })

  const p = raffle.progress
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex min-w-0 flex-col gap-6">
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

        {mode === 'pick' && raffle.status === 'ACTIVE' && (
          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-gray-900">Escolha seus números</h2>
            {lost.length > 0 && (
              <div className="mb-3">
                <Alert tone="warning">
                  {lost.map((n) => padNumber(n, raffle.totalNumbers)).join(', ')} acabou de ser reservado por outra pessoa e saiu da sua seleção.
                </Alert>
              </div>
            )}
            <NumberGrid slug={raffle.slug} total={raffle.totalNumbers} selected={selected} max={raffle.maxPerOrder} onToggle={toggle} />
          </Card>
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

      <aside className="order-first lg:order-none lg:sticky lg:top-6 lg:self-start">
        <BuyBox raffle={raffle} mode={mode} onModeChange={setMode} selected={selected} onDeselect={deselect} />
      </aside>
    </div>
  )
}
