// API pública do domínio: outras partes do app importam só daqui.
export { AddressFields } from './components/AddressFields'
export { BuyerForm } from './components/BuyerForm'
export { BuyerLookupForm } from './components/BuyerLookupForm'
export { CheckoutPanel } from './components/CheckoutPanel'
export { OrderStatusBadge, orderStatusInfo } from './components/OrderStatusBadge'
export { emptyBuyer } from './constants'
export {
  useBuyerLogout,
  useBuyerProfile,
  useBuyerRegister,
  useBuyerSession,
  useMyOrders,
  useUpdateProfile,
} from './hooks/useBuyer'
export { useCreateOrder } from './hooks/useOrder'
export { CheckoutPage } from './pages/CheckoutPage'
export type { AddressInput, BuyerAccount, BuyerDraft, BuyerInput, BuyerProfile, MyOrder, OrderStatus, ProfileInput } from './types'
