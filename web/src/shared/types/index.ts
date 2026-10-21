export type Role = 'ADMIN' | 'BUYER'

export type SessionUser = {
  id: string
  name: string
  email: string | null
  role: Role
}

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number }
