import { TicketIcon } from '@phosphor-icons/react'
import { padNumber } from '@/shared/utils/format'

export function OrderNumbers({ numbers, total }: { numbers: number[]; total: number }) {
  return (
    <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
      {numbers.map((n) => (
        <span
          key={n}
          className="inline-flex items-center gap-1 rounded-lg border border-watercourse-200 bg-watercourse-50 px-2.5 py-1 font-mono text-sm font-bold text-watercourse-900 shadow-2xs"
        >
          <TicketIcon weight="duotone" className="size-3.5 text-anzac-600" />
          {padNumber(n, total)}
        </span>
      ))}
    </div>
  )
}
