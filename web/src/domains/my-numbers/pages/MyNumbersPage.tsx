import { SignOutIcon, TicketIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { AccountTabs, loginPath, ScamWarning } from '@/domains/account'
import { type OrderStatus, useBuyerLogout, useBuyerSession, useMyOrders } from '@/domains/checkout'
import { Alert, Button, EmptyState, FullPageSpinner, PageHeader, Tabs } from '@/shared/components'
import { MyOrderCard } from '../components/MyOrderCard'

type Filter = 'ALL' | OrderStatus

// "Minhas compras": pedidos e números do comprador logado. Sem sessão, manda entrar.
export function MyNumbersPage() {
  const session = useBuyerSession()
  const buyer = session.data
  const orders = useMyOrders(!!buyer)
  const logout = useBuyerLogout()
  const [filter, setFilter] = useState<Filter>('ALL')

  if (session.isLoading) return <FullPageSpinner />
  if (!buyer) return <Navigate to={loginPath('/meus-numeros')} replace />

  const all = orders.data?.orders ?? []
  const count = (s: OrderStatus) => all.filter((o) => o.status === s).length
  const list =
    filter === 'ALL'
      ? all
      : all.filter((o) => o.status === filter || (filter === 'EXPIRED' && o.status === 'CANCELED'))

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Olá, ${buyer.name}`}
        subtitle={buyer.phone ? `Compras feitas com o celular ${buyer.phone}` : 'Suas compras e números'}
        actions={
          <Button variant="ghost" className="text-xs" loading={logout.isPending} onClick={() => logout.mutate()}>
            <SignOutIcon weight="bold" className="size-4" />
            Sair
          </Button>
        }
      />
      <AccountTabs />
      <ScamWarning />

      {orders.isLoading && <FullPageSpinner />}
      {orders.error && <Alert tone="error">Não foi possível carregar suas compras. Tente de novo em instantes.</Alert>}
      {orders.data && all.length === 0 && (
        <EmptyState
          icon={<TicketIcon className="size-6" />}
          title="Nenhuma compra ainda"
          description="Quando você comprar, seus números aparecem aqui."
          action={
            <Link to="/">
              <Button variant="buy">Ver campanhas</Button>
            </Link>
          }
        />
      )}
      {all.length > 0 && (
        <>
          <Tabs<Filter>
            className="mb-4"
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'ALL', label: 'Todas', count: all.length },
              { value: 'PAID', label: 'Pagas', count: count('PAID') },
              { value: 'PENDING', label: 'Aguardando', count: count('PENDING') },
              { value: 'EXPIRED', label: 'Expiradas', count: count('EXPIRED') + count('CANCELED') },
            ]}
          />
          {list.length === 0 && <p className="py-6 text-center text-sm text-slate-grey-600">Nenhuma compra neste filtro.</p>}
          <div className="flex flex-col gap-3">
            {list.map((o) => (
              <MyOrderCard key={o.id} order={o} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
