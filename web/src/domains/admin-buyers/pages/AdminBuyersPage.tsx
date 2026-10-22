import { MagnifyingGlassIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { formatPhone } from '@/domains/admin-orders'
import { Alert, Card, type ColumnDef, DataTable, EmptyState, Input, PageHeader, Pagination } from '@/shared/components'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatCents, formatCpf, formatDate, formatInt } from '@/shared/utils/format'
import { BuyerDetailModal } from '../components/BuyerDetailModal'
import { useAdminBuyers } from '../hooks/useAdminBuyers'
import type { AdminBuyerListItem } from '../types'

export function AdminBuyersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const q = useDebounce(search.trim(), 350)
  const { data, isLoading, isFetching, error } = useAdminBuyers({ q: q || undefined, page, pageSize: 20 })

  const columns: ColumnDef<AdminBuyerListItem>[] = [
    {
      key: 'name',
      header: 'Comprador',
      cell: (b) => (
        <button type="button" onClick={() => setOpenId(b.id)} className="text-left">
          <p className="font-bold text-charcoal-900 hover:text-watercourse-800">{b.name}</p>
          <p className="text-xs text-slate-grey-500">{b.email}</p>
        </button>
      ),
    },
    {
      key: 'contact',
      header: 'Celular / CPF',
      className: 'w-44',
      cell: (b) => (
        <div className="text-xs">
          <p>{formatPhone(b.phone)}</p>
          <p className="font-mono text-slate-grey-500">{formatCpf(b.cpf)}</p>
        </div>
      ),
    },
    { key: 'city', header: 'Cidade', className: 'w-36', cell: (b) => (b.city ? `${b.city}/${b.state}` : '—') },
    {
      key: 'paid',
      header: 'Compras pagas',
      className: 'w-32',
      cell: (b) => (
        <span className="text-xs">
          <strong className="font-mono text-sm">{formatInt(b.paidOrders)}</strong> · {formatInt(b.paidNumbers)} números
        </span>
      ),
    },
    {
      key: 'spent',
      header: 'Total gasto',
      className: 'w-28',
      cell: (b) => <span className="font-mono font-semibold">{formatCents(b.spentCents)}</span>,
    },
    { key: 'since', header: 'Desde', className: 'w-28', cell: (b) => <span className="text-xs">{formatDate(b.createdAt)}</span> },
  ]

  return (
    <>
      <PageHeader
        title="Compradores"
        subtitle={data ? `${formatInt(data.total)} cadastros` : 'Quem já se cadastrou ou comprou'}
      />
      <Card className="mb-4 p-4">
        <Input
          aria-label="Buscar"
          placeholder="Nome, ou celular, CPF ou e-mail completo"
          leftIcon={<MagnifyingGlassIcon className="size-4" />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </Card>
      {error && <Alert tone="error">{error.message}</Alert>}
      <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : undefined}>
        <DataTable
          columns={columns}
          data={data?.items}
          keyExtractor={(b) => b.id}
          isLoading={isLoading}
          emptyState={
            <EmptyState icon={<UsersThreeIcon className="size-6" />} title="Nenhum comprador encontrado" />
          }
        />
      </div>
      {data && <Pagination page={page} pages={Math.ceil(data.total / data.pageSize)} onPageChange={setPage} />}
      <BuyerDetailModal buyerId={openId} onClose={() => setOpenId(null)} />
    </>
  )
}
