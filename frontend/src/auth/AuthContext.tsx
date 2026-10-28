import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'flowsync.token'

type AuthContextValue = {
  token: string | null
  setToken: (token: string) => void
  clearToken: () => void
}

// eslint-disable-next-line react/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(readStoredToken)

  const setToken = useCallback((next: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable (private mode): the session lasts until reload.
    }
    setTokenState(next)
  }, [])

  const clearToken = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing to clear.
    }
    setTokenState(null)
  }, [])

  const value = useMemo(
    () => ({ token, setToken, clearToken }),
    [token, setToken, clearToken],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
