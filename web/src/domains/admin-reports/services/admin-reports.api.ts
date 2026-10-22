import { env } from '@/shared/config/env'
import { http } from '@/shared/lib/http'
import type { Paginated } from '@/shared/types'
import { toQuery } from '@/shared/utils/query'
import type { RaffleOption, ReportFilters, ReportInfo, ReportPreview, ReportType } from '../types'

export const adminReportsApi = {
  catalog: () => http<ReportInfo[]>('/admin/reports'),
  preview: (type: ReportType, f: ReportFilters) => http<ReportPreview>(`/admin/reports/${type}${toQuery(f)}`),
  // Download direto pelo navegador (o cookie da sessão vai junto): o arquivo chega em streaming,
  // sem passar pela memória da página, então aguenta relatórios com milhões de linhas.
  exportUrl: (type: ReportType, format: 'csv' | 'xlsx', f: ReportFilters) =>
    `${env.apiBase}/admin/reports/${type}/export${toQuery({ ...f, format })}`,
  raffles: async (): Promise<RaffleOption[]> =>
    (await http<Paginated<RaffleOption>>('/admin/raffles?pageSize=50')).items.map(({ id, title }) => ({ id, title })),
}
