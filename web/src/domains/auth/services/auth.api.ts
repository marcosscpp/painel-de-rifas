import { http } from '@/shared/lib/http'
import type { SessionUser } from '@/shared/types'
import type { LoginInput } from '../types'

export const authApi = {
  me: () => http<SessionUser>('/auth/me'),
  login: (input: LoginInput) => http<SessionUser>('/auth/login', { method: 'POST', body: input }),
  logout: () => http<void>('/auth/logout', { method: 'POST' }),
}
