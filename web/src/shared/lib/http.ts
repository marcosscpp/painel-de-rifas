import axios, { AxiosError, type AxiosRequestConfig, type Method } from 'axios'
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

// Instância única do axios. A sessão vai no cookie httpOnly (o JS não vê o token),
// então só precisamos mandar credenciais; API e site ficam na mesma origem (/api).
export const api = axios.create({
  baseURL: env.apiBase,
  withCredentials: true,
  headers: { Accept: 'application/json' },
  timeout: 30_000,
})

// Todo erro vira ApiError com a mensagem da API (NestJS manda string ou lista de strings).
api.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (error instanceof AxiosError) {
      const status = error.response?.status ?? 0
      const data = error.response?.data as { message?: string | string[] } | undefined
      const msg = data?.message
      const fallback =
        status === 0
          ? error.code === AxiosError.ECONNABORTED
            ? 'O servidor demorou para responder. Tente de novo.'
            : 'Sem conexão com o servidor. Verifique a internet.'
          : (error.response?.statusText ?? error.message)
      return Promise.reject(new ApiError(status, Array.isArray(msg) ? msg.join('\n') : (msg ?? fallback), data))
    }
    return Promise.reject(error)
  },
)

type Options = Omit<AxiosRequestConfig, 'url' | 'method' | 'data'> & { method?: Method; body?: unknown }

// Atalho usado pelos services: devolve só o corpo da resposta.
export async function http<T>(path: string, { body, method = 'GET', ...config }: Options = {}): Promise<T> {
  const res = await api.request<T>({ url: path, method, data: body, ...config })
  return res.data
}

// Envio de arquivo (multipart). O axios monta o Content-Type com o boundary a partir do FormData.
export async function upload<T>(path: string, file: File, field = 'file'): Promise<T> {
  const form = new FormData()
  form.append(field, file)
  const res = await api.post<T>(path, form)
  return res.data
}
