import { env } from '@/shared/config/env'

export type ApiCall = {
  requestId: string
  method: string
  route: string
  startedAt: number
}

// Query strings may contain CPF, contact information or order access links.
// Neither request/response bodies nor headers are passed to the console.
function routeOf(url: string) {
  try {
    return new URL(url, window.location.origin).pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:id')
      .replace(/\/\d+(?=\/|$)/g, '/:number')
  } catch {
    return '/invalid-url'
  }
}

export function beginApiCall(method: string, url: string): ApiCall {
  const call = { requestId: crypto.randomUUID(), method: method.toUpperCase(), route: routeOf(url), startedAt: performance.now() }
  if (env.apiLogging) console.info('[API →]', { requestId: call.requestId, method: call.method, route: call.route })
  return call
}

export function finishApiCall(call: ApiCall, status: number, requestId = call.requestId, code?: string) {
  if (!env.apiLogging) return
  const details = {
    requestId,
    method: call.method,
    route: call.route,
    status,
    durationMs: Math.round(performance.now() - call.startedAt),
    ...(code && { code }),
  }
  if (status === 0 || status >= 500) console.error('[API ✕]', details)
  else if (status >= 400) console.warn('[API ←]', details)
  else console.info('[API ←]', details)
}

export function logApiStream(event: 'connected' | 'reconnecting' | 'closed') {
  if (env.apiLogging) console.info('[API SSE]', { method: 'GET', route: `${env.apiBase}/events`, event })
}
