import { padNumber } from '@/shared/utils/format'

export function OrderNumbers({ numbers, total }: { numbers: number[]; total: number }) {
  return (
    <div className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
      {numbers.map((n) => (
        <span key={n} className="rounded-md bg-emerald-50 px-2 py-1 font-mono text-sm font-semibold text-emerald-800">
          {padNumber(n, total)}
        </span>
      ))}
    </div>
  )
}
