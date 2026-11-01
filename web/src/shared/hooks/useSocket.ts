import { useEffect, useLayoutEffect, useRef } from 'react'
import { env } from '@/shared/config/env'
import { logApiStream } from '@/shared/lib/api-logger'

// EventSource reconnects automatically and sends session cookies.
const events = new EventTarget()

export function useSocketRoom(_joinEvent: string, payload: Record<string, string> | null, _leaveEvent?: string) {
  const key = payload ? JSON.stringify(payload) : null
  useEffect(() => {
    if (!key) return
    const source = new EventSource(`${env.apiBase}/events?${new URLSearchParams(JSON.parse(key) as Record<string, string>)}`, { withCredentials: true })
    source.addEventListener('open', () => {
      logApiStream('connected')
      events.dispatchEvent(new CustomEvent('raffle:refresh', { detail: JSON.parse(key) as Record<string, string> }))
    })
    source.addEventListener('error', () => logApiStream('reconnecting'))
    for (const name of ['raffle:progress', 'raffle:numbers', 'order:status']) {
      source.addEventListener(name, (event) => {
        const data: unknown = JSON.parse((event as MessageEvent<string>).data)
        events.dispatchEvent(new CustomEvent(name, { detail: data }))
      })
    }
    return () => {
      source.close()
      logApiStream('closed')
    }
  }, [key])
}

export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const ref = useRef(handler)
  useLayoutEffect(() => { ref.current = handler })
  useEffect(() => {
    const listener = (e: Event) => ref.current((e as CustomEvent<T>).detail)
    events.addEventListener(event, listener)
    return () => events.removeEventListener(event, listener)
  }, [event])
}
