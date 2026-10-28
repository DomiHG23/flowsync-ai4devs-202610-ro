import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthLayout } from '@/components/AuthLayout'
import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/useAuth'
import { signup } from '@/lib/api'
import { signupErrors, type FormErrors } from '@/lib/errors'

// Mirrors `backend/app/validators/user.ts` so obvious mistakes never hit the API.
const PASSWORD_MIN = 8
const PASSWORD_MAX = 32

function validate(
  email: string,
  password: string,
  passwordConfirmation: string,
): Record<string, string> {
  const fields: Record<string, string> = {}
  if (!email) fields.email = 'Este campo es obligatorio.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fields.email = 'Introduce un email válido.'
  if (password.length < PASSWORD_MIN)
    fields.password = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`
  else if (password.length > PASSWORD_MAX)
    fields.password = `La contraseña no puede tener más de ${PASSWORD_MAX} caracteres.`
  if (passwordConfirmation !== password)
    fields.passwordConfirmation = 'Las contraseñas no coinciden.'
  return fields
}

export function SignupPage() {
  const { setToken } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [errors, setErrors] = useState<FormErrors>({ fields: {} })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const trimmedEmail = email.trim()
    const fields = validate(trimmedEmail, password, passwordConfirmation)
    if (Object.keys(fields).length > 0) {
      setErrors({ fields })
      return
    }

    setSubmitting(true)
    setErrors({ fields: {} })
    try {
      const { token } = await signup(
        trimmedEmail,
        password,
        passwordConfirmation,
      )
      setToken(token)
      navigate('/profile', { replace: true })
    } catch (error) {
      setErrors(signupErrors(error))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Crear cuenta"
      description="Regístrate con tu email para empezar a usar FlowSync."
      footer={
        <span>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-foreground underline">
            Iniciar sesión
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
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.fields.password}
        />
        <FormField
          id="passwordConfirmation"
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          error={errors.fields.passwordConfirmation}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>
    </AuthLayout>
  )
}
