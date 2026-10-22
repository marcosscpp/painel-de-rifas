import { CalendarBlankIcon, ChartBarIcon, FileCsvIcon, FileXlsIcon } from '@phosphor-icons/react'
import { type ReactNode, useState } from 'react'
import type { OrderStatus } from '@/domains/checkout'
import {
  Alert,
  Badge,
  type BadgeTone,
  Card,
  DateField,
  EmptyState,
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
import { formatCents, formatCpf, formatDate, formatDateTime, formatInt } from '@/shared/utils/format'
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

const statusBadgeTone: Record<string, BadgeTone> = {
  Ativa: 'teal',
  'À venda': 'teal',
  Pago: 'teal',
  Feito: 'teal',
  Sorteada: 'gold',
  Pausada: 'warning',
  'Aguardando pagamento': 'warning',
  Pendente: 'warning',
  Encerrada: 'error',
  Expirado: 'neutral',
  Cancelado: 'neutral',
  Rascunho: 'neutral',
}

const formatPhoneCell = (raw: string) =>
  raw.replace(/\D/g, '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3')

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

function formatValue(v: ReportCell, type: ColumnType): string {
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

function renderCell(v: ReportCell, col: ReportColumn): ReactNode {
  if (v == null || v === '') {
    return <span className="text-slate-grey-400">—</span>
  }

  if (col.key === 'status' || col.key === 'refund') {
    const label = String(v)
    const tone = statusBadgeTone[label] ?? 'neutral'
    return <Badge tone={tone}>{label}</Badge>
  }

  if (col.key === 'id' || col.key === 'order') {
    const full = String(v)
    return (
      <span
        title={full}
        className="inline-block rounded-md border border-cream-200 bg-cream-100/80 px-2 py-0.5 font-mono text-xs font-semibold text-slate-grey-700"
      >
        #{full.slice(0, 8)}
      </span>
    )
  }

  if (col.key === 'number') {
    return (
      <span className="inline-flex items-center rounded-md border border-watercourse-200 bg-watercourse-50 px-2.5 py-0.5 font-mono text-xs font-bold text-watercourse-900">
        {String(v)}
      </span>
    )
  }

  if (col.key === 'phone') {
    return <span className="font-mono text-xs text-slate-grey-700 tabular-nums">{formatPhoneCell(String(v))}</span>
  }

  if (col.key === 'cpf') {
    return <span className="font-mono text-xs text-slate-grey-600 tabular-nums">{formatCpf(String(v))}</span>
  }

  if (col.type === 'percent') {
    const pct = Math.max(0, Math.min(100, Number(v) * 100))
    return (
      <div className="inline-flex items-center justify-end gap-2">
        <div className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-cream-200 sm:block">
          <div
            className="h-full rounded-full bg-watercourse-700"
            style={{ width: `${Math.max(pct, pct > 0 ? 6 : 0)}%` }}
          />
        </div>
        <span className="font-mono text-xs font-bold text-charcoal-900 tabular-nums">
          {pct.toFixed(1).replace('.', ',')}%
        </span>
      </div>
    )
  }

  if (col.type === 'money') {
    const highlight = col.key === 'revenue' || col.key === 'total' || col.key === 'spent'
    return (
      <span
        className={cn(
          'font-mono text-sm tabular-nums',
          highlight ? 'font-bold text-watercourse-900' : 'font-medium text-charcoal-900',
        )}
      >
        {formatCents(Number(v))}
      </span>
    )
  }

  if (col.type === 'int') {
    return <span className="font-mono text-sm text-charcoal-900 tabular-nums">{formatInt(Number(v))}</span>
  }

  if (col.type === 'date' || col.type === 'datetime') {
    return (
      <span className="text-xs text-slate-grey-600 tabular-nums">
        {col.type === 'date' ? formatDate(String(v)) : formatDateTime(String(v))}
      </span>
    )
  }

  if (col.key === 'raffle' || col.key === 'name' || col.key === 'buyer') {
    const text = String(v)
    return (
      <span title={text} className="block max-w-60 truncate font-semibold text-charcoal-900">
        {text}
      </span>
    )
  }

  if (col.key === 'email') {
    const text = String(v)
    return (
      <span title={text} className="block max-w-48 truncate text-xs text-slate-grey-600">
        {text}
      </span>
    )
  }

  return <span className="text-sm text-slate-grey-700">{String(v)}</span>
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

  const summaryItems =
    data && totals
      ? data.columns
          .map((c, i) => (c.total && totals[i] != null ? { key: c.key, label: c.label, value: formatValue(totals[i], c.type) } : null))
          .filter((item): item is { key: string; label: string; value: string } => item !== null)
      : []

  const exportLink = (format: 'csv' | 'xlsx', label: string, Icon: typeof FileCsvIcon) => (
    <a
      href={ready ? adminReportsApi.exportUrl(type, format, filters) : undefined}
      aria-disabled={!ready}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border border-cream-300 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal-900 shadow-2xs transition',
        ready ? 'hover:border-watercourse-700 hover:bg-cream-50' : 'pointer-events-none opacity-50',
      )}
    >
      <Icon weight="bold" className="size-4 text-watercourse-800" />
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

      <Card className="mb-5 grid gap-3.5 bg-white p-4 md:grid-cols-4">
        <Select
          label={info?.needsRaffle ? 'Campanha (obrigatória)' : 'Campanha'}
          value={raffleId}
          onChange={(e) => setRaffleId(e.target.value)}
          options={[
            { value: '', label: info?.needsRaffle ? 'Escolha uma campanha' : 'Todas as campanhas' },
            ...(raffles.data ?? []).map((r) => ({ value: r.id, label: r.title })),
          ]}
        />
        <DateField
          label="De"
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
        />
        <DateField
          label="Até"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
        />
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
        <div className="flex flex-wrap items-center gap-1.5 border-t border-cream-200/80 pt-3 md:col-span-4">
          <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-grey-500">
            <CalendarBlankIcon className="size-3.5" />
            Atalhos:
          </span>
          {presets.map((p) => {
            const [pf, pt] = p.range()
            const isActive = from === pf && to === pt
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setFrom(pf)
                  setTo(pt)
                }}
                className={cn(
                  'cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                  isActive
                    ? 'bg-watercourse-800 text-cream-50 shadow-2xs'
                    : 'bg-cream-100 text-slate-grey-700 hover:bg-watercourse-50 hover:text-watercourse-800',
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </Card>

      {missingRaffle && <Alert tone="info">Escolha uma campanha para ver os números vendidos.</Alert>}
      {badRange && <Alert tone="error">A data inicial é depois da final.</Alert>}
      {preview.error && ready && <Alert tone="error">{preview.error.message}</Alert>}

      {ready && (
        <div className={cn(preview.isFetching && !preview.isLoading && 'opacity-70 transition-opacity')}>
          {preview.isLoading || !data ? (
            <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between border-b border-cream-200 px-5 py-3.5">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Table>
                <TableHeader>
                  <tr>
                    {(info?.columns ?? Array.from({ length: 6 }, (_, i) => ({ key: String(i), label: '' }))).map((c) => (
                      <TableHead key={c.key} className="px-3.5 py-3">
                        <Skeleton className="h-3.5 w-20" />
                      </TableHead>
                    ))}
                  </tr>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }, (_, rIdx) => (
                    <TableRow key={rIdx}>
                      {(info?.columns ?? Array.from({ length: 6 }, (_, i) => ({ key: String(i) }))).map((c) => (
                        <TableCell key={c.key} className="px-3.5 py-3.5">
                          <Skeleton className="h-4 w-full max-w-28" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : data.rows.length === 0 ? (
            <EmptyState
              icon={<ChartBarIcon className="size-6" />}
              title="Nada neste período"
              description="Ajuste os filtros para ver outro intervalo ou outra campanha."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-2xs">
              {/* Cabeçalho de resumo da tabela */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 bg-cream-50/60 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-wide text-sm font-bold text-charcoal-900">{data.title}</h2>
                  <Badge tone="neutral">
                    {data.truncated
                      ? `Primeiros ${formatInt(data.rows.length)} registros`
                      : `${formatInt(data.rows.length)} ${data.rows.length === 1 ? 'registro' : 'registros'}`}
                  </Badge>
                </div>

                {summaryItems.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                    {summaryItems.map((item) => (
                      <div key={item.key} className="flex items-baseline gap-1.5">
                        <span className="text-slate-grey-500">{item.label}:</span>
                        <strong className="font-mono font-bold text-charcoal-900 tabular-nums">{item.value}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Table>
                <TableHeader>
                  <tr>
                    {data.columns.map((c, idx) => (
                      <TableHead
                        key={c.key}
                        className={cn(
                          'px-3.5 py-3 text-[11px]',
                          numeric(c) && 'text-right',
                          idx === 0 && 'pl-5',
                          idx === data.columns.length - 1 && 'pr-5',
                        )}
                      >
                        {c.label}
                      </TableHead>
                    ))}
                  </tr>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row, i) => (
                    <TableRow key={i}>
                      {data.columns.map((c, j) => (
                        <TableCell
                          key={c.key}
                          className={cn(
                            'px-3.5 py-3 text-sm whitespace-nowrap',
                            numeric(c) && 'text-right',
                            j === 0 && 'pl-5',
                            j === data.columns.length - 1 && 'pr-5',
                          )}
                        >
                          {renderCell(row[j], c)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
                {totals && (
                  <tfoot className="border-t-2 border-cream-300 bg-cream-100/80 font-bold text-charcoal-900">
                    <tr>
                      {data.columns.map((c, j) => (
                        <TableCell
                          key={c.key}
                          className={cn(
                            'px-3.5 py-3.5 text-sm whitespace-nowrap',
                            numeric(c) && 'text-right font-mono tabular-nums',
                            j === 0 && 'pl-5 font-wide text-xs tracking-wider text-slate-grey-700 uppercase',
                            j === data.columns.length - 1 && 'pr-5',
                          )}
                        >
                          {j === 0 ? 'Total do período' : totals[j] == null ? '' : formatValue(totals[j], c.type)}
                        </TableCell>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </Table>

              {data.truncated && (
                <div className="flex items-center justify-between gap-3 border-t border-cream-200 bg-cream-50/80 px-5 py-3 text-xs text-slate-grey-600">
                  <span>
                    Mostrando as primeiras <strong className="text-charcoal-900">{formatInt(data.rows.length)}</strong> linhas na prévia.
                  </span>
                  <span className="font-medium text-watercourse-800">
                    Exporte em Excel ou CSV para baixar o relatório completo com totais.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
