import type { RaffleStatus } from '@/shared/types'
import { cn } from '@/shared/utils/cn'

const styles: Record<RaffleStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700' },
  ACTIVE: { label: 'À venda', className: 'bg-emerald-100 text-emerald-800' },
  PAUSED: { label: 'Pausada', className: 'bg-amber-100 text-amber-800' },
  CLOSED: { label: 'Vendas encerradas', className: 'bg-sky-100 text-sky-800' },
  DRAWN: { label: 'Sorteada', className: 'bg-violet-100 text-violet-800' },
}

export function RaffleStatusBadge({ status }: { status: RaffleStatus }) {
  const s = styles[status]
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', s.className)}>{s.label}</span>
}
