import type { ComponentType } from 'react'
import {
  LockKeyIcon,
  NotePencilIcon,
  PauseCircleIcon,
  SparkleIcon,
  TrophyIcon,
  type IconProps,
} from '@phosphor-icons/react'
import type { RaffleStatus } from '@/shared/types'
import { cn } from '@/shared/utils/cn'

const styles: Record<RaffleStatus, { label: string; className: string; icon: ComponentType<IconProps> }> = {
  DRAFT: {
    label: 'Rascunho',
    className: 'border border-cream-300 bg-cream-200/70 text-slate-grey-700',
    icon: NotePencilIcon,
  },
  ACTIVE: {
    label: 'À venda',
    className: 'border border-watercourse-200 bg-watercourse-50 text-watercourse-800',
    icon: SparkleIcon,
  },
  PAUSED: {
    label: 'Pausada',
    className: 'border border-warning-300 bg-warning-50 text-warning-800',
    icon: PauseCircleIcon,
  },
  CLOSED: {
    label: 'Vendas encerradas',
    className: 'border border-slate-grey-200 bg-slate-grey-100 text-slate-grey-700',
    icon: LockKeyIcon,
  },
  DRAWN: {
    label: 'Sorteada',
    className: 'border border-anzac-400/50 bg-charcoal-900 text-anzac-300',
    icon: TrophyIcon,
  },
}

export function RaffleStatusBadge({ status }: { status: RaffleStatus }) {
  const s = styles[status]
  const Icon = s.icon
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        s.className,
      )}
    >
      <Icon weight="fill" className="size-3.5" />
      {s.label}
    </span>
  )
}
