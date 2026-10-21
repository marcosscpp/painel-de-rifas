import { useState } from 'react'
import { FunnelSimpleIcon, MagnifyingGlassIcon, PlusIcon, TicketIcon } from '@phosphor-icons/react'
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
  ProgressBar,
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
    ),
  },
  {
    key: 'status',
    header: 'Status',
    cell: (r) => <RaffleStatusBadge status={r.status} />,
  },
  {
    key: 'price',
    header: 'Preço',
    cell: (r) => <span className="font-semibold text-watercourse-800">{formatCents(r.priceCents)}</span>,
  },
  {
    key: 'totalNumbers',
    header: 'Cotas',
    cell: (r) => <span className="font-mono text-xs text-slate-grey-700">{formatInt(r.totalNumbers)}</span>,
  },
  {
    key: 'progress',
    header: 'Progresso',
    className: 'w-52',
    cell: (r) => <ProgressBar percent={r.progress.percent} label={`${r.progress.percent}% vendido`} />,
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

      <Card className="mb-5 flex flex-wrap items-end gap-4 p-4">
        <div className="w-full sm:w-60">
          <Select
            label="Status"
            leftIcon={<FunnelSimpleIcon weight="duotone" className="size-4" />}
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
