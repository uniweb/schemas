/**
 * @uniweb/schemas
 *
 * Its main parts, and it is worth knowing which you are reaching for (the
 * content declaration and starter content are subpaths of their own):
 *
 *   the FORMAT    the data-schema language itself — the type vocabulary, the
 *                 normalizer that folds its friendly aliases to canonical kinds,
 *                 and the conformance checker. `@uniweb/build` re-exports these,
 *                 so `uniweb validate` and this package run one implementation.
 *                 → `./format`, `./conform`
 *
 *   the STANDARDS the shared `@std/*` schema definitions — person, article,
 *                 event, and the rest — written in that format.
 *                 → `./standard/*`, or the named exports below
 *
 *   the FAMILIES  the standard section types a foundation's component can claim
 *                 (`family:` in `meta.js`), so an editor can show the right
 *                 illustration and a translated label. A different kind of
 *                 standard name from the schemas above, in the same package
 *                 because "where are Uniweb's standard names?" should have one
 *                 answer. ⛔ Aliases are NOT here — they are `uniweb doctor`'s.
 *                 → `./families`, `./families.json`
 *
 *   the SITE TAGS the standard words for what a site is for (`tags:` in
 *                 `site.yml`), so a list of sites can be filtered and labelled
 *                 the same way everywhere. Standard names again, same reason.
 *                 → `./site-tags`, `./site-tags.json`
 *
 *   the COMPONENT what a section type's `meta.js` declares, read for an editor:
 *                 its expected content (`./content` — lowered to the canonical
 *                 list a foundation registers), and where it may be placed, the
 *                 children it arranges and its title (`./component`). A grid
 *                 layout value (`grid: '40/60'`) has its own dependency-free
 *                 module, since kit renders with it.
 *                 → `./content`, `./component`, `./grid`
 *
 *   the SECTION   the names framework reserves in a section's params —
 *                 `background`, `grid`, `theme`, `vars`, `fetch` — settings of the section
 *                 that framework applies, which an editor offers as the section's
 *                 settings rather than its component's.
 *                 → `./section`
 *
 * Both vocabularies' labels are translated in `./locales/*`, keyed by id.
 */

// Standard schemas
import person from './standard/person.js'
import article from './standard/article.js'
import event from './standard/event.js'
import project from './standard/project.js'
import opportunity from './standard/opportunity.js'
import publication from './standard/publication.js'
import nav from './standard/nav.js'
import scene from './standard/scene.js'
import form from './standard/form.js'

// Section families — also at the `@uniweb/schemas/families` subpath
export {
  FAMILIES,
  GROUPS,
  getFamily,
  getGroup,
  isFamily,
  normalizeName,
  resolveFamily,
} from './families.js'

// Site tags — also at the `@uniweb/schemas/site-tags` subpath
export { SITE_TAGS, getSiteTag, isSiteTag, resolveSiteTags } from './site-tags.js'

// Utilities
import { validateAgainstSchema } from './utils/validate.js'

// Export individual schemas
export { person, article, event, project, opportunity, publication, nav, scene, form }

// A foundation schema in its normalized form, format 3 — also the
// `@uniweb/schemas/foundation` subpath, which `@uniweb/build`'s `register` imports.
export {
  FOUNDATION_SCHEMA_FORMAT,
  DATA_KINDS,
  normalizeFoundationSchema,
  normalizeData,
  normalizeParams,
  qualifyRef,
  schemaDeclarationOf,
} from './foundation.js'

// The format itself — normalization and conformance. Also available as the
// `@uniweb/schemas/format` and `@uniweb/schemas/conform` subpaths, which is what
// `@uniweb/build` imports.
export {
  SCALAR_KINDS,
  STRUCTURAL_KINDS,
  FORMAT_TYPES,
  SECTION_KINDS,
  AUTHORING_TYPES,
  SCHEMA_EXTENSIONS,
  parseSchemaRef,
  validateAndNormalizeSchema,
  collectNestedRefs,
} from './format.js'
export {
  validateItem,
  validateRecordFile,
  isStaticallyCheckable,
  recordLayout,
  briefSectionName,
  deliveredFields,
  toDeliveredRecord,
  briefFieldMap,
  wholeFieldMap,
  toStoredRecord,
  mergedFromStored,
  storedFromMerged,
  storedPath,
  contentBodyField,
  misplacedFields,
  referencesOf,
  mapReferences,
  flatRecordFields,
  rootListSection,
  validateBound,
  validateKeyValue,
  validateStoredRecord,
} from './conform.js'

/**
 * Registry of all standard schemas
 * @type {Object.<string, object>}
 */
export const schemas = {
  person,
  article,
  event,
  project,
  opportunity,
  publication,
  nav,
  scene,
  form,
}

/**
 * Get a schema by name
 * @param {string} name - Schema name
 * @returns {object|undefined} Schema definition
 */
export function getSchema(name) {
  return schemas[name]
}

/**
 * Check if a schema name is a standard schema
 * @param {string} name - Schema name to check
 * @returns {boolean}
 */
export function isStandardSchema(name) {
  return name in schemas
}

/**
 * Get all standard schema names
 * @returns {string[]}
 */
export function getSchemaNames() {
  return Object.keys(schemas)
}

/**
 * Validate one record against a schema.
 *
 * Accepts the schema as authored — the friendly vocabulary (`many:`, `number`,
 * `richtext`, `{ ref: '@/x' }`) and both the `fields:` and `sections:` forms are
 * normalized first. Throws when the *schema* is malformed; invalid *data* comes
 * back as findings.
 *
 * @param {object} data - Data to validate
 * @param {string|object} schema - Schema name or definition
 * @returns {{ valid: boolean, errors: Array<{ path: string, rule: string, message: string }> }}
 */
export function validate(data, schema) {
  const schemaDef = typeof schema === 'string' ? schemas[schema] : schema
  if (!schemaDef) {
    return { valid: false, errors: [{ path: '', message: `Unknown schema: ${schema}` }] }
  }
  return validateAgainstSchema(data, schemaDef)
}

// ⛔ No `applyDefaults` / `getDefaults` (removed 2026-10-05): a named data schema declares no
// default, and a record reaches a component as it is — what an absent field renders as is the
// component's choice. A default lives in a component's own inline field map or form, where an
// editor pre-fills from it.

// Default export
export default schemas
