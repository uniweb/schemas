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
 *        ↓  validateAndNormalizeSchema (this file)
 *   IR          what tooling reads: `kind: single|multi|binder`, `array` +
 *               `items`, `type: ref`, `nestable`, canonical scalar kinds
 *        ↓  toDataSchemaDeclaration (@uniweb/build — at `uniweb register`, and
 *           at push to shape each record into its sections)
 *   wire        what the registry ingests: always `sections:`, `multiple: true`,
 *               `entity_ref`, `localized` computed, no `kind`, no `array`
 *
 * This file owns the first arrow only. It performs **normalization and nothing
 * else** — no lowering to any storage model, no I/O, no network. (`normalizeSchema`
 * in `./editor-form.js` is a different arrow — a data schema to an editor form —
 * despite the name.)
 */

import { patternRefusal } from './pattern.js'

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
// `url`/`email` → `string` (server-validated value subtypes). `markdown` → `text`
// (a file-based rich-content body — round-trips as the raw source string).
//
// ⛔ There is no `html`. Content is never markup: components decide how content
// renders, and a body of HTML is the one thing a component cannot render without
// running whatever it holds. Rich text is `richtext`; a source body is `markdown`.
// `html` and `format: html` were offered until 2026-10-14, when nothing declared
// them, and are refused by name since (`refuseHtml`).
const FORMAT_TYPE_ALIASES = {
  url: { type: 'string', format: 'url' },
  email: { type: 'string', format: 'email' },
  markdown: { type: 'text', format: 'markdown' },
  // `richtext` → a rich document (`json` + `format: richtext`): the framework's
  // standard way to represent rich text — the structured, lossless form the visual
  // app edits (text, media, tables, code, data blocks, icons, and inline components),
  // held to the rich-text vocabulary (`@uniweb/content-reader/vocabulary`). Synced to
  // file mode as enhanced markdown via content-writer. Contrast `markdown`, a
  // source-string body (raw text, no structured editor). ⛔ The format was
  // `prosemirror` until 2026-10-18 — renamed for what the value is held to, not how it
  // is encoded [Diego] — and is refused by name since (`refuseRetiredFormat`).
  richtext: { type: 'json', format: 'richtext' },
}
// The advertised format-aliasing type words (drives the "Known types" hint).
export const FORMAT_TYPES = new Set(['url', 'email', 'markdown', 'richtext'])

/**
 * ⭐ A FIELD'S RULES — what a registry storing the Model checks on every write, written as the
 * field's own keys, each on the kinds it applies to (2026-10-15). The lowering carries them as
 * they are written (`@uniweb/build`, `uwx/data-schema.js`), and `./conform.js` checks a value
 * against them before it is sent. `max_length` counts characters, and for a translatable value
 * each language's on its own; `max_size` is in bytes; `mime_types` lists what a file may be
 * (`image/*`, `application/pdf`); `pattern` is a regular expression the whole value matches, in
 * the syntax a registry reads (`./pattern.js`).
 */
export const FIELD_RULES = Object.freeze({
  max_length: ['string', 'text'],
  min: ['int', 'decimal'],
  max: ['int', 'decimal'],
  mime_types: ['file'],
  max_size: ['file'],
  pattern: ['string'],
})

/**
 * The `format`s each kind takes — closed, because a registry refuses a whole schema for a format
 * its kind does not take (2026-10-15). A kind not listed takes none. On a `date`, the format is
 * its precision: `year-month` holds `2024-05`, `year` holds `2024`, and none holds a day.
 * `markdown`, `richtext`, `scene` and `icon` say what the value is; `email`, `url` and `currency`
 * (an ISO 4217 code) are checked against it. `icon` holds a framework icon name (`ICON_NAME`,
 * below) — `lu-flame` — which a registry keeps as written, so no value is refused for it
 * (2026-10-22).
 */
export const FIELD_FORMATS = Object.freeze({
  string: ['email', 'url', 'currency', 'icon'],
  text: ['email', 'url', 'markdown'],
  date: ['year-month', 'year'],
  json: ['richtext', 'scene'],
})

