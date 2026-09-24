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
 * Scope: ONE RECORD. A `fields`-form schema — the shorthand for a single brief
 * section — checks the record's fields. A `sections`-form schema checks a record
 * in either of the shapes a file can hold it in:
 *
 *   - FLAT — the single sections' fields at the top of the record, brief first
 *     (`flatRecordFields`). A `many` section has no flat form, so it is not checked
 *     there — and that is the whole of what a flat file can say about it.
 *   - WRITTEN BY SECTION — each section under its own key, the shape
 *     docs/reference/entity-content.md gives a sections-form record: a single
 *     section an object, a `many` section a list of records, a binder an object of
 *     its child sections. Checked section by section, child sections included.
 *
 * ⛔ Until 2026-09-24 a `sections`-form schema was not checked at all — "deferred",
 * even one with nothing but a brief — because a flat file was taken to be unable to
 * mirror it. The flat surface was already defined beside it (`flatRecordFields`),
 * and the records a project keeps in files are exactly what a push sends.
 *
 * A schema whose root is a LIST describes an entity whose content is that list. A
 * file holds one such entity written by section — the list under its section's key,
 * `{ items: [...] }` — since a file whose top level is an array holds several
 * records, not one list; it is checked like any other. ⛔ Until 2026-09-24 this
 * returned `[]` for such a schema, and `@uniweb/build` deferred or skipped it.
 *
 * ⚠️ ONE ENTITY, not one element of a list. A VALUE delivered under a key — a data
 * block's array, a query's records — is the bare list: check it whole with
 * `validateBound`. Handing its elements here one at a time would treat each as an
 * entity of the list schema, which finds nothing to check.
 *
 * @param {Object} schema - a normalized data schema (`{ fields }` or `{ sections }`)
 * @param {*} item - the data item to check
 * @returns {Array<{ field: string, rule: string, message: string }>}
 */
export function validateItem(schema, item) {
  if (!schema || typeof schema !== 'object') return []
  if (schema.fields) return validateFields(schema.fields, item, '')
  if (!schema.sections) return []
  return validateSectionedRecord(schema, item, '')
}

// Which shape a sections-form record is written in: BY SECTION when a top-level key
// names one of the schema's sections and is not also one of its flat fields — a
// name may be both, since sections are namespaces, and there the field reading wins.
function writtenBySection(schema, record) {
  const flat = flatRecordFields(schema) || {}
  return Object.keys(schema.sections).some(
    (name) => Object.prototype.hasOwnProperty.call(record, name) && !(name in flat)
  )
}

function validateSectionedRecord(schema, item, prefix) {
  const record = isPlainObject(item) ? item : {}
  if (!writtenBySection(schema, record)) {
    const flat = flatRecordFields(schema)
    return flat ? validateFields(flat, record, prefix) : []
  }
  const out = []
  for (const [name, section] of Object.entries(schema.sections)) {
    out.push(...validateSection(section, record[name], prefix ? `${prefix}.${name}` : name))
  }
  return out
}

// A section's value in a record written by section. An absent single section is an
// empty record — its `required` fields are still owed; an absent list or binder is
// an empty one.
function validateSection(section, value, path) {
  if (section.kind === 'multi') {
    if (value == null) return []
    if (!Array.isArray(value)) {
      return [violation(path, 'type', `expected a list of records, got ${typeName(value)}`)]
    }
    return validateRecords(section, value, path)
  }
  if (value != null && !isPlainObject(value)) {
    const expected = section.kind === 'binder' ? 'an object of sections' : 'a record'
    return [violation(path, 'type', `expected ${expected}, got ${typeName(value)}`)]
  }
  if (section.kind === 'binder') {
    const out = []
    for (const [name, child] of Object.entries(section.sections || {})) {
      out.push(...validateSection(child, value?.[name], `${path}.${name}`))
    }
    return out
  }
  return validateSectionRecord(section, value || {}, path)
}

