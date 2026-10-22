import { FloppyDiskIcon, MapPinIcon, SignOutIcon } from '@phosphor-icons/react'
import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router'
import {
  AddressFields,
  type BuyerAccount,
  type BuyerDraft,
  useBuyerLogout,
  useBuyerProfile,
  useBuyerSession,
  useUpdateProfile,
} from '@/domains/checkout'
import { Alert, Button, Card, FullPageSpinner, InfoList, Input, PageHeader } from '@/shared/components'
import { formatDate } from '@/shared/utils/format'
import { AccountTabs } from '../components/AccountTabs'
import { loginPath } from '../nav'

type Address = BuyerDraft['address']
const emptyAddress: Address = { zipCode: '', street: '', number: '', district: '', city: '', state: '', complement: '', reference: '' }

function toForm(p: BuyerAccount) {
  const a = p.address
  return {
    name: p.name,
    socialName: p.socialName ?? '',
    email: p.email ?? '',
    wantsAddress: !!a,
    address: a
      ? {
          zipCode: a.zipCode.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
          street: a.street,
          number: a.number,
          district: a.district,
          city: a.city,
          state: a.state,
          complement: a.complement ?? '',
          reference: a.reference ?? '',
        }
      : emptyAddress,
  }
}

// "Meus dados": celular, CPF e nascimento identificam a pessoa e só mudam pelo suporte.
function ProfileForm({ profile }: { profile: BuyerAccount }) {
  const update = useUpdateProfile()
  const [f, setF] = useState(() => toForm(profile))
  const [saved, setSaved] = useState(false)
  const set = (patch: Partial<typeof f>) => {
    setSaved(false)
    setF((s) => ({ ...s, ...patch }))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const a = f.address
    update.mutate(
      {
        name: f.name,
        socialName: f.socialName,
        email: f.email,
        address: f.wantsAddress
          ? {
              zipCode: a.zipCode.replace(/\D/g, ''),
              street: a.street,
              number: a.number,
              district: a.district,
              city: a.city,
              state: a.state,
              ...(a.complement && { complement: a.complement }),
              ...(a.reference && { reference: a.reference }),
            }
          : null,
      },
      { onSuccess: () => setSaved(true) },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <Input label="Nome completo" required maxLength={80} value={f.name} onChange={(e) => set({ name: e.target.value })} />
      <Input
        label="Nome social (opcional)"
        maxLength={80}
        value={f.socialName}
        onChange={(e) => set({ socialName: e.target.value })}
      />
      <Input label="E-mail" type="email" required value={f.email} onChange={(e) => set({ email: e.target.value })} />
      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-charcoal-900">
        <input
          type="checkbox"
          checked={f.wantsAddress}
          onChange={(e) => set({ wantsAddress: e.target.checked })}
          className="size-4 accent-watercourse-800"
        />
        <MapPinIcon className="size-4 text-watercourse-700" />
        Informar meu endereço
      </label>
      {f.wantsAddress && <AddressFields value={f.address} onChange={(address) => set({ address })} />}
      {update.error && <Alert tone="error">{update.error.message}</Alert>}
      {saved && <Alert tone="success">Dados atualizados.</Alert>}
      <Button type="submit" loading={update.isPending} className="self-start">
        <FloppyDiskIcon weight="bold" className="size-4" />
        Salvar alterações
      </Button>
    </form>
  )
}

export function MyDataPage() {
  const session = useBuyerSession()
  const profile = useBuyerProfile(!!session.data)
  const logout = useBuyerLogout()

  if (session.isLoading || (session.data && profile.isLoading)) return <FullPageSpinner />
  if (!session.data) return <Navigate to={loginPath('/minha-conta')} replace />

  const p = profile.data
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Olá, ${session.data.name}`}
        subtitle="Seus dados de cadastro"
        actions={
          <Button variant="ghost" className="text-xs" loading={logout.isPending} onClick={() => logout.mutate()}>
            <SignOutIcon weight="bold" className="size-4" />
            Sair
          </Button>
        }
      />
      <AccountTabs />
      {profile.error && <Alert tone="error">Não foi possível carregar seus dados. Tente de novo em instantes.</Alert>}
      {p && (
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="font-wide mb-3 font-bold text-charcoal-900">Identificação</h2>
            <InfoList
              items={[
                { label: 'Celular', value: p.phone },
                { label: 'CPF', value: p.cpf },
                { label: 'Nascimento', value: p.birthDate && formatDate(p.birthDate) },
                { label: 'Cliente desde', value: formatDate(p.createdAt) },
              ]}
            />
            <p className="mt-3 text-xs text-slate-grey-600">Para alterar celular, CPF ou nascimento, fale com o suporte.</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-wide mb-3 font-bold text-charcoal-900">Dados pessoais</h2>
            <ProfileForm profile={p} />
          </Card>
        </div>
      )}
    </div>
  )
}