/**
 * ⭐ EVERY KEY A FIELD MAY DECLARE — what `normalizeField` reads. Any other key is refused by name
 * (2026-10-15). ⛔ Until then one was dropped here without a word, before any reader could see it,
 * so a rule an author wrote — `maxLength`, `pattern` — reached neither a registry nor an editor,
 * and nothing said so.
 *
 * ⚖️ Model-level keys WARN instead (`warnUnknownModelKeys`), so a schema written against a newer
 * registry still builds. A field rule is the opposite case: a registry would accept every write
 * the dropped rule should refuse, so building on is the failure, not the courtesy.
 */
const FIELD_KEYS = new Set([
  'type', 'label', 'description', 'help', 'required', 'translatable', 'default', 'many',
  'enum', 'format', 'constraints', 'ref', 'options', 'readable_with', 'sold_with',
  'fields', 'items', 'values', 'tree', 'nestable', 'append_only',
  ...Object.keys(FIELD_RULES),
])

/** Keys a data schema spells another way, or does not take — each with what to write instead. */
const REFUSED_FIELD_KEYS = {
  localized: "write `translatable` — text is translatable by default, and `translatable: false` keeps one value for every language",
  multiple: 'write `many: true`',
  model: "write `ref:` naming the Model ('@/person')",
  min_length: 'a registry does not check a minimum length yet',
  languages: 'a data schema cannot require languages of a value',
  precision: 'a data schema cannot declare a decimal\'s precision',
  scale: 'a data schema cannot declare a decimal\'s scale',
  compact: 'a data schema cannot declare it',
}

function refuseUnknownFieldKeys(field, ref, path) {
  for (const key of Object.keys(field)) {
    if (FIELD_KEYS.has(key)) continue
    const known = REFUSED_FIELD_KEYS[key]
    if (known) {
      throw new Error(`Data schema '${ref}': field '${path}' declares '${key}', which a data schema does not take — ${known}.`)
    }
    const snake = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
    const hint = snake !== key && (FIELD_KEYS.has(snake) || REFUSED_FIELD_KEYS[snake]) ? ` Did you mean '${snake}'?` : ''
    throw new Error(
      `Data schema '${ref}': field '${path}' declares '${key}', which is not a field key.${hint} ` +
        `A field takes: ${[...FIELD_KEYS].join(', ')}. How a field is edited — a widget, a placeholder — is the component's.`
    )
  }
}

// A rule's value, checked: a whole number above zero for a length or a size, a number for a
// bound (a whole one on an `int`), a list of media types for `mime_types`.
function ruleValue(key, value, kind, ref, path) {
  const fail = (what) => {
    throw new Error(`Data schema '${ref}': field '${path}' '${key}' must be ${what}, got ${JSON.stringify(value)}.`)
  }
  if (key === 'max_length' || key === 'max_size') {
    if (!Number.isInteger(value) || value < 1) fail('a whole number above zero')
  } else if (key === 'min' || key === 'max') {
    if (typeof value !== 'number' || !Number.isFinite(value)) fail('a number')
    if (kind === 'int' && !Number.isInteger(value)) fail('a whole number on an int')
  } else if (key === 'mime_types') {
    if (!Array.isArray(value) || !value.length || !value.every((t) => typeof t === 'string' && /^[\w.+-]+\/(\*|[\w.+-]+)$/.test(t))) {
      fail("a list of media types, like ['image/*', 'application/pdf']")
    }
  } else if (key === 'pattern') {
    if (typeof value !== 'string') fail('a regular expression, written as text')
    const why = patternRefusal(value)
    if (why) throw new Error(`Data schema '${ref}': field '${path}' 'pattern' ${JSON.stringify(value)} ${why}.`)
  }
  return value
}

// The registry's kinds that are NOT authoring types, each with what a data schema writes instead.
// A registered definition spells a picklist `type: item_ref` and a reference `type: entity_ref`;
// an author copying one is refused by name and told the spelling, rather than told the type is
// unknown (2026-10-15 — `@uniweb/api`'s README had taught the registry's spelling).
const REGISTRY_KINDS = {
  item_ref: "`options:` naming the section whose items are the choices ('@/lists/countries') — the type follows from it",
  entity_ref: "`ref:` naming the Model ('@/person') — the type follows from it",
  section: '`type: object` for one record, or `type: object` with `many: true` for a list of records',
}

