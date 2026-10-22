import { DownloadSimpleIcon, MagnifyingGlassIcon, ReceiptIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { type OrderStatus, OrderStatusBadge } from '@/domains/checkout'
import {
  Alert,
  Card,
  type ColumnDef,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  Select,
} from '@/shared/components'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatCents, formatDateTime, formatInt } from '@/shared/utils/format'
import { formatPhone } from '../components/BuyerInfo'
import { OrderDetailModal } from '../components/OrderDetailModal'
import { useAdminOrders, useRaffleOptions } from '../hooks/useAdminOrders'
import { adminOrdersApi } from '../services/admin-orders.api'
import type { AdminOrderListItem, AdminOrdersFilters } from '../types'

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'PAID', label: 'Pago' },
  { value: 'PENDING', label: 'Aguardando pagamento' },
  { value: 'EXPIRED', label: 'Expirado' },
  { value: 'CANCELED', label: 'Cancelado' },
]

const pageSizes = [20, 50, 100].map((n) => ({ value: String(n), label: `${n} por página` }))

export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [raffleId, setRaffleId] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const refundPending = params.get('reembolso') === '1'
  const openId = params.get('pedido')
  const q = useDebounce(search.trim(), 350)

  const filters: AdminOrdersFilters = {
    status: status || undefined,
    raffleId: raffleId || undefined,
    q: q || undefined,
    refundPending: refundPending || undefined,
    page,
    pageSize,
  }
  const { data, isLoading, isFetching, error } = useAdminOrders(filters)
  const raffles = useRaffleOptions()

  const setParam = (key: string, value: string | null) =>
    setParams(
      (p) => {
        if (value) p.set(key, value)
        else p.delete(key)
        return p
      },
      { replace: true },
    )
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }

  const columns: ColumnDef<AdminOrderListItem>[] = [
    {
      key: 'buyer',
      header: 'Comprador',
      cell: (o) => (
        <button type="button" onClick={() => setParam('pedido', o.id)} className="text-left">
          <p className="font-bold text-charcoal-900 hover:text-watercourse-800">{o.buyer.name}</p>
          <p className="text-xs text-slate-grey-500">{formatPhone(o.buyer.phone)}</p>
        </button>
      ),
    },
    { key: 'raffle', header: 'Campanha', cell: (o) => <span className="line-clamp-2 text-sm">{o.raffle.title}</span> },
    {
      key: 'status',
      header: 'Status',
      className: 'w-44',
      cell: (o) => <OrderStatusBadge status={o.status} refundPending={o.refundRequired && !o.refundedAt} />,
    },
    { key: 'qty', header: 'Números', className: 'w-24', cell: (o) => <span className="font-mono">{formatInt(o.quantity)}</span> },
    {
      key: 'total',
      header: 'Total',
      className: 'w-28',
      cell: (o) => <span className="font-mono font-semibold">{formatCents(o.totalCents)}</span>,
    },
    { key: 'date', header: 'Data', className: 'w-40', cell: (o) => <span className="text-xs">{formatDateTime(o.createdAt)}</span> },
  ]

  return (
    <>
      <PageHeader
        title="Pedidos"
        subtitle={data ? `${formatInt(data.total)} pedidos encontrados` : 'Compras de todas as campanhas'}
        actions={
          <a
            href={adminOrdersApi.exportUrl(filters)}
            className="inline-flex items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm font-medium text-charcoal-900 shadow-2xs transition hover:border-watercourse-700 hover:bg-white"
          >
            <DownloadSimpleIcon weight="bold" className="size-4" />
            Exportar CSV
          </a>
        }
      />

      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-[1.5fr_1fr_1fr_auto]">
        <Input
          aria-label="Buscar"
          placeholder="Nome, nº do pedido, ou celular, CPF ou e-mail completo"
          leftIcon={<MagnifyingGlassIcon className="size-4" />}
          value={search}
          onChange={(e) => reset(setSearch)(e.target.value)}
        />
        <Select
          aria-label="Campanha"
          value={raffleId}
          onChange={(e) => reset(setRaffleId)(e.target.value)}
          options={[{ value: '', label: 'Todas as campanhas' }, ...(raffles.data ?? []).map((r) => ({ value: r.id, label: r.title }))]}
        />
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => reset(setStatus)(e.target.value as OrderStatus | '')}
          options={statusOptions}
        />
        <Select
          aria-label="Itens por página"
          value={String(pageSize)}
          onChange={(e) => reset(setPageSize)(Number(e.target.value))}
          options={pageSizes}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-charcoal-900 md:col-span-4">
          <input
            type="checkbox"
            checked={refundPending}
            onChange={(e) => {
              setParam('reembolso', e.target.checked ? '1' : null)
              setPage(1)
            }}
            className="size-4 accent-watercourse-800"
          />
          Só reembolsos pendentes
        </label>
      </Card>

      {error && <Alert tone="error">{error.message}</Alert>}
      <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : undefined}>
        <DataTable
          columns={columns}
          data={data?.items}
          keyExtractor={(o) => o.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              icon={<ReceiptIcon className="size-6" />}
              title="Nenhum pedido encontrado"
              description="Ajuste os filtros ou aguarde as primeiras compras."
            />
          }
        />
      </div>
      {data && <Pagination page={page} pages={Math.ceil(data.total / data.pageSize)} onPageChange={setPage} />}

      <OrderDetailModal orderId={openId} onClose={() => setParam('pedido', null)} />
    </>
  )
}
