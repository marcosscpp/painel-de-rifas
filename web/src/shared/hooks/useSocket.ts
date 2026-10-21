import { useEffect, useLayoutEffect, useRef } from 'react'
import { getSocket } from '@/shared/lib/socket'

// Entra numa sala enquanto o componente estiver na tela. Entra de novo se a conexão cair e voltar.
export function useSocketRoom(joinEvent: string, payload: Record<string, string> | null, leaveEvent?: string) {
  const key = payload ? JSON.stringify(payload) : null

  useEffect(() => {
    if (!key) return
    const socket = getSocket()
    const data = JSON.parse(key) as Record<string, string>
    const join = () => socket.emit(joinEvent, data)
    join()
    socket.on('connect', join)
    return () => {
      socket.off('connect', join)
      if (leaveEvent) socket.emit(leaveEvent, data)
    }
  }, [joinEvent, leaveEvent, key])
}

// Escuta um evento; o handler mais recente é sempre o usado (sem reinscrever a cada render).
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const ref = useRef(handler)
  useLayoutEffect(() => {
    ref.current = handler
  })

  useEffect(() => {
    const socket = getSocket()
    const fn = (p: T) => ref.current(p)
    socket.on(event, fn)
    return () => {
      socket.off(event, fn)
    }
  }, [event])
}
