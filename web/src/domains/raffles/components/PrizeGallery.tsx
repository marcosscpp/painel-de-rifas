import { useState } from 'react'
import { formatCents } from '@/shared/utils/format'
import type { PublicPrize } from '../types'

export function PrizeGallery({ prize }: { prize: PublicPrize }) {
  const [active, setActive] = useState(0)
  const current = prize.images[active]

  return (
    <div className="flex flex-col gap-3">
      {current && <img src={current.full} alt={prize.title} className="aspect-video w-full rounded-lg object-cover" />}
      {prize.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {prize.images.map((img, i) => (
            <button
              key={img.thumb}
              type="button"
              aria-label={`Foto ${i + 1}`}
              onClick={() => setActive(i)}
              className={i === active ? 'rounded-lg ring-2 ring-emerald-500' : 'rounded-lg opacity-70 hover:opacity-100'}
            >
              <img src={img.thumb} alt="" className="size-16 rounded-lg object-cover" />
            </button>
          ))}
        </div>
      )}
      <div>
        <p className="font-semibold text-gray-900">
          {prize.position}º prêmio: {prize.title}
        </p>
        {prize.valueCents != null && <p className="text-sm text-gray-600">Valor: {formatCents(prize.valueCents)}</p>}
        {prize.description && <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{prize.description}</p>}
      </div>
    </div>
  )
}
