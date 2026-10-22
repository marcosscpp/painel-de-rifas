import {
  ArrowCounterClockwiseIcon,
  ClockIcon,
  CurrencyCircleDollarIcon,
  ReceiptIcon,
  TicketIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Alert, Card, EmptyState, FullPageSpinner, PageHeader, ProgressBar, RaffleStatusBadge } from '@/shared/components'
import { cn } from '@/shared/utils/cn'
import { formatCents, formatDateTime, formatInt } from '@/shared/utils/format'
import { RevenueChart } from '../components/RevenueChart'
import { useDashboard } from '../hooks/useDashboard'

function Stat({ icon, label, value, hint, to, alert }: { icon: ReactNode; label: string; value: string; hint?: string; to?: string; alert?: boolean }) {
  const body = (
    <Card className={cn('flex h-full items-start gap-3 p-4', alert && 'border-warning-300 bg-warning-50', to && 'transition hover:border-watercourse-400')}>
      <span className={cn('rounded-xl p-2', alert ? 'bg-warning-100 text-warning-800' : 'bg-watercourse-50 text-watercourse-700')}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-grey-600">{label}</p>
        <p className="font-wide truncate text-xl font-extrabold text-charcoal-900">{value}</p>
        {hint && <p className="text-[11px] text-slate-grey-500">{hint}</p>}
      </div>
    </Card>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

export function DashboardPage() {
  const { data: d, isLoading, error } = useDashboard()

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Vendas, faturamento e progresso das campanhas (atualiza sozinho)" />
      {isLoading && <FullPageSpinner />}
      {error && <Alert tone="error">{error.message}</Alert>}
      {d && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Stat
              icon={<CurrencyCircleDollarIcon weight="duotone" className="size-6" />}
              label="Faturamento (números pagos)"
              value={formatCents(d.revenueCents)}
              hint={`+ ${formatCents(d.feesCents)} de taxas Pix repassadas`}
            />
            <Stat
              icon={<ClockIcon weight="duotone" className="size-6" />}
              label="Hoje"
              value={formatCents(d.today.revenueCents)}
              hint={`${formatInt(d.today.orders)} pedidos pagos`}
            />
            <Stat
              icon={<ReceiptIcon weight="duotone" className="size-6" />}
              label="Pedidos pagos"
              value={formatInt(d.paidOrders)}
              hint={`${formatInt(d.pendingOrders)} aguardando pagamento · ${formatInt(d.expiredOrders)} expirados/cancelados`}
              to="/admin/pedidos"
            />
            <Stat icon={<UsersThreeIcon weight="duotone" className="size-6" />} label="Compradores" value={formatInt(d.buyers)} to="/admin/compradores" />
            <Stat
              icon={<ArrowCounterClockwiseIcon weight="duotone" className="size-6" />}
              label="Reembolsos pendentes"
              value={formatInt(d.refundsPending)}
              hint="Pix pago depois de expirar com número já vendido"
              to="/admin/pedidos?reembolso=1"
              alert={d.refundsPending > 0}
            />
          </div>

          <Card className="p-5">
            <h2 className="font-wide mb-4 font-bold text-charcoal-900">Faturamento por dia (30 dias)</h2>
            <RevenueChart daily={d.daily} />
          </Card>

          <div>
            <h2 className="font-wide mb-3 font-bold text-charcoal-900">Campanhas em andamento</h2>
            {d.raffles.length === 0 ? (
              <EmptyState title="Nenhuma campanha publicada" description="Publique uma rifa para acompanhar as vendas aqui." />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {d.raffles.map((r) => (
                  <Link key={r.id} to={`/admin/rifas/${r.id}`}>
                    <Card className="flex flex-col gap-3 p-4 transition hover:border-watercourse-400">
                      <div className="flex items-start gap-3">
                        {r.cover ? (
                          <img src={r.cover.thumb} alt="" className="h-12 w-18 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="royal-gradient flex h-12 w-18 shrink-0 items-center justify-center rounded-lg text-anzac-300">
                            <TicketIcon weight="duotone" className="size-5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-charcoal-900">{r.title}</p>
                          <p className="text-xs text-slate-grey-600">
                            {formatCents(r.revenueCents)} · {formatInt(r.paidOrders)} pedidos
                            {r.drawDate && ` · sorteio ${formatDateTime(r.drawDate)}`}
                          </p>
                        </div>
                        <RaffleStatusBadge status={r.status} />
                      </div>
                      <ProgressBar
                        percent={r.percent}
                        label={`${formatInt(r.paid)} pagos · ${formatInt(r.reserved)} reservados · ${formatInt(r.totalNumbers - r.paid - r.reserved)} livres (${r.percent}%)`}
                      />
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
