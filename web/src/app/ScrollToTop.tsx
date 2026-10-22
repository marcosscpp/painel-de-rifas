import { useEffect } from 'react'
import { useLocation } from 'react-router'

// Toda troca de página começa do topo (a rolagem da página anterior não vem junto).
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
