import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { diffJson, openApiDocumentPath, renderOpenApiDocument } from '#openapi/document'

/**
 * Cuántas diferencias se enseñan como mucho. Un cambio grande (renombrar un
 * esquema, por ejemplo) puede producir cientos; con las primeras basta para
 * saber que hay que regenerar.
 */
const MAX_DIFFERENCES = 50

/**
 * Comprueba que `docs/api/openapi.json` coincide con lo que el código genera
 * hoy. Solo compara: regenera en un directorio temporal y nunca escribe sobre
 * el fichero versionado. Si no coinciden, explica qué difiere y termina con
 * código de salida 1.
 */
export default class OpenApiCheck extends BaseCommand {
  static commandName = 'openapi:check'
  static description =
    'Comprueba que docs/api/openapi.json coincide con el documento OpenAPI que genera el código'

  static options: CommandOptions = { startApp: true }

  async run() {
    const versionedPath = openApiDocumentPath(this.app)
    const shownPath = relative(process.cwd(), versionedPath)

    const versioned = await readFile(versionedPath, 'utf-8').catch((error) => {
      if (error.code === 'ENOENT') return null
      throw error
    })
    if (versioned === null) {
      return this.fail(
        `No existe ${shownPath}. Genéralo con \`npm run openapi:generate\` y commitéalo.`
      )
    }

    const generated = await this.generateInTempDir()
    if (generated === versioned) {
      this.logger.success(`${shownPath} está al día con el código`)
      return
    }

    let versionedJson
    try {
      versionedJson = JSON.parse(versioned)
    } catch (error) {
      return this.fail(
        `${shownPath} no es JSON válido (${(error as Error).message}). ` +
          'Regenéralo con `npm run openapi:generate`.'
      )
    }

    const differences = diffJson(versionedJson, JSON.parse(generated))
    if (differences.length === 0) {
      return this.fail(
        `${shownPath} tiene el mismo contenido que el generado pero otro formato ` +
          '(indentación, orden de claves o salto de línea final). ' +
          'Regenéralo con `npm run openapi:generate` en vez de editarlo a mano.'
      )
    }

    const shown = differences.slice(0, MAX_DIFFERENCES)
    const hidden = differences.length - shown.length
    this.fail(
      [
        `${shownPath} no coincide con el documento que genera el código ` +
          `(${differences.length} diferencia${differences.length === 1 ? '' : 's'}):`,
        '',
        ...shown.map((line) => `  ${line}`),
        ...(hidden > 0 ? [`  ... y ${hidden} más`] : []),
        '',
        'Si el cambio de contrato es intencionado, regenera con `npm run openapi:generate` ' +
          'y commitea el fichero junto al cambio que lo provoca.',
      ].join('\n')
    )
  }

  /**
   * Regenera el documento en un directorio temporal propio y lo lee de vuelta,
   * de modo que se compara exactamente lo que `openapi:generate` escribiría.
   */
  private async generateInTempDir() {
    const dir = await mkdtemp(join(tmpdir(), 'flowsync-openapi-'))
    try {
      const file = join(dir, 'openapi.json')
      await writeFile(file, await renderOpenApiDocument(this.app))
      return await readFile(file, 'utf-8')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }

  private fail(message: string) {
    this.logger.error(message)
    this.exitCode = 1
  }
}
