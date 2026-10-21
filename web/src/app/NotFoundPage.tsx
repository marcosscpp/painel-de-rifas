import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-bold text-gray-300">404</p>
      <p className="text-gray-700">Página não encontrada.</p>
      <Link to="/" className="text-emerald-700 underline">
        Voltar para o início
      </Link>
    </main>
  )
}
