import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/auth/useAuth'
import { ApiError, getProfile, logout, type User } from '@/lib/api'

type State =
  | { status: 'loading' }
  | { status: 'ready'; user: User }
  | { status: 'error'; message: string }

const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' })

export function ProfilePage() {
  const { token, clearToken } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    getProfile(token)
      .then((user) => {
        if (!cancelled) setState({ status: 'ready', user })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          // Expired or revoked token: dropping it makes <RequireAuth> redirect to login.
          clearToken()
          return
        }
        setState({
          status: 'error',
          message: 'No se pudo cargar tu perfil. Inténtalo de nuevo.',
        })
      })
    return () => {
      cancelled = true
    }
  }, [token, clearToken, reloadKey])

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    if (token) {
      // Best effort: the local session ends even if the server call fails.
      await logout(token).catch(() => undefined)
    }
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Tu perfil</CardTitle>
          <CardDescription>Datos de tu cuenta de FlowSync.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.status === 'loading' && (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          )}
          {state.status === 'error' && (
            <div className="grid gap-3">
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
              <Button
                variant="outline"
                onClick={() => {
                  setState({ status: 'loading' })
                  setReloadKey((key) => key + 1)
                }}
              >
                Reintentar
              </Button>
            </div>
          )}
          {state.status === 'ready' && (
            <div className="flex items-center gap-4">
              <div
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
              >
                {state.user.initials}
              </div>
              <dl className="grid min-w-0 gap-1 text-sm">
                <dt className="sr-only">Nombre</dt>
                <dd className="truncate text-base font-medium">
                  {state.user.fullName ?? 'Sin nombre'}
                </dd>
                <dt className="sr-only">Email</dt>
                <dd className="truncate text-muted-foreground">
                  {state.user.email}
                </dd>
                <dt className="sr-only">Miembro desde</dt>
                <dd className="text-muted-foreground">
                  Miembro desde{' '}
                  {dateFormatter.format(new Date(state.user.createdAt))}
                </dd>
              </dl>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
