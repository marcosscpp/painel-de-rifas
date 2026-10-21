import { TicketIcon } from '@phosphor-icons/react'
import { Spinner } from './Spinner'

export function FullPageSpinner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-cream-100/80 backdrop-blur-[2px]"
    >
      <div className="relative flex size-14 items-center justify-center rounded-2xl border border-anzac-300 bg-cream-50 shadow-md">
        <Spinner className="size-9 text-watercourse-800" />
        <TicketIcon weight="duotone" className="absolute size-4 text-anzac-500" />
      </div>
      <span className="text-xs font-bold tracking-wider text-slate-grey-600 uppercase">Carregando...</span>
    </div>
  )
}
