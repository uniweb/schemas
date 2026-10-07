/**
 * ⭐ A FOUNDATION SCHEMA IN ITS NORMALIZED FORM — `_self.schemaFormat: 3`.
 *
 * What `register` sends, and what an editor receives for a version registered with it: every
 * component entry written in ONE spelling per meaning, so a reader needs no framework grammar to
 * read it ([Diego, 2026-10-01]: *"we are the only source of truth and logic regarding any
 * shorthands or sugar"*). Format 2 (the build, 2026-09-29) lowered `content`, `children` and the
 * `'md:<tag>'` keys of `data`; this finishes the job:
 *
 *   data      each key one tagged value — `{ kind: 'schema', schema, single, whole }` with the ref
 *             QUALIFIED with the foundation's scope and BOTH flags written, whatever was authored
 *             (`schemaDeclarationOf`), `{ kind: 'fields', fields }` (an inline field map, normalized
 *             as a data schema file is), `{ kind: 'form', … }` (an inline form, its shorthands
 *             expanded), `{ kind: 'concept' }` or `{ kind: 'untyped' }`.
 *             A component that declares no key has no `data`.
 *   params    a select's `options` always `[{ value, label }]`.
 *   content   as format 2 — the lowered list, `[]` for a component that takes no content, absent
 *             for one that declares nothing.
 *
 * ⭐ ABSENCE STAYS MEANINGFUL. Normalizing changes how a meaning is SPELLED, never whether it was
 * declared: an absent `title` still says the component is unnamed, and an absent `content` still
 * says unknown. Nothing is filled from a default.
 *
 * ⭐ `@/x` IS THE FOUNDATION'S OWN SCOPE — whatever scope its name carries (`@acme/marketing` →
 * `@acme/member`), never `@std` and never a site's org [Diego, 2026-09-22]. A ref leaving the CLI
 * is the name its Model was stored under, so `register`, the one step that always knows the
 * scope, passes it here. Without a scope (a dry run) `@/x` stays as written.
 *
 * Pure and browser-safe: an editor holding a version registered before may normalize it here
 * rather than keep a copy of the grammar — a format-1 or format-2 schema comes out format 3.
 *
 * ⭐ TWO USES, TWO MODES. `register` is STRICT, the default: a `data:` value that cannot be
 * normalized throws, so nothing registers half-normalized. A READER passes `strict: false`: an
 * older version was never checked, and may hold an inline field map that is not a valid data
 * schema — read mode normalizes it field by field, keeps a field it cannot normalize as written,
 * and says why in the value's `problems`, never throwing. A registered format-3 schema never
 * carries `problems`.
 *
 * @module @uniweb/schemas/foundation
 */

import { validateAndNormalizeSchema } from './format.js'
import { describeContent, conceptTag } from './content.js'
import { lowerChildren } from './component.js'

/** The form `normalizeFoundationSchema` writes: `_self.schemaFormat`. */
export const FOUNDATION_SCHEMA_FORMAT = 3

/** Every `kind` a format-3 `data:` value can have. */
export const DATA_KINDS = Object.freeze(['schema', 'fields', 'form', 'concept', 'untyped'])

/** The properties a `data:` key typed by a schema takes, written out: `{ schema, single, whole }`. */
const DECLARATION_KEYS = Object.freeze(['schema', 'single', 'whole'])

/**
 * A foundation schema — a built `meta/schema.json`, or a registered one of any format — in format
 * 3. Returns a new object; the input is not changed. Keys beside the entries (`_self`, `_layouts`,
 * `dataSchemas`) keep their places: `_self.data` and each layout's `data` and `params` are
 * normalized as an entry's are, and `dataSchemas` is left as it is.
 *
 * @param {object} schema - the foundation schema
 * @param {object} [options]
 * @param {string} [options.scope] - the foundation's scope (`@acme` or `acme`), which `@/x` refs
 *   resolve into; without one they stay `@/x`
 * @param {boolean} [options.strict=true] - throw for a `data:` value that cannot be normalized
 *   (`register`); `false` to read an older version, which says so in the value's `problems`
 * @returns {object} the schema in format 3
 * @throws {Error} when strict, naming the component and key, for a `data:` value that cannot be
 *   normalized — an inline field map that is not a valid data schema, or a value that is no schema
 */
