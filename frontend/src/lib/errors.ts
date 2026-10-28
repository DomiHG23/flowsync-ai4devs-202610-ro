import { ApiError, NETWORK_ERROR_STATUS, type ApiFieldError } from '@/lib/api'

export type FormErrors = {
  /** Message shown at the top of the form. */
  form?: string
  /** Messages shown under each input, keyed by API field name. */
  fields: Record<string, string>
}

const NETWORK_MESSAGE =
  'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
const GENERIC_MESSAGE =
  'Algo ha salido mal. Inténtalo de nuevo en unos minutos.'

/** Translates one VineJS validation error into a user-facing Spanish message. */
function fieldMessage({ field, rule }: ApiFieldError): string {
  switch (rule) {
    case 'database.unique':
      return 'Este email ya está registrado.'
    case 'email':
      return 'Introduce un email válido.'
    case 'required':
      return 'Este campo es obligatorio.'
    case 'minLength':
      return 'La contraseña debe tener al menos 8 caracteres.'
    case 'maxLength':
      return field === 'email'
        ? 'El email es demasiado largo.'
        : 'La contraseña no puede tener más de 32 caracteres.'
    case 'sameAs':
      return 'Las contraseñas no coinciden.'
    default:
      return 'Revisa este campo.'
  }
}

function fromValidationErrors(errors: ApiFieldError[]): FormErrors {
  const fields: Record<string, string> = {}
  for (const error of errors) {
    if (error.field && !fields[error.field]) {
      fields[error.field] = fieldMessage(error)
    }
  }
  return Object.keys(fields).length > 0
    ? { form: 'Revisa los campos marcados.', fields }
    : { form: GENERIC_MESSAGE, fields }
}

function fromUnknown(error: unknown): FormErrors | null {
  if (!(error instanceof ApiError)) return { form: GENERIC_MESSAGE, fields: {} }
  if (error.status === NETWORK_ERROR_STATUS)
    return { form: NETWORK_MESSAGE, fields: {} }
  if (error.status === 422) return fromValidationErrors(error.errors)
  return null
}

export function loginErrors(error: unknown): FormErrors {
  const mapped = fromUnknown(error)
  if (mapped) return mapped
  // `User.verifyCredentials` answers 400 for both unknown email and wrong password.
  if (
    error instanceof ApiError &&
    (error.status === 400 || error.status === 401)
  )
    return { form: 'Email o contraseña incorrectos.', fields: {} }
  return { form: GENERIC_MESSAGE, fields: {} }
}

export function signupErrors(error: unknown): FormErrors {
  const mapped = fromUnknown(error)
  if (mapped) {
    // Surface the duplicate email at the top too, it's the most common failure.
    if (mapped.fields.email === 'Este email ya está registrado.')
      mapped.form =
        'Ya existe una cuenta con este email. ¿Quieres iniciar sesión?'
    return mapped
  }
  return { form: GENERIC_MESSAGE, fields: {} }
}
