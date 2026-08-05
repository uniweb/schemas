/**
 * The data-schema authoring format — vocabulary, validation, normalization.
 *
 * This is the *language* the schemas in this package are written in. It lives
 * here, in the zero-dependency leaf, for the same reason `@uniweb/core` owns the
 * dynamic-route matcher: it is a contract with more than one consumer, and a
 * second copy is a guaranteed divergence rather than a hypothetical one.
 *
 *   @uniweb/build   resolves refs from disk, then normalizes with this
 *   @uniweb/schemas validates + applies defaults through this
 *   a foundation    authors schema files in this
 *
 * It used to live inside `@uniweb/build`'s `resolve-data-schema.js`, which also
 * does file I/O and ref resolution — so anything that wanted to *understand* a
 * schema had to depend on a package that pulls Vite, esbuild and sharp. This
 * package's own `validate()` therefore grew a second, simplified reader that
 * drifted: it never learned `many:`, `values:`, the `sections:` form, or the
 * canonical kinds, and reported false failures on correct data. Moving the
 * pure part here and re-exporting it from the build is what makes one
 * implementation possible. (Same move, same reason, as the search extraction
 * into `@uniweb/projections`.)
 *
 * THE THREE LANGUAGES. Keep them distinct — they are not interchangeable:
 *
 *   authoring   what a human writes: `many: true`, `number`, `richtext`,
 *               `{ ref: '@/x' }`, `tree: true`, the flat `fields:` form
 *        ↓  normalizeSchema (this file)
 *   IR          what tooling reads: `kind: single|multi|binder`, `array` +
 *               `items`, `type: ref`, `nestable`, canonical scalar kinds
 *        ↓  toDataSchemaDeclaration (@uniweb/build, publish time only)
 *   wire        what the registry ingests: always `sections:`, `multiple: true`,
 *               `entity_ref`, `localized` computed, no `kind`, no `array`
 *
 * This file owns the first arrow only. It performs **normalization and nothing
 * else** — no lowering to any storage model, no I/O, no network.
 */

// Extensions a schema file may use, in resolution order. Declared here (rather
// than in the resolver) because it is a property of the format, and both the
// build's ref resolution and any tooling that discovers schema files need it.
export const SCHEMA_EXTENSIONS = ['.js', '.json', '.yml', '.yaml']

// The authoring type vocabulary. Scalars + structural; aliases fold in below.
// Exported so a conformance checker can speak the same definition of each kind
// that normalization produces — "normalizes" and "conforms" stay in lockstep.
export const SCALAR_KINDS = new Set([
  'string', 'text', 'int', 'decimal', 'bool',
  'date', 'datetime', 'file', 'json',
])
export const STRUCTURAL_KINDS = new Set(['object', 'array', 'ref'])
// Friendly aliases → canonical kind.
//
// Each exists because the canonical kind is a STORAGE word and the alias is what
// the person writing the schema actually means. `decimal`, `int`, `bool` and
// `file` describe how a value is kept; `number`, `integer`, `boolean` and `image`
// describe what it is. Schemas are written in markdown-adjacent YAML by people
// who are not always developers, so who has to understand the word decides which
// word is offered.
//
// `group` → `object` is that same move, and the one the set was missing: a nested
// record is a *group of fields* to anyone who is not thinking about storage.
// `group` + `many: true` reads correctly too — a repeating group.
const TYPE_ALIASES = {
  number: 'decimal',
  integer: 'int',
  boolean: 'bool',
  image: 'file',
  group: 'object',
}
// Friendly type aliases that lower to a base kind + a carried `format` marker.
// `url`/`email` → `string` (server-validated value subtypes). `markdown`/`html` →
// `text` (a file-based rich-content body — round-trips as the raw source string).
const FORMAT_TYPE_ALIASES = {
  url: { type: 'string', format: 'url' },
  email: { type: 'string', format: 'email' },
  markdown: { type: 'text', format: 'markdown' },
  html: { type: 'text', format: 'html' },
  // `richtext` → a ProseMirror rich document (`json` + `format: prosemirror`): the
  // framework's standard way to represent rich text — the structured, lossless form
  // the visual app edits (text, media, tables, code, data blocks, icons, and inline
  // components). Synced to file mode as enhanced markdown via content-writer. Contrast
  // `markdown`/`html`, which are source-string bodies (raw text, no structured editor).
  richtext: { type: 'json', format: 'prosemirror' },
}
// The advertised format-aliasing type words (drives the "Known types" hint).
export const FORMAT_TYPES = new Set(['url', 'email', 'markdown', 'html', 'richtext'])
export const SECTION_KINDS = new Set(['single', 'multi', 'binder'])

