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
import { applySchemaDefaults, getSchemaDefaults } from './utils/defaults.js'

// Export individual schemas
export { person, article, event, project, opportunity, publication, nav, scene, form }

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
  contentBodyField,
  misplacedFields,
  flatRecordFields,
  rootListSection,
  validateBound,
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

/**
 * Apply schema defaults to data
 * @param {object} data - Data to apply defaults to
 * @param {string|object} schema - Schema name or definition
 * @returns {object} Data with defaults applied
 */
export function applyDefaults(data, schema) {
  const schemaDef = typeof schema === 'string' ? schemas[schema] : schema
  if (!schemaDef) {
    return data
  }
  return applySchemaDefaults(data, schemaDef)
}

/**
 * Get all default values from a schema
 * @param {string|object} schema - Schema name or definition
 * @returns {object} Object with all defaults
 */
export function getDefaults(schema) {
  const schemaDef = typeof schema === 'string' ? schemas[schema] : schema
  if (!schemaDef) {
    return {}
  }
  return getSchemaDefaults(schemaDef)
}

// Default export
export default schemas