/**
 * `readable_with` — a reference that opens its entry, for `read`, to whoever holds that
 * level (`read`, `edit` or `admin`) on the entry it points to: a submission's `course`
 * declaring `edit` is read by the course's staff, and by none of its students. Only a
 * reference can declare it — a `ref` field, or a list of them (2026-10-14 [Diego]: "I
 * think data schemas should be able to set it").
 */
const READABLE_WITH = new Set(['read', 'edit', 'admin'])

function readableWith(value, isReference, ref, path) {
  if (value === undefined) return undefined
  if (!isReference) {
    throw new Error(
      `Data schema '${ref}': field '${path}' declares 'readable_with', which only a reference can — ` +
        `a 'ref' field, or a list of them. It opens the entry to whoever holds that level on the entry it points to.`
    )
  }
  if (!READABLE_WITH.has(value)) {
    throw new Error(
      `Data schema '${ref}': field '${path}' 'readable_with' must be read, edit or admin, got ${JSON.stringify(value)}.`
    )
  }
  return value
}

/**
 * `sold_with` — a reference a purchase travels along: a buyer of the entry can read what the
 * field names, through it, and onward along that entry's own `sold_with` fields. A boolean, and
 * only a reference can declare it — a `ref` field, or a list of them, each element its own link
 * (2026-10-21, backend's purchase reach). `false` says what leaving it out says, so it is dropped.
 */
function soldWith(value, isReference, ref, path) {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    throw new Error(`Data schema '${ref}': field '${path}' 'sold_with' must be a boolean, got ${JSON.stringify(value)}.`)
  }
  if (!isReference) {
    throw new Error(
      `Data schema '${ref}': field '${path}' declares 'sold_with', which only a reference can — ` +
        `a 'ref' field, or a list of them. It carries a purchase of the entry to the entry it points to.`
    )
  }
  return value || undefined
}

/** `html` and `format: html` are refused by name — see FORMAT_TYPE_ALIASES. */
function refuseHtml(field, ref, path) {
  if (field.type === 'html' || field.format === 'html') {
    throw new Error(
      `Data schema '${ref}': field '${path}' is HTML, which a data schema cannot declare — ` +
        `content is never markup, and a component decides how it renders. ` +
        `Use \`richtext\` for rich text, or \`markdown\` for a source body.`
    )
  }
}

/** `format: prosemirror` is refused by name — renamed `richtext`, see FORMAT_TYPE_ALIASES. */
function refuseRetiredFormat(field, ref, path) {
  if (field.format === 'prosemirror') {
    throw new Error(
      `Data schema '${ref}': field '${path}' has format 'prosemirror', which is now 'richtext' — ` +
        `write \`type: richtext\`, or \`type: json\` with \`format: richtext\`.`
    )
  }
}
export const SECTION_KINDS = new Set(['single', 'multi', 'binder'])

/**
 * Every key a Model may carry beside its content. Used only to WARN, never to
 * refuse — see `warnUnknownModelKeys`.
 */
const MODEL_KEYS = new Set([
  'name', 'version', 'label', 'plural', 'icon', 'description', 'source_locale', 'sourceLocale',
  'linkable', 'grantable', 'sort_date', 'sortDate',
  'fields', 'sections', 'constraints', 'i18n'
])

/**
 * A language tag, as a key of `i18n`: `fr`, `pt-BR`, `zh-Hant`. The shape a language takes
 * everywhere else in this framework; a registry is the authority on which it accepts.
 */
const LANGUAGE_TAG = /^[A-Za-z]+(?:[-_][A-Za-z0-9]+)*$/

/**
 * A label's path, as a key of one language in `i18n`: `model.label`, `model.plural`,
 * `model.description`; `section.<path>.label` or `.description`; and
 * `section.<path>.field.<key>.label` or `.description`. Whether the path names a section and
 * a field of this schema is checked where the sections get their names (`@uniweb/build`).
 */
const LABEL_PATH = /^(?:model\.(?:label|plural|description)|section\..+\.(?:label|description))$/

