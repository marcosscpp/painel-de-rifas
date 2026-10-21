import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Alert, Card, FullPageSpinner, PageHeader, ProgressBar, RaffleStatusBadge } from '@/shared/components'
import { formatInt } from '@/shared/utils/format'
import { CoverSection } from '../components/CoverSection'
import { PackagesEditor } from '../components/PackagesEditor'
import { PrizesEditor } from '../components/PrizesEditor'
import { RaffleActions } from '../components/RaffleActions'
import { RaffleDetailsForm } from '../components/RaffleDetailsForm'
import { useAdminRaffle, useRaffleMutation } from '../hooks/useAdminRaffles'
import { adminRafflesApi } from '../services/admin-raffles.api'
import type { AdminRaffle, RaffleInput } from '../types'

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  )
}

export function AdminRaffleFormPage() {
  const { id } = useParams()
  return id ? <EditRaffle id={id} /> : <NewRaffle />
}

function NewRaffle() {
  const navigate = useNavigate()
  const create = useRaffleMutation((input: RaffleInput) => adminRafflesApi.create(input))

  return (
    <>
      <PageHeader title="Nova rifa" />
      <Section title="Dados da rifa" description="Depois de criar, você adiciona capa, prêmios e pacotes.">
        <RaffleDetailsForm
          submitLabel="Criar rascunho"
          submitting={create.isPending}
          error={create.error?.message}
          onSubmit={(input) => create.mutate(input, { onSuccess: (r) => navigate(`/admin/rifas/${r.id}`, { replace: true }) })}
        />
      </Section>
    </>
  )
}

function EditRaffle({ id }: { id: string }) {
  const { data: raffle, isLoading, error } = useAdminRaffle(id)

  if (isLoading) return <FullPageSpinner />
  if (error || !raffle) return <Alert tone="error">{error?.message ?? 'Rifa não encontrada'}</Alert>

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title={raffle.title}
        actions={
          <div className="flex items-center gap-3">
            <RaffleStatusBadge status={raffle.status} />
            {raffle.status !== 'DRAFT' && (
              <Link to={`/rifa/${raffle.slug}`} target="_blank" className="text-sm text-emerald-700 underline">
                Ver no site
              </Link>
            )}
          </div>
        }
      />

      {raffle.status !== 'DRAFT' && (
        <Card className="p-6">
          <ProgressBar
            percent={raffle.progress.percent}
            label={`${formatInt(raffle.progress.paid)} pagos · ${formatInt(raffle.progress.reserved)} reservados · ${formatInt(raffle.progress.available)} livres (${raffle.progress.percent}%)`}
          />
        </Card>
      )}

      <Section title="Status">
        <RaffleActions raffle={raffle} />
      </Section>

      <Section title="Dados da rifa">
        {/* key: recarrega o formulário quando a rifa muda de status (campos travados) */}
        <EditDetails key={raffle.status} raffle={raffle} />
      </Section>

      <Section title="Capa">
        <CoverSection raffle={raffle} />
      </Section>

      <Section title="Prêmios" description="O 1º prêmio aparece em destaque na página da rifa.">
        <PrizesEditor raffle={raffle} />
      </Section>

      <Section title="Pacotes" description={`Atalhos de compra. Cada pacote precisa ficar entre ${raffle.minPerOrder} e ${raffle.maxPerOrder} números.`}>
        <PackagesEditor raffle={raffle} />
      </Section>
    </div>
  )
}

function EditDetails({ raffle }: { raffle: AdminRaffle }) {
  const update = useRaffleMutation((input: RaffleInput) => adminRafflesApi.update(raffle.id, input))
  return (
    <>
      <RaffleDetailsForm
        raffle={raffle}
        submitLabel="Salvar alterações"
        submitting={update.isPending}
        error={update.error?.message}
        onSubmit={(input) => update.mutate(input)}
      />
      {update.isSuccess && !update.isPending && (
        <div className="mt-3">
          <Alert tone="success">Alterações salvas.</Alert>
        </div>
      )}
    </>
  )
}
