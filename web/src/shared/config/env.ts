// Variáveis públicas do front (prefixo VITE_). Nunca coloque segredo aqui:
// tudo que começa com VITE_ vai parar no JavaScript que o navegador baixa.
export const env = {
  apiBase: '/api',
  appName: import.meta.env.VITE_APP_NAME ?? 'WinClub',
} as const
