import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthLayout } from '@/components/AuthLayout'
import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/useAuth'
import { login } from '@/lib/api'
import { loginErrors, type FormErrors } from '@/lib/errors'

export function LoginPage() {
  const { setToken } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({ fields: {} })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setErrors({ fields: {} })
    try {
      const { token } = await login(email.trim(), password)
      setToken(token)
      navigate('/profile', { replace: true })
    } catch (error) {
      setErrors(loginErrors(error))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Iniciar sesión"
      description="Accede a tu cuenta de FlowSync."
      footer={
        <span>
          ¿No tienes cuenta?{' '}
          <Link to="/signup" className="font-medium text-foreground underline">
            Crear cuenta
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.fields.email}
        />
        <FormField
          id="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.fields.password}
        />
        <Button
          type="submit"
          disabled={submitting || !email.trim() || !password}
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthLayout>
  )
}
