import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert, Button, Card, EmptyState, PageHeader, ProgressBar, RaffleStatusBadge, Select, Spinner } from '@/shared/components'
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

  const { data, isLoading, error, isFetching } = useAdminRaffleList({ status: status || undefined, q: q || undefined, page })
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <>
      <PageHeader title="Rifas" actions={<Button onClick={() => navigate('/admin/rifas/nova')}>Nova rifa</Button>} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-56">
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
        <div className="flex min-w-60 flex-1 flex-col gap-1">
          <label htmlFor="busca" className="text-sm font-medium text-gray-700">
            Buscar
          </label>
          <input
            id="busca"
            type="search"
            placeholder="Título ou endereço"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        {isFetching && !isLoading && <Spinner className="mb-2 text-emerald-600" />}
      </div>

      {error && <Alert tone="error">{error.message}</Alert>}
      {isLoading && <Spinner className="text-emerald-600" />}
      {data && data.items.length === 0 && (
        <EmptyState title="Nenhuma rifa encontrada" description="Crie a primeira em “Nova rifa”." />
      )}

      {data && data.items.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Rifa</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Números</th>
                <th className="w-48 px-4 py-3">Vendido</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/rifas/${r.id}`} className="flex items-center gap-3 font-medium text-gray-900 hover:text-emerald-700">
                      {r.cover ? (
                        <img src={r.cover.thumb} alt="" className="h-10 w-16 rounded object-cover" />
                      ) : (
                        <span className="h-10 w-16 rounded bg-gray-100" />
                      )}
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <RaffleStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">{formatCents(r.priceCents)}</td>
                  <td className="px-4 py-3">{formatInt(r.totalNumbers)}</td>
                  <td className="px-4 py-3">
                    <ProgressBar percent={r.progress.percent} label={`${r.progress.percent}%`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {data && pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span>
            Página {page} de {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </>
  )
}
