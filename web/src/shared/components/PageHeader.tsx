import type { ReactNode } from 'react'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  useDocumentTitle(title)
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {actions}
    </div>
  )
}
