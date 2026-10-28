/**
 * Thin client for the FlowSync API. By default requests go to relative
 * `/api/v1/...` URLs, which the Vite dev server proxies to the backend; set
 * `VITE_API_URL` (e.g. `https://api.example.com/api/v1`) for other setups.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export type User = {
  id: number
  fullName: string | null
  email: string
  createdAt: string
  updatedAt: string | null
  initials: string
}

export type AuthResponse = {
  user: User
  token: string
}

/** One entry of the AdonisJS error format: `{ errors: [{ message, field, rule }] }`. */
export type ApiFieldError = {
  message: string
  field?: string
  rule?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly errors: ApiFieldError[]

  constructor(status: number, errors: ApiFieldError[]) {
    super(errors[0]?.message ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

/** Status used when the request never got a response (backend down, offline). */
export const NETWORK_ERROR_STATUS = 0

type RequestOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string | null
}

async function apiFetch<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(NETWORK_ERROR_STATUS, [])
  }

  // A gateway error means the backend itself is unreachable (e.g. the Vite
  // proxy answers 502 when the API is down): report it like a network failure.
  if ([502, 503, 504].includes(response.status)) {
    throw new ApiError(NETWORK_ERROR_STATUS, [])
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const errors =
      payload &&
      typeof payload === 'object' &&
      'errors' in payload &&
      Array.isArray(payload.errors)
        ? (payload.errors as ApiFieldError[])
        : []
    throw new ApiError(response.status, errors)
  }

  // Every successful payload is wrapped in `{ data: ... }` by `ctx.serialize()`.
  return (payload as { data: T } | null)?.data as T
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export function signup(
  email: string,
  password: string,
  passwordConfirmation: string,
) {
  return apiFetch<AuthResponse>('/auth/signup', {
    method: 'POST',
    // `fullName` is nullable but required by the validator, so send it explicitly.
    body: { fullName: null, email, password, passwordConfirmation },
  })
}

export function getProfile(token: string) {
  return apiFetch<User>('/account/profile', { token })
}

export function logout(token: string) {
  return apiFetch<unknown>('/account/logout', { method: 'POST', token })
}
