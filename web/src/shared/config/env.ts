// Variáveis públicas do front (prefixo VITE_). Nunca coloque segredo aqui:
// tudo que começa com VITE_ vai parar no JavaScript que o navegador baixa.
export const env = {
  apiBase: (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, ''),
  apiLogging: import.meta.env.VITE_API_LOGGING === 'true' || (import.meta.env.DEV && import.meta.env.VITE_API_LOGGING !== 'false'),
  appName: import.meta.env.VITE_APP_NAME ?? 'WinClub',
} as const
