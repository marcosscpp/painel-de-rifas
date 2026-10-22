// Para onde voltar depois de entrar/cadastrar. Só caminhos internos (evita redirecionar para outro site).
export function safeNext(raw: string | null, fallback = '/meus-numeros') {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : fallback
}

export const loginPath = (next: string) => `/entrar?next=${encodeURIComponent(next)}`
