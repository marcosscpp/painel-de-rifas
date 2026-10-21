import { http } from '@/shared/lib/http'
import type { CreateOrderInput, Order } from '../types'

export const ordersApi = {
  create: (input: CreateOrderInput) => http<Order>('/orders', { method: 'POST', body: input }),
  get: (id: string) => http<Order>(`/orders/${id}`),
}
