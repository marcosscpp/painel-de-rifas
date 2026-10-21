import { CheckIcon, CopyIcon, FlaskIcon, QrCodeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Alert, Button } from '@/shared/components'
import { useSimulatePayment } from '../hooks/useOrder'
import type { Order } from '../types'

// QR Code + copia e cola do Pix. No celular, o copia e cola é o caminho principal
// (a pessoa já está no aparelho do banco), então o botão de copiar vem em destaque.
export function PixPayment({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false)
  const simulate = useSimulatePayment()
  const pay = order.payment

  if (!pay?.pixCopyPaste) {
    return (
      <div className="flex h-48 w-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cream-300 bg-cream-100/70 p-4 text-xs text-slate-grey-600">
        <QrCodeIcon weight="duotone" className="size-12 text-watercourse-700" />
        <span>Gerando o Pix…</span>
      </div>
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pay.pixCopyPaste!)
    } catch {
      // Navegador sem permissão de área de transferência: seleciona o texto para copiar à mão.
      document.getElementById('pix-copia-e-cola')?.focus()
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {pay.pixQrCodeBase64 && (
        <img
          src={`data:image/png;base64,${pay.pixQrCodeBase64}`}
          alt="QR Code do Pix"
          className="size-52 rounded-2xl border border-cream-200 bg-white p-2"
        />
      )}

      <div className="w-full">
        <label htmlFor="pix-copia-e-cola" className="mb-1 block text-left text-xs font-medium text-slate-grey-600">
          Pix copia e cola
        </label>
        <textarea
          id="pix-copia-e-cola"
          readOnly
          rows={3}
          value={pay.pixCopyPaste}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full resize-none rounded-xl border border-cream-200 bg-cream-50 p-3 font-mono text-xs break-all text-charcoal-900"
        />
      </div>

      <Button type="button" variant="buy" className="w-full py-3.5 text-base" onClick={copy}>
        {copied ? <CheckIcon weight="bold" className="size-5" /> : <CopyIcon weight="bold" className="size-5" />}
        {copied ? 'Código copiado' : 'Copiar código Pix'}
      </Button>

      <ol className="w-full list-decimal space-y-1 pl-5 text-left text-xs text-slate-grey-600">
        <li>Abra o app do seu banco e escolha pagar com Pix.</li>
        <li>Escaneie o QR Code ou cole o código copiado.</li>
        <li>Confirme o pagamento. Esta tela atualiza sozinha.</li>
      </ol>

      {pay.canSimulate && (
        <div className="w-full rounded-xl border border-dashed border-warning-300 bg-warning-50 p-3 text-left">
          <p className="mb-2 text-xs text-warning-800">
            Ambiente de teste: o Pix acima não é real. Use o botão para simular a confirmação do banco.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            loading={simulate.isPending}
            onClick={() => simulate.mutate(order.id)}
          >
            <FlaskIcon weight="duotone" className="size-4" />
            Simular pagamento
          </Button>
          {simulate.error && (
            <div className="mt-2">
              <Alert tone="error">{simulate.error.message}</Alert>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
