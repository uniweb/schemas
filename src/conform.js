/**
 * Data conformance — does this item match a normalized schema?
 *
 * The pure half of what used to be `@uniweb/build`'s `validate-data.js`. It sits
 * here beside `format.js` for one reason: **what normalizes and what conforms
 * must speak one definition of each kind**, and that agreement is mechanical
 * (see the coverage guard at the bottom), not a convention someone remembers.
 * Splitting the pair across packages is what let this package's own `validate()`
 * drift into a second, wrong reader of the same vocabulary.
 *
 * `@uniweb/build` re-exports these, so `uniweb validate` and this package's
 * `validate()` run the same code on the same normalized shape. The build keeps
 * the half that needs a disk — pairing a site's data files with the schemas its
 * sections bind, and attributing findings back to sections.
 *
 * Facet-driven: each declared facet (required / type / enum / format / nested
 * object+array / open map) contributes its own check, so a new facet in the
 * schema model is covered without restructuring this function.
 *
 * This is a pre-live dev/CI gate, not a render-time guard. The runtime stays
 * tolerant (apply defaults, ignore the rest); a wrong value is best caught
 * before a site is live — so this returns findings and the caller decides
 * whether they fail a build (CI treats them as errors).
 */

import { SCALAR_KINDS, FORMAT_TYPES } from './format.js'

/**
 * Validate one data item against a normalized data schema.
 *
 * Operates on the *normalized* schema (canonical kinds + `required` / `enum` /
 * `format` / nested `fields` / `items` / `values`) — the shape `dataSchemas[ref]`
 * carries. Pass an authored schema through `validateAndNormalizeSchema` first;
 * the friendly vocabulary (`many:`, `number`, `richtext`) is not read here.
 *
 * Scope: a `fields`-form schema (the locally-testable case). A `sections`-form
 * (rich) schema describes the backend's section/item graph, which a flat file
 * can't reproduce — callers defer those rather than pass them here; given one,
 * this returns `[]`. Ask `isStaticallyCheckable()` first when the answer matters:
 * an empty finding list from a deferred schema means "not checked", not "clean".
 *
 * @param {Object} schema - a normalized data schema (`{ fields }` or `{ sections }`)
 * @param {*} item - the data item to check
 * @returns {Array<{ field: string, rule: string, message: string }>}
 */
export function validateItem(schema, item) {
  if (!schema || typeof schema !== 'object') return []
  if (schema.fields) return validateFields(schema.fields, item, '')
  // `sections`-form schemas are deferred upstream (rich model — not reproducible
  // from a flat file); this is a no-op safety net. For a schema whose root is a
  // LIST rather than a record, use `validateBound` — see below for why that is a
  // separate entry point rather than a widening of this one.
  return []
}

/**
 * The section whose records ARE the whole value — i.e. the schema's root is a
 * LIST, not a record.
 *
 * `@std/nav` is the shape: one `many` section, no singles, no brief, and the
 * authored content is a bare array of items. `@std/form` is the same shape once a
 * form's title and description move out of the data block and into the section's
 * markdown, where they belong.
 *
 * Requires EXACTLY ONE section, and that it be `multi`. Two multi sections and no
 * singles would leave "which one is the value?" unanswerable, so it is not a
 * root-list — better to check nothing than to guess.
 *
 * @param {Object} schema - a normalized data schema
 * @returns {Object|null} the section, or null when the root is not a list
 */
export function rootListSection(schema) {
  if (!schema || typeof schema !== 'object' || !schema.sections) return null
  const entries = Object.entries(schema.sections)
  if (entries.length !== 1) return null
  const section = entries[0][1]
  return section && section.kind === 'multi' && section.fields ? section : null
}

/**
 * Validate the whole value bound to a `content.data` key — a record OR a list.
 *
 * This is the entry point a caller holding an entire authored value wants: a
 * tagged data block (```` ```yaml:nav ````), or anything else delivered under one
 * key. It dispatches on the schema's root shape:
 *
 *   root is a LIST    → the value is an array of that section's records
 *   root is a RECORD  → the value is one record (`flatRecordFields`)
 *
 * WHY THIS IS NOT `validateItem`, and why `isStaticallyCheckable` is untouched.
 * Both of those answer "does ONE RECORD match this schema?", and callers rely on
 * exactly that: `@uniweb/build` checks each concept-block item and each collection
 * record with them. Teaching them about root-lists would make a root-list schema
 * apply per-item, which is the opposite of what it says — the list is the whole
 * value, not each element of some outer one. Two questions, two functions.
 *
 * @param {Object} schema - a normalized data schema
 * @param {*} value - the whole bound value
 * @returns {Array<{ field: string, rule: string, message: string }>}
 */
