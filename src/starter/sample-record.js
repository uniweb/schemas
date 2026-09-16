/**
 * A believable record for a schema — what a tagged data block starts out
 * holding.
 *
 * ## ⭐ IT IS NOT `getSchemaDefaults`
 *
 * Defaults answer *what does this field hold when nobody said?* — and the honest
 * answer is usually nothing. `{ type: 'string', default: '' }` is the commonest
 * declaration in the templates, so a block built from defaults is a block of
 * empty strings, which teaches an author less than an empty block would.
 *
 * ⇒ This answers a different question: *what would a filled-in one look like?*
 * A declared default is used only when it carries a value; an empty one is
 * treated as the absence it is.
 *
 * ## The order a value is chosen in
 *
 *   1. a non-empty `default`   — the developer's own answer, and it wins
 *   2. `enum[0]`               — a declared choice is their vocabulary, not ours
 *   3. the field's NAME        — `email` is an address, `price` is a number
 *   4. the canonical kind      — the last resort
 *
 * ⭐ STEP 3 IS WHAT MAKES THE OUTPUT READABLE. Without it every string is
 * "Sample value" and the block is uniform noise; with it a `person` block reads
 * like a person. The names are matched on their last word, so `contactEmail`,
 * `contact_email` and `email` all land on the same sample.
 *
 * ## ⚠️ THE LIMIT, AND WHY IT IS NOT WORKED AROUND
 *
 * A schema that flattens a DISCRIMINATED UNION samples every branch at once. A
 * `@std/form` control is a union on `type` — `enum` means something only for a
 * select, `accept` only for a file — and the data-schema vocabulary has no union
 * construct, so a sample of a string control still carries an `enum`.
 *
 * ⛔ THE SCHEMA'S AUTHORS ALREADY ACCEPTED THAT CEILING, in `standard/form.js`:
 * "the union flattens into one record where most keys are meaningless for most
 * variants… The cost is inert: a renderer branches on `type` and ignores the
 * rest." A sample inherits the same ceiling, and a heuristic fitted to one
 * schema's field names would be a worse trade than one key an author deletes —
 * the more so because the rule below already removes the bulk of it (a string
 * control was carrying `accept`, `multiple`, `format` and `default` too).
 */

import { validateAndNormalizeSchema } from '../format.js'
import { flatRecordFields, rootListSection } from '../conform.js'

/** Deeper than this and a sample stops being a sample. */
const MAX_DEPTH = 4

/** How many entries a list-valued field gets. */
const LIST_LENGTH = 2

/**
 * Samples keyed by the last word of a field name.
 *
 * ⛔ A `description:` on a field is prose ABOUT the field, never a value for it —
 * using one as a sample puts "Job title or role" in the role slot. That looked
 * clever and is a category error, which is why the table is here instead.
 */
const BY_NAME = {
  // ⭐ AN ARRAY IS A LIST OF VARIANTS, indexed by position in a list-valued
  // field. Two identical entries read as a bug rather than as a placeholder —
  // the same reason the copy registers never repeat to reach a count.
  name: ['Ada Okonkwo', 'Marek Duval', 'Priya Raman'],
  fullname: ['Ada Okonkwo', 'Marek Duval', 'Priya Raman'],
  firstname: ['Ada', 'Marek', 'Priya'],
  lastname: ['Okonkwo', 'Duval', 'Raman'],
  author: ['Ada Okonkwo', 'Marek Duval', 'Priya Raman'],
  title: ['A short, specific title', 'A second title', 'A third title'],
  label: ['First', 'Second', 'Third'],
  heading: ['A short heading', 'A second heading', 'A third heading'],
  subtitle: 'One line that adds to the title',
  role: 'Principal engineer',
  position: 'Principal engineer',
  department: 'Research',
  organization: 'Northwind',
  company: 'Northwind',
  publisher: 'Northwind Press',
  email: 'ada@example.com',
  phone: '+1 (555) 010-0000',
  tel: '+1 (555) 010-0000',
  url: 'https://example.com',
  website: 'https://example.com',
  href: ['/a-page', '/another-page', '/a-third-page'],
  link: ['/a-page', '/another-page', '/a-third-page'],
  slug: ['a-slug', 'another-slug', 'a-third-slug'],
  id: ['a-1', 'a-2', 'a-3'],
  key: 'a-key',
  code: 'A-1',
  sku: 'NW-0001',
  location: 'Toronto, Canada',
  city: 'Toronto',
  country: 'Canada',
  address: '361 Example Street, Toronto',
  venue: 'Main hall',
  room: 'Auditorium',
  description: 'One sentence describing this entry.',
  summary: 'One sentence summarising this entry.',
  excerpt: 'One sentence of standfirst, to be replaced.',
  abstract: 'One paragraph describing the work, to be replaced.',
  bio: 'A short biography, to be replaced.',
  body: 'The body of this entry goes here.',
  content: 'The content of this entry goes here.',
  note: 'A note about this entry.',
  quote: 'A short quotation, in their own words.',
  tag: ['research', 'teaching', 'outreach'],
  tags: ['research', 'teaching', 'outreach'],
  category: ['general', 'updates', 'notes'],
  keyword: ['research', 'methods', 'analysis'],
  topic: ['research', 'methods', 'analysis'],
  status: 'published',
  language: 'en',
  locale: 'en',
  price: 24,
  amount: 24,
  cost: 24,
  total: 24,
  count: 12,
  quantity: 3,
  duration: 45,
  year: 2026,
  rating: 4,
  order: [1, 2, 3],
  method: 'GET',
  path: '/v1/things',
  icon: 'lu-star',
  image: '/images/placeholder.jpg',
  photo: '/images/placeholder.jpg',
  avatar: '/images/placeholder.jpg',
  thumbnail: '/images/placeholder.jpg',
  logo: '/images/placeholder.svg',
  file: '/files/placeholder.pdf',
  doi: '10.1000/example.2026.001',
  isbn: '978-0-000-00000-0',
  // Social handles — recognizable names that would otherwise fall through to
  // the kind and print "Sample value" five times in a row.
  twitter: '@example',
  x: '@example',
  mastodon: '@example@mastodon.social',
  bluesky: 'example.bsky.social',
  linkedin: 'https://linkedin.com/in/example',
  github: 'example',
  gitlab: 'example',
  orcid: '0000-0002-1825-0097',
  scholar: 'https://scholar.google.com/citations?user=example',
  youtube: 'https://youtube.com/@example',
  instagram: '@example',
  facebook: 'https://facebook.com/example',
}