// One record of a section: its own fields, and each child section under its key —
// "a nested section is an inline field on the parent's records"
// (docs/reference/entity-content.md).
function validateSectionRecord(section, record, path) {
  const out = validateFields(section.fields || {}, record, path)
  for (const [name, child] of Object.entries(section.sections || {})) {
    out.push(...validateSection(child, isPlainObject(record) ? record[name] : undefined, `${path}.${name}`))
  }
  return out
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
 *   root is a RECORD  → the value is one record (`validateItem`)
 *
 * WHY THIS IS NOT `validateItem`. That one takes ONE ENTITY as a file holds it — for
 * a list-rooted schema, the list under its section's key. This takes the VALUE a key
 * receives, which for a list-rooted schema is the bare array. So a caller holding a
 * list of items — a query's records — passes the whole list here, never each element
 * to `validateItem`: that would treat each as an entity of the list schema, which is
 * the opposite of what it says. Two questions, two functions.
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
    return validateRecords(list, value, '')
  }
  return validateItem(schema, value)
}

/**
 * The key a `tree` section's records nest under.
 *
 * A self-nesting section declares no parent/child field — the link is internal to
 * the registry (`parent_item_id`) — so on the authoring side the recursion is a
 * reserved key on each record, and this is it. The convention is stated in
 * `@std/nav`, which is the shape's original user; naming it here rather than
 * inlining the string is what lets the checker walk it.
 */
const TREE_CHILDREN_KEY = 'children'

/**
 * Check a list of records against a section, descending into a `tree` section's
 * children.
 *
 * The descent is the point. `tree: true` says the records nest under each other,
 * and until this existed the checker walked only the top level — so a nav two
 * levels deep had its whole second level unverified, and `tree` bought the wire
 * shape while buying nothing from validation. A finding names its full path
 * (`[1].children[0].label`) because "a label is missing" is unactionable on a
 * menu with thirty entries.
 *
 * Only a `nestable` section recurses. On any other section a `children` key is
 * just an undeclared field, and undeclared fields are ignored — the same
 * tolerance every other record gets.
 */
function validateRecords(section, records, prefix) {
  const out = []
  records.forEach((record, i) => {
    const path = `${prefix}[${i}]`
    out.push(...validateSectionRecord(section, record, path))

    if (!section.nestable || !isPlainObject(record)) return
    const children = record[TREE_CHILDREN_KEY]
    if (children === undefined || children === null) return

    const childPath = `${path}.${TREE_CHILDREN_KEY}`
    if (!Array.isArray(children)) {
      out.push(violation(childPath, 'type', `expected array, got ${typeName(children)}`))
      return
    }
    out.push(...validateRecords(section, children, childPath))
  })
  return out
}

/**
 * Whether ONE ENTITY of a normalized schema can be checked from a file: any schema
 * that declares fields or sections (`validateItem`) — a list-rooted one included,
 * whose entity is written by section.
 *
 * ⛔ Until 2026-09-24 this was `!!schema.fields`, and `@uniweb/build` deferred every
 * sections-form schema on it — "rich", even one holding nothing but a brief. The same
 * day it still answered "no" for a list-rooted schema; there was never a reason to.
 */
export function isStaticallyCheckable(schema) {
  if (!schema || typeof schema !== 'object') return false
  return !!(schema.fields || schema.sections)
}

/**
 * The field names a record's LEAN shape carries — the fields of the section
 * marked `brief: true`.
 *
 * ⭐ A brief is a data schema stating what its own summary is: the card, the row,
 * the thing a list shows. Paired with `flatRecordFields` (everything a flat record
 * can carry) it answers "which fields belong only on the focused record?" without
 * a site listing them by hand per collection, in build config, with nothing
 * checking the list against the shape it describes.
 *
 * `format.js` guarantees at most one brief section and that it is single, so
 * there is nothing to disambiguate here.
 *
 * Returns null — "this schema states no lean shape" — when there is no brief.
 * ⛔ Null is NOT an empty set. An empty set would say the lean shape is nothing,
 * and a caller stripping to it empties every record. A root list (`@std/nav`) is
 * the ordinary case for null, and the right response is to leave records whole.
 *
 * @param {Object} schema - a normalized data schema
 * @returns {Set<string>|null} the brief's field names, or null when none
 */
