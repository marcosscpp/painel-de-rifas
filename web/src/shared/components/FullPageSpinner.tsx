import { Spinner } from './Spinner'

export function FullPageSpinner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-cream-100/80 backdrop-blur-[2px]"
    >
      <div className="flex size-16 items-center justify-center rounded-2xl border border-cream-200 bg-white p-4 shadow-md">
        <Spinner className="size-7 text-watercourse-800" />
      </div>
      <span className="text-xs font-bold tracking-wider text-slate-grey-600 uppercase">Carregando...</span>
    </div>
  )
}
