import { useState } from 'react'
import { CoinsIcon, TrophyIcon } from '@phosphor-icons/react'
import { formatCents } from '@/shared/utils/format'
import type { PublicPrize } from '../types'

export function PrizeGallery({ prize }: { prize: PublicPrize }) {
  const [active, setActive] = useState(0)
  const current = prize.images[active]
  const isFirst = prize.position === 1

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-cream-200 bg-cream-100/50 p-4">
      {current && (
        <img src={current.full} alt={prize.title} className="aspect-video w-full rounded-xl object-cover shadow-xs" />
      )}
      {prize.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {prize.images.map((img, i) => (
            <button
              key={img.thumb}
              type="button"
              aria-label={`Foto ${i + 1}`}
              onClick={() => setActive(i)}
              className={
                i === active
                  ? 'rounded-xl ring-2 ring-anzac-400'
                  : 'rounded-xl opacity-70 transition hover:opacity-100'
              }
            >
              <img src={img.thumb} alt="" className="size-16 rounded-xl object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={
                isFirst
                  ? 'gold-gradient inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold text-charcoal-950'
                  : 'inline-flex items-center gap-1 rounded-full border border-cream-300 bg-white px-2.5 py-0.5 text-xs font-bold text-slate-grey-700'
              }
            >
              <TrophyIcon weight="fill" className="size-3.5" />
              {prize.position}º Prêmio
            </span>
            <p className="font-wide text-base font-extrabold text-charcoal-900">{prize.title}</p>
          </div>
          {prize.valueCents != null && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-watercourse-800">
              <CoinsIcon className="size-4 text-anzac-500" />
              Valor estimado: {formatCents(prize.valueCents)}
            </span>
          )}
        </div>
        {prize.description && (
          <p className="pt-1 whitespace-pre-line text-sm leading-relaxed text-slate-grey-600">{prize.description}</p>
        )}
      </div>
    </div>
  )
}