export function normalizeFoundationSchema(schema, { scope, strict = true } = {}) {
  if (!isPlainObject(schema)) throw new Error('normalizeFoundationSchema: expected a foundation schema object.')
  const format = Number(schema._self?.schemaFormat) || 1
  const out = {}
  for (const [key, value] of Object.entries(schema)) {
    if (key === '_self') out._self = normalizeSelf(value, scope, strict)
    else if (key === '_layouts') out._layouts = mapValues(value, (layout, name) => normalizeEntry(layout, { format, scope, strict, owner: `layout ${name}` }))
    else if (key.startsWith('_') || key === 'dataSchemas') out[key] = value
    else out[key] = isPlainObject(value) ? normalizeEntry(value, { format, scope, strict, owner: key }) : value
  }
  out._self = { ...(isPlainObject(out._self) ? out._self : {}), schemaFormat: FOUNDATION_SCHEMA_FORMAT }
  return out
}

function normalizeSelf(self, scope, strict) {
  if (!isPlainObject(self)) return self
  const out = { ...self }
  const data = normalizeData(self.data, { scope, strict, owner: 'the foundation (main.js)' })
  if (data === undefined) delete out.data
  else out.data = data
  return out
}

/**
 * One component's (or layout's) entry in format 3. A format-1 entry — its `meta.js` as written —
 * is lowered first, as the build lowers one (`content`, `children`).
 */
function normalizeEntry(entry, { format, scope, strict, owner }) {
  if (!isPlainObject(entry)) return entry
  const out = { ...entry }

  if (format < 2) {
    // ⛔ A format-1 entry wrote `content: {}` where nothing was declared, so an empty map there is
    // UNKNOWN — never "takes no content", which only a format-2 build's `[]` says.
    const content = describeContent(entry)
    if (content.elements.length > 0) out.content = content.elements
    else delete out.content
    const children = lowerChildren(entry)
    if (children) out.children = children
    else delete out.children
  }

  const data = normalizeData(entry.data, { scope, strict, owner, concepts: conceptKeys(out.content) })
  if (data === undefined) delete out.data
  else out.data = data

  if (out.params !== undefined) out.params = normalizeParams(out.params)
  return out
}

/**
 * A `data:` map in format 3 — each key one tagged value. `undefined` when it declares no key
 * (`false`, `{}`, absent): a component with no key receives none, however that was spelled.
 *
 * @param {object|false|null|undefined} data - a `data:` value, as written or lowered
 * @param {object} [options]
 * @param {string} [options.scope] - the foundation's scope, for `@/x`
 * @param {Set<string>} [options.concepts] - the keys the entry's `content` declares as concept
 *   blocks, which a format-2 build lowered to `{}`
 * @param {string} [options.owner] - who declares it, for an error
 * @param {boolean} [options.strict=true] - throw for a value that cannot be normalized; `false`
 *   says so in its `problems` instead
 * @returns {object|undefined}
 */
