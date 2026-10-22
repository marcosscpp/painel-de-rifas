import { ArrowSquareOutIcon, MagnifyingGlassIcon, MegaphoneIcon } from '@phosphor-icons/react'
import { type FormEvent, useState } from 'react'
import { Alert, Button, ConfirmDialog, Input } from '@/shared/components'
import { formatInt } from '@/shared/utils/format'
import { useDrawConfirm, useDrawPreview } from '../hooks/useDraws'
import type { DrawRaffle } from '../types'
import { DrawPreview } from './DrawPreview'

const onlyDigits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max)

// Apuração: o admin digita o concurso e os 5 prêmios da Federal, confere a prévia e publica.
// A publicação é única: depois disso o resultado aparece na página da rifa.
export function DrawForm({ raffle, onDone }: { raffle: DrawRaffle; onDone: () => void }) {
  const [contest, setContest] = useState('')
  const [prizes, setPrizes] = useState(['', '', '', '', ''])
  const [confirming, setConfirming] = useState(false)
  const preview = useDrawPreview(raffle.id)
  const confirm = useDrawConfirm(raffle.id)

  const complete = contest.length > 0 && prizes.every((p) => p.length === 5)
  const input = { contest, prizes }

  const check = (e: FormEvent) => {
    e.preventDefault()
    if (complete) preview.mutate(input)
  }
  const edit = (i: number, v: string) => {
    preview.reset()
    setPrizes((ps) => ps.map((p, j) => (j === i ? onlyDigits(v, 5) : p)))
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={check} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Concurso"
            required
            inputMode="numeric"
            placeholder="5912"
            wrapperClassName="flex w-32 flex-col gap-1.5"
            value={contest}
            onChange={(e) => {
              preview.reset()
              setContest(onlyDigits(e.target.value, 6))
            }}
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
          {prizes.map((p, i) => (
            <Input
              key={i}
              label={`${i + 1}º prêmio`}
              required
              inputMode="numeric"
              placeholder="00000"
              className="font-mono"
              value={p}
              onChange={(e) => edit(i, e.target.value)}
            />
          ))}
        </div>
        <p className="text-xs text-slate-grey-600">
          {formatInt(raffle.totalNumbers)} números · {formatInt(raffle.progress.paid)} vendidos. Digite os 5 bilhetes
          exatamente como a Caixa divulgou.
        </p>
        <Button type="submit" variant="secondary" loading={preview.isPending} disabled={!complete} className="self-start">
          <MagnifyingGlassIcon weight="bold" className="size-4" />
          Conferir resultado
        </Button>
      </form>

      {preview.error && <Alert tone="error">{preview.error.message}</Alert>}
      {preview.data && (
        <>
          <DrawPreview outcome={preview.data} prizes={prizes} />
          {preview.data.winningNumber !== null && (
            <Button variant="buy" className="self-start" onClick={() => setConfirming(true)}>
              <MegaphoneIcon weight="fill" className="size-4" />
              Publicar resultado
            </Button>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title="Publicar resultado?"
        confirmLabel="Publicar"
        loading={confirm.isPending}
        error={confirm.error?.message}
        onClose={() => {
          confirm.reset()
          setConfirming(false)
        }}
        onConfirm={() =>
          confirm.mutate(input, {
            onSuccess: () => {
              setConfirming(false)
              onDone()
            },
          })
        }
      >
        <p>
          O número <strong>{preview.data?.winningLabel}</strong> do concurso {contest} vai aparecer como resultado
          oficial na página da campanha. Isso não pode ser desfeito.
        </p>
      </ConfirmDialog>
    </div>
  )
}
