import { FloppyDiskIcon, MapPinIcon, SignOutIcon } from '@phosphor-icons/react'
import { FormProvider } from 'react-hook-form'
import { Navigate } from 'react-router'
import {
  AddressFields,
  type BuyerAccount,
  type AddressDraft,
  useBuyerLogout,
  useBuyerProfile,
  useBuyerSession,
  useUpdateProfile,
} from '@/domains/checkout'
import { Alert, Button, Card, Checkbox, FullPageSpinner, InfoList, Input, PageHeader } from '@/shared/components'
import { useZodForm } from '@/shared/hooks/useZodForm'
import { formatDate } from '@/shared/utils/format'
import { AccountTabs } from '../components/AccountTabs'
import { loginPath } from '../nav'
import { profileSchema } from '../schemas'

const emptyAddress: AddressDraft = { zipCode: '', street: '', number: '', district: '', city: '', state: '', complement: '', reference: '' }

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
  const form = useZodForm(profileSchema, { defaultValues: toForm(profile) })
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isDirty },
  } = form
  const wantsAddress = watch('wantsAddress')

  const save = handleSubmit((input) =>
    update.mutate(input, { onSuccess: () => form.reset(form.getValues()) }),
  )

  return (
    <FormProvider {...form}>
      <form onSubmit={save} noValidate className="flex flex-col gap-3.5">
        <Input label="Nome completo" maxLength={80} error={errors.name?.message} {...register('name')} />
        <Input label="Nome social (opcional)" maxLength={80} error={errors.socialName?.message} {...register('socialName')} />
        <Input label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
        <Checkbox
          label="Informar meu endereço"
          icon={<MapPinIcon className="size-4 text-watercourse-700" />}
          {...register('wantsAddress')}
        />
        {wantsAddress && <AddressFields />}
        {update.error && <Alert tone="error">{update.error.message}</Alert>}
        {update.isSuccess && !isDirty && <Alert tone="success">Dados atualizados.</Alert>}
        <Button type="submit" loading={update.isPending} className="self-start">
          <FloppyDiskIcon weight="bold" className="size-4" />
          Salvar alterações
        </Button>
      </form>
    </FormProvider>
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