export function normalizeData(data, { scope, concepts, owner = 'a component', strict = true } = {}) {
  if (!isPlainObject(data)) return undefined
  const out = {}
  for (const [key, value] of Object.entries(data)) {
    const tag = conceptTag(key)
    if (tag !== null) {
      // `'md:faq'` — a concept block, read as `faq`. A key declared both ways keeps the bare one,
      // as the build's lowering does (`lowerData`).
      if (tag && !tag.includes(':') && !Object.hasOwn(data, tag)) out[tag] = { kind: 'concept' }
      continue
    }
    out[key] = normalizeDataValue(value, { scope, strict, concept: concepts?.has(key) === true, where: `${owner}: data.${key}` })
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function normalizeDataValue(value, { scope, strict, concept, where }) {
  if (value === null) return { kind: 'untyped' }
  if (typeof value !== 'string' && !isPlainObject(value)) {
    const message = `${where} is not a schema — a ref ('@/x'), an inline field map, a form or {} — got ${JSON.stringify(value)}.`
    if (strict) throw new Error(message)
    return { kind: 'untyped', problems: [message] }
  }

  // Already format 3: normalized again, which changes nothing but an unqualified ref.
  if (isPlainObject(value) && DATA_KINDS.includes(value.kind)) return renormalize(value, { scope, strict, where })

  // A ref, short or long. ⛔ Read mode reads none of a retired spelling either: a `/*` value says
  // why in its `problems` rather than standing for what it once meant.
  let declaration
  try {
    declaration = schemaDeclarationOf(value)
  } catch (err) {
    const message = `${where}: ${err.message}`
    if (strict) throw new Error(message)
    return { kind: 'untyped', problems: [message] }
  }
  if (declaration) return schemaValue(declaration, scope)

  if (isForm(value)) return { kind: 'form', ...normalizeForm(value) }
  if (Object.keys(value).length === 0) return concept ? { kind: 'concept' } : { kind: 'untyped' }

  // An inline field map, or one written as a whole schema (`{ fields: { … } }`): normalized as a
  // data schema file is, so the two are one shape — the docs promise they are interchangeable.
  const fullFormat = isPlainObject(value.fields)
  let normalized
  try {
    normalized = validateAndNormalizeSchema(fullFormat ? value : { fields: value }, '@/inline')
  } catch (err) {
    if (strict) throw new Error(`${where} is an inline field map that is not a valid data schema: ${schemaMessage(err)}`)
    return { kind: 'fields', ...qualifyFieldRefs(fieldByField(fullFormat ? value.fields : value), scope) }
  }
  return { kind: 'fields', ...qualifyFieldRefs(normalized, scope) }
}

/**
 * Read mode: a map that is not a valid data schema, normalized one field at a time — each field
 * the normalizer accepts written out, each it refuses kept as written, and why in `problems`.
 */
function fieldByField(map) {
  const fields = {}
  const problems = []
  for (const [name, spec] of Object.entries(map)) {
    try {
      Object.assign(fields, validateAndNormalizeSchema({ fields: { [name]: spec } }, '@/inline').fields)
    } catch (err) {
      fields[name] = spec
      problems.push(schemaMessage(err))
    }
  }
  return { fields, problems }
}

function schemaMessage(err) {
  return String(err?.message || err).replace(/^Data schema '@\/inline': /, '')
}

function renormalize(value, { scope, strict, where }) {
  switch (value.kind) {
    case 'schema':
      // A version registered before `single` existed held a list: absent is `false`.
      return schemaValue({ schema: String(value.schema ?? ''), single: value.single === true, whole: value.whole === true }, scope)
    case 'fields':
      return { ...qualifyFieldRefs(value, scope), kind: 'fields' }
    case 'form': {
      const { kind: _kind, ...form } = value
      return { kind: 'form', ...normalizeForm(form) }
    }
    case 'concept':
    case 'untyped':
      return Array.isArray(value.problems) ? { kind: value.kind, problems: value.problems } : { kind: value.kind }
    default: {
      const message = `${where} has an unknown kind '${value.kind}'.`
      if (strict) throw new Error(message)
      return { kind: 'untyped', problems: [message] }
    }
  }
}

/** A key typed by a schema in format 3: the ref qualified, both flags written. */
function schemaValue({ schema, single, whole }, scope) {
  return { kind: 'schema', schema: qualifyRef(schema, scope), single: single === true, whole: whole === true }
}

/**
 * ⭐ A `data:` KEY TYPED BY A SCHEMA, as authored — the one reader of the grammar (ruled 2026-10-07
 * [Diego]). Two flags, independent: how many records the key holds, and how much of each.
 *
 *   '@std/article'                                          a list of briefs — the short form
 *   { schema: '@std/article' }                              the same, written out
 *   { schema: '@std/article', single: true }                one record's brief, or null
 *   { schema: '@std/article', whole: true }                 a list of whole records
 *   { schema: '@std/article', single: true, whole: true }   one record, whole
 *
 * The long form is an object whose `schema` is a REF — a string starting with `@`. Any other object
 * is an inline shape (a field map, a form, `{}`), and not this function's: it answers `null`. A field
 * spec is never a bare ref, so a field map with a field named `schema` is not mistaken for one.
 *
 * ⛔ Refused, naming what to write: a `/*` suffix — retired 2026-10-07, `whole: true` says it — a
 * property of the long form other than `schema`, `single` and `whole`, and a flag that is not a
 * boolean. Whether a flag suits its schema — none does on a list schema — is the build's to check,
 * which resolves the schema.
 *
 * @param {*} value - one `data:` entry's value, as authored
 * @returns {{ schema: string, single: boolean, whole: boolean } | null} null when the value is not a ref
 * @throws {Error} for a spelling that is retired or not one of the above
 */
export function schemaDeclarationOf(value) {
  if (typeof value === 'string') {
    refuseWholeSuffix(value)
    return { schema: value, single: false, whole: false }
  }
  if (!isPlainObject(value) || typeof value.schema !== 'string' || !value.schema.startsWith('@')) return null
  refuseWholeSuffix(value.schema)
  const unknown = Object.keys(value).filter((key) => !DECLARATION_KEYS.includes(key))
  if (unknown.length > 0) {
    throw new Error(
      `a key typed by a schema takes \`schema\`, \`single\` and \`whole\` — not ${unknown.map((k) => `\`${k}\``).join(', ')}. ` +
        `\`single: true\` holds one record instead of a list; \`whole: true\` gives each record as stored instead of its brief.`
    )
  }
  for (const flag of ['single', 'whole']) {
    if (value[flag] !== undefined && typeof value[flag] !== 'boolean') {
      throw new Error(`\`${flag}\` is true or false — got ${JSON.stringify(value[flag])}.`)
    }
  }
  return { schema: value.schema, single: value.single === true, whole: value.whole === true }
}

