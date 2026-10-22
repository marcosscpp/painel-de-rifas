import { type ComponentType, lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { FullPageSpinner } from '@/shared/components'
import { LoginPage } from '@/domains/auth'
import { AdminLayout } from './layouts/AdminLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { RequireAdmin } from './RequireAdmin'
import { ScrollToTop } from './ScrollToTop'

// Cada domínio vira um arquivo JS separado: quem compra rifa não baixa o código do painel.
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) =>
  lazy(() => load().then((m) => ({ default: m[name] as ComponentType })))

const HomePage = page(() => import('@/domains/raffles'), 'HomePage')
const RafflePage = page(() => import('@/domains/raffles'), 'RafflePage')
const CheckoutPage = page(() => import('@/domains/checkout'), 'CheckoutPage')
const MyNumbersPage = page(() => import('@/domains/my-numbers'), 'MyNumbersPage')
const BuyerLoginPage = page(() => import('@/domains/account'), 'BuyerLoginPage')
const BuyerRegisterPage = page(() => import('@/domains/account'), 'BuyerRegisterPage')
const MyDataPage = page(() => import('@/domains/account'), 'MyDataPage')
const DashboardPage = page(() => import('@/domains/admin-dashboard'), 'DashboardPage')
const AdminRafflesPage = page(() => import('@/domains/admin-raffles'), 'AdminRafflesPage')
const AdminRaffleFormPage = page(() => import('@/domains/admin-raffles'), 'AdminRaffleFormPage')
const AdminOrdersPage = page(() => import('@/domains/admin-orders'), 'AdminOrdersPage')
const AdminBuyersPage = page(() => import('@/domains/admin-buyers'), 'AdminBuyersPage')
const AdminDrawsPage = page(() => import('@/domains/admin-draws'), 'AdminDrawsPage')
const AdminSettingsPage = page(() => import('@/domains/admin-settings'), 'AdminSettingsPage')
const NotFoundPage = page(() => import('./NotFoundPage'), 'NotFoundPage')

export function AppRouter() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="rifa/:slug" element={<RafflePage />} />
          <Route path="pedido/:orderId" element={<CheckoutPage />} />
          <Route path="meus-numeros" element={<MyNumbersPage />} />
          <Route path="entrar" element={<BuyerLoginPage />} />
          <Route path="cadastrar" element={<BuyerRegisterPage />} />
          <Route path="minha-conta" element={<MyDataPage />} />
        </Route>

        <Route path="admin/login" element={<LoginPage />} />
        <Route path="admin" element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="rifas" element={<AdminRafflesPage />} />
            <Route path="rifas/nova" element={<AdminRaffleFormPage />} />
            <Route path="rifas/:id" element={<AdminRaffleFormPage />} />
            <Route path="pedidos" element={<AdminOrdersPage />} />
            <Route path="compradores" element={<AdminBuyersPage />} />
            <Route path="sorteios" element={<AdminDrawsPage />} />
            <Route path="configuracoes" element={<AdminSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
