import { useEffect } from 'react'
import { env } from '@/shared/config/env'

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${env.appName}` : env.appName
  }, [title])
}
