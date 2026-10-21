import { useState } from 'react'
import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon, PlusIcon, TicketIcon } from '@phosphor-icons/react'
import { Link, useNavigate } from 'react-router'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  RaffleStatusBadge,
  Select,
  Spinner,
} from '@/shared/components'
import { useDebounce } from '@/shared/hooks/useDebounce'
import type { RaffleStatus } from '@/shared/types'
import { formatCents, formatInt } from '@/shared/utils/format'
import { useAdminRaffleList } from '../hooks/useAdminRaffles'

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'ACTIVE', label: 'À venda' },
  { value: 'PAUSED', label: 'Pausada' },
  { value: 'CLOSED', label: 'Vendas encerradas' },
  { value: 'DRAWN', label: 'Sorteada' },
]

export function AdminRafflesPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<RaffleStatus | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounce(search)

  const { data, isLoading, error, isFetching } = useAdminRaffleList({
    status: status || undefined,
    q: q || undefined,
    page,
  })
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <>
      <PageHeader
        title="Rifas"
        subtitle="Gerencie suas campanhas, prêmios, pacotes e status de venda"
        actions={
          <Button variant="buy" onClick={() => navigate('/admin/rifas/nova')}>
            <PlusIcon weight="bold" className="size-4" />
            Nova rifa
          </Button>
        }
      />

      <Card className="mb-5 flex flex-wrap items-end gap-4 p-4">
        <div className="w-full sm:w-56">
          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as RaffleStatus | '')
              setPage(1)
            }}
          />
        </div>
        <div className="flex min-w-60 flex-1 flex-col gap-1.5">
          <label htmlFor="busca" className="text-sm font-semibold text-charcoal-900">
            Buscar campanha
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-grey-500" />
            <input
              id="busca"
              type="search"
              placeholder="Título ou endereço (slug)"
              className="w-full rounded-xl border border-cream-300 bg-cream-50 py-2.5 pr-3.5 pl-10 text-sm text-charcoal-900 outline-none transition placeholder:text-slate-grey-400 focus:border-watercourse-700 focus:bg-white focus:ring-2 focus:ring-anzac-400/45"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
        {isFetching && !isLoading && <Spinner className="mb-2.5 text-watercourse-700" />}
      </Card>

      {error && <Alert tone="error">{error.message}</Alert>}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner className="size-7 text-watercourse-700" />
        </div>
      )}
      {data && data.items.length === 0 && (
        <EmptyState
          title="Nenhuma rifa encontrada"
          description="Crie a primeira campanha clicando em “Nova rifa”."
          action={
            <Button variant="primary" onClick={() => navigate('/admin/rifas/nova')}>
              <PlusIcon weight="bold" className="size-4" />
              Criar primeira rifa
            </Button>
          }
        />
      )}

      {data && data.items.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cream-200 bg-cream-100/90 text-xs font-bold tracking-wider text-slate-grey-600 uppercase">
              <tr>
                <th className="px-4 py-3.5">Campanha</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Preço</th>
                <th className="px-4 py-3.5">Cotas</th>
                <th className="w-52 px-4 py-3.5">Progresso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {data.items.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-cream-100/60">
                  <td className="px-4 py-3.5">
                    <Link
                      to={`/admin/rifas/${r.id}`}
                      className="flex items-center gap-3 font-bold text-charcoal-900 hover:text-watercourse-800"
                    >
                      {r.cover ? (
                        <img src={r.cover.thumb} alt="" className="h-11 w-16 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="royal-gradient flex h-11 w-16 shrink-0 items-center justify-center rounded-lg text-anzac-300">
                          <TicketIcon weight="duotone" className="size-5" />
                        </span>
                      )}
                      <span className="line-clamp-1">{r.title}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <RaffleStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-watercourse-800">{formatCents(r.priceCents)}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-grey-700">{formatInt(r.totalNumbers)}</td>
                  <td className="px-4 py-3.5">
                    <ProgressBar percent={r.progress.percent} label={`${r.progress.percent}% vendido`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {data && pages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <CaretLeftIcon weight="bold" className="size-4" />
            Anterior
          </Button>
          <span className="text-xs font-semibold text-slate-grey-600">
            Página <strong className="text-charcoal-900">{page}</strong> de {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Próxima
            <CaretRightIcon weight="bold" className="size-4" />
          </Button>
        </div>
      )}
    </>
  )
}