/**
 * ⛔ A FIELD NAME MEANS DIFFERENT THINGS IN DIFFERENT RECORDS, and a flat table
 * cannot see that. `name` inside `@std/person` is a person; `name` inside an
 * `parameters` list is an identifier — and the flat table confidently produced
 * `parameters: [{ name: 'Ada Okonkwo', in: 'query' }]`, which is worse than
 * useless because it reads as a real example.
 *
 * ⇒ The enclosing list's name narrows it. Keyed by the PARENT field, then by
 * the child, and consulted before the flat table.
 */
const BY_PARENT = {
  parameters: { name: ['limit', 'offset', 'cursor'], label: ['limit', 'offset', 'cursor'] },
  params: { name: ['limit', 'offset', 'cursor'], label: ['limit', 'offset', 'cursor'] },
  headers: { name: ['Accept', 'Authorization', 'Content-Type'] },
  fields: { name: ['email', 'full_name', 'message'], label: ['Email', 'Full name', 'Message'] },
  controls: { name: ['email', 'full_name', 'message'], label: ['Email', 'Full name', 'Message'] },
  form: { name: ['email', 'full_name', 'message'], label: ['Email', 'Full name', 'Message'] },
  enum: { value: ['first', 'second', 'third'], label: ['First', 'Second', 'Third'] },
  nav: { label: ['Home', 'Docs', 'Pricing'], href: ['/', '/docs', '/pricing'] },
  columns: { name: ['id', 'title', 'created_at'], label: ['ID', 'Title', 'Created'] },
  properties: { name: ['width', 'height', 'depth'] },
  variables: { name: ['baseUrl', 'apiKey', 'locale'] },
  options: { name: ['first', 'second', 'third'], label: ['First', 'Second', 'Third'] },
  specs: { name: ['Weight', 'Dimensions', 'Material'] },
  attributes: { name: ['colour', 'size', 'finish'] },
}

/** By canonical kind, when the name said nothing. */
const BY_KIND = {
  string: 'Sample value',
  text: 'A sentence of sample text, here to be replaced.',
  int: 7,
  decimal: 7.5,
  bool: true,
  date: '2026-03-14',
  datetime: '2026-03-14T09:30:00Z',
  file: '/images/placeholder.jpg',
  json: {},
}

/** By `format`, which is narrower than the kind and so wins over it. */
const BY_FORMAT = {
  email: 'ada@example.com',
  url: 'https://example.com',
  markdown: 'A sentence of sample text, with **emphasis** where it helps.',
  html: '<p>A sentence of sample text.</p>',
}

/** The last word of a field name: `contactEmail` / `contact_email` → `email`. */
function lastWord(fieldName) {
  const words = String(fieldName)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .filter(Boolean)
  return (words[words.length - 1] || '').toLowerCase()
}

