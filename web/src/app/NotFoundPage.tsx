import { ArrowLeftIcon, CompassIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { Button } from '@/shared/components'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream-100 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-anzac-300 bg-anzac-50 p-4 text-anzac-600 shadow-xs">
        <CompassIcon className="size-7" />
      </div>
      <p className="font-display text-5xl font-bold text-watercourse-800">404</p>
      <div className="max-w-sm space-y-1">
        <h1 className="font-wide text-lg font-bold text-charcoal-900">Página não encontrada</h1>
        <p className="text-sm text-slate-grey-600">
          O endereço que você tentou acessar não existe ou a campanha mudou de lugar.
        </p>
      </div>
      <Link to="/" className="mt-2">
        <Button variant="primary">
          <ArrowLeftIcon weight="bold" className="size-4" />
          Voltar para o início
        </Button>
      </Link>
    </main>
  )
}
