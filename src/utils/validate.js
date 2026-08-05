/**
 * Schema validation — a thin adapter over the shared conformance checker.
 *
 * This file used to hold a SECOND reader of the schema format, written when the
 * real one was locked inside `@uniweb/build`. It drifted, as a second reader
 * does: it never learned `many:`, `values:`, or the `sections:` form, and it knew
 * only the friendly type words — so `{ type: 'string', many: true }` given a
 * perfectly good array reported "Expected string, got object", and a
 * `sections:`-form schema silently returned valid no matter what you passed it.
 *
 * There is now one implementation. `format.js` normalizes, `conform.js` checks,
 * and `@uniweb/build` re-exports both — so `uniweb validate` and this function
 * run the same code over the same normalized shape.
 */

import { validateAndNormalizeSchema } from '../format.js'
import { validateItem, flatRecordFields } from '../conform.js'

/**
 * Validate one record against a schema.
 *
 * The schema is normalized first, so the friendly authoring vocabulary works:
 * `many:`, `number`/`boolean`/`image`, `markdown`/`richtext`, `{ ref: '@/x' }`,
 * and both the `fields:` and `sections:` forms.
 *
 * **Throws** when the schema itself is malformed — a bad schema is a programming
 * error, and the normalizer's message names the offending field. Invalid *data*
 * is what this reports; an invalid *schema* is not something to report as valid.
 *
 * @param {object} data - the record to check
 * @param {object} schema - a schema definition, as authored
 * @returns {{ valid: boolean, errors: Array<{ path: string, rule: string, message: string }> }}
 */
export function validateAgainstSchema(data, schema) {
  const label = typeof schema?.name === 'string' ? `@/${schema.name}` : '(schema)'
  const normalized = validateAndNormalizeSchema(schema, label)

  // The surface one flat record can populate. Null means the schema declares no
  // such surface at all (e.g. `@std/nav`, whose only section is a list) — there
  // is nothing a single record could be checked against, so nothing to report.
  const fields = flatRecordFields(normalized)
  if (!fields) return { valid: true, errors: [] }

  const findings = validateItem({ fields }, data)
  return {
    valid: findings.length === 0,
    errors: findings.map((f) => ({ path: f.field, rule: f.rule, message: f.message })),
  }
}

export default validateAgainstSchema
