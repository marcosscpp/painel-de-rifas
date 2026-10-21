import { useState } from 'react'
import { Alert, FilePickerButton } from '@/shared/components'
import { adminRafflesApi } from '../services/admin-raffles.api'
import { useRaffleMutation } from '../hooks/useAdminRaffles'
import type { AdminRaffle } from '../types'

export function CoverSection({ raffle }: { raffle: AdminRaffle }) {
  const upload = useRaffleMutation((file: File) => adminRafflesApi.uploadCover(raffle.id, file))
  const [rejected, setRejected] = useState<string>()

  return (
    <div className="flex flex-col gap-3">
      {raffle.cover ? (
        <img src={raffle.cover.full} alt="Capa da rifa" className="aspect-video w-full max-w-lg rounded-lg object-cover" />
      ) : (
        <div className="flex aspect-video w-full max-w-lg items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
          Sem capa
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
      <p className="text-xs text-gray-500">JPG, PNG ou WebP até 8 MB. Formato 16:9 fica melhor.</p>
      {(rejected || upload.error) && <Alert tone="error">{rejected ?? upload.error?.message}</Alert>}
    </div>
  )
}
