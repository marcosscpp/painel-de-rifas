import { env } from '@/shared/config/env'

export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

type Options = Omit<RequestInit, 'body'> & { body?: unknown }

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T

  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = (data as { message?: string | string[] } | null)?.message
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join('\n') : (msg ?? res.statusText), data)
  }
  return data as T
}

// Cliente HTTP único. A sessão vai no cookie httpOnly (o JS não vê o token),
// por isso só precisamos mandar credenciais da mesma origem.
export async function http<T>(path: string, { body, headers, ...init }: Options = {}): Promise<T> {
  const res = await fetch(`${env.apiBase}${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return parse<T>(res)
}

// Envio de arquivo (multipart). O navegador define o Content-Type com o boundary.
export async function upload<T>(path: string, file: File, field = 'file'): Promise<T> {
  const form = new FormData()
  form.append(field, file)
  const res = await fetch(`${env.apiBase}${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    body: form,
  })
  return parse<T>(res)
}
