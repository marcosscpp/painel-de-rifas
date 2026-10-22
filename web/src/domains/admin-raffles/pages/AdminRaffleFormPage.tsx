import type { ReactNode } from 'react'
import {
  ArrowSquareOutIcon,
  FileTextIcon,
  ImageIcon,
  PackageIcon,
  SlidersHorizontalIcon,
  TrophyIcon,
} from '@phosphor-icons/react'
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

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="bg-white p-6">
      <div className="flex items-start gap-3.5 border-b border-cream-200 pb-4">
        {icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-watercourse-50 p-2.5 text-watercourse-700 ring-1 ring-watercourse-200/60">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-wide text-lg font-bold text-charcoal-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-grey-600">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
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
    <div className="max-w-4xl">
      <PageHeader title="Nova rifa" subtitle="Configure os dados principais para iniciar o rascunho da campanha" />
      <Section
        title="Dados da rifa"
        description="Depois de criar, você adiciona capa, prêmios e pacotes."
        icon={<FileTextIcon className="size-5" />}
      >
        <RaffleDetailsForm
          submitLabel="Criar rascunho"
          submitting={create.isPending}
          error={create.error?.message}
          onSubmit={(input) =>
            create.mutate(input, { onSuccess: (r) => navigate(`/admin/rifas/${r.id}`, { replace: true }) })
          }
        />
      </Section>
    </div>
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
        subtitle={`Slug: /rifa/${raffle.slug}`}
        actions={
          <div className="flex items-center gap-3">
            <RaffleStatusBadge status={raffle.status} />
            {raffle.status !== 'DRAFT' && (
              <Link
                to={`/rifa/${raffle.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl border border-cream-300 bg-white px-3 py-1.5 text-xs font-bold text-watercourse-800 transition hover:border-anzac-400"
              >
                Ver no site
                <ArrowSquareOutIcon className="size-3.5" />
              </Link>
            )}
          </div>
        }
      />

      {raffle.status !== 'DRAFT' && (
        <Card className="bg-white p-6">
          <ProgressBar
            percent={raffle.progress.percent}
            label={`${formatInt(raffle.progress.paid)} pagos · ${formatInt(raffle.progress.reserved)} reservados · ${formatInt(raffle.progress.available)} livres (${raffle.progress.percent}%)`}
          />
        </Card>
      )}

      <Section title="Status e publicação" icon={<SlidersHorizontalIcon className="size-5" />}>
        <RaffleActions raffle={raffle} />
      </Section>

      <Section title="Dados da rifa" icon={<FileTextIcon className="size-5" />}>
        {/* key: recarrega o formulário quando a rifa muda de status (campos travados) */}
        <EditDetails key={raffle.status} raffle={raffle} />
      </Section>

      <Section title="Imagem de capa" icon={<ImageIcon className="size-5" />}>
        <CoverSection raffle={raffle} />
      </Section>

      <Section
        title="Prêmios"
        description="O 1º prêmio aparece em destaque na página da rifa."
        icon={<TrophyIcon className="size-5" />}
      >
        <PrizesEditor raffle={raffle} />
      </Section>

      <Section
        title="Pacotes promocionais"
        description={`Atalhos de compra. Cada pacote precisa ficar entre ${raffle.minPerOrder} e ${raffle.maxPerOrder} números.`}
        icon={<PackageIcon className="size-5" />}
      >
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
