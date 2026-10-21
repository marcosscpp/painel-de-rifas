import { useQuery } from '@tanstack/react-query'
import { Link, Route, Routes } from 'react-router'
import { api } from './lib/api'

type Health = { status: string; db: string; time: string }

function Home() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api<Health>('/health'),
    refetchInterval: 5000,
  })

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">Rifas</h1>
      <p className="mt-2 text-gray-600">Boilerplate no ar. As rifas entram aqui.</p>
      <div className="mt-6 rounded-lg border p-4 text-sm">
        API:{' '}
        {health.isLoading && 'verificando...'}
        {health.isError && <span className="text-red-600">fora do ar</span>}
        {health.data && (
          <span className="text-green-600">
            {health.data.status} (banco {health.data.db})
          </span>
        )}
      </div>
      <Link to="/admin" className="mt-4 inline-block text-blue-600 underline">
        Painel admin
      </Link>
    </main>
  )
}

function Admin() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">Painel admin</h1>
      <p className="mt-2 text-gray-600">Em construção.</p>
      <Link to="/" className="mt-4 inline-block text-blue-600 underline">
        Voltar
      </Link>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/*" element={<Admin />} />
    </Routes>
  )
}
