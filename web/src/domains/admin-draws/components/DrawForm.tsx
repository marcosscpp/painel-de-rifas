import { ArrowSquareOutIcon, MagnifyingGlassIcon, MegaphoneIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Alert, Button, ConfirmDialog, MaskedInput } from '@/shared/components'
import { useZodForm } from '@/shared/hooks/useZodForm'
import { formatInt, maskDigits } from '@/shared/utils/format'
import { useDrawConfirm, useDrawPreview } from '../hooks/useDraws'
import type { DrawInput, DrawRaffle } from '../types'
import { DrawPreview } from './DrawPreview'

const schema = z.object({
  contest: z.string().regex(/^\d{1,6}$/, 'Informe o número do concurso'),
  prizes: z.array(z.string().regex(/^\d{5}$/, '5 dígitos')).length(5),
})

// Apuração: o admin digita o concurso e os 5 prêmios da Federal, confere a prévia e publica.
// A publicação é única: depois disso o resultado aparece na página da rifa.
export function DrawForm({ raffle, onDone }: { raffle: DrawRaffle; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [checked, setChecked] = useState<DrawInput | null>(null)
  const preview = useDrawPreview(raffle.id)
  const confirm = useDrawConfirm(raffle.id)
  const { control, watch, handleSubmit } = useZodForm(schema, {
    defaultValues: { contest: '', prizes: ['', '', '', '', ''] },
  })

  // Mudou algum número: a prévia antiga não vale mais.
  useEffect(() => {
    const sub = watch(() => {
      preview.reset()
      setChecked(null)
    })
    return () => sub.unsubscribe()
  }, [watch, preview.reset])

  const check = handleSubmit((input) => {
    setChecked(input)
    preview.mutate(input)
  })

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={check} noValidate className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <MaskedInput
            control={control}
            name="contest"
            mask={maskDigits(6)}
            label="Concurso"
            inputMode="numeric"
            placeholder="5912"
            wrapperClassName="w-32"
          />
          <a
            href="https://loterias.caixa.gov.br/Paginas/Federal.aspx"
            target="_blank"
            rel="noreferrer"
            className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-watercourse-800 hover:underline"
          >
            Ver resultado na Caixa
            <ArrowSquareOutIcon className="size-3.5" />
          </a>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <MaskedInput
              key={i}
              control={control}
              name={`prizes.${i}`}
              mask={maskDigits(5)}
              label={`${i + 1}º prêmio`}
              inputMode="numeric"
              placeholder="00000"
              className="font-mono"
            />
          ))}
        </div>
        <p className="text-xs text-slate-grey-600">
          {formatInt(raffle.totalNumbers)} números · {formatInt(raffle.progress.paid)} vendidos. Digite os 5 bilhetes
          exatamente como a Caixa divulgou.
        </p>
        <Button type="submit" variant="secondary" loading={preview.isPending} className="self-start">
          <MagnifyingGlassIcon weight="bold" className="size-4" />
          Conferir resultado
        </Button>
      </form>

      {preview.error && <Alert tone="error">{preview.error.message}</Alert>}
      {preview.data && checked && (
        <>
          <DrawPreview outcome={preview.data} prizes={checked.prizes} />
          <Button variant="buy" className="self-start" onClick={() => setConfirming(true)}>
            <MegaphoneIcon weight="fill" className="size-4" />
            {preview.data.winningNumber === null ? 'Publicar sem ganhador' : 'Publicar resultado'}
          </Button>
        </>
      )}

      <ConfirmDialog
        open={confirming && !!checked}
        title="Publicar resultado?"
        confirmLabel="Publicar"
        loading={confirm.isPending}
        error={confirm.error?.message}
        onClose={() => {
          confirm.reset()
          setConfirming(false)
        }}
        onConfirm={() =>
          checked &&
          confirm.mutate(checked, {
            onSuccess: () => {
              setConfirming(false)
              onDone()
            },
          })
        }
      >
        {preview.data?.winningLabel ? (
          <p>
            O número <strong>{preview.data.winningLabel}</strong> do concurso {checked?.contest} vai aparecer como
            resultado oficial na página da campanha. Isso não pode ser desfeito.
          </p>
        ) : (
          <p>
            Nenhum prêmio do concurso {checked?.contest} caiu num número vendido. A campanha vai aparecer como sorteada,
            <strong> sem ganhador</strong>. Isso não pode ser desfeito.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
