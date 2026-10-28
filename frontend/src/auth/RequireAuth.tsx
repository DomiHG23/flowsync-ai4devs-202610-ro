import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/auth/useAuth'

/** Route guard: renders the nested routes only when a token is stored. */
export function RequireAuth() {
  const { token } = useAuth()
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

/** Inverse guard for login/signup: a signed-in user goes straight to the profile. */
export function RedirectIfAuthenticated() {
  const { token } = useAuth()
  return token ? <Navigate to="/profile" replace /> : <Outlet />
}
