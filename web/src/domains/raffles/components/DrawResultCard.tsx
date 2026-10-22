import { TrophyIcon } from '@phosphor-icons/react'
import { Disclosure } from '@/shared/components'
import { formatDateTime, padNumber } from '@/shared/utils/format'
import type { RaffleResult } from '../types'

// Resultado oficial: número premiado, ganhador (nome abreviado + cidade), concurso,
// os 5 prêmios da Federal e a explicação passo a passo de como o número saiu.
export function DrawResultCard({ result, totalNumbers }: { result: RaffleResult; totalNumbers: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="royal-gradient flex items-center gap-4 rounded-2xl border border-anzac-400 p-5 text-cream-50 shadow-md">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-anzac-400 p-3 text-charcoal-950">
          <TrophyIcon weight="fill" className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-anzac-300 uppercase">Resultado oficial</p>
          <p className="font-wide text-lg font-extrabold">
            Número premiado:{' '}
            <span className="font-mono text-anzac-300">
              {result.winningNumber === null ? '—' : padNumber(result.winningNumber, totalNumbers)}
            </span>
          </p>
          {result.winnerName && <p className="text-sm font-semibold">Ganhador: {result.winnerName}</p>}
          <p className="text-xs text-cream-100/80">
            Concurso {result.lotteryContest} da Loteria Federal
            {result.drawnAt && ` · publicado em ${formatDateTime(result.drawnAt)}`}
          </p>
        </div>
      </div>

      {result.lotteryPrizes.length > 0 && (
        <Disclosure title="Como o número foi apurado">
          <div className="flex flex-col gap-3">
            <ol className="grid grid-cols-5 gap-1.5 text-center">
              {result.lotteryPrizes.map((p, i) => (
                <li key={i} className="rounded-lg border border-cream-200 bg-white px-1 py-1.5">
                  <span className="block text-[10px] font-semibold text-slate-grey-500">{i + 1}º prêmio</span>
                  <span className="font-mono text-sm font-bold text-charcoal-900">{p}</span>
                </li>
              ))}
            </ol>
            {result.explanation && (
              <p className="text-sm whitespace-pre-line text-slate-grey-700">{result.explanation}</p>
            )}
          </div>
        </Disclosure>
      )}
    </div>
  )
}
