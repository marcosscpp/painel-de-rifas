import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { adminReportsApi } from '../services/admin-reports.api'
import type { ReportFilters, ReportType } from '../types'

export function useReportCatalog() {
  return useQuery({ queryKey: ['admin-reports', 'catalog'], queryFn: adminReportsApi.catalog, staleTime: Infinity })
}

export function useReportPreview(type: ReportType, filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['admin-reports', 'preview', type, filters],
    queryFn: () => adminReportsApi.preview(type, filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useReportRaffles() {
  return useQuery({ queryKey: ['admin-reports', 'raffles'], queryFn: adminReportsApi.raffles, staleTime: 60_000 })
}