/**
 * Every word valid as a `type:` — the canonical kinds plus every alias that folds
 * into one. This is the complete authoring type vocabulary.
 *
 * DERIVED, never hand-listed, and that is the point. It used to exist only as an
 * expression inside the "unknown type" error message, which meant anything else
 * wanting the set — a schema constraining a `type` field, a doc, a tool — had to
 * restate it and would drift the first time a kind was added. Adding a kind above
 * now updates the error hint, this set, and every consumer at once.
 *
 * A schema that describes something schema-SHAPED is the obvious consumer:
 * `@std/form`'s controls carry a `type` drawn from exactly this vocabulary, so it
 * can close that set against this rather than against a copy.
 */
export const AUTHORING_TYPES = new Set([
  ...SCALAR_KINDS,
  ...STRUCTURAL_KINDS,
  ...Object.keys(TYPE_ALIASES),
  ...FORMAT_TYPES,
])

/**
 * Parse a data-schema ref into `{ scope, name }`.
 *   '@/member'       → { scope: '',    name: 'member' }   (self namespace)
 *   '@std/person'    → { scope: 'std', name: 'person' }
 *
 * Shape only — resolving a ref to a file is the build's job (it needs a disk).
 */
export function parseSchemaRef(ref) {
  if (typeof ref !== 'string' || ref[0] !== '@') {
    throw new Error(
      `Invalid data-schema ref ${JSON.stringify(ref)}: must start with '@' ` +
        `(e.g. '@/member' for this foundation, or '@std/person' for a shared standard).`
    )
  }
  const slash = ref.indexOf('/')
  if (slash === -1) {
    throw new Error(`Invalid data-schema ref '${ref}': expected '@<scope>/<name>' (use '@/<name>' for this foundation).`)
  }
  const scope = ref.slice(1, slash) // '' for '@/...'
  const name = ref.slice(slash + 1)
  if (!name || name.includes('/')) {
    throw new Error(`Invalid data-schema ref '${ref}': expected a single '<name>' segment after the namespace.`)
  }
  return { scope, name }
}

/**
 * `tree` / `append_only` on a FIELD — the same flags `normalizeSection` accepts,
 * validated the same way, because a section-shaped field becomes a section.
 *
 * Both describe how a *list of records* behaves, so they need one: a `many: true`
 * field whose items are objects. On anything else — a single object, a list of
 * plain values — they describe nothing, and were previously carried partway and
 * then silently discarded. Rejecting is right here (unlike `constraints` on a
 * leaf, which is well-formed authoring the registry merely has no slot for):
 * `tree: true` on a single object is not a declaration the wire can't take, it is
 * a statement that cannot be true.
 *
 * Rewrites the friendly `tree` to the IR's `nestable`, so the lowering reads the
 * one key `normalizeSection` also emits.
 */
function normalizeSectionFlags(node, ref, path, isRecordList) {
  const flags = [
    ['tree', node.tree !== undefined ? node.tree : node.nestable],
    ['append_only', node.append_only],
  ]
  for (const [name, value] of flags) {
    if (value === undefined) continue
    if (typeof value !== 'boolean') {
      throw new Error(`Data schema '${ref}': field '${path}' '${name}' must be a boolean.`)
    }
    if (value && !isRecordList) {
      throw new Error(
        `Data schema '${ref}': field '${path}' is '${name}: true', which describes a list of records — ` +
          `declare it on a 'many: true' field whose items are objects, or on a 'many: true' section.`
      )
    }
  }
  const tree = node.tree !== undefined ? node.tree : node.nestable
  delete node.tree
  if (tree === true) node.nestable = true
  else delete node.nestable
  if (node.append_only !== true) delete node.append_only
}

