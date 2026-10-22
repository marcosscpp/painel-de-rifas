import { CaretDownIcon, FlaskIcon, QrCodeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Alert, Button, CopyButton, Spinner, Textarea } from '@/shared/components'
import { cn } from '@/shared/utils/cn'
import { useSimulatePayment } from '../hooks/useOrder'
import type { Order } from '../types'

const steps = [
  'Copie o código Pix abaixo.',
  'Abra o app do seu banco e escolha Pix copia e cola.',
  'Cole o código e confirme. Esta tela atualiza sozinha.',
]

// Pagamento no estilo da referência: passos numerados, copia e cola em destaque (a pessoa
// geralmente já está no celular) e o QR Code escondido atrás de "Exibir QR Code".
export function PixPayment({ order }: { order: Order }) {
  const [showQr, setShowQr] = useState(false)
  const simulate = useSimulatePayment()
  const pay = order.payment

  if (!pay?.pixCopyPaste) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-cream-300 bg-cream-100/70 p-6 text-xs text-slate-grey-600">
        <Spinner className="size-6 text-watercourse-700" />
        Gerando o Pix…
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <ol className="flex flex-col gap-2.5">
        {steps.map((text, i) => (
          <li key={text} className="flex items-center gap-3 text-sm text-charcoal-900">
            <span className="gold-gradient flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-charcoal-950 shadow-2xs">
              {i + 1}
            </span>
            {text}
          </li>
        ))}
      </ol>

      <Textarea
        id="pix-copia-e-cola"
        aria-label="Pix copia e cola"
        readOnly
        rows={3}
        size="sm"
        value={pay.pixCopyPaste}
        onFocus={(e) => e.currentTarget.select()}
        className="resize-none font-mono break-all"
      />

      <CopyButton
        text={pay.pixCopyPaste}
        label="Copiar código Pix"
        copiedLabel="Código copiado"
        variant="buy"
        className="w-full py-3.5 text-base"
        onFail={() => document.getElementById('pix-copia-e-cola')?.focus()}
      />

      {pay.pixQrCodeBase64 && (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            aria-expanded={showQr}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-watercourse-800 hover:underline"
          >
            <QrCodeIcon weight="bold" className="size-4.5" />
            {showQr ? 'Ocultar QR Code' : 'Exibir QR Code'}
            <CaretDownIcon weight="bold" className={cn('size-3.5 transition', showQr && 'rotate-180')} />
          </button>
          {showQr && (
            <img
              src={`data:image/png;base64,${pay.pixQrCodeBase64}`}
              alt="QR Code do Pix"
              className="size-52 rounded-2xl border border-cream-200 bg-white p-2"
            />
          )}
        </div>
      )}

      <Button type="button" variant="secondary" disabled className="w-full py-3 disabled:opacity-100">
        <Spinner className="size-4 text-watercourse-700" />
        Aguardando confirmação do banco…
      </Button>

      {pay.canSimulate && (
        <div className="rounded-xl border border-dashed border-warning-300 bg-warning-50 p-3">
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
            <FlaskIcon className="size-4" />
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
