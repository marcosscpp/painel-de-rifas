// API pública do domínio: outras partes do app importam só daqui.
export { BuyerLookupForm } from './components/BuyerLookupForm'
export { CheckoutPanel } from './components/CheckoutPanel'
export { emptyBuyer } from './constants'
export { useBuyerLogout, useBuyerSession, useMyOrders } from './hooks/useBuyer'
export { useCreateOrder } from './hooks/useOrder'
export { CheckoutPage } from './pages/CheckoutPage'
export type { BuyerDraft, BuyerInput, MyOrder } from './types'