/**
 * A framework icon name — `family-name`: `lu-user` is the icon `user` of the family `lu`.
 * The family is a short code with no hyphen (`lu`, `hi2`, `fa6`); the name is kebab-case
 * and may hold hyphens of its own (`lu-calendar-days`), so the first hyphen is the split.
 * The spelling `![](lu-house)` uses in content, and the one `@uniweb/core/icon-corpus`
 * resolves (`{family}/{family}-{name}.svg`).
 */
const ICON_NAME = /^[a-z][a-z0-9]*-[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Warn about a model-level key nothing will carry.
 *
 * ⚖️ WHY WARN HERE WHEN THE QUERY DECL DELIBERATELY DOES NOT. `queriesNested` in
 * `@uniweb/build` forwards keys it does not recognise, and argues — correctly —
 * that framework cannot tell a valid Model field from a typo, so only the server
 * should judge. **That reasoning does not reach this tier, and the difference is
 * structural rather than a matter of taste:**
 *
 *   - a decl's fields are a PASSTHROUGH — an unknown key can be forwarded intact,
 *     so silence costs nothing and refusing would cry wolf on every new field;
 *   - a model's keys are LOWERED — each one is read by name and written into a
 *     specific slot of the declaration. An unknown key cannot be forwarded,
 *     because there is nowhere to forward it TO.
 *
 * ⇒ Here, silence is a guaranteed loss rather than a possible one. It stays a
 * warning and not an error so a schema written against a newer registry still
 * builds — it simply says what will not survive.
 */
function warnUnknownModelKeys(schema, ref) {
  const unknown = Object.keys(schema).filter((k) => !MODEL_KEYS.has(k))
  if (unknown.length === 0) return
  console.warn(
    `Data schema '${ref}': ${unknown.map((k) => `'${k}'`).join(', ')} ` +
      `${unknown.length === 1 ? 'is not a model-level key and will not be carried' : 'are not model-level keys and will not be carried'}. ` +
      `Known: ${[...MODEL_KEYS].filter((k) => !/[A-Z]/.test(k)).join(', ')}.`
  )
}

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
 * Parse a picklist's `options:` — the SECTION of a Model whose items are the field's choices,
 * written as the Model's ref and then the section's path in it:
 *
 *   '@/country'                           → { model: '@/country',   path: null }
 *   '@/lists/countries'                   → { model: '@/lists',     path: 'countries' }
 *   '@acme/lists/countries/subdivisions'  → { model: '@acme/lists', path: 'countries/subdivisions' }
 *
 * A nested section is named by its path from the top, as a write names it. A Model whose top
 * holds ONE list may be named alone (`path: null`), and that list is the one meant; the build
 * refuses the short form for a Model with several (`@uniweb/build`, `optionsSectionPath`).
 * ⛔ Until 2026-10-15 `options:` took a Model alone and the build chose its first list, so a
 * second list could not be named at all.
 *
 * Shape only, like `parseSchemaRef`: whether the Model has the section is the build's to say.
 *
 * @param {string} ref
 * @returns {{ model: string, path: string|null }}
 */
export function parseOptionsRef(ref) {
  if (typeof ref !== 'string' || ref[0] !== '@') {
    throw new Error(
      `Invalid options ref ${JSON.stringify(ref)}: must start with '@' — the Model whose section holds ` +
        `the choices, then the section (e.g. '@/lists/countries').`
    )
  }
  const [namespace, name, ...path] = ref.split('/')
  parseSchemaRef(name === undefined ? ref : `${namespace}/${name}`)
  if (path.some((segment) => !segment || segment.startsWith('$'))) {
    throw new Error(
      `Invalid options ref '${ref}': after the Model comes the section's path — section names ` +
        `joined by '/' (e.g. '@/lists/countries/subdivisions').`
    )
  }
  return { model: `${namespace}/${name}`, path: path.length ? path.join('/') : null }
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
 * `label` and `description` are plain strings, at every tier — and a Model's
 * `plural`, which exists only at the model tier.
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
function assertProseStrings(node, ref, path, keys = ['label', 'description']) {
  for (const k of keys) {
    if (node[k] !== undefined && typeof node[k] !== 'string') {
      const got = Array.isArray(node[k]) ? 'a list' : `an ${typeof node[k]}`.replace(/^an ([^aeiou])/, 'a $1')
      throw new Error(
        `Data schema '${ref}': '${k}' on '${path}' must be a plain string, got ${got}. ` +
          `Write it once, in the schema's source locale — not as a per-locale object.`
      )
    }
  }
}

/**
 * A schema's `i18n`, checked for shape and copied: each key a language tag other than the
 * schema's source locale, each holding a map of label paths (`LABEL_PATH`) to strings.
 */
function normalizeI18n(i18n, ref, sourceLocale) {
  const isMap = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
  if (!isMap(i18n)) {
    throw new Error(
      `Data schema '${ref}': 'i18n' must be a map of language → labels, like ` +
        `{ fr: { 'model.label': 'Chercheur' } }.`
    )
  }
  const out = {}
  for (const [language, labels] of Object.entries(i18n)) {
    if (!LANGUAGE_TAG.test(language)) {
      throw new Error(`Data schema '${ref}': i18n '${language}' is not a language — a tag like 'fr' or 'pt-BR'.`)
    }
    if (sourceLocale && language === sourceLocale) {
      throw new Error(
        `Data schema '${ref}': i18n '${language}' is the schema's source locale — its labels in ` +
          `'${language}' are the ones written inline.`
      )
    }
    if (!isMap(labels)) {
      throw new Error(`Data schema '${ref}': i18n '${language}' must be a map of label path → text.`)
    }
    for (const [path, text] of Object.entries(labels)) {
      if (!LABEL_PATH.test(path)) {
        throw new Error(
          `Data schema '${ref}': i18n '${language}': '${path}' is not a label path — write ` +
            `model.label, section.<path>.label or section.<path>.field.<key>.label ` +
            `(each also with .description, and model.plural).`
        )
      }
      if (typeof text !== 'string') {
        throw new Error(`Data schema '${ref}': i18n '${language}': '${path}' must be a string, got ${typeof text}.`)
      }
    }
    out[language] = { ...labels }
  }
  return out
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

  assertProseStrings(schema, ref, 'the model', ['label', 'plural', 'description'])

  // `plural` — the Model's name for many of its entries (`label: Person`,
  // `plural: People`). Carried like `label` since 2026-09-30 [Diego]; until then it
  // was warned about and dropped.
  const out = {}
  for (const k of ['name', 'version', 'description', 'label', 'plural']) {
    if (schema[k] !== undefined) out[k] = schema[k]
  }

  // `icon` — the Model's icon, a framework icon name (`ICON_NAME`), never an uploaded
  // image. One value for every language: the registry stores it as written, and a
  // consumer resolves it under its icon base. Carried since 2026-10-05 [Diego]; until then
  // it was warned about and dropped.
  if (schema.icon !== undefined) {
    if (typeof schema.icon !== 'string' || !ICON_NAME.test(schema.icon)) {
      throw new Error(
        `Data schema '${ref}': 'icon' must be a framework icon name written family-name, like 'lu-user' ` +
          `(the icon 'user' of the family 'lu'), got ${JSON.stringify(schema.icon)}.`
      )
    }
    out.icon = schema.icon
  }

  // ⛔ THE MODEL-LEVEL KEYS WERE A SILENT DROP, MEASURED 2026-09-01. This
  // allowlist held `name`/`version`/`description` and nothing else, so `label`,
  // `source_locale` and `linkable` were discarded here with **no error**. An author
  // wrote them, saw nothing, and shipped a Model that did not carry them.
  const sourceLocale = schema.source_locale ?? schema.sourceLocale
  if (sourceLocale !== undefined) {
    if (typeof sourceLocale !== 'string' || !sourceLocale) {
      throw new Error(
        `Data schema '${ref}': 'source_locale' must be a locale code like 'en', got ${typeof sourceLocale}.`
      )
    }
    out.sourceLocale = sourceLocale
  }

  // `linkable` — `false` keeps this Model's entries out of references and out of a
  // site's folder. Omitted, it is true, with or without a brief (2026-09-27 [Diego]);
  // the producer sends only an authored `false`.
  // ⛔ This said the producer reconciled it against whether a brief exists until
  // 2026-09-30 — true only before 2026-09-27, when that derivation was removed.
  if (schema.linkable !== undefined) {
    if (typeof schema.linkable !== 'boolean') {
      throw new Error(
        `Data schema '${ref}': 'linkable' must be a boolean, got ${typeof schema.linkable}.`
      )
    }
    out.linkable = schema.linkable
  }

  // `grantable` — `false` keeps this Model's entries from being shared one at a time: a
  // grant of read, edit or admin on one entry, to an account or a team. Omitted, it is
  // true; the producer sends only an authored `false` (2026-10-14 [Diego]: "They default
  // to true but if they don't want it to be grantable, why not let them").
  if (schema.grantable !== undefined) {
    if (typeof schema.grantable !== 'boolean') {
      throw new Error(
        `Data schema '${ref}': 'grantable' must be a boolean, got ${typeof schema.grantable}.`
      )
    }
    out.grantable = schema.grantable
  }

  // `i18n` — the schema's labels in other languages, each language a map of a label's path to
  // its text: `{ fr: { 'model.label': 'Chercheur', 'section.brief.field.name.label': 'Nom' } }`.
  // A section is named by its full `/`-path from the root, and a `fields:` schema's one section
  // is `brief`. The schema's own labels stay inline, in its source locale, so that language is
  // refused here. It is carried whole: a register sends the whole set every time, and a language
  // taken out of it goes. Since 2026-10-28.
  if (schema.i18n !== undefined) out.i18n = normalizeI18n(schema.i18n, ref, sourceLocale)

  // ⛔ `creatable_by` is RETIRED (2026-09-23): Models are open. Anyone signed in may
  // create entries of any Model; who may see or edit an entry is decided by the
  // entry, never by who may create one. Refused by name rather than dropped, so a
  // restriction an author believes they declared is not silently absent.
  if (schema.creatable_by !== undefined || schema.creatableBy !== undefined) {
    throw new Error(
      `Data schema '${ref}': 'creatable_by' is retired — Models are open: anyone signed in may create entries of any Model, and who may see or edit an entry is decided by the entry. Remove the key.`
    )
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

  // A `fields:` schema's section rules — `exclusive`, `required_one_of`, `required_when`, … — sit
  // beside its fields, for its one section (2026-10-15). Until then it had nowhere to write them:
  // the key was warned about and dropped, and a field's own `constraints:` were dropped silently.
  // A `sections:` schema declares them on the section they rule.
  if (schema.constraints !== undefined) {
    if (hasSections) {
      throw new Error(
        `Data schema '${ref}': 'constraints' beside 'sections' rules no section — declare them on the section they rule.`
      )
    }
    if (!Array.isArray(schema.constraints)) {
      throw new Error(`Data schema '${ref}': 'constraints' must be a list of rules.`)
    }
    out.constraints = schema.constraints
  }

  warnUnknownModelKeys(schema, ref)

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
    refuseSystemName(name, ref, 'section', `sections.${name}`)
    out[name] = normalizeSection(section, ref, `sections.${name}`, briefState)
  }
  return out
}

/**
 * ⛔ A `$` NAME IS THE SYSTEM'S (ruled 2026-09-27 [Diego]) — `$uuid`, `$name` and `$tags` sit beside
 * a record's sections, and a brief's fields beside them, so no field or section may start with `$`,
 * at any level. A records service refuses such a schema when it is registered; this refuses it where
 * it is written.
 */
function refuseSystemName(name, ref, kind, path) {
  if (typeof name === 'string' && name.startsWith('$')) {
    throw new Error(
      `Data schema '${ref}': ${kind} '${path}' starts with '$' — a '$' name is the system's ('$uuid', '$name', '$tags'). Rename the ${kind}.`
    )
  }
}

function normalizeSection(section, ref, path, briefState, underList = false) {
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

  // `brief` — the section an entry's card is made of: `true` marks it, at any depth but under
  // a list, and `false` keeps a section from being taken for it when none is marked (the first
  // top-level single one is). At most one in the whole schema. ⛔ Until 2026-10-29 `false` was
  // dropped here and the count ran per level, so a brief marked inside a group and the first
  // top-level section, taken for one beside it, both reached a register, which refuses two.
  if (section.brief !== undefined && typeof section.brief !== 'boolean') {
    throw new Error(`Data schema '${ref}': section '${path}' 'brief' must be true or false.`)
  }
  if (section.brief === true) {
    if (kind !== 'single') {
      throw new Error(`Data schema '${ref}': brief section '${path}' must be a single record (drop 'many').`)
    }
    if (underList) {
      throw new Error(
        `Data schema '${ref}': brief section '${path}' sits under a list — an entry has one brief, ` +
          `and a section under a list holds one record for each of the list's.`
      )
    }
    if (++briefState.count > 1) {
      throw new Error(`Data schema '${ref}': more than one section marked 'brief: true' (at most one).`)
    }
    out.brief = true
  } else if (section.brief === false) {
    out.brief = false
  }

  if (kind === 'binder') {
    if (section.fields !== undefined) {
      throw new Error(`Data schema '${ref}': binder section '${path}' carries only child 'sections', not 'fields'.`)
    }
    if (section.sections === undefined) {
      throw new Error(`Data schema '${ref}': binder section '${path}' must declare child 'sections'.`)
    }
  }
  // `fields` and `sections` enter the IR in the order the author wrote them, so the lowering can
  // list a section's child sections where they were written: before its fields or after them. A
  // registry lists a definition's sections in the declared order. ⛔ Until 2026-10-28 `fields`
  // always came first here, and the lowering put every child section after the fields.
  for (const key of Object.keys(section)) {
    if (key === 'fields' && section.fields !== undefined) {
      out.fields = normalizeFields(section.fields, ref, path)
    } else if (key === 'sections' && section.sections !== undefined) {
      out.sections = {}
      for (const [n, s] of Object.entries(section.sections)) {
        refuseSystemName(n, ref, 'section', `${path}.sections.${n}`)
        out.sections[n] = normalizeSection(s, ref, `${path}.sections.${n}`, briefState, underList || kind === 'multi')
      }
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
    refuseSystemName(name, ref, 'field', path ? `${path}.${name}` : name)
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
  refuseUnknownFieldKeys(field, ref, path)

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
      // rides on the array; the type-bearing attributes describe each item — a value's
      // rules among them, since each value is checked against them.
      const ITEM_KEYS = new Set(['type', 'ref', 'options', 'enum', 'fields', 'items', 'format', ...Object.keys(FIELD_RULES)])
      const out = { type: 'array' }
      const item = {}
      for (const [k, v] of Object.entries(field)) {
        if (k === 'many') continue
        if (ITEM_KEYS.has(k)) item[k] = v
        else out[k] = v
      }
      out.items = normalizeField(item, ref, `${path}[]`)
      if (out.readable_with !== undefined) {
        out.readable_with = readableWith(out.readable_with, out.items.type === 'ref', ref, path)
      }
      if (out.sold_with !== undefined) {
        const carries = soldWith(out.sold_with, out.items.type === 'ref', ref, path)
        if (carries) out.sold_with = true
        else delete out.sold_with
      }
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
  refuseHtml(field, ref, path)
  refuseRetiredFormat(field, ref, path)
  if (REGISTRY_KINDS[rawType]) {
    throw new Error(
      `Data schema '${ref}': field '${path}' has type '${rawType}', the registry's word for it, not a ` +
        `data schema's — write ${REGISTRY_KINDS[rawType]}.`
    )
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
  // On a LEAF a registry has no slot for them (`constraints` is a section key), and
  // nothing else reads them: a NAMED schema refuses them, pointing at its section's
  // `constraints:` (`@uniweb/build`, `resolve-data-schema.js`, since 2026-10-15 — they
  // were dropped by the lowering without a word until then). A component's inline field
  // map keeps them, as it keeps `default` and `help`, for an editor to read.
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
  // rich-content marker `markdown` belongs on a `text` field; `richtext`
  // (a rich document) and `scene` (a Scene Composition Format payload — an opaque
  // structured blob the app edits via the Designer / visual canvas) both belong on
  // a `json` field. Catch a mismatch at build time, not at publish (the backend
  // rejects it).
  if (out.format === 'markdown' && out.type !== 'text') {
    throw new Error(
      `Data schema '${ref}': field '${path}' has format '${out.format}', valid only on a 'text' field (got '${out.type}').`
    )
  }
  const opensWith = readableWith(field.readable_with, out.type === 'ref', ref, path)
  if (opensWith) out.readable_with = opensWith
  if (soldWith(field.sold_with, out.type === 'ref', ref, path)) out.sold_with = true

  if ((out.format === 'richtext' || out.format === 'scene') && out.type !== 'json') {
    throw new Error(
      `Data schema '${ref}': field '${path}' has format '${out.format}', valid only on a 'json' field (got '${out.type}').`
    )
  }
  // Every other format, per kind (`FIELD_FORMATS`) — a registry refuses the whole schema for one
  // its kind does not take. ⛔ Until 2026-10-15 a value-validator format passed on any kind, and a
  // date's precision (`year-month`, `year`) was not known here.
  if (out.format !== undefined) {
    const takes = FIELD_FORMATS[out.type] || []
    if (!takes.includes(out.format)) {
      throw new Error(
        `Data schema '${ref}': field '${path}' has format ${JSON.stringify(out.format)}, which a '${out.type}' ` +
          `field does not take — ${takes.length ? `it takes ${takes.join(', ')}` : 'it takes none'}.`
      )
    }
  }

  // A field's rules (`FIELD_RULES`), each on the kinds it applies to.
  for (const [key, kinds] of Object.entries(FIELD_RULES)) {
    if (field[key] === undefined) continue
    if (!kinds.includes(out.type) || field.options !== undefined) {
      throw new Error(
        `Data schema '${ref}': field '${path}' declares '${key}', which applies to ${kinds.join(' and ')} values` +
          `${field.options !== undefined ? ' — a field that picks from a list holds a choice from it' : `, not ${out.type}`}.`
      )
    }
    out[key] = ruleValue(key, field[key], out.type, ref, path)
  }
  if (out.min !== undefined && out.max !== undefined && out.min > out.max) {
    throw new Error(`Data schema '${ref}': field '${path}' has 'min' ${out.min} above 'max' ${out.max}.`)
  }

  // Picklists: enum = inline list; options = a curated '@/x' ref (item_ref). An entry is a value, or
  // `{ value, label }` where the label is what an editor shows — `enumValues` reads either.
  if (field.enum !== undefined) {
    if (!Array.isArray(field.enum)) {
      throw new Error(`Data schema '${ref}': field '${path}' 'enum' must be a list of values.`)
    }
    if (out.type === 'ref' || out.type === 'object') {
      throw new Error(
        `Data schema '${ref}': field '${path}' declares 'enum' on ${out.type === 'ref' ? 'a reference' : 'an object'}, ` +
          `which holds no value of its own to check — an enum belongs on a value.`
      )
    }
    out.enum = field.enum
  }
  if (field.options !== undefined) {
    for (const k of ['enum', 'format']) {
      if (field[k] !== undefined) {
        throw new Error(
          `Data schema '${ref}': field '${path}' picks from a list ('options:'), so '${k}' does not apply — ` +
            `its value is a choice from that list.`
        )
      }
    }
    if (typeof field.options !== 'string' || field.options[0] !== '@') {
      throw new Error(
        `Data schema '${ref}': field '${path}' 'options' must name the section whose items are the ` +
          `choices — '@/<name>/<section>', or '@/<name>' for a Model with one list. For an inline list use 'enum:'.`
      )
    }
    try {
      parseOptionsRef(field.options) // shape-check: a Model, then a section path
    } catch (err) {
      throw new Error(`Data schema '${ref}': field '${path}' 'options': ${err.message}`)
    }
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
      // A picklist names a section of a Model; the Model is the dependency.
      if (typeof field.options === 'string') found.add(parseOptionsRef(field.options).model)
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

/**
 * The values an `enum:` allows — each entry's own, whether written bare (`draft`) or as
 * `{ value, label }`, the form that gives an editor a label to show. The value is what a record
 * stores; the label never is.
 *
 * @param {Array} list - a field's `enum`
 * @returns {Array}
 */
export function enumValues(list) {
  return (Array.isArray(list) ? list : []).map((entry) =>
    entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in entry ? entry.value : entry
  )
}
