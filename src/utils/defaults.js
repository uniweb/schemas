/**
 * Default values — applied over the normalized schema shape.
 *
 * Like `validate.js`, this used to read the authored schema directly and so knew
 * only part of the format: a `sections:`-form schema yielded no defaults at all
 * (`getDefaults('article')` returned `{}` while the schema plainly declared
 * `status: 'published'`), and `many:` was invisible. Normalizing first makes the
 * whole vocabulary work, and keeps this file to the one job it actually has.
 *
 * What counts as "the record" is `flatRecordFields` — the same surface
 * validation checks, so defaults and validation never disagree about which
 * fields a flat record has.
 */

import { validateAndNormalizeSchema } from '../format.js'
import { flatRecordFields, rootListSection } from '../conform.js'

/**
 * Apply a schema's declared defaults to a record, without overwriting values the
 * record already carries. Returns a new object; the input is not mutated.
 *
 * **Throws** on a malformed schema — see `validateAgainstSchema`.
 *
 * @param {object} data - the record
 * @param {object} schema - a schema definition, as authored
 * @returns {object} the record with defaults filled in
 */
export function applySchemaDefaults(data, schema) {
  // A schema whose root is a LIST (`@std/nav`) declares its defaults per record,
  // so applying them means applying them to each element — the same dispatch
  // `validateAgainstSchema` makes.
  const list = listItemFields(schema)
  if (list) {
    return Array.isArray(data) ? data.map((record) => applyFieldDefaults(record || {}, list)) : data
  }
  const fields = recordFields(schema)
  if (!fields) return data
  return applyFieldDefaults(data, fields)
}

/**
 * Every default a schema declares, shaped like the record they apply to.
 *
 * @param {object} schema - a schema definition, as authored
 * @returns {object} defaults, nested to match the record shape
 */
export function getSchemaDefaults(schema) {
  // For a root-list schema these are the defaults of EACH record — there is no
  // record-level shape to report them against, because the value is the list.
  const fields = listItemFields(schema) || recordFields(schema)
  if (!fields) return {}
  return extractDefaults(fields)
}

function normalized(schema) {
  if (!schema || typeof schema !== 'object') return null
  const label = typeof schema.name === 'string' ? `@/${schema.name}` : '(schema)'
  return validateAndNormalizeSchema(schema, label)
}

function recordFields(schema) {
  const n = normalized(schema)
  return n && flatRecordFields(n)
}

function listItemFields(schema) {
  const n = normalized(schema)
  return n && rootListSection(n)?.fields
}

// --- the walk (normalized shape) --------------------------------------------

function applyFieldDefaults(data, fields) {
  const result = { ...data }

  for (const [name, def] of Object.entries(fields)) {
    if (!def || typeof def !== 'object') continue
    const hasValue = result[name] !== undefined && result[name] !== null

    if (!hasValue && def.default !== undefined) {
      result[name] = def.default
    }

    // A nested record: recurse when there is something already there, or when
    // the nested shape has defaults worth materializing.
    if (def.type === 'object' && def.fields) {
      if (result[name] || hasDefaults(def.fields)) {
        result[name] = applyFieldDefaults(result[name] || {}, def.fields)
      }
      continue
    }

    // An OPEN MAP (`values:`): the keys are the author's, so there is nothing to
    // materialize from nothing — but every entry that IS present gets the value
    // shape's defaults.
    if (def.type === 'object' && def.values?.fields && isPlainObject(result[name])) {
      const filled = {}
      for (const [key, entry] of Object.entries(result[name])) {
        filled[key] = applyFieldDefaults(entry || {}, def.values.fields)
      }
      result[name] = filled
      continue
    }

    // A list of records (`many: true` on an object, or `array` + object `items`):
    // each present element gets the item shape's defaults. Absent stays absent —
    // inventing a first element would be inventing content.
    if (def.type === 'array' && def.items?.fields && Array.isArray(result[name])) {
      result[name] = result[name].map((item) => applyFieldDefaults(item || {}, def.items.fields))
    }
  }

  return result
}

function extractDefaults(fields) {
  const defaults = {}

  for (const [name, def] of Object.entries(fields)) {
    if (!def || typeof def !== 'object') continue

    if (def.default !== undefined) defaults[name] = def.default

    if (def.type === 'object' && def.fields) {
      const nested = extractDefaults(def.fields)
      if (Object.keys(nested).length > 0) defaults[name] = nested
    }
    // No entry for an open map or a list: their defaults belong to entries that
    // do not exist yet, so there is nothing to report at the record level.
  }

  return defaults
}

function hasDefaults(fields) {
  return Object.values(fields).some(
    (f) =>
      f &&
      typeof f === 'object' &&
      (f.default !== undefined || (f.type === 'object' && f.fields && hasDefaults(f.fields)))
  )
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export default applySchemaDefaults
