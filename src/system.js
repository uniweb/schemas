/**
 * The system Models a site's records may name — `@uniweb/<name>`.
 *
 * `@uniweb/*` is the reserved system scope: no foundation or site publishes a data schema in it,
 * so no other definition can bear these names. A record of one is a folder entry of that kind,
 * holding its data itself, never an entity. `@uniweb/link` is the one a site's records may name
 * today; `@uniweb/file` waits on how a file reference is stored.
 *
 * @module @uniweb/schemas/system
 */
import link from './system/link.js'

/** The system Models a site's records may name, by name within `@uniweb`. */
export const SYSTEM_RECORD_SCHEMAS = Object.freeze({ link })

/** Is this ref one of them — `@uniweb/link`? */
export function isSystemRecordRef(ref) {
  const m = typeof ref === 'string' ? /^@uniweb\/([^/]+)$/.exec(ref) : null
  return Boolean(m && Object.prototype.hasOwnProperty.call(SYSTEM_RECORD_SCHEMAS, m[1]))
}
