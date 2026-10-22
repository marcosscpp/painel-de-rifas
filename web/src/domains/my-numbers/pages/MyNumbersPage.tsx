import { SignOutIcon, TicketIcon, UserCheckIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { BuyerLookupForm, useBuyerLogout, useBuyerSession, useMyOrders } from '@/domains/checkout'
import { Alert, Button, Card, EmptyState, FullPageSpinner, PageHeader } from '@/shared/components'
import { MyOrderCard } from '../components/MyOrderCard'

// Compras e números do comprador. Quem já comprou neste navegador entra direto;
// em outro aparelho, identifica-se com celular + CPF.
export function MyNumbersPage() {
  const session = useBuyerSession()
  const buyer = session.data
  const orders = useMyOrders(!!buyer)
  const logout = useBuyerLogout()

  if (session.isLoading) return <FullPageSpinner />

  if (!buyer) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Meus números" subtitle="Consulte suas compras e números" />
        <Card className="p-5">
          <p className="mb-4 text-sm text-slate-grey-700">
            Informe o celular e o CPF usados na compra.
          </p>
          <BuyerLookupForm onFound={() => undefined} submitLabel="Consultar meus números" />
        </Card>
      </div>
    )
  }

  const list = orders.data?.orders ?? []
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Meus números"
        actions={
          <Button variant="ghost" className="text-xs" loading={logout.isPending} onClick={() => logout.mutate()}>
            <SignOutIcon weight="bold" className="size-4" />
            Sair
          </Button>
        }
      />
      <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-watercourse-200 bg-watercourse-50 p-3 text-sm">
        <UserCheckIcon weight="duotone" className="size-5 text-watercourse-700" />
        <span>
          <strong className="text-charcoal-900">{buyer.name}</strong>{' '}
          <span className="text-slate-grey-600">· {buyer.phone}</span>
        </span>
      </div>

      {orders.isLoading && <FullPageSpinner />}
      {orders.error && <Alert tone="error">Não foi possível carregar suas compras. Tente de novo em instantes.</Alert>}
      {orders.data && list.length === 0 && (
        <EmptyState
          icon={<TicketIcon weight="duotone" className="size-7" />}
          title="Nenhuma compra ainda"
          description="Quando você comprar, seus números aparecem aqui."
          action={
            <Link to="/">
              <Button variant="buy">Ver campanhas</Button>
            </Link>
          }
        />
      )}
      <div className="flex flex-col gap-3">
        {list.map((o) => (
          <MyOrderCard key={o.id} order={o} />
        ))}
      </div>
    </div>
  )
}
