import type { ApplicationService } from '@adonisjs/core/types'

/**
 * Dónde vive el documento OpenAPI versionado. Va en el `docs/` de la raíz del
 * monorepo, no en `backend/`, porque es el contrato que comparten backend y
 * frontend; `app.makePath` resuelve desde `backend/`, de ahí el `..`.
 */
export function openApiDocumentPath(app: ApplicationService) {
  return app.makePath('..', 'docs', 'api', 'openapi.json')
}

/**
 * Construye el documento exactamente como lo sirve `GET /api.json`: el mismo
 * servicio `openapi`, sobre el mismo router y los mismos decoradores. La única
 * diferencia es el formato: aquí va indentado y con salto de línea final, para
 * que el fichero versionado dé diffs legibles en git.
 *
 * Desde Ace el servidor HTTP no arranca, así que nadie ha hecho `commit()` del
 * router; sin él no hay rutas que leer. Es lo mismo que hace `list:routes`.
 */
export async function renderOpenApiDocument(app: ApplicationService): Promise<string> {
  const router = await app.container.make('router')
  router.commit()

  const openapi = await app.container.make('openapi')
  const document = await openapi.buildDocument()

  return `${JSON.stringify(document, null, 2)}\n`
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

/**
 * Lista las diferencias entre dos documentos JSON, una por línea y con la
 * ruta en formato JSON Pointer (RFC 6901), para que quien lea el fallo sepa
 * qué operación, respuesta o esquema ha cambiado sin tener que hacer el diff
 * a mano.
 *
 * `+` es algo que el código genera y el fichero versionado no tiene, `-` lo
 * contrario, y `~` un valor que está en los dos pero ha cambiado.
 */
export function diffJson(versioned: Json, generated: Json, pointer = ''): string[] {
  if (isObject(versioned) && isObject(generated)) {
    const keys = new Set([...Object.keys(versioned), ...Object.keys(generated)])
    return [...keys].flatMap((key) => {
      const child = `${pointer}/${escapePointer(key)}`
      if (!(key in generated))
        return [`- ${child}: está en el fichero versionado y el código ya no lo genera`]
      if (!(key in versioned))
        return [`+ ${child}: lo genera el código y falta en el fichero versionado`]
      return diffJson(versioned[key], generated[key], child)
    })
  }

  if (Array.isArray(versioned) && Array.isArray(generated)) {
    const length = Math.max(versioned.length, generated.length)
    return Array.from({ length }, (_, index) => {
      const child = `${pointer}/${index}`
      if (index >= generated.length)
        return [`- ${child}: está en el fichero versionado y el código ya no lo genera`]
      if (index >= versioned.length)
        return [`+ ${child}: lo genera el código y falta en el fichero versionado`]
      return diffJson(versioned[index], generated[index], child)
    }).flat()
  }

  if (JSON.stringify(versioned) === JSON.stringify(generated)) return []

  return [`~ ${pointer || '/'}: versionado ${preview(versioned)} → generado ${preview(generated)}`]
}

function isObject(value: Json): value is { [key: string]: Json } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function escapePointer(key: string) {
  return key.replaceAll('~', '~0').replaceAll('/', '~1')
}

function preview(value: Json) {
  const text = JSON.stringify(value)
  return text.length > 80 ? `${text.slice(0, 77)}...` : text
}
