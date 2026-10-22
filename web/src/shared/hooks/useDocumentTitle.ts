import { useEffect } from 'react'
import { useSiteName } from './useSiteSettings'

export function useDocumentTitle(title?: string) {
  const siteName = useSiteName()
  useEffect(() => {
    document.title = title ? `${title} · ${siteName}` : siteName
  }, [title, siteName])
}