export function validateBound(schema, value) {
  const list = rootListSection(schema)
  if (list) {
    if (!Array.isArray(value)) {
      return [violation('', 'type', `expected a list of records, got ${typeName(value)}`)]
    }
    const out = []
    value.forEach((record, i) => out.push(...validateFields(list.fields, record, `[${i}]`)))
    return out
  }
  const fields = flatRecordFields(schema)
  if (!fields) return []
  return validateFields(fields, value, '')
}

/**
 * Whether a normalized schema can be checked statically against a flat file.
 * `fields`-form yes; `sections`-form no (the rich, backend-graph case).
 *
 * This is `@uniweb/build`'s conservative gate for its own site-data join, and it
 * is deliberately narrower than `flatRecordFields` below — see that function's
 * note for why the two differ rather than one calling the other.
 */
export function isStaticallyCheckable(schema) {
  return !!(schema && typeof schema === 'object' && schema.fields)
}

/**
 * The field map ONE FLAT RECORD is checked against — the surface a single source
 * file (a `.md` with frontmatter, a `.yml`, one `.json` object) can populate.
 *
 *   fields-form    → the field map as declared
 *   sections-form  → the union of every SINGLE section's fields, in declared
 *                    order, first occurrence winning a name collision
 *
 * The sections rule is not invented here: it is the convention
 * `collectionRecordsToEntities` implements when it turns a collection's source
 * files into entities (`@uniweb/build`, `src/uwx/collections.js`) — "a record
 * maps to the Model's SINGLE sections in declared order — the brief (the card)
 * plus any sibling single sections", with field names unique across a Model's
 * sections. `multi` sections are skipped there for the same reason they are
 * skipped here: repeating items cannot be expressed by one flat record.
 *
 * WHY THIS IS NOT `isStaticallyCheckable`. That predicate guards a different
 * question — whether `@uniweb/build` should validate a site's data files at all
 * — and it answers "no" for every sections-form schema, conservatively, because
 * in that join the schema may describe a backend graph no local file mirrors.
 * A test pins that behavior. This function answers the narrower question a
 * caller holding an actual flat record has, so it can say something useful about
 * `@std/article` instead of nothing. Keeping them separate is deliberate: one
 * gate did not fit both jobs, and collapsing them would change build's contract.
 *
 * @param {Object} schema - a normalized data schema
 * @returns {Object|null} a field map, or null when the schema declares no
 *   flat-record surface at all (e.g. `@std/nav`, whose only section is a list)
 */
export function flatRecordFields(schema) {
  if (!schema || typeof schema !== 'object') return null
  if (schema.fields) return schema.fields
  if (!schema.sections) return null

  const out = {}
  for (const section of Object.values(schema.sections)) {
    if (!section || section.kind === 'multi') continue
    for (const [name, def] of Object.entries(section.fields || {})) {
      if (!(name in out)) out[name] = def
    }
  }
  return Object.keys(out).length ? out : null
}

function validateFields(fields, obj, prefix) {
  const out = []
  const record = isPlainObject(obj) ? obj : {}
  for (const [name, rawDef] of Object.entries(fields)) {
    const def = asFieldDef(rawDef)
    const path = prefix ? `${prefix}.${name}` : name
    const has = Object.prototype.hasOwnProperty.call(record, name) && record[name] != null

    // required — a promised field with no value. Don't flag a merely-absent
    // optional field: the runtime fills it from `default` (or leaves it unset).
    if (def.required === true && !has) {
      out.push(violation(path, 'required', `missing required field '${path}'`))
      continue
    }
    if (!has) continue

    out.push(...validateValue(def, record[name], path))
  }
  return out
}

