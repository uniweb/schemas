/**
 * ⭐ A FOUNDATION SCHEMA IN ITS NORMALIZED FORM — `_self.schemaFormat: 3`.
 *
 * What `register` sends, and what an editor receives for a version registered with it: every
 * component entry written in ONE spelling per meaning, so a reader needs no framework grammar to
 * read it ([Diego, 2026-10-01]: *"we are the only source of truth and logic regarding any
 * shorthands or sugar"*). Format 2 (the build, 2026-09-29) lowered `content`, `children` and the
 * `'md:<tag>'` keys of `data`; this finishes the job:
 *
 *   data      each key one tagged value — `{ kind: 'schema', schema, whole }` with the ref
 *             QUALIFIED with the foundation's scope, `{ kind: 'fields', fields }` (an inline field
 *             map, normalized as a data schema file is), `{ kind: 'form', … }` (an inline form,
 *             its shorthands expanded), `{ kind: 'concept' }` or `{ kind: 'untyped' }`. A component
 *             that declares no key has no `data`.
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
 * @module @uniweb/schemas/foundation
 */

import { validateAndNormalizeSchema } from './format.js'
import { describeContent, conceptTag } from './content.js'
import { lowerChildren } from './component.js'

/** The form `normalizeFoundationSchema` writes: `_self.schemaFormat`. */
export const FOUNDATION_SCHEMA_FORMAT = 3

/** Every `kind` a format-3 `data:` value can have. */
export const DATA_KINDS = Object.freeze(['schema', 'fields', 'form', 'concept', 'untyped'])

/** The suffix that asks for whole records: `'@std/article/*'`. */
const WHOLE_SUFFIX = '/*'

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
 * @returns {object} the schema in format 3
 * @throws {Error} naming the component and key, when a `data:` value cannot be normalized — an
 *   inline field map that is not a valid data schema, or a value that is no schema at all
 */
export function normalizeFoundationSchema(schema, { scope } = {}) {
  if (!isPlainObject(schema)) throw new Error('normalizeFoundationSchema: expected a foundation schema object.')
  const format = Number(schema._self?.schemaFormat) || 1
  const out = {}
  for (const [key, value] of Object.entries(schema)) {
    if (key === '_self') out._self = normalizeSelf(value, scope)
    else if (key === '_layouts') out._layouts = mapValues(value, (layout, name) => normalizeEntry(layout, { format, scope, owner: `layout ${name}` }))
    else if (key.startsWith('_') || key === 'dataSchemas') out[key] = value
    else out[key] = isPlainObject(value) ? normalizeEntry(value, { format, scope, owner: key }) : value
  }
  out._self = { ...(isPlainObject(out._self) ? out._self : {}), schemaFormat: FOUNDATION_SCHEMA_FORMAT }
  return out
}

function normalizeSelf(self, scope) {
  if (!isPlainObject(self)) return self
  const out = { ...self }
  const data = normalizeData(self.data, { scope, owner: 'the foundation (main.js)' })
  if (data === undefined) delete out.data
  else out.data = data
  return out
}

/**
 * One component's (or layout's) entry in format 3. A format-1 entry — its `meta.js` as written —
 * is lowered first, as the build lowers one (`content`, `children`).
 */
function normalizeEntry(entry, { format, scope, owner }) {
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

  const data = normalizeData(entry.data, { scope, owner, concepts: conceptKeys(out.content) })
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
 * @returns {object|undefined}
 */
export function normalizeData(data, { scope, concepts, owner = 'a component' } = {}) {
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
    out[key] = normalizeDataValue(value, { scope, concept: concepts?.has(key) === true, where: `${owner}: data.${key}` })
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function normalizeDataValue(value, { scope, concept, where }) {
  if (typeof value === 'string') return schemaValue(value, false, scope)
  if (value === null) return { kind: 'untyped' }
  if (!isPlainObject(value)) {
    throw new Error(`${where} is not a schema — a ref ('@/x'), an inline field map, a form or {} — got ${JSON.stringify(value)}.`)
  }

  // Already format 3: normalized again, which changes nothing but an unqualified ref.
  if (DATA_KINDS.includes(value.kind)) return renormalize(value, { scope, where })

  if (typeof value.schema === 'string') return schemaValue(value.schema, value.whole === true, scope)
  if (isForm(value)) return { kind: 'form', ...normalizeForm(value) }
  if (Object.keys(value).length === 0) return concept ? { kind: 'concept' } : { kind: 'untyped' }

  // An inline field map, or one written as a whole schema (`{ fields: { … } }`): normalized as a
  // data schema file is, so the two are one shape — the docs promise they are interchangeable.
  const fullFormat = isPlainObject(value.fields)
  let normalized
  try {
    normalized = validateAndNormalizeSchema(fullFormat ? value : { fields: value }, '@/inline')
  } catch (err) {
    throw new Error(`${where} is an inline field map that is not a valid data schema: ${err.message.replace(/^Data schema '@\/inline': /, '')}`)
  }
  return { kind: 'fields', ...qualifyFieldRefs(normalized, scope) }
}

function renormalize(value, { scope, where }) {
  switch (value.kind) {
    case 'schema':
      return schemaValue(String(value.schema ?? ''), value.whole === true, scope)
    case 'fields':
      return { ...qualifyFieldRefs(value, scope), kind: 'fields' }
    case 'form': {
      const { kind: _kind, ...form } = value
      return { kind: 'form', ...normalizeForm(form) }
    }
    case 'concept':
    case 'untyped':
      return { kind: value.kind }
    default:
      throw new Error(`${where} has an unknown kind '${value.kind}'.`)
  }
}

/** A named ref as `{ kind: 'schema', schema, whole }` — `'@x/y/*'` asks for whole records. */
function schemaValue(ref, whole, scope) {
  const isWhole = whole || ref.endsWith(WHOLE_SUFFIX)
  const bare = ref.endsWith(WHOLE_SUFFIX) ? ref.slice(0, -WHOLE_SUFFIX.length) : ref
  return { kind: 'schema', schema: qualifyRef(bare, scope), whole: isWhole }
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

/** An inline form — a `fields` LIST, or `isComposite` / `childSchema` — as `isRichSchema` reads one. */
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
