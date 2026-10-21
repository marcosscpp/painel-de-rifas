import { type FormEvent, useState } from 'react'
import { SignInIcon } from '@phosphor-icons/react'
import { Alert, Button, Input } from '@/shared/components'
import { ApiError } from '@/shared/lib/http'
import { useLogin } from '../hooks/useSession'

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate({ email, password }, { onSuccess })
  }

  const error =
    login.error instanceof ApiError && login.error.status === 429
      ? 'Muitas tentativas. Aguarde um minuto.'
      : login.error?.message

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input
        label="E-mail"
        type="email"
        autoComplete="username"
        placeholder="admin@exemplo.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Senha"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" variant="primary" className="mt-1 py-3" loading={login.isPending}>
        <SignInIcon weight="bold" className="size-4.5" />
        Entrar no painel
      </Button>
    </form>
  )
}
