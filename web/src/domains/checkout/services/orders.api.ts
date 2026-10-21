import { http } from '@/shared/lib/http'
import type { CheckoutSettings, CreateOrderInput, Order } from '../types'

export const ordersApi = {
  create: (input: CreateOrderInput) => http<Order>('/orders', { method: 'POST', body: input }),
  get: (id: string) => http<Order>(`/orders/${id}`),
  // Só funciona com o gateway de teste (a API responde 404 em produção).
  simulatePayment: (id: string) => http<{ outcome: string; order: Order }>(`/orders/${id}/simulate-payment`, { method: 'POST' }),
  settings: () => http<CheckoutSettings>('/settings/public'),
}
