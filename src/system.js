/**
 * The system Models a site's records may name — `@uniweb/<name>`.
 *
 * `@uniweb/*` is the reserved system scope: no foundation or site publishes a data schema in it,
 * so no other definition can bear these names. A record of one is a folder entry of that kind,
 * holding its data itself, never an entity: `@uniweb/link` (a URL) and `@uniweb/file` (a stored
 * file, whose value is an asset).
 *
 * @module @uniweb/schemas/system
 */
import link from './system/link.js'
import file from './system/file.js'

/** The system Models a site's records may name, by name within `@uniweb`. */
export const SYSTEM_RECORD_SCHEMAS = Object.freeze({ link, file })

/** Is this ref one of them — `@uniweb/link`? */
export function isSystemRecordRef(ref) {
  const m = typeof ref === 'string' ? /^@uniweb\/([^/]+)$/.exec(ref) : null
  return Boolean(m && Object.prototype.hasOwnProperty.call(SYSTEM_RECORD_SCHEMAS, m[1]))
}