/**
 * `label` and `description` are plain strings, at every tier.
 *
 * They are carried inline as the SOURCE-LOCALE string; the other locales live in
 * translation rows. So an inline per-locale object — `label: { en: 'Name' }` — is
 * not a shorthand for anything, it is a different shape, and the registry rejects
 * it. Catching it here means the author sees it at their own screen rather than as
 * a publish failure much later.
 *
 * This is a type check in our OWN format (`label` is documented as a string),
 * which is why it belongs at build time alongside the checks on `many`, `tree`,
 * `enum` and `options` — unlike a rule that merely reflects what the registry has
 * no slot for.
 */
function assertProseStrings(node, ref, path) {
  for (const k of ['label', 'description']) {
    if (node[k] !== undefined && typeof node[k] !== 'string') {
      const got = Array.isArray(node[k]) ? 'a list' : `an ${typeof node[k]}`.replace(/^an ([^aeiou])/, 'a $1')
      throw new Error(
        `Data schema '${ref}': '${k}' on '${path}' must be a plain string, got ${got}. ` +
          `Write the source-locale text inline; translations live in the locales/ folder, ` +
          `not as a per-locale object.`
      )
    }
  }
}

/**
 * Validate a schema definition against the authoring format and return a
 * normalized copy (type aliases folded to canonical kinds). Pure — no I/O.
 * Throws an Error naming the schema + the offending field/section.
 *
 * @param {Object} schema - the schema as authored
 * @param {string} ref - for error messages (e.g. '@/product')
 * @returns {Object} normalized schema
 */
export function validateAndNormalizeSchema(schema, ref) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error(`Data schema '${ref}' did not export a schema object.`)
  }

  const out = {}
  for (const k of ['name', 'version', 'description']) {
    if (schema[k] !== undefined) out[k] = schema[k]
  }

  // The model's sort axis names a DATE FIELD IN THE BRIEF section (not a boolean,
  // not a field-level flag) — the lowering stamps `sort_date: true` on that field.
  // Authored as `sort_date` (the authoring vocabulary is snake_case, like
  // `append_only`); `sortDate` is an accepted alias. Both normalize to `sortDate`,
  // the single key the lowering reads — carrying the two spellings through verbatim
  // meant an authored `sort_date` was silently dropped.
  const sortDate = schema.sort_date ?? schema.sortDate
  if (sortDate !== undefined) {
    if (typeof sortDate !== 'string') {
      throw new Error(
        `Data schema '${ref}': 'sort_date' must name a date field in the brief section, got ${typeof sortDate}.`
      )
    }
    out.sortDate = sortDate
  }

  const hasFields = schema.fields !== undefined
  const hasSections = schema.sections !== undefined
  if (hasFields && hasSections) {
    throw new Error(`Data schema '${ref}': declare either 'fields' (shorthand) or 'sections', not both.`)
  }
  if (!hasFields && !hasSections) {
    throw new Error(`Data schema '${ref}': must declare 'fields' or 'sections'.`)
  }

  if (hasSections) {
    out.sections = normalizeSections(schema.sections, ref)
  } else {
    out.fields = normalizeFields(schema.fields, ref, '')
  }
  return out
}

function normalizeSections(sections, ref) {
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) {
    throw new Error(`Data schema '${ref}': 'sections' must be a map of section name → definition.`)
  }
  const briefState = { count: 0 }
  const out = {}
  for (const [name, section] of Object.entries(sections)) {
    out[name] = normalizeSection(section, ref, `sections.${name}`, briefState)
  }
  return out
}

