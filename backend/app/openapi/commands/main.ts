import type { CommandMetaData } from '@adonisjs/core/types/ace'
import OpenApiCheck from './openapi_check.js'
import OpenApiGenerate from './openapi_generate.js'

/**
 * Loader de los comandos `openapi:*`, registrado en `adonisrc.ts`.
 *
 * No viven en `commands/` a propósito. Ace valida cada comando de ese
 * directorio contra un JSON Schema con `jsonschema@1.5.0` (la última versión
 * publicada), y en Node 26 esa validación revienta con `Invalid URL` al
 * resolver el `$ref` del schema. Basta con que exista un comando en
 * `commands/` para que `node ace` deje de listar nada. Los loaders de
 * `adonisrc.ts` no pasan por esa validación, igual que los comandos de los
 * paquetes (`@adonisjs/lucid/commands`, etc.).
 *
 * Si algún día se arregla, estos dos ficheros pueden volver a `commands/` y
 * este loader desaparecer.
 */
const commands = [OpenApiGenerate, OpenApiCheck]

export async function getMetaData() {
  return commands.map((command) => command.serialize())
}

export async function getCommand(metaData: CommandMetaData) {
  return commands.find((command) => command.commandName === metaData.commandName) ?? null
}