function validateValue(def, value, path) {
  const out = []
  const kind = def.type

  // ref / options — a reference into the entity graph (entity_ref / item_ref).
  // Its target isn't resolvable without the backend, so the value can't be
  // checked statically. `required` already ran in validateFields; presence is
  // all we can assert here.
  if (kind === 'ref' || def.options !== undefined) return out

  // enum (inline picklist) — the value must be one of the allowed set. Mirrors
  // the runtime, which checks enum membership regardless of the base type, so a
  // wrong-type-and-wrong-value lands as one clear enum finding (not two).
  if (Array.isArray(def.enum)) {
    if (!def.enum.includes(value)) {
      out.push(violation(path, 'enum', `${fmt(value)} is not one of [${def.enum.map(fmt).join(', ')}]`))
    }
    return out
  }

  if (kind === 'object') {
    if (!isPlainObject(value)) {
      out.push(violation(path, 'type', `expected object, got ${typeName(value)}`))
    } else if (def.fields) {
      out.push(...validateFields(def.fields, value, path))
    } else if (def.values) {
      // An OPEN MAP: the keys are the author's, every value conforms to one
      // shape. `values` is to an object what `items` is to an array.
      //
      // Note what this deliberately does NOT do: reject a key. It cannot — the
      // keys are the whole point — and it must not reject unexpected keys
      // WITHIN a value either, which falls out of `validateFields` walking the
      // schema's fields rather than the data's. That tolerance is load-bearing
      // for `@std/form`: a form definition may carry per-field keys the current
      // builder cannot author (hand-written, or from a newer editor), and the
      // editor's boundary passes them through untouched. A stricter check here
      // would fail builds on good content.
      for (const [key, item] of Object.entries(value)) {
        out.push(...validateValue(def.values, item, `${path}.${key}`))
      }
    }
    return out
  }

  if (kind === 'array') {
    if (!Array.isArray(value)) {
      out.push(violation(path, 'type', `expected array, got ${typeName(value)}`))
    } else if (def.items !== undefined) {
      const itemDef = asFieldDef(def.items)
      value.forEach((el, i) => out.push(...validateValue(itemDef, el, `${path}[${i}]`)))
    }
    return out
  }

  // scalar kind
  if (!isKind(kind, value)) {
    out.push(violation(path, 'type', `expected ${kind}, got ${typeName(value)}`))
    return out
  }

  // format (url / email) — only on present string scalars
  if (typeof value === 'string' && FORMAT_TYPES.has(def.format)) {
    if (def.format === 'email' && !isEmailish(value)) {
      out.push(violation(path, 'format', `${fmt(value)} is not a valid email`))
    } else if (def.format === 'url' && !isUrlish(value)) {
      out.push(violation(path, 'format', `${fmt(value)} is not a valid url`))
    }
  }

  return out
}

// Scalar kinds this checker knows how to verify. Kept in lockstep with the
// normalizer's SCALAR_KINDS by the coverage guard at the bottom of this file —
// adding a kind to the shared vocabulary without teaching the checker throws at
// module load, rather than silently passing everything via the default branch.
const KNOWN_SCALAR_KINDS = new Set([
  'string', 'text', 'file',
  'int', 'decimal', 'bool', 'date', 'datetime', 'json',
])

/**
 * Does a value match a canonical scalar kind?
 */
function isKind(kind, value) {
  switch (kind) {
    case 'string':
    case 'text':
    case 'file':
      return typeof value === 'string'
    case 'int':
      return typeof value === 'number' && Number.isInteger(value)
    case 'decimal':
      return typeof value === 'number' && Number.isFinite(value)
    case 'bool':
      return typeof value === 'boolean'
    case 'date':
    case 'datetime':
      // YAML parses bare dates to Date objects; JSON carries them as strings.
      return typeof value === 'string' || value instanceof Date
    case 'json':
      return true // structured / untyped — no scalar constraint
    default:
      return true // unknown kind → forward-compatible, not a violation
  }
}

// Lenient format checks — strict enough to catch garbage, loose enough not to
// flag the shapes authors legitimately write (bare domains, root-relative
// paths). The north star is no false positives.
function isEmailish(v) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim())
}
function isUrlish(v) {
  const s = v.trim()
  if (!s || /\s/.test(s)) return false
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return true // scheme://
  if (s.startsWith('//') || s.startsWith('/') || s.startsWith('./') || s.startsWith('../')) return true
  if (/^[\w-]+(\.[\w-]+)+/.test(s)) return true // bare domain (example.com, sub.site.io/x)
  return false
}

function violation(field, rule, message) {
  return { field, rule, message }
}

function asFieldDef(def) {
  // Normalized schemas always carry objects, but tolerate a bare type string
  // (the authoring shorthand) so callers can validate against either form.
  if (typeof def === 'string') return { type: def }
  return def && typeof def === 'object' ? def : { type: undefined }
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
}

function typeName(v) {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  if (v instanceof Date) return 'date'
  return typeof v
}

function fmt(v) {
  if (typeof v === 'string') return `"${v}"`
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

// Coverage guard — see KNOWN_SCALAR_KINDS. Every scalar kind the normalizer can
// emit must be one this checker handles, so the two never drift apart silently.
for (const kind of SCALAR_KINDS) {
  if (!KNOWN_SCALAR_KINDS.has(kind)) {
    throw new Error(
      `conform: scalar kind '${kind}' is in the schema vocabulary but has ` +
        'no conformance predicate. Add a case to isKind() and KNOWN_SCALAR_KINDS.'
    )
  }
}