function normalizeSection(section, ref, path, briefState) {
  if (!section || typeof section !== 'object' || Array.isArray(section)) {
    throw new Error(`Data schema '${ref}': section '${path}' must be an object.`)
  }
  if (section.many !== undefined && typeof section.many !== 'boolean') {
    throw new Error(`Data schema '${ref}': section '${path}' 'many' must be a boolean.`)
  }
  // Cardinality. Friendly sugar: `many: true` → a list of records; a section with
  // only child `sections:` (no `fields:`) is a binder — inferred, never written.
  // Explicit `kind:` is still honored (the lower-level form it normalizes to).
  let kind = section.kind
  if (kind === undefined) {
    if (section.many === true) kind = 'multi'
    else if (section.fields === undefined && section.sections !== undefined) kind = 'binder'
    else kind = 'single'
  }
  if (!SECTION_KINDS.has(kind)) {
    throw new Error(`Data schema '${ref}': section '${path}' has invalid kind '${kind}' (expected single | multi | binder).`)
  }
  const out = { kind }

  // A section carries display prose the same way a field does. Confirmed by the
  // registry (2026-08-05): both are stored on the section, keyed for translation
  // as `section.<name>.label` / `section.<name>.description`. These were dropped
  // here until then, so an authored section `description:` never left the build.
  for (const k of ['label', 'description']) {
    if (section[k] !== undefined) out[k] = section[k]
  }
  assertProseStrings(out, ref, path)

  if (section.brief === true) {
    if (kind !== 'single') {
      throw new Error(`Data schema '${ref}': brief section '${path}' must be a single record (drop 'many').`)
    }
    if (++briefState.count > 1) {
      throw new Error(`Data schema '${ref}': more than one section marked 'brief: true' (at most one).`)
    }
    out.brief = true
  }

  if (kind === 'binder') {
    if (section.fields !== undefined) {
      throw new Error(`Data schema '${ref}': binder section '${path}' carries only child 'sections', not 'fields'.`)
    }
    if (section.sections === undefined) {
      throw new Error(`Data schema '${ref}': binder section '${path}' must declare child 'sections'.`)
    }
  }
  if (section.fields !== undefined) out.fields = normalizeFields(section.fields, ref, path)
  if (section.sections !== undefined) {
    const childBrief = { count: 0 }
    out.sections = {}
    for (const [n, s] of Object.entries(section.sections)) {
      out.sections[n] = normalizeSection(s, ref, `${path}.sections.${n}`, childBrief)
    }
  }
  if (section.constraints !== undefined) {
    if (!Array.isArray(section.constraints)) {
      throw new Error(`Data schema '${ref}': section '${path}' 'constraints' must be a list of rules.`)
    }
    out.constraints = section.constraints
  }

  // `tree: true` (friendly) / `nestable: true` (lower-level) — a list section whose
  // records form a tree among themselves. Carried into the IR so the lowering maps
  // it to the model's `self_nesting`. The parent/child link is internal to the
  // backend (`parent_item_id`); no explicit field expresses it.
  const treeFlag = section.tree ?? section.nestable
  if (treeFlag !== undefined) {
    if (typeof treeFlag !== 'boolean') {
      throw new Error(`Data schema '${ref}': section '${path}' 'tree' must be a boolean.`)
    }
    if (treeFlag && kind !== 'multi') {
      throw new Error(`Data schema '${ref}': section '${path}' is 'tree: true' but not a list — only a 'many: true' section can form a tree.`)
    }
    if (treeFlag) out.nestable = true
  }

  // `append_only` — a multi whose records are insert-only: the backend accepts
  // appends but refuses edits or deletes of existing items, so the section is
  // tamper-evident (activity logs, submissions, audit trails). Carried into the IR
  // verbatim for the submission lowering to emit as the model's `append_only`.
  // Like `nestable`, only a `multi` section can be append-only.
  if (section.append_only !== undefined) {
    if (typeof section.append_only !== 'boolean') {
      throw new Error(`Data schema '${ref}': section '${path}' 'append_only' must be a boolean.`)
    }
    if (section.append_only && kind !== 'multi') {
      throw new Error(`Data schema '${ref}': section '${path}' is 'append_only: true' but not a list — only a 'many: true' section can be append-only.`)
    }
    if (section.append_only) out.append_only = true
  }

  return out
}

function normalizeFields(fields, ref, path) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw new Error(`Data schema '${ref}': 'fields'${path ? ` in '${path}'` : ''} must be a map of field name → definition.`)
  }
  const out = {}
  for (const [name, field] of Object.entries(fields)) {
    out[name] = normalizeField(field, ref, path ? `${path}.${name}` : name)
  }
  return out
}

