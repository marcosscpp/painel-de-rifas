import { useEffect, useState } from 'react'

// Segundos restantes até `until` (nunca negativo), atualizado a cada segundo.
export function useCountdown(until: string | Date | null | undefined) {
  const target = until ? new Date(until).getTime() : 0
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!target) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])

  const left = target ? Math.max(0, Math.floor((target - now) / 1000)) : 0
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return { seconds: left, label: `${mm}:${ss}` }
}
