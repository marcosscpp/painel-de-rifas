import { CheckCircleIcon, WhatsappLogoIcon } from '@phosphor-icons/react'
import { formatPhone, whatsappUrl } from '@/domains/admin-orders'
import { Badge, type BadgeTone } from '@/shared/components'
import type { DrawOutcome, DrawStep } from '../types'

const outcomeInfo: Record<DrawStep['outcome'], { label: string; tone: BadgeTone }> = {
  winner: { label: 'Premiado', tone: 'gold' },
  'out-of-range': { label: 'Fora da faixa', tone: 'neutral' },
  'not-sold': { label: 'Não vendido', tone: 'warning' },
  skipped: { label: 'Não usado', tone: 'neutral' },
}

// Conferência do resultado antes de publicar: candidato de cada prêmio e o ganhador com contato.
export function DrawPreview({ outcome, prizes }: { outcome: DrawOutcome; prizes: string[] }) {
  const w = outcome.winner
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-cream-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-xs font-bold text-slate-grey-600 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Prêmio</th>
              <th className="px-3 py-2 text-left">Bilhete</th>
              <th className="px-3 py-2 text-left">Candidato</th>
              <th className="px-3 py-2 text-left">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {outcome.steps.map((s) => (
              <tr key={s.prize}>
                <td className="px-3 py-2">{s.prize}º</td>
                <td className="px-3 py-2 font-mono">{prizes[s.prize - 1]}</td>
                <td className="px-3 py-2 font-mono font-bold">{s.candidateLabel}</td>
                <td className="px-3 py-2">
                  <Badge tone={outcomeInfo[s.outcome].tone}>{outcomeInfo[s.outcome].label}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm whitespace-pre-line text-slate-grey-700">{outcome.explanation}</p>

      {outcome.winningLabel && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-anzac-300 bg-anzac-50 p-4">
          <CheckCircleIcon weight="fill" className="size-8 text-anzac-600" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-grey-600">
              Número premiado {outcome.method === 'next-sold' && '(próximo vendido)'}
            </p>
            <p className="font-wide font-mono text-2xl font-extrabold text-charcoal-900">{outcome.winningLabel}</p>
            {w && (
              <p className="text-sm text-charcoal-900">
                <strong>{w.name}</strong>
                {w.city && ` · ${w.city}/${w.state}`}
              </p>
            )}
          </div>
          {w?.phone && (
            <a
              href={whatsappUrl(w.phone)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-watercourse-800 px-3 py-2 text-xs font-bold text-cream-50 hover:bg-watercourse-700"
            >
              <WhatsappLogoIcon weight="fill" className="size-4" />
              {formatPhone(w.phone)}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