function normalizeField(field, ref, path) {
  // Shorthand: a bare type string.
  if (typeof field === 'string') field = { type: field }
  if (!field || typeof field !== 'object' || Array.isArray(field)) {
    throw new Error(`Data schema '${ref}': field '${path}' must be an object or a type string.`)
  }

  // Sugar: `many: true` → a list. Wrap the field-minus-`many` as the array's item
  // type (lowers to the canonical `multiple`). The common cases —
  // `{ ref: '@/x', many: true }`, `{ type: string, many: true }` — read as "a list
  // of X" with no `array`/`items` ceremony.
  if (field.many !== undefined) {
    if (typeof field.many !== 'boolean') {
      throw new Error(`Data schema '${ref}': field '${path}' 'many' must be a boolean.`)
    }
    if (field.many) {
      // Collection-level metadata (required, default, label, help, description)
      // rides on the array; the type-bearing attributes describe each item.
      const ITEM_KEYS = new Set(['type', 'ref', 'options', 'enum', 'fields', 'items', 'format'])
      const out = { type: 'array' }
      const item = {}
      for (const [k, v] of Object.entries(field)) {
        if (k === 'many') continue
        if (ITEM_KEYS.has(k)) item[k] = v
        else out[k] = v
      }
      out.items = normalizeField(item, ref, `${path}[]`)
      // A list of records becomes a section, so it accepts the section flags.
      normalizeSectionFlags(out, ref, path, out.items.type === 'object')
      return out
    }
    const { many, ...rest } = field // many: false → a single value
    field = rest
  }
  // Not a list — so `tree` / `append_only` cannot apply. Validate before the
  // carry-through so the author is told, rather than having them vanish.
  normalizeSectionFlags({ ...field }, ref, path, false)

  // Sugar: infer `type` from `ref:`/`options:` when omitted — `{ ref: '@/x' }` is a
  // reference; `{ options: '@/x' }` is a curated picklist value.
  if (field.type === undefined) {
    if (typeof field.ref === 'string') field = { ...field, type: 'ref' }
    else if (typeof field.options === 'string') field = { ...field, type: 'string' }
  }

  const rawType = field.type
  if (typeof rawType !== 'string') {
    throw new Error(`Data schema '${ref}': field '${path}' has no 'type'.`)
  }

  const out = {}
  // Carry-through metadata (render hints / flags / value).
  //
  // `constraints` rides here so a SECTION-SHAPED field (an `object`, or a list of
  // records) can carry the section rules it lowers into — `min_items` on
  // `authors: { type: object, many: true }` is the motivating case, and it was
  // unreachable while only the `sections:` form could declare them. A `many:`
  // field already carried them by accident, because the `many` expansion copies
  // every non-item key onto the array; this makes the non-`many` object case work
  // too, deliberately rather than as a side effect.
  //
  // On a LEAF they are carried and then dropped by the lowering: the wire has no
  // slot for them (`constraints` is a section key), and a leaf narrows with
  // `enum` / `format` instead. Not an error — it is well-formed authoring that
  // only the registry has no home for, and failing a build over it would break a
  // project that never registers at all.
  for (const k of ['required', 'default', 'label', 'help', 'description', 'translatable', 'format', 'constraints']) {
    if (field[k] !== undefined) out[k] = field[k]
  }
  assertProseStrings(out, ref, path)
  if (out.constraints !== undefined && !Array.isArray(out.constraints)) {
    throw new Error(`Data schema '${ref}': field '${path}' 'constraints' must be a list of rules.`)
  }

  // Resolve the type: format-aliases (url/email → string; markdown/html → text;
  // richtext → json) carry a `format` marker; else the plain alias map; else verbatim.
  const formatAlias = FORMAT_TYPE_ALIASES[rawType]
  if (formatAlias) {
    out.type = formatAlias.type
    out.format = field.format ?? formatAlias.format
  } else {
    out.type = TYPE_ALIASES[rawType] ?? rawType
  }

  if (!SCALAR_KINDS.has(out.type) && !STRUCTURAL_KINDS.has(out.type)) {
    throw new Error(
      `Data schema '${ref}': field '${path}' has unknown type '${rawType}'. ` +
        `Known: ${[...AUTHORING_TYPES].sort().join(', ')}.`
    )
  }

  // Content `format` markers are registered per-shape (uwx-format.md §3): the
  // rich-content markers `markdown`/`html` belong on a `text` field; `prosemirror`
  // (a ProseMirror doc) and `scene` (a Scene Composition Format payload — an opaque
  // structured blob the app edits via the Designer / visual canvas) both belong on
  // a `json` field. Catch a mismatch at build time, not at publish (the backend
  // rejects it). Value-validator formats (email/url) are unrestricted here.
  if ((out.format === 'markdown' || out.format === 'html') && out.type !== 'text') {
    throw new Error(
      `Data schema '${ref}': field '${path}' has format '${out.format}', valid only on a 'text' field (got '${out.type}').`
    )
  }
  if ((out.format === 'prosemirror' || out.format === 'scene') && out.type !== 'json') {
    throw new Error(
      `Data schema '${ref}': field '${path}' has format '${out.format}', valid only on a 'json' field (got '${out.type}').`
    )
  }

  // Picklists: enum = inline list; options = a curated '@/x' ref (item_ref).
  if (field.enum !== undefined) {
    if (!Array.isArray(field.enum)) {
      throw new Error(`Data schema '${ref}': field '${path}' 'enum' must be a list of values.`)
    }
    out.enum = field.enum
  }
  if (field.options !== undefined) {
    if (typeof field.options !== 'string' || field.options[0] !== '@') {
      throw new Error(
        `Data schema '${ref}': field '${path}' 'options' must be a '@/<name>' ref to a curated options schema. ` +
          `For an inline list use 'enum:'.`
      )
    }
    parseSchemaRef(field.options) // shape-check the ref
    out.options = field.options
  }

  // Structural kinds.
  if (out.type === 'object') {
    // Two ways to describe an object, and they answer different questions:
    //
    //   fields  the object's KNOWN keys — `{ street, city }`
    //   values  an OPEN MAP whose keys belong to the author and whose values all
    //           conform to one shape — `{ <anything>: <a field spec> }`
    //
    // `values` is to an object what `items` is to an array, and it exists for
    // the same reason: a form's `fields` is a map keyed by author-chosen names
    // (see `@std/form`), which could not be described at all until this landed.
    // Requested by the editor team 2026-07-31 — the shape they needed and could
    // not state in this vocabulary either.
    if (field.values !== undefined && field.fields !== undefined) {
      throw new Error(
        `Data schema '${ref}': object field '${path}' declares both 'fields' and 'values'. ` +
          `Use 'fields' for known keys, 'values' for an open map — not both.`
      )
    }
    if (field.values !== undefined) {
      out.values = normalizeField(field.values, ref, `${path}{}`)
    } else if (field.fields === undefined) {
      throw new Error(
        `Data schema '${ref}': object field '${path}' must declare nested 'fields' (known keys) or 'values' (an open map).`
      )
    } else {
      out.fields = normalizeFields(field.fields, ref, path)
    }
  } else if (out.type === 'array') {
    // `items` (the element type) is recommended but optional — an array with
    // no declared element type is an untyped list.
    if (field.items !== undefined) {
      out.items = normalizeField(field.items, ref, `${path}[]`)
    }
  } else if (out.type === 'ref') {
    if (typeof field.ref !== 'string' || field.ref[0] !== '@') {
      throw new Error(`Data schema '${ref}': ref field '${path}' must name a target schema, e.g. ref: '@/person'.`)
    }
    parseSchemaRef(field.ref)
    out.ref = field.ref
  }

  return out
}

/**
 * Walk a normalized schema and collect every nested `ref`/`options` target —
 * the data schemas this one depends on. Used to close the resolution graph.
 *
 * @param {Object} schema - a normalized schema
 * @returns {string[]} distinct ref strings
 */
export function collectNestedRefs(schema) {
  const found = new Set()
  const walkFields = (fields) => {
    for (const field of Object.values(fields || {})) {
      if (typeof field !== 'object' || !field) continue
      if (typeof field.ref === 'string') found.add(field.ref)
      if (typeof field.options === 'string') found.add(field.options)
      if (field.fields) walkFields(field.fields)
      if (field.items) walkFields({ _: field.items })
      if (field.values) walkFields({ _: field.values })
    }
  }
  const walkSections = (sections) => {
    for (const section of Object.values(sections || {})) {
      if (section?.fields) walkFields(section.fields)
      if (section?.sections) walkSections(section.sections)
    }
  }
  if (schema?.fields) walkFields(schema.fields)
  if (schema?.sections) walkSections(schema.sections)
  return [...found]
}
