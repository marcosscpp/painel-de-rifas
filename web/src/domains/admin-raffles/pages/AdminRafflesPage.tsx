import { useState } from 'react'
import { CaretRightIcon, FunnelIcon, MagnifyingGlassIcon, PlusIcon, TicketIcon } from '@phosphor-icons/react'
import { Link, useNavigate } from 'react-router'
import {
  Alert,
  Button,
  Card,
  type ColumnDef,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  RaffleStatusBadge,
  Select,
  Spinner,
} from '@/shared/components'
import { useDebounce } from '@/shared/hooks/useDebounce'
import type { RaffleStatus } from '@/shared/types'
import { formatCents, formatInt } from '@/shared/utils/format'
import { useAdminRaffleList } from '../hooks/useAdminRaffles'
import type { AdminRaffleListItem } from '../types'

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'ACTIVE', label: 'À venda' },
  { value: 'PAUSED', label: 'Pausada' },
  { value: 'CLOSED', label: 'Vendas encerradas' },
  { value: 'DRAWN', label: 'Sorteada' },
]

const columns: ColumnDef<AdminRaffleListItem>[] = [
  {
    key: 'title',
    header: 'Campanha',
    cell: (r) => (
      <Link to={`/admin/rifas/${r.id}`} className="flex items-center gap-3.5">
        {r.cover ? (
          <img
            src={r.cover.thumb}
            alt=""
            className="h-11 w-16 shrink-0 rounded-xl border border-cream-200 object-cover"
          />
        ) : (
          <span className="royal-gradient flex h-11 w-16 shrink-0 items-center justify-center rounded-xl p-3 text-anzac-300">
            <TicketIcon className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-bold text-charcoal-900 transition-colors group-hover:text-watercourse-800">
            {r.title}
          </p>
          <p className="truncate text-xs text-slate-grey-500">
            /rifa/{r.slug} · {r.saleMode === 'PICK' ? 'Dezenas' : 'Aleatório'}
          </p>
        </div>
      </Link>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    className: 'w-36',
    cell: (r) => <RaffleStatusBadge status={r.status} />,
  },
  {
    key: 'price',
    header: 'Preço',
    className: 'w-32',
    cell: (r) => <span className="font-mono text-sm font-semibold text-charcoal-900">{formatCents(r.priceCents)}</span>,
  },
  {
    key: 'totalNumbers',
    header: 'Cotas',
    className: 'w-28',
    cell: (r) => <span className="font-mono text-sm text-slate-grey-700">{formatInt(r.totalNumbers)}</span>,
  },
  {
    key: 'progress',
    header: 'Progresso',
    className: 'w-56',
    cell: (r) => {
      const pct = Math.max(0, Math.min(100, r.progress.percent))
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-mono font-bold text-charcoal-900">{pct}% vendido</span>
            <span className="text-[11px] text-slate-grey-500">{formatInt(r.progress.paid)} pagos</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-cream-200">
            <div
              className="h-full rounded-full bg-watercourse-700 transition-[width] duration-500"
              style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
            />
          </div>
        </div>
      )
    },
  },
  {
    key: 'action',
    header: '',
    className: 'w-10 text-right',
    cell: () => (
      <CaretRightIcon className="ml-auto size-4 text-slate-grey-400 transition group-hover:translate-x-0.5 group-hover:text-watercourse-800" />
    ),
  },
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

      <Card className="mb-5 flex flex-wrap items-end gap-4 bg-white p-4">
        <div className="w-full sm:w-56">
          <Select
            label="Status"
            leftIcon={<FunnelIcon className="size-4" />}
            options={statusOptions}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as RaffleStatus | '')
              setPage(1)
            }}
          />
        </div>
        <div className="min-w-60 flex-1">
          <Input
            label="Buscar campanha"
            type="search"
            placeholder="Título ou endereço (slug)"
            className="bg-white"
            leftIcon={<MagnifyingGlassIcon className="size-4" />}
            rightAdornment={isFetching && !isLoading ? <Spinner className="size-4 text-watercourse-700" /> : undefined}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </Card>

      {error && <Alert tone="error">{error.message}</Alert>}

      <DataTable
        columns={columns}
        data={data?.items}
        keyExtractor={(r) => r.id}
        onRowClick={(r) => navigate(`/admin/rifas/${r.id}`)}
        isLoading={isLoading}
        skeletonRows={5}
        emptyState={
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
        }
      />

      {data && <Pagination page={page} pages={pages} onPageChange={setPage} />}
    </>
  )
}