/** `'@std/article/*'` — the whole-record suffix, retired 2026-10-07 [Diego]. */
function refuseWholeSuffix(ref) {
  if (!ref.endsWith('/*')) return
  const schema = ref.slice(0, -2)
  throw new Error(
    `\`/*\` is retired: write { schema: '${schema}', whole: true } for whole records — ` +
      `and single: true as well when the section shows one record.`
  )
}

/**
 * `@/x` in the foundation's scope — `@acme/x` for `@acme` (or `acme`). Any other ref, or no scope,
 * as given.
 *
 * @param {string} ref
 * @param {string} [scope]
 * @returns {string}
 */
export function qualifyRef(ref, scope) {
  const handle = typeof scope === 'string' ? scope.replace(/^@/, '').replace(/\/.*$/, '') : ''
  return typeof ref === 'string' && ref.startsWith('@/') && handle ? `@${handle}/${ref.slice(2)}` : ref
}

/** Every Model a normalized field map names — a `ref` field's `ref`, a picklist's `options` — qualified. */
function qualifyFieldRefs(schema, scope) {
  if (!scope || !isPlainObject(schema)) return schema
  const field = (spec) => {
    if (!isPlainObject(spec)) return spec
    const out = { ...spec }
    if (typeof out.ref === 'string') out.ref = qualifyRef(out.ref, scope)
    if (typeof out.options === 'string') out.options = qualifyRef(out.options, scope)
    if (isPlainObject(out.fields)) out.fields = mapValues(out.fields, field)
    if (out.items !== undefined) out.items = field(out.items)
    if (out.values !== undefined) out.values = field(out.values)
    return out
  }
  return isPlainObject(schema.fields) ? { ...schema, fields: mapValues(schema.fields, field) } : schema
}

/**
 * An inline form — a `fields` LIST, or `isComposite` / `childSchema`. The one test of what makes a
 * `data:` value a form: `@uniweb/core` carried a copy, `isRichSchema`, until 2026-10-05.
 */
function isForm(value) {
  return Array.isArray(value.fields) || value.isComposite === true || isPlainObject(value.childSchema)
}

/**
 * An inline form with its shorthands written out: an option `'news'` is `{ value: 'news', label:
 * 'news' }`, and a condition `{ for: 'scholar' }` is `{ for: { $eq: 'scholar' } }` — in its
 * `fields`, a `nestedObject`'s `fields` and a `childSchema`, all the way down.
 */
function normalizeForm(form) {
  const out = { ...form }
  if (Array.isArray(form.fields)) out.fields = form.fields.map(normalizeFormField)
  if (isPlainObject(form.childSchema)) out.childSchema = normalizeForm(form.childSchema)
  return out
}

function normalizeFormField(field) {
  if (!isPlainObject(field)) return field
  const out = { ...field }
  if (Array.isArray(field.options)) out.options = field.options.map(fullOption)
  if (isPlainObject(field.condition)) out.condition = normalizeCondition(field.condition)
  if (Array.isArray(field.fields)) out.fields = field.fields.map(normalizeFormField)
  if (isPlainObject(field.childSchema)) out.childSchema = normalizeForm(field.childSchema)
  return out
}

/** `{ key: value }` is `$eq` — every key an operator map, each AND'd as before. */
function normalizeCondition(condition) {
  const isOperators = (v) => isPlainObject(v) && Object.keys(v).length > 0 && Object.keys(v).every((k) => k.startsWith('$'))
  return mapValues(condition, (v) => (isOperators(v) ? v : { $eq: v }))
}

/**
 * A component's `params` with each select's `options` written out: `'dark'` is `{ value: 'dark',
 * label: 'dark' }` — the shorthand says the value and the label are one. Everything else as
 * written; a param that is not an object is left as it is.
 *
 * @param {object} params
 * @returns {object}
 */
export function normalizeParams(params) {
  if (!isPlainObject(params)) return params
  return mapValues(params, (spec) =>
    isPlainObject(spec) && Array.isArray(spec.options) ? { ...spec, options: spec.options.map(fullOption) } : spec
  )
}

function fullOption(option) {
  return typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean'
    ? { value: option, label: String(option) }
    : option
}

/** The keys a lowered `content` list declares as concept blocks. */
function conceptKeys(content) {
  const keys = new Set()
  if (Array.isArray(content)) for (const el of content) if (el && el.kind === 'concept' && el.key) keys.add(el.key)
  return keys
}

function mapValues(object, fn) {
  if (!isPlainObject(object)) return object
  const out = {}
  for (const [key, value] of Object.entries(object)) out[key] = fn(value, key)
  return out
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
