import { useState } from 'react'
import { Button, Spinner } from '@/shared/components'
import { cn } from '@/shared/utils/cn'
import { formatInt, padNumber } from '@/shared/utils/format'
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="size-3 rounded border border-gray-300 bg-white" /> Livre
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-emerald-600" /> Selecionado
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-amber-200" /> Reservado
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-gray-300" /> Vendido
        </span>
      </div>

      {pages > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button type="button" variant="secondary" disabled={from === 0} onClick={() => setFrom(from - GRID_PAGE)}>
            ‹
          </Button>
          <span>
            {padNumber(from, total)} a {padNumber(Math.min(from + GRID_PAGE, total) - 1, total)}
          </span>
          <Button type="button" variant="secondary" disabled={from + GRID_PAGE >= total} onClick={() => setFrom(from + GRID_PAGE)}>
            ›
          </Button>
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault()
              if (jump) goTo(Number(jump))
            }}
          >
            <input
              type="number"
              min={0}
              max={total - 1}
              placeholder="Ir para nº"
              aria-label="Ir para o número"
              className="w-28 rounded-lg border border-gray-300 px-2 py-1.5"
              value={jump}
              onChange={(e) => setJump(e.target.value)}
            />
          </form>
          <span className="text-xs text-gray-500">{formatInt(total)} números</span>
        </div>
      )}

      {isLoading || !page ? (
        <Spinner className="text-emerald-600" />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1">
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
                  'rounded py-1.5 font-mono text-xs font-semibold transition',
                  isSel && 'bg-emerald-600 text-white',
                  !isSel && s === '0' && 'border border-gray-300 bg-white hover:border-emerald-500 disabled:opacity-40',
                  !isSel && s === '1' && 'cursor-not-allowed bg-amber-200 text-amber-900',
                  !isSel && s === '2' && 'cursor-not-allowed bg-gray-300 text-gray-500 line-through',
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
