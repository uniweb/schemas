/**
 * @uniweb/schemas
 *
 * Standard schema definitions for Uniweb components.
 * These schemas define common content types that components can consume.
 */

// Standard schemas
import person from './standard/person.js'
import article from './standard/article.js'
import event from './standard/event.js'
import project from './standard/project.js'
import opportunity from './standard/opportunity.js'
import publication from './standard/publication.js'
import nav from './standard/nav.js'

// Utilities
import { validateAgainstSchema } from './utils/validate.js'
import { applySchemaDefaults, getSchemaDefaults } from './utils/defaults.js'

// Export individual schemas
export { person, article, event, project, opportunity, publication, nav }

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
 * Validate data against a schema
 * @param {object} data - Data to validate
 * @param {string|object} schema - Schema name or definition
 * @returns {{ valid: boolean, errors: Array<{ path: string, message: string }> }}
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
