// API pública do domínio: outras partes do app importam só daqui.
export { BuyerForm } from './components/BuyerForm'
export { emptyBuyer } from './constants'
export { useCreateOrder } from './hooks/useOrder'
export { CheckoutPage } from './pages/CheckoutPage'
export type { BuyerDraft, BuyerInput } from './types'
