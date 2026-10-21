import type { ReactNode } from 'react'
import { LockKeyIcon, NotePencilIcon, PauseCircleIcon, TrophyIcon } from '@phosphor-icons/react'
import type { RaffleStatus } from '@/shared/types'
import { Badge, type BadgeTone } from './Badge'

const statusConfig: Record<
  RaffleStatus,
  { label: string; tone: BadgeTone; icon?: ReactNode; dot?: boolean; pulse?: boolean }
> = {
  DRAFT: {
    label: 'Rascunho',
    tone: 'neutral',
    icon: <NotePencilIcon weight="bold" className="size-3.5 text-slate-grey-600" />,
  },
  ACTIVE: {
    label: 'À venda',
    tone: 'teal',
    dot: true,
    pulse: true,
  },
  PAUSED: {
    label: 'Pausada',
    tone: 'warning',
    icon: <PauseCircleIcon weight="fill" className="size-3.5 text-warning-600" />,
  },
  CLOSED: {
    label: 'Vendas encerradas',
    tone: 'error',
    icon: <LockKeyIcon weight="fill" className="size-3.5 text-error-600" />,
  },
  DRAWN: {
    label: 'Sorteada',
    tone: 'gold',
    icon: <TrophyIcon weight="fill" className="size-3.5 text-charcoal-950" />,
  },
}

export function RaffleStatusBadge({ status, className }: { status: RaffleStatus; className?: string }) {
  const cfg = statusConfig[status]
  return (
    <Badge tone={cfg.tone} icon={cfg.icon} dot={cfg.dot} pulse={cfg.pulse} className={className}>
      {cfg.label}
    </Badge>
  )
}
