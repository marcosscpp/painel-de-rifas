import type { OrderStatus } from '@/domains/checkout'

export type ReportType = 'sales-by-raffle' | 'sales-by-day' | 'orders' | 'buyers' | 'numbers'

// money em centavos, percent em fração, date "AAAA-MM-DD", datetime ISO.
export type ColumnType = 'text' | 'int' | 'money' | 'datetime' | 'date' | 'percent'
export type ReportColumn = { key: string; label: string; type: ColumnType; total?: boolean }
export type ReportCell = string | number | null

export type ReportInfo = {
  type: ReportType
  title: string
  periodOf: string
  needsRaffle: boolean
  usesStatus: boolean
  columns: ReportColumn[]
}

export type ReportFilters = {
  from?: string
  to?: string
  raffleId?: string
  status?: OrderStatus
}

export type ReportPreview = {
  type: ReportType
  title: string
  columns: ReportColumn[]
  rows: ReportCell[][]
  truncated: boolean
}

export type RaffleOption = { id: string; title: string }
