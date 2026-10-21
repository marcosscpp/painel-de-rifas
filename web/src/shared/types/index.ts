export type Role = 'ADMIN' | 'BUYER'

export type SessionUser = {
  id: string
  name: string
  email: string | null
  role: Role
}

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number }

// Tipos que mais de um domínio usa (site público e admin).
export type RaffleStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'DRAWN'
// Definido pelo admin: roleta (quantidade, números aleatórios) ou grade (comprador escolhe).
export type SaleMode = 'QUANTITY' | 'PICK'
export type PrizeKind = 'MONEY' | 'ITEM'

export type ImageUrls = { thumb: string; full: string }

export type RaffleProgress = { paid: number; reserved: number; available: number; percent: number }
