import {
  ArrowCounterClockwiseIcon,
  ClockIcon,
  CurrencyCircleDollarIcon,
  ReceiptIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { Link } from 'react-router'
import {
  Alert,
  Card,
  CoverThumb,
  EmptyState,
  FullPageSpinner,
  PageHeader,
  ProgressBar,
  RaffleStatusBadge,
  StatCard,
} from '@/shared/components'
import { formatCents, formatDateTime, formatInt } from '@/shared/utils/format'
import { RevenueChart } from '../components/RevenueChart'
import { useDashboard } from '../hooks/useDashboard'

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
            <StatCard
              icon={<CurrencyCircleDollarIcon className="size-5" />}
              label="Faturamento (números pagos)"
              value={formatCents(d.revenueCents)}
              hint={`+ ${formatCents(d.feesCents)} de taxas Pix repassadas`}
            />
            <StatCard
              icon={<ClockIcon className="size-5" />}
              label="Hoje"
              value={formatCents(d.today.revenueCents)}
              hint={`${formatInt(d.today.orders)} pedidos pagos`}
            />
            <StatCard
              icon={<ReceiptIcon className="size-5" />}
              label="Pedidos pagos"
              value={formatInt(d.paidOrders)}
              hint={`${formatInt(d.pendingOrders)} aguardando pagamento · ${formatInt(d.expiredOrders)} expirados/cancelados`}
              to="/admin/pedidos"
            />
            <StatCard
              icon={<UsersThreeIcon className="size-5" />}
              label="Compradores"
              value={formatInt(d.buyers)}
              to="/admin/compradores"
            />
            <StatCard
              icon={<ArrowCounterClockwiseIcon className="size-5" />}
              label="Reembolsos pendentes"
              value={formatInt(d.refundsPending)}
              hint="Pix pago depois de expirar com número já vendido"
              to="/admin/pedidos?reembolso=1"
              alert={d.refundsPending > 0}
            />
          </div>

          <Card className="bg-white p-5">
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
                    <Card className="flex flex-col gap-3 bg-white p-4 transition hover:border-watercourse-500">
                      <div className="flex items-start gap-3">
                        <CoverThumb cover={r.cover} size="sm" className="rounded-xl border border-cream-200" />
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
