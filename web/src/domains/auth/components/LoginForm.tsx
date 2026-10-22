import { SignInIcon } from '@phosphor-icons/react'
import { z } from 'zod'
import { Alert, Button, Input } from '@/shared/components'
import { useZodForm } from '@/shared/hooks/useZodForm'
import { ApiError } from '@/shared/lib/http'
import { zEmail } from '@/shared/lib/validators'
import { useLogin } from '../hooks/useSession'

const schema = z.object({
  email: zEmail,
  password: z.string().min(1, 'Informe a senha'),
})

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(schema, { defaultValues: { email: '', password: '' } })

  const error =
    login.error instanceof ApiError && login.error.status === 429
      ? 'Muitas tentativas. Aguarde um minuto.'
      : login.error?.message

  return (
    <form onSubmit={handleSubmit((v) => login.mutate(v, { onSuccess }))} noValidate className="flex flex-col gap-4">
      <Input
        label="E-mail"
        type="email"
        autoComplete="username"
        placeholder="admin@exemplo.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Senha"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register('password')}
      />
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" variant="primary" className="mt-1 py-3" loading={login.isPending}>
        <SignInIcon weight="bold" className="size-4.5" />
        Entrar no painel
      </Button>
    </form>
  )
}
