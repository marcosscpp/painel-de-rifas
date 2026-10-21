import { Spinner } from './Spinner'

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-emerald-600">
      <Spinner className="size-8" />
    </div>
  )
}
