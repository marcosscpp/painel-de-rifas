import { CaretDownIcon, ConfettiIcon, TrophyIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { DrawResultCard } from '@/domains/raffles'
import { Alert, Card, EmptyState, PageHeader, Spinner, Tabs } from '@/shared/components'
import { cn } from '@/shared/utils/cn'
import { formatDateTime } from '@/shared/utils/format'
import { DrawForm } from '../components/DrawForm'
import { useDrawRaffles, usePublishedResult } from '../hooks/useDraws'
import type { DrawRaffle } from '../types'

function PublishedResult({ raffle }: { raffle: DrawRaffle }) {
  const { data, isLoading } = usePublishedResult(raffle.slug)
  if (isLoading) return <Spinner className="size-5 text-watercourse-700" />
  return data ? <DrawResultCard result={data} totalNumbers={raffle.totalNumbers} /> : null
}

function RaffleRow({ raffle, open, onToggle }: { raffle: DrawRaffle; open: boolean; onToggle: () => void }) {
  return (
    <Card className="bg-white p-0">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-charcoal-900">{raffle.title}</p>
          <p className="text-xs text-slate-grey-600">
            {raffle.drawDate ? `Sorteio previsto para ${formatDateTime(raffle.drawDate)}` : 'Sem data de sorteio definida'}
          </p>
        </div>
        <span className="text-xs font-bold text-watercourse-800">
          {raffle.status === 'CLOSED' ? 'Apurar resultado' : 'Ver resultado'}
        </span>
        <CaretDownIcon weight="bold" className={cn('size-4 text-slate-grey-500 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-cream-200 p-4">
          {raffle.status === 'CLOSED' ? <DrawForm raffle={raffle} onDone={onToggle} /> : <PublishedResult raffle={raffle} />}
        </div>
      )}
    </Card>
  )
}

export function AdminDrawsPage() {
  const [tab, setTab] = useState<DrawRaffle['status']>('CLOSED')
  const [openId, setOpenId] = useState<string | null>(null)
  const { data, isLoading, error } = useDrawRaffles(tab)

  return (
    <>
      <PageHeader title="Sorteios" subtitle="Apuração pelo resultado da Loteria Federal" />
      <Tabs
        className="mb-4 max-w-md"
        value={tab}
        onChange={(t) => {
          setTab(t)
          setOpenId(null)
        }}
        items={[
          { value: 'CLOSED', label: 'Aguardando apuração', icon: <ConfettiIcon className="size-4" /> },
          { value: 'DRAWN', label: 'Apuradas', icon: <TrophyIcon className="size-4" /> },
        ]}
      />
      {tab === 'CLOSED' && (
        <div className="mb-4">
          <Alert tone="info">
            Só aparecem campanhas com as vendas encerradas. Encerre a venda na tela da campanha e, depois do concurso da
            Federal, digite aqui os 5 prêmios.
          </Alert>
        </div>
      )}
      {error && <Alert tone="error">{error.message}</Alert>}
      {isLoading && <Spinner className="size-6 text-watercourse-700" />}
      {data && data.length === 0 && (
        <EmptyState
          icon={<TrophyIcon className="size-6" />}
          title={tab === 'CLOSED' ? 'Nenhuma campanha aguardando apuração' : 'Nenhum resultado publicado'}
          action={
            <Link to="/admin/rifas" className="text-sm font-bold text-watercourse-800 hover:underline">
              Ver campanhas
            </Link>
          }
        />
      )}
      <div className="flex flex-col gap-3">
        {data?.map((r) => (
          <RaffleRow key={r.id} raffle={r} open={openId === r.id} onToggle={() => setOpenId((id) => (id === r.id ? null : r.id))} />
        ))}
      </div>
    </>
  )
}
