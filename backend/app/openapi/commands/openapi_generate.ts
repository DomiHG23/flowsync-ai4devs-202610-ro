import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { openApiDocumentPath, renderOpenApiDocument } from '#openapi/document'

/**
 * Escribe en `docs/api/openapi.json` el documento OpenAPI que el servidor
 * sirve en `/api.json`, para que el contrato exista en el repositorio y no
 * solo mientras el servidor corre.
 */
export default class OpenApiGenerate extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = 'Genera el documento OpenAPI y lo escribe en docs/api/openapi.json'

  static options: CommandOptions = { startApp: true }

  async run() {
    const target = openApiDocumentPath(this.app)
    const document = await renderOpenApiDocument(this.app)

    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, document)

    this.logger.success(`Documento OpenAPI escrito en ${relative(process.cwd(), target)}`)
  }
}
