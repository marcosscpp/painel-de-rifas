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
        <div className="flex aspect-video w-full max-w-lg flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cream-300 bg-cream-100/60 text-sm text-slate-grey-600">
          <ImageIcon weight="duotone" className="size-8 text-anzac-500" />
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
