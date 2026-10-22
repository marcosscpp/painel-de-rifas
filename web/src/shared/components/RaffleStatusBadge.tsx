import type { ReactNode } from 'react'
import {
  LockIcon,
  NotePencilIcon,
  PauseCircleIcon,
  SparkleIcon,
  TrophyIcon,
} from '@phosphor-icons/react'
import type { RaffleStatus } from '@/shared/types'
import { Badge, type BadgeTone } from './Badge'

const statusConfig: Record<
  RaffleStatus,
  { label: string; tone: BadgeTone; icon: ReactNode; dot?: boolean; pulse?: boolean }
> = {
  DRAFT: {
    label: 'Rascunho',
    tone: 'neutral',
    icon: <NotePencilIcon className="size-3.5" />,
  },
  ACTIVE: {
    label: 'À venda',
    tone: 'teal',
    icon: <SparkleIcon weight="fill" className="size-3.5" />,
    dot: true,
    pulse: true,
  },
  PAUSED: {
    label: 'Pausada',
    tone: 'warning',
    icon: <PauseCircleIcon className="size-3.5" />,
  },
  CLOSED: {
    label: 'Encerrada',
    tone: 'error',
    icon: <LockIcon className="size-3.5" />,
  },
  DRAWN: {
    label: 'Sorteada',
    tone: 'gold',
    icon: <TrophyIcon weight="fill" className="size-3.5" />,
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
