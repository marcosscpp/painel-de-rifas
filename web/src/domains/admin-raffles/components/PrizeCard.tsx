import { useState } from 'react'
import { Alert, Button, FilePickerButton, Input, Select, Textarea } from '@/shared/components'
import type { PrizeKind } from '@/shared/types'
import { centsToInput, parseMoneyToCents } from '@/shared/utils/format'
import { adminRafflesApi } from '../services/admin-raffles.api'
import { useRaffleMutation } from '../hooks/useAdminRaffles'
import { prizeKinds } from '../constants'
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
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500">{prize.position}º prêmio</span>
        {isDraft && (
          <Button
            type="button"
            variant="ghost"
            className="text-red-600"
            loading={remove.isPending}
            onClick={() => confirm('Remover este prêmio e as fotos?') && remove.mutate(undefined)}
          >
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
      <Textarea label="Descrição" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} disabled={finished} />

      <div className="flex flex-wrap gap-3">
        {prize.images.map((img) => (
          <div key={img.id} className="relative">
            <img src={img.thumb} alt="" className="size-24 rounded-lg object-cover" />
            {raffle.status !== 'DRAWN' && (
              <button
                type="button"
                aria-label="Remover foto"
                className="absolute -right-2 -top-2 rounded-full bg-white px-2 text-sm font-bold text-red-600 shadow"
                onClick={() => removeImage.mutate(img.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

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
          Salvar prêmio
        </Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  )
}
