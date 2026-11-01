import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// /api inclui REST, uploads, downloads e eventos SSE do Spring MVC.
// O ambiente do Docker tem prioridade sobre os arquivos .env locais.
export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), 'API_PROXY_TARGET')
  const apiTarget = process.env.API_PROXY_TARGET ?? localEnv.API_PROXY_TARGET ?? 'http://localhost:3000'
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      host: true,
      port: 5173,
      watch: { usePolling: !!process.env.CHOKIDAR_USEPOLLING },
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, timeout: 0, proxyTimeout: 0 },
      },
    },
    build: {
      sourcemap: false, // não publica o código-fonte original em produção
    },
  }
})