export function briefFields(schema) {
  if (!schema || typeof schema !== 'object' || !schema.sections) return null
  for (const section of Object.values(schema.sections)) {
    if (!section || section.brief !== true) continue
    const names = Object.keys(section.fields || {})
    return names.length ? new Set(names) : null
  }
  return null
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
 * `recordsToEntities` implements when it turns a site's record files into
 * entities (`@uniweb/build`, `src/uwx/records.js`) — "a record
 * maps to the Model's SINGLE sections in declared order — the brief (the card)
 * plus any sibling single sections". `multi` sections are skipped there as they
 * are here, because both functions describe the same FLAT-RECORD shape: one file
 * whose frontmatter keys are field names.
 *
 * ⛔ TWO CORRECTIONS, because this paragraph carried both and one of them had
 * been relied on:
 *
 * 1. It used to add "with field names unique across a Model's sections". That is
 *    FALSE, and it was never the design: sections are namespaces for groups of
 *    fields, so two of them may declare the same field name. A flat record is
 *    what cannot tell them apart — where a name is
 *    declared in two sections the mapper writes the same value into both, each
 *    encoded per its own field's type. The merge below inherits the ambiguity and
 *    keeps the first occurrence, which is a choice, not a guarantee.
 *
 * 2. It used to say repeating items "cannot be expressed by one flat record".
 *    True of a flat record and misleading as a statement about records, which
 *    need not be flat: a Model whose only section is `many` is a supported shape
 *    whose content is a bare array — see `rootListSection` above, and `@std/nav`.
 *    `flatRecordFields` returns null for exactly those, which is the honest
 *    answer to "what is this schema's flat surface?", not a limitation of theirs.
 *
 * `validateItem` checks a FLAT sections-form record against this surface, and
 * `isStaticallyCheckable` admits every schema a record can be checked against —
 * ⛔ it used to answer "no" for every sections-form schema, deferring them, and
 * this comment called that deliberate (until 2026-09-24).
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

  // date / datetime — the value is the string as written (the build's YAML resolves
  // no timestamps), and it must be one a backend stores: a real `YYYY-MM-DD` day for
  // a date, a day and a time for a datetime. ⛔ Until 2026-09-24 any string passed —
  // `joined: March 2021` included, which a backend refuses ("is not a valid date").
  // A datetime's offset is not required here: which a backend demands is its to say.
  if (typeof value === 'string' && kind === 'date' && !isIsoDate(value)) {
    out.push(violation(path, 'format', `${fmt(value)} is not a date (YYYY-MM-DD)`))
    return out
  }
  if (typeof value === 'string' && kind === 'datetime' && !isIsoDateTime(value)) {
    out.push(violation(path, 'format', `${fmt(value)} is not a date and time (YYYY-MM-DDTHH:MM)`))
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

// A calendar day, `YYYY-MM-DD` — and a real one: `2026-02-30` is not.
function isIsoDate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const day = new Date(Date.UTC(y, mo - 1, d))
  return day.getUTCFullYear() === y && day.getUTCMonth() === mo - 1 && day.getUTCDate() === d
}

// A day and a time: `YYYY-MM-DD` then `T` (or a space) and `HH:MM`, optional seconds,
// fraction and offset.
function isIsoDateTime(v) {
  const m = /^(\d{4}-\d{2}-\d{2})[Tt ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:[Zz]|[+-]\d{2}:?\d{2})?$/.exec(v)
  if (!m || !isIsoDate(m[1])) return false
  return Number(m[2]) < 24 && Number(m[3]) < 60 && (m[4] === undefined || Number(m[4]) < 61)
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
