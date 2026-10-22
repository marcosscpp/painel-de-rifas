import { ShieldWarningIcon } from '@phosphor-icons/react'

// Aviso fixo da área do comprador, como na referência.
export function ScamWarning() {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-warning-300 bg-warning-50 px-4 py-3">
      <ShieldWarningIcon weight="duotone" className="size-6 shrink-0 text-warning-600" />
      <div className="text-xs text-warning-900">
        <p className="font-bold">Proteja-se de golpes</p>
        <p>
          Nunca pedimos senha, código por SMS ou Pix fora do site. Prêmios são pagos pela organização sem cobrar
          nenhuma taxa do ganhador.
        </p>
      </div>
    </div>
  )
}
