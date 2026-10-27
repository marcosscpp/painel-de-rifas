import { ArrowSquareOutIcon, CloudArrowDownIcon, MagnifyingGlassIcon, MegaphoneIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Alert, Button, ConfirmDialog, MaskedInput } from '@/shared/components'
import { useZodForm } from '@/shared/hooks/useZodForm'
import { formatDate, formatInt, maskDigits } from '@/shared/utils/format'
import { useDrawConfirm, useDrawPreview, useFederalResult } from '../hooks/useDraws'
import type { DrawInput, DrawRaffle } from '../types'
import { DrawPreview } from './DrawPreview'

const schema = z.object({
  contest: z.string().regex(/^\d{1,6}$/, 'Informe o número do concurso'),
  prizes: z.array(z.string().regex(/^\d{5}$/, '5 dígitos')).length(5),
})

// Apuração: o admin informa o concurso, busca os 5 prêmios na Caixa (ou digita), confere a prévia e publica.
// A publicação é única: depois disso o resultado aparece na página da rifa.
export function DrawForm({ raffle, onDone }: { raffle: DrawRaffle; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [checked, setChecked] = useState<DrawInput | null>(null)
  const preview = useDrawPreview(raffle.id)
  const confirm = useDrawConfirm(raffle.id)
  const federal = useFederalResult()
  const { control, watch, handleSubmit, getValues, setValue, setError } = useZodForm(schema, {
    defaultValues: { contest: '', prizes: ['', '', '', '', ''] },
  })

  // Mudou algum número: a prévia antiga não vale mais. Outro concurso: a busca na Caixa também não.
  useEffect(() => {
    const sub = watch((_, { name }) => {
      preview.reset()
      setChecked(null)
      if (name === 'contest') federal.reset()
    })
    return () => sub.unsubscribe()
  }, [watch, preview.reset, federal.reset])

  const fetchFromCaixa = () => {
    const contest = getValues('contest')
    if (!/^\d{1,6}$/.test(contest)) return setError('contest', { message: 'Informe o número do concurso' })
    federal.mutate(contest, {
      onSuccess: (r) => r.prizes.forEach((p, i) => setValue(`prizes.${i}`, p, { shouldValidate: true })),
    })
  }
  // Concurso de outro dia que não o da data do sorteio da rifa: só avisa, o admin decide.
  const drawDay = raffle.drawDate ? new Date(raffle.drawDate).toLocaleDateString('sv-SE') : null
  const otherDay = federal.data && drawDay && federal.data.date !== drawDay

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
          <Button
            type="button"
            variant="secondary"
            loading={federal.isPending}
            onClick={fetchFromCaixa}
            className="mb-0.5"
          >
            <CloudArrowDownIcon weight="bold" className="size-4" />
            Buscar na Caixa
          </Button>
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
        {federal.error && <Alert tone="error">{federal.error.message}</Alert>}
        {federal.data && (
          <Alert tone={otherDay ? 'warning' : 'info'}>
            Prêmios do concurso {federal.data.contest}, sorteado em {formatDate(federal.data.date)}.
            {otherDay && ` A data do sorteio desta rifa é ${formatDate(drawDay)}: confira se é o concurso certo.`}
          </Alert>
        )}
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
          {formatInt(raffle.totalNumbers)} números · {formatInt(raffle.progress.paid)} vendidos. Busque na Caixa ou
          digite os 5 bilhetes exatamente como a Caixa divulgou.
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
