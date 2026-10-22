import { ChartBarIcon, FileCsvIcon, FileXlsIcon, InfoIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import type { OrderStatus } from '@/domains/checkout'
import {
  Alert,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
} from '@/shared/components'
import { cn } from '@/shared/utils/cn'
import { formatCents, formatDate, formatDateTime, formatInt } from '@/shared/utils/format'
import { useReportCatalog, useReportPreview, useReportRaffles } from '../hooks/useReports'
import { adminReportsApi } from '../services/admin-reports.api'
import type { ColumnType, ReportCell, ReportColumn, ReportFilters, ReportType } from '../types'

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'PAID', label: 'Pago' },
  { value: 'PENDING', label: 'Aguardando pagamento' },
  { value: 'EXPIRED', label: 'Expirado' },
  { value: 'CANCELED', label: 'Cancelado' },
]

// Dia de hoje no fuso do navegador, no formato do <input type="date">.
const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return day(d)
}
const presets: { label: string; range: () => [string, string] }[] = [
  { label: 'Hoje', range: () => [day(new Date()), day(new Date())] },
  { label: '7 dias', range: () => [daysAgo(6), day(new Date())] },
  { label: '30 dias', range: () => [daysAgo(29), day(new Date())] },
  { label: 'Este mês', range: () => [day(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), day(new Date())] },
  { label: 'Tudo', range: () => ['', ''] },
]

function formatCell(v: ReportCell, type: ColumnType) {
  if (v == null || v === '') return '—'
  switch (type) {
    case 'money':
      return formatCents(Number(v))
    case 'int':
      return formatInt(Number(v))
    case 'percent':
      return `${(Number(v) * 100).toFixed(1).replace('.', ',')}%`
    case 'date':
      return formatDate(String(v))
    case 'datetime':
      return formatDateTime(String(v))
    default:
      return String(v)
  }
}

const numeric = (c: ReportColumn) => c.type !== 'text' && c.type !== 'date' && c.type !== 'datetime'

export function AdminReportsPage() {
  const catalog = useReportCatalog()
  const raffles = useReportRaffles()
  const [type, setType] = useState<ReportType>('sales-by-raffle')
  const [raffleId, setRaffleId] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [from, setFrom] = useState(() => daysAgo(29))
  const [to, setTo] = useState(() => day(new Date()))

  const info = catalog.data?.find((r) => r.type === type)
  const filters: ReportFilters = {
    from: from || undefined,
    to: to || undefined,
    raffleId: raffleId || undefined,
    status: info?.usesStatus && status ? status : undefined,
  }
  const missingRaffle = !!info?.needsRaffle && !raffleId
  const badRange = !!from && !!to && from > to
  const ready = !!info && !missingRaffle && !badRange
  const preview = useReportPreview(type, filters, ready)
  const data = ready ? preview.data : undefined

  // Total das colunas somáveis, só quando a prévia mostra tudo (senão o número enganaria).
  const totals =
    data && !data.truncated && data.rows.length > 1 && data.columns.some((c) => c.total)
      ? data.columns.map((c, i) => (c.total ? data.rows.reduce((s, r) => s + Number(r[i] ?? 0), 0) : null))
      : null

  const exportLink = (format: 'csv' | 'xlsx', label: string, Icon: typeof FileCsvIcon) => (
    <a
      href={ready ? adminReportsApi.exportUrl(type, format, filters) : undefined}
      aria-disabled={!ready}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm font-medium text-charcoal-900 shadow-2xs transition',
        ready ? 'hover:border-watercourse-700 hover:bg-white' : 'pointer-events-none opacity-50',
      )}
    >
      <Icon weight="bold" className="size-4" />
      {label}
    </a>
  )

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Confira na tela e exporte a planilha completa"
        actions={
          <div className="flex flex-wrap gap-2">
            {exportLink('xlsx', 'Exportar Excel', FileXlsIcon)}
            {exportLink('csv', 'Exportar CSV', FileCsvIcon)}
          </div>
        }
      />

      {catalog.error && <Alert tone="error">{catalog.error.message}</Alert>}
      <Tabs
        className="mb-4"
        value={type}
        onChange={setType}
        items={(catalog.data ?? []).map((r) => ({ value: r.type, label: r.title }))}
      />

      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-4">
        <Select
          label={info?.needsRaffle ? 'Campanha (obrigatória)' : 'Campanha'}
          value={raffleId}
          onChange={(e) => setRaffleId(e.target.value)}
          options={[
            { value: '', label: info?.needsRaffle ? 'Escolha uma campanha' : 'Todas as campanhas' },
            ...(raffles.data ?? []).map((r) => ({ value: r.id, label: r.title })),
          ]}
        />
        <Input label="De" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Até" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        {info?.usesStatus ? (
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
            options={statusOptions}
          />
        ) : (
          <div className="hidden md:block" />
        )}
        <div className="flex flex-wrap items-center gap-1.5 md:col-span-4">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                const [f, t] = p.range()
                setFrom(f)
                setTo(t)
              }}
              className="rounded-lg bg-watercourse-50 px-2.5 py-1 text-xs font-semibold text-watercourse-800 ring-1 ring-watercourse-200 transition ring-inset hover:bg-watercourse-100"
            >
              {p.label}
            </button>
          ))}
          {info && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-grey-600">
              <InfoIcon className="size-3.5" />
              Período pela {info.periodOf}, no horário de Brasília
            </span>
          )}
        </div>
      </Card>

      {missingRaffle && <Alert tone="info">Escolha uma campanha para ver os números vendidos.</Alert>}
      {badRange && <Alert tone="error">A data inicial é depois da final.</Alert>}
      {preview.error && ready && <Alert tone="error">{preview.error.message}</Alert>}

      {ready && (
        <Card className={cn('overflow-hidden p-0', preview.isFetching && 'opacity-70 transition-opacity')}>
          {preview.isLoading || !data ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : data.rows.length === 0 ? (
            <EmptyState
              icon={<ChartBarIcon className="size-6" />}
              title="Nada neste período"
              description="Ajuste os filtros para ver outro intervalo ou outra campanha."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {data.columns.map((c) => (
                      <TableHead key={c.key} className={cn(numeric(c) && 'text-right')}>
                        {c.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row, i) => (
                    <TableRow key={i}>
                      {data.columns.map((c, j) => (
                        <TableCell key={c.key} className={cn('py-3 text-sm whitespace-nowrap', numeric(c) && 'text-right font-mono')}>
                          {formatCell(row[j], c.type)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {totals && (
                    <TableRow className="bg-cream-100/70 font-bold">
                      {data.columns.map((c, j) => (
                        <TableCell key={c.key} className={cn('py-3 text-sm whitespace-nowrap', numeric(c) && 'text-right font-mono')}>
                          {j === 0 ? 'Total' : totals[j] == null ? '' : formatCell(totals[j], c.type)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {data.truncated && (
                <p className="border-t border-cream-200 px-5 py-3 text-xs text-slate-grey-600">
                  Mostrando as primeiras {formatInt(data.rows.length)} linhas. A exportação traz o relatório completo, com totais.
                </p>
              )}
            </>
          )}
        </Card>
      )}
    </>
  )
}
