import { Spinner } from './Spinner'

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-gold-deep">
      <Spinner className="size-8" />
    </div>
  )
}
