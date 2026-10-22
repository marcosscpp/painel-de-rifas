import { useState } from 'react'
import { ImageIcon } from '@phosphor-icons/react'
import { Alert, FilePickerButton } from '@/shared/components'
import { useRaffleMutation } from '../hooks/useAdminRaffles'
import { adminRafflesApi } from '../services/admin-raffles.api'
import type { AdminRaffle } from '../types'

export function CoverSection({ raffle }: { raffle: AdminRaffle }) {
  const upload = useRaffleMutation((file: File) => adminRafflesApi.uploadCover(raffle.id, file))
  const [rejected, setRejected] = useState<string>()

  return (
    <div className="flex flex-col gap-3">
      {raffle.cover ? (
        <img src={raffle.cover.full} alt="Capa da rifa" className="aspect-video w-full max-w-lg rounded-xl object-cover shadow-xs" />
      ) : (
        <div className="flex aspect-video w-full max-w-lg flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-cream-300 bg-cream-100/50 text-sm text-slate-grey-500">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white p-3.5 text-watercourse-700 shadow-2xs ring-1 ring-cream-200">
            <ImageIcon className="size-5" />
          </div>
          <span>Sem imagem de capa</span>
        </div>
      )}
      <div>
        <FilePickerButton
          label={raffle.cover ? 'Trocar capa' : 'Enviar capa'}
          loading={upload.isPending}
          disabled={raffle.status === 'DRAWN'}
          onReject={setRejected}
          onPick={([file]) => {
            setRejected(undefined)
            upload.mutate(file)
          }}
        />
      </div>
      <p className="text-xs text-slate-grey-600">JPG, PNG ou WebP até 8 MB. Formato 16:9 fica melhor.</p>
      {(rejected || upload.error) && <Alert tone="error">{rejected ?? upload.error?.message}</Alert>}
    </div>
  )
}