/** A default worth using — one that carries a value rather than an absence. */
function usefulDefault(value) {
  if (value === undefined || value === null) return false
  if (value === '') return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function sampleField(name, def, depth, index = 0, parent = null) {
  if (typeof def === 'string') return sampleField(name, { type: def }, depth, index, parent)
  if (!def || typeof def !== 'object') return null

  if (usefulDefault(def.default)) return def.default
  if (Array.isArray(def.enum) && def.enum.length > 0) return def.enum[0]

  if (def.type === 'array') {
    if (depth >= MAX_DEPTH) return []
    const item = def.items
    if (!item) return def.required ? [] : null
    // The list's own name becomes the context its items are read in: `name`
    // inside `parameters` is an identifier, not a person.
    return Array.from({ length: LIST_LENGTH }, (_, i) =>
      sampleField(name, item, depth + 1, i, lastWord(name)),
    ).filter((v) => v !== null)
  }

  if (def.type === 'object') {
    if (depth >= MAX_DEPTH) return {}
    if (def.fields) {
      const nested = sampleFields(def.fields, depth + 1, index, parent || lastWord(name))
      // An optional object whose every field was unknown says nothing; an empty
      // map in the output is noise the author has to delete.
      if (Object.keys(nested).length === 0 && !def.required) return null
      return nested
    }
    // An OPEN MAP — the keys belong to the author, so a sample invents one
    // rather than pretending to know their names.
    if (def.values) {
      return { example: sampleField('example', def.values, depth + 1, index, parent) }
    }
    return {}
  }

  // A reference names another record. Its handle is the honest sample; the
  // record it points at is not this schema's to invent.
  if (def.type === 'ref') return 'a-referenced-record'

  const byFormat = def.format && BY_FORMAT[def.format]
  if (byFormat !== undefined && (def.type === 'string' || def.type === 'text')) return byFormat

  const contextual = parent && BY_PARENT[parent] ? BY_PARENT[parent][lastWord(name)] : undefined
  const named = contextual !== undefined ? contextual : BY_NAME[lastWord(name)]
  if (named !== undefined) {
    const byName = Array.isArray(named) ? named[index % named.length] : named
    // A name sample is usually a STRING; honour it only where a string belongs,
    // so a `count` field declared as text does not get the number 12.
    const wantsNumber = def.type === 'int' || def.type === 'decimal'
    if (wantsNumber === (typeof byName === 'number')) return byName
  }

  // ⛔ NOTHING ABOVE MATCHED — so we know the field's KIND and nothing else, and
  // a kind-only sample is a guess. A REQUIRED field gets one anyway, because a
  // record missing a required field is not a sample of that schema. An optional
  // one is left out.
  //
  // ⭐ THIS IS NOT TIDINESS; A FLATTENED UNION MAKES IT CORRECTNESS. `@std/form`
  // says so in its own words: a control is "a DISCRIMINATED UNION on `type` —
  // `enum` means something only for a select, `accept`/`multiple` only for a
  // file", and the vocabulary has no union construct, so "the union flattens
  // into one record where most keys are meaningless for most variants." Filling
  // every optional field of one produced a control carrying `accept`, `enum`,
  // `multiple` and `default` at once — a shape no author would write and every
  // renderer ignores most of. Measured 2026-09-16 on `services/QuoteForm`.
  if (!def.required) return null

  const byKind = BY_KIND[def.type]
  return byKind !== undefined ? byKind : null
}

function sampleFields(fields, depth, index = 0, parent = null) {
  const out = {}
  for (const [name, def] of Object.entries(fields || {})) {
    const value = sampleField(name, def, depth, index, parent)
    if (value !== null) out[name] = value
  }
  return out
}

/**
 * A sample for one authored `data:` value.
 *
 * Accepts every shape `meta.js` may declare: a full schema (either authoring
 * form), a bare inline field map, or a rich-form `{ fields: [...] }`.
 *
 * @param {object} schema - the schema, as authored
 * @returns {object|Array|null} a record, a LIST of records for a root-list
 *   schema (`@std/nav` is a list of items, not a record holding one), or null
 *   when the value names no shape to sample.
 */
export function sampleRecord(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return null

  // A rich-form is an editor FORM definition — an ordered array of controls,
  // keyed by `id`. Different shape, different walk.
  if (Array.isArray(schema.fields)) {
    const out = {}
    for (const field of schema.fields) {
      if (!field || !field.id) continue
      const value = sampleField(field.id, { type: field.type || 'string', ...field }, 1)
      if (value !== null) out[field.id] = value
    }
    return Object.keys(out).length > 0 ? out : null
  }

  // A full schema declares `fields` or `sections`; a bare field map is neither
  // and normalizes once wrapped.
  const authored = schema.fields || schema.sections ? schema : { fields: schema }
  let normalized
  try {
    normalized = validateAndNormalizeSchema(
      authored,
      typeof schema.name === 'string' ? `@/${schema.name}` : '(inline)',
    )
  } catch {
    // A malformed schema is the developer's to fix and `uniweb validate` is
    // where they hear about it. Starter content declines rather than throwing:
    // one bad `data:` entry must not cost a section its whole starter.
    return null
  }

  const list = rootListSection(normalized)
  if (list) {
    // A root list has no enclosing FIELD to give its records a context, so the
    // schema's own name does: `@std/form`'s records are controls, not people.
    const context = typeof normalized.name === 'string' ? lastWord(normalized.name) : null
    return Array.from({ length: LIST_LENGTH }, (_, i) => sampleFields(list.fields, 1, i, context))
  }

  const fields = flatRecordFields(normalized)
  if (!fields) return null
  const record = sampleFields(fields, 1)
  return Object.keys(record).length > 0 ? record : null
}
