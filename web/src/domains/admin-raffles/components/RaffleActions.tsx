import { useNavigate } from 'react-router'
import { Alert, Button } from '@/shared/components'
import { formatInt } from '@/shared/utils/format'
import { adminRafflesApi } from '../services/admin-raffles.api'
import { useDeleteRaffle, useRaffleMutation } from '../hooks/useAdminRaffles'
import type { AdminRaffle, RaffleAction } from '../types'

const confirmText: Record<RaffleAction, (r: AdminRaffle) => string> = {
  publish: (r) =>
    `Publicar "${r.title}"?\n\nOs ${formatInt(r.totalNumbers)} números serão gerados e a rifa entra à venda. ` +
    'Depois disso, preço, total de números e modo de venda não mudam mais.',
  pause: () => 'Pausar as vendas? Ninguém consegue comprar até você retomar.',
  resume: () => 'Retomar as vendas?',
  close: () => 'Encerrar as vendas definitivamente? Não dá para reabrir.',
}

export function RaffleActions({ raffle }: { raffle: AdminRaffle }) {
  const navigate = useNavigate()
  const act = useRaffleMutation((action: RaffleAction) => adminRafflesApi.transition(raffle.id, action))
  const del = useDeleteRaffle()

  const run = (action: RaffleAction) => {
    if (confirm(confirmText[action](raffle))) act.mutate(action)
  }

  const s = raffle.status
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {s === 'DRAFT' && (
          <Button loading={act.isPending && act.variables === 'publish'} onClick={() => run('publish')}>
            Publicar rifa
          </Button>
        )}
        {s === 'ACTIVE' && (
          <Button variant="secondary" loading={act.isPending && act.variables === 'pause'} onClick={() => run('pause')}>
            Pausar vendas
          </Button>
        )}
        {s === 'PAUSED' && (
          <Button loading={act.isPending && act.variables === 'resume'} onClick={() => run('resume')}>
            Retomar vendas
          </Button>
        )}
        {(s === 'ACTIVE' || s === 'PAUSED') && (
          <Button variant="danger" loading={act.isPending && act.variables === 'close'} onClick={() => run('close')}>
            Encerrar vendas
          </Button>
        )}
        {s === 'DRAFT' && (
          <Button
            variant="ghost"
            className="text-red-600"
            loading={del.isPending}
            onClick={() =>
              confirm('Excluir este rascunho? Não dá para desfazer.') &&
              del.mutate(raffle.id, { onSuccess: () => navigate('/admin/rifas', { replace: true }) })
            }
          >
            Excluir rascunho
          </Button>
        )}
      </div>
      {act.isPending && act.variables === 'publish' && raffle.totalNumbers > 100_000 && (
        <Alert tone="info">Gerando {formatInt(raffle.totalNumbers)} números. Pode levar alguns segundos.</Alert>
      )}
      {(act.error ?? del.error) && <Alert tone="error">{(act.error ?? del.error)?.message}</Alert>}
    </div>
  )
}
