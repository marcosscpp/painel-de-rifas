import { useState } from 'react'
import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { Button, Input, Skeleton } from '@/shared/components'
import { cn } from '@/shared/utils/cn'
import { formatInt, maskDigits, padNumber } from '@/shared/utils/format'
import { GRID_PAGE, useNumbersPage } from '../hooks/useRaffles'

type Props = {
  slug: string
  total: number
  selected: Set<number>
  max: number
  onToggle: (n: number) => void
}

// Grade de escolha, em páginas de 500. Reservados e pagos ficam bloqueados e
// mudam ao vivo quando outra pessoa compra (eventos aplicados em useRaffleLive).
export function NumberGrid({ slug, total, selected, max, onToggle }: Props) {
  const [from, setFrom] = useState(0)
  const [jump, setJump] = useState('')
  const { data: page, isLoading } = useNumbersPage(slug, from, true)
  const pages = Math.ceil(total / GRID_PAGE)
  const full = selected.size >= max

  const goTo = (n: number) => setFrom(Math.floor(Math.max(0, Math.min(total - 1, n)) / GRID_PAGE) * GRID_PAGE)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-cream-200 bg-cream-100/70 px-3.5 py-2.5 text-xs font-medium text-slate-grey-700">
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border border-cream-300 bg-white" /> Livre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded bg-watercourse-800 ring-1 ring-anzac-400" /> Selecionado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="stripes size-3.5 rounded border border-anzac-300" /> Reservado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded bg-cream-300" /> Vendido
        </span>
      </div>

      {pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={from === 0}
              className="px-2.5"
              onClick={() => setFrom(from - GRID_PAGE)}
            >
              <CaretLeftIcon weight="bold" className="size-4" />
            </Button>
            <span className="font-mono text-xs font-bold text-charcoal-900">
              {padNumber(from, total)} — {padNumber(Math.min(from + GRID_PAGE, total) - 1, total)}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={from + GRID_PAGE >= total}
              className="px-2.5"
              onClick={() => setFrom(from + GRID_PAGE)}
            >
              <CaretRightIcon weight="bold" className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (jump) goTo(Number(jump))
              }}
            >
              <Input
                inputMode="numeric"
                enterKeyHint="go"
                placeholder="Ir para nº"
                aria-label="Ir para o número"
                leftIcon={<MagnifyingGlassIcon className="size-4" />}
                size="sm"
                wrapperClassName="w-36"
                value={jump}
                onChange={(e) => setJump(maskDigits(String(total - 1).length)(e.target.value))}
              />
            </form>
            <span className="text-xs text-slate-grey-600">{formatInt(total)} cotas</span>
          </div>
        </div>
      )}

      {isLoading || !page ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(3.4rem,1fr))] gap-1.5">
          {Array.from({ length: 60 }).map((_, i) => (
            <Skeleton key={i} className="h-8 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(3.4rem,1fr))] gap-1.5">
          {page.statuses.split('').map((s, i) => {
            const n = page.from + i
            const isSel = selected.has(n)
            const taken = s !== '0'
            return (
              <button
                key={n}
                type="button"
                disabled={(taken && !isSel) || (!isSel && full)}
                onClick={() => onToggle(n)}
                aria-pressed={isSel}
                className={cn(
                  'rounded-lg py-1.5 font-mono text-xs font-bold transition',
                  isSel && 'bg-watercourse-800 text-anzac-300 shadow-xs ring-2 ring-anzac-400',
                  !isSel &&
                    s === '0' &&
                    'cursor-pointer border border-cream-300 bg-white text-charcoal-900 hover:border-watercourse-600 hover:bg-watercourse-50/50 disabled:opacity-40',
                  !isSel && s === '1' && 'stripes cursor-not-allowed border border-anzac-300 text-anzac-900',
                  !isSel && s === '2' && 'cursor-not-allowed bg-cream-200 text-slate-grey-400 line-through',
                )}
              >
                {padNumber(n, total)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
