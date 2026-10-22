import { useState } from 'react'
import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  FileTextIcon,
  GridNineIcon,
  ScalesIcon,
  TicketIcon,
  TrophyIcon,
} from '@phosphor-icons/react'
import { Link, useParams } from 'react-router'
import { Alert, Button, Card, ProgressBar, RaffleDetailSkeleton, RaffleStatusBadge } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { useSocketEvent } from '@/shared/hooks/useSocket'
import { ApiError } from '@/shared/lib/http'
import { formatCents, formatDateTime, formatInt, padNumber } from '@/shared/utils/format'
import { type BuyMode, BuyBox } from '../components/BuyBox'
import { DrawResultCard } from '../components/DrawResultCard'
import { NumberGrid } from '../components/NumberGrid'
import { PrizeGallery } from '../components/PrizeGallery'
import { useRaffle, useRaffleLive } from '../hooks/useRaffles'
import type { NumbersEvent } from '../types'

export function RafflePage() {
  const { slug } = useParams()
  const { data: raffle, isLoading, error } = useRaffle(slug)
  useRaffleLive(slug)
  useDocumentTitle(raffle?.title)

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

  if (isLoading) return <RaffleDetailSkeleton />
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-anzac-300 bg-anzac-50 p-4 text-anzac-600">
          <TicketIcon className="size-7" />
        </div>
        <p className="font-wide text-lg font-bold text-charcoal-900">Campanha não encontrada</p>
        <Link to="/">
          <Button variant="primary">
            <ArrowLeftIcon weight="bold" className="size-4" />
            Ver rifas abertas
          </Button>
        </Link>
      </div>
    )
  }
  if (error || !raffle) return <Alert tone="error">Não foi possível carregar a rifa. Tente de novo em instantes.</Alert>

  // Quem decide é o admin: grade (escolher números) ou roleta (quantidade).
  const mode: BuyMode = raffle.saleMode === 'PICK' ? 'pick' : 'quantity'
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
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        {/* Hero Card da Campanha */}
        <Card className="overflow-hidden p-0">
          {raffle.cover && (
            <div className="relative aspect-video w-full bg-watercourse-950">
              <img src={raffle.cover.full} alt="" className="h-full w-full object-cover" />
              <div className="absolute top-4 right-4">
                <RaffleStatusBadge status={raffle.status} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                {!raffle.cover && (
                  <div className="mb-2">
                    <RaffleStatusBadge status={raffle.status} />
                  </div>
                )}
                <h1 className="font-wide text-2xl font-extrabold text-charcoal-900 sm:text-3xl">{raffle.title}</h1>
                {raffle.drawDate && (
                  <p className="inline-flex items-center gap-1.5 text-sm text-slate-grey-600">
                    <CalendarBlankIcon className="size-4 text-watercourse-700" />
                    Sorteio pela Loteria Federal em <strong className="text-charcoal-900">{formatDateTime(raffle.drawDate)}</strong>
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-anzac-300 bg-anzac-50 px-4 py-2.5 text-right">
                <span className="block text-[11px] font-semibold tracking-wider text-anzac-800 uppercase">Por apenas</span>
                <span className="font-wide text-2xl font-extrabold text-watercourse-800">{formatCents(raffle.priceCents)}</span>
                <span className="block text-[11px] text-slate-grey-600">por bilhete</span>
              </div>
            </div>

            <ProgressBar
              percent={p.percent}
              label={`${p.percent}% vendido · ${formatInt(p.available)} números disponíveis`}
            />
          </div>
        </Card>

        {raffle.result && <DrawResultCard result={raffle.result} totalNumbers={raffle.totalNumbers} />}

        {mode === 'pick' && raffle.status === 'ACTIVE' && (
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5 border-b border-cream-200 pb-3">
              <GridNineIcon className="size-5 text-watercourse-700" />
              <h2 className="font-wide text-lg font-bold text-charcoal-900">Escolha seus números</h2>
            </div>
            {lost.length > 0 && (
              <div className="mb-4">
                <Alert tone="warning">
                  {lost.map((n) => padNumber(n, raffle.totalNumbers)).join(', ')} acabou de ser reservado por outra pessoa e saiu da sua seleção.
                </Alert>
              </div>
            )}
            <NumberGrid
              slug={raffle.slug}
              total={raffle.totalNumbers}
              selected={selected}
              max={raffle.maxPerOrder}
              onToggle={toggle}
            />
          </Card>
        )}

        <Card className="p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2.5 border-b border-cream-200 pb-3">
            <FileTextIcon className="size-5 text-watercourse-700" />
            <h2 className="font-wide text-lg font-bold text-charcoal-900">Sobre a campanha</h2>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-grey-700">{raffle.description}</p>
        </Card>

        {raffle.prizes.length > 0 && (
          <Card className="flex flex-col gap-6 p-5 sm:p-6">
            <div className="flex items-center gap-2.5 border-b border-cream-200 pb-3">
              <TrophyIcon className="size-5 text-anzac-600" />
              <h2 className="font-wide text-lg font-bold text-charcoal-900">Prêmios da campanha</h2>
            </div>
            <div className="flex flex-col gap-6">
              {raffle.prizes.map((prize) => (
                <PrizeGallery key={prize.position} prize={prize} />
              ))}
            </div>
          </Card>
        )}

        {raffle.rules && (
          <Card className="p-5 sm:p-6">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between font-wide text-base font-bold text-charcoal-900">
                <span className="flex items-center gap-2.5">
                  <ScalesIcon className="size-5 text-watercourse-700" />
                  Regulamento e termos do sorteio
                </span>
                <span className="text-xs font-semibold text-watercourse-700 transition-transform group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-4 border-t border-cream-200 pt-4 whitespace-pre-line text-sm leading-relaxed text-slate-grey-700">
                {raffle.rules}
              </p>
            </details>
          </Card>
        )}
      </div>

      <aside className="order-first lg:order-none lg:sticky lg:top-20 lg:self-start">
        <BuyBox raffle={raffle} mode={mode} selected={selected} onDeselect={deselect} />
      </aside>
    </div>
  )
}
