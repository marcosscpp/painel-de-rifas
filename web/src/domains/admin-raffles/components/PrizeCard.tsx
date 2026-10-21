import { useState } from 'react'
import { FloppyDiskIcon, TrashIcon, TrophyIcon, XIcon } from '@phosphor-icons/react'
import { Alert, Button, FilePickerButton, Input, Select, Textarea } from '@/shared/components'
import type { PrizeKind } from '@/shared/types'
import { centsToInput, parseMoneyToCents } from '@/shared/utils/format'
import { prizeKinds } from '../constants'
import { useRaffleMutation } from '../hooks/useAdminRaffles'
import { adminRafflesApi } from '../services/admin-raffles.api'
import type { AdminPrize, AdminRaffle } from '../types'

export function PrizeCard({ raffle, prize }: { raffle: AdminRaffle; prize: AdminPrize }) {
  const isDraft = raffle.status === 'DRAFT'
  const finished = raffle.status === 'CLOSED' || raffle.status === 'DRAWN'

  const [title, setTitle] = useState(prize.title)
  const [description, setDescription] = useState(prize.description)
  const [kind, setKind] = useState<PrizeKind>(prize.kind)
  const [value, setValue] = useState(centsToInput(prize.valueCents))
  const [rejected, setRejected] = useState<string>()

  const save = useRaffleMutation(() =>
    adminRafflesApi.updatePrize(prize.id, {
      title,
      description,
      ...(isDraft && { kind, valueCents: value ? parseMoneyToCents(value) : null }),
    }),
  )
  const remove = useRaffleMutation(() => adminRafflesApi.removePrize(prize.id))
  // Envia uma foto por vez: cada uma fica abaixo do limite de tamanho por requisição.
  const addImages = useRaffleMutation(async (files: File[]) => {
    let last: AdminRaffle | undefined
    for (const f of files) last = await adminRafflesApi.addPrizeImage(prize.id, f)
    return last!
  })
  const removeImage = useRaffleMutation((imageId: string) => adminRafflesApi.removePrizeImage(imageId))

  const error = rejected ?? (save.error ?? remove.error ?? addImages.error ?? removeImage.error)?.message

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-cream-200 bg-cream-100/60 p-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-anzac-300 bg-anzac-50 px-3 py-0.5 text-xs font-bold text-anzac-800">
          <TrophyIcon weight="fill" className="size-3.5 text-anzac-500" />
          {prize.position}º prêmio
        </span>
        {isDraft && (
          <Button
            type="button"
            variant="ghost"
            className="text-alert hover:bg-alert-soft"
            loading={remove.isPending}
            onClick={() => confirm('Remover este prêmio e as fotos?') && remove.mutate(undefined)}
          >
            <TrashIcon className="size-4" />
            Remover
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nome do prêmio" value={title} onChange={(e) => setTitle(e.target.value)} disabled={finished} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo"
            options={prizeKinds}
            value={kind}
            onChange={(e) => setKind(e.target.value as PrizeKind)}
            disabled={!isDraft}
          />
          <Input
            label="Valor (R$)"
            inputMode="decimal"
            placeholder="Opcional"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={!isDraft}
          />
        </div>
      </div>
      <Textarea
        label="Descrição"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={finished}
      />

      {prize.images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {prize.images.map((img) => (
            <div key={img.id} className="relative">
              <img src={img.thumb} alt="" className="size-24 rounded-xl object-cover shadow-2xs" />
              {raffle.status !== 'DRAWN' && (
                <button
                  type="button"
                  aria-label="Remover foto"
                  className="absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-full border border-cream-200 bg-white text-alert shadow-sm hover:bg-alert-soft"
                  onClick={() => removeImage.mutate(img.id)}
                >
                  <XIcon weight="bold" className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <FilePickerButton
          label="Adicionar fotos"
          multiple
          loading={addImages.isPending}
          disabled={raffle.status === 'DRAWN' || prize.images.length >= 10}
          onReject={setRejected}
          onPick={(files) => {
            setRejected(undefined)
            addImages.mutate(files.slice(0, 10 - prize.images.length))
          }}
        />
        <Button type="button" loading={save.isPending} disabled={finished} onClick={() => save.mutate(undefined)}>
          <FloppyDiskIcon weight="bold" className="size-4" />
          Salvar prêmio
        </Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  )
}
