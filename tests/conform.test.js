/**
 * A schema whose ROOT IS A LIST.
 *
 * `@std/nav` has been this shape since it shipped — one `many` section, no
 * singles, no brief — and its authored content is a bare array. Nothing checked
 * it: `flatRecordFields` returned null, so `validate(anything, 'nav')` answered
 * `{ valid: true }` for any input at all, including a list of items missing their
 * required `label`. Silent, and the shape it silently skipped is a shipped
 * standard.
 *
 * The rule is narrow on purpose: EXACTLY ONE section, and it must be `multi`.
 * Two multi sections and no singles leaves "which one is the value?"
 * unanswerable, and guessing there would be worse than checking nothing.
 *
 * Two entry points, two questions. `validateBound` takes the VALUE a key
 * receives — for a root list, the bare array. `validateItem` takes ONE ENTITY as a
 * file holds it — for a root list, the list under its section's key. A caller
 * holding a list of items passes it whole to `validateBound`; handing its elements
 * to `validateItem` would treat each as an entity of the list schema.
 *
 * ⛔ Until 2026-09-24 `validateItem` and `isStaticallyCheckable` were deliberately
 * NOT widened to root lists, because `@uniweb/build` called them per item of a list.
 * Build now checks a delivered list with `validateBound`, so an entity of a root-list
 * schema — which a record file holds — is checked like any other.
 */

import { describe, expect, it } from 'vitest'
import {
  rootListSection,
  validateBound,
  validateItem,
  validateRecordFile,
  isStaticallyCheckable,
  recordLayout,
  deliveredFields,
  toDeliveredRecord,
  contentBodyField,
  misplacedFields,
  referencesOf,
  mapReferences,
  validateKeyValue,
  validateStoredRecord,
  storedValue,
  briefSectionName,
  markedBriefPath,
} from '../src/conform.js'
import { validateAndNormalizeSchema } from '../src/format.js'
import { validate, nav } from '../src/index.js'

const norm = (s) => validateAndNormalizeSchema(s, '@/x')
const LIST = { sections: { items: { many: true, fields: { label: { type: 'string', required: true } } } } }

describe('rootListSection — what counts as a list at the root', () => {
  it('one multi section and nothing else', () => {
    expect(rootListSection(norm(LIST))?.fields).toHaveProperty('label')
  })

  it('not a single section', () => {
    expect(rootListSection(norm({ sections: { a: { fields: { x: 'string' } } } }))).toBeNull()
  })

  it('not two sections, even when one is multi', () => {
    // "Which one is the value?" has no answer, so it is not a root list.
    const two = { sections: { a: { fields: { x: 'string' } }, b: { many: true, fields: { y: 'string' } } } }
    expect(rootListSection(norm(two))).toBeNull()
  })

  it('not a fields-form schema', () => {
    expect(rootListSection(norm({ fields: { a: 'string' } }))).toBeNull()
  })
})

describe('validateBound — dispatches on the root shape', () => {
  const findings = (schema, value) => validateBound(norm(schema), value).map((f) => `${f.field}:${f.rule}`)

  it('checks each record of a list, and names its index', () => {
    expect(findings(LIST, [{ label: 'Home' }, {}])).toEqual(['[1].label:required'])
  })

  it('accepts a well-formed list, and an empty one', () => {
    expect(findings(LIST, [{ label: 'Home' }])).toEqual([])
    expect(findings(LIST, [])).toEqual([])
  })

  it('reports a non-list where a list is declared', () => {
    expect(findings(LIST, { label: 'not a list' })).toEqual([':type'])
  })

  it('still checks a record-rooted schema the ordinary way', () => {
    expect(findings({ fields: { a: { type: 'string', required: true } } }, {})).toEqual(['a:required'])
  })

  it('says nothing about a schema with neither shape', () => {
    // A binder-only schema describes no value one key could carry.
    const binder = { sections: { b: { sections: { c: { many: true, fields: { x: 'string' } } } } } }
    expect(validateBound(norm(binder), { anything: true })).toEqual([])
  })
})

/**
 * A `tree` section's records nest under each other via a reserved `children:`
 * key — the section declares no parent/child field, because the link is internal
 * to the registry.
 *
 * Until this existed the checker walked only the top level, so `tree: true`
 * bought the wire shape (`self_nesting`) and bought nothing from validation: a
 * two-level nav had its entire second level unverified. Findings carry the full
 * path, because "a label is missing" is unactionable on a menu of thirty items.
 */
describe('a tree section descends into its children', () => {
  const TREE = {
    name: 'menu',
    sections: { items: { many: true, tree: true, fields: { label: { type: 'string', required: true } } } },
  }
  const paths = (value, schema = TREE) => validate(value, schema).errors.map((e) => `${e.path}:${e.rule}`)

  it('catches a child one level down', () => {
    expect(paths([{ label: 'Home' }, { label: 'Products', children: [{ label: 'Widgets' }, {}] }])).toEqual([
      '[1].children[1].label:required',
    ])
  })

  it('recurses to any depth', () => {
    expect(paths([{ label: 'A', children: [{ label: 'B', children: [{}] }] }])).toEqual([
      '[0].children[0].children[0].label:required',
    ])
  })

  it('accepts a well-formed tree', () => {
    expect(paths([{ label: 'A', children: [{ label: 'B', children: [{ label: 'C' }] }] }])).toEqual([])
  })

  it('reports children that are not a list', () => {
    expect(paths([{ label: 'A', children: 'nope' }])).toEqual(['[0].children:type'])
  })

  it('treats absent and null children as the leaf they are', () => {
    expect(paths([{ label: 'A' }, { label: 'B', children: null }])).toEqual([])
  })

  it('does NOT descend on a section that is not a tree', () => {
    // There, `children` is simply an undeclared field, and undeclared fields are
    // ignored — the same tolerance every other record gets.
    const flat = { name: 'x', sections: { items: { many: true, fields: { label: { type: 'string', required: true } } } } }
    expect(paths([{ label: 'A', children: [{}] }], flat)).toEqual([])
  })

  it('@std/nav gets this, since it is the shape it was written for', () => {
    expect(paths([{ label: 'Products', children: [{ href: '/x' }] }], 'nav')).toEqual([
      '[0].children[0].label:required',
    ])
  })
})

describe('validateItem takes an entity; validateBound takes a value', () => {
  it('validateItem checks an ENTITY of a root-list schema, written by section', () => {
    const found = validateItem(norm(LIST), { items: [{ label: 'Home' }, {}] }).map((f) => `${f.field}:${f.rule}`)
    expect(found).toEqual(['items[1].label:required'])
  })

  it('CONTROL: validateItem given the bare list finds nothing — a list is a value, for validateBound', () => {
    expect(validateItem(norm(LIST), [{ label: 'Home' }, {}])).toEqual([])
    expect(validateBound(norm(LIST), [{ label: 'Home' }, {}]).map((f) => `${f.field}:${f.rule}`)).toEqual([
      '[1].label:required',
    ])
  })

  it('isStaticallyCheckable answers yes for a root-list schema too', () => {
    expect(isStaticallyCheckable(norm(LIST))).toBe(true)
    expect(isStaticallyCheckable(norm({ fields: { a: 'string' } }))).toBe(true)
    expect(isStaticallyCheckable(null)).toBe(false)
  })
})

describe('@std/nav — the shipped standard this was silently skipping', () => {
  it('catches an item missing its required label', () => {
    expect(validate([{ label: 'Home', href: '/' }, { href: '/x' }], 'nav').errors.map((e) => `${e.path}:${e.rule}`)).toEqual(
      ['[1].label:required']
    )
  })

  it('accepts a well-formed nav', () => {
    expect(validate([{ label: 'Home', href: '/' }], 'nav')).toEqual({ valid: true, errors: [] })
  })

  it('is authored as one multi section with no brief, and that is legal', () => {
    const n = validateAndNormalizeSchema(nav, '@std/nav')
    expect(Object.keys(n.sections)).toHaveLength(1)
    expect(Object.values(n.sections)[0].kind).toBe('multi')
    expect(Object.values(n.sections).some((s) => s.brief)).toBe(false)
  })
})

// ⭐ A sections-form schema is checked, not deferred (2026-09-24). Asked for with a
// measurement: a course schema checked 12 records written in the `fields:` shorthand
// and 5 the moment it was written with `sections:` — a brief plus a modules list,
// the way the app stores it — because `isStaticallyCheckable` was `!!schema.fields`.
describe('a sections-form record — in its file, and as delivered', () => {
  // ⭐ One record, two shapes. In a FILE a schema of several sections is written by
  // section — the flat form is retired (2026-09-22 [Diego]) — and a component receives
  // it DELIVERED: the brief's fields at the top, each other section under its name, the
  // shape a host's records service answers (measured 2026-09-24).
  const course = norm({
    name: 'course',
    sections: {
      identity: { brief: true, fields: { title: { type: 'string', required: true }, starts: { type: 'date' } } },
      pricing: { fields: { amount: { type: 'number', required: true } } },
      modules: {
        many: true,
        fields: { title: { type: 'string', required: true } },
        sections: { lessons: { many: true, fields: { title: { type: 'string', required: true } } } },
      },
    },
  })
  const file = (record) => validateRecordFile(course, record).map((f) => `${f.field}:${f.rule}`)
  const delivered = (record) => validateItem(course, record).map((f) => `${f.field}:${f.rule}`)

  it('is statically checkable — as every schema with fields or sections is', () => {
    expect(isStaticallyCheckable(course)).toBe(true)
    expect(isStaticallyCheckable(norm(LIST))).toBe(true)
  })

  it('its layout: by section, and the brief is the section marked brief', () => {
    expect(recordLayout(course)).toMatchObject({ flat: false, brief: 'identity' })
    expect(recordLayout(norm({ name: 'one', fields: { a: 'string' } }))).toMatchObject({ flat: true })
    expect(recordLayout(norm({ name: 'one', sections: { only: { fields: { a: 'string' } } } }))).toMatchObject({ flat: true })
    expect(recordLayout(norm(LIST))).toMatchObject({ flat: false, brief: null })
  })

  it('FILE: each section under its key, lists and child sections included', () => {
    expect(
      file({
        identity: { title: 'Rust 101' },
        pricing: { amount: 40 },
        modules: [{ title: 'Basics', lessons: [{ title: 'Install' }, {}] }, {}],
      })
    ).toEqual(['modules[0].lessons[1].title:required', 'modules[1].title:required'])
  })

  it("FILE: the brief is always sent and owes its required fields; another section only once it is written", () => {
    expect(file({ pricing: { amount: 40 } })).toEqual(['identity.title:required'])
    expect(file({ identity: { title: 'Rust 101' } })).toEqual([])
    expect(file({ identity: { title: 'Rust 101' }, pricing: {} })).toEqual(['pricing.amount:required'])
  })

  it('FILE: ⛔ a field written flat is the retired form — reported, naming its section', () => {
    expect(validateRecordFile(course, { title: 'Rust 101', amount: 40 }).map((f) => `${f.field}:${f.rule}`)).toEqual([
      'title:section',
      'amount:section',
      'identity.title:required',
    ])
  })

  it('misplacedFields: each flat-written key, with the sections it belongs under', () => {
    expect(misplacedFields(course, { slug: 'rust', title: 'Rust 101', amount: 40, color: 'red', $uuid: 'u' })).toEqual([
      { key: 'title', sections: ['identity'] },
      { key: 'amount', sections: ['pricing'] },
    ])
    expect(misplacedFields(course, { identity: { title: 'Rust 101' } })).toEqual([])
    expect(misplacedFields(norm({ name: 'one', fields: { title: 'string' } }), { title: 'x' })).toEqual([])
  })

  it('FILE: a value of the wrong shape says which shape it should be', () => {
    expect(file({ identity: 'Rust 101', pricing: { amount: 40 }, modules: { title: 'x' } })).toEqual([
      'identity:type',
      'modules:type',
    ])
  })

  it('DELIVERED: the brief at the top, each other section under its name', () => {
    expect(delivered({ title: 'Rust 101', starts: '2026-10-15', pricing: { amount: 40 } })).toEqual([])
    expect(delivered({ starts: '2026-10-15' })).toEqual(['title:required'])
    expect(delivered({ title: 'Rust 101', modules: [{ title: 'Basics', lessons: [{}] }] })).toEqual([
      'modules[0].lessons[0].title:required',
    ])
  })

  it('DELIVERED: a section other than the brief may be absent — a list delivers briefs', () => {
    expect(delivered({ title: 'Rust 101' })).toEqual([])
  })

  it('validateBound takes a delivered record root', () => {
    expect(validateBound(course, { pricing: { amount: 1 } }).map((f) => f.field)).toEqual(['title'])
  })

  it('toDeliveredRecord lifts the brief and keeps the rest under their names', () => {
    expect(
      toDeliveredRecord(course, { slug: 'rust', identity: { title: 'Rust 101' }, pricing: { amount: 40 } })
    ).toEqual({ slug: 'rust', title: 'Rust 101', pricing: { amount: 40 } })
  })

  it('deliveredFields: the brief\'s fields, then each other section as one field', () => {
    const fields = deliveredFields(course)
    expect(Object.keys(fields)).toEqual(['title', 'starts', 'pricing', 'modules'])
    expect(fields.pricing).toMatchObject({ type: 'object', section: true })
    expect(fields.modules).toMatchObject({ type: 'array', items: { type: 'object' } })
    expect(Object.keys(fields.modules.items.fields)).toEqual(['title', 'lessons'])
  })

  it('contentBodyField: where a markdown body goes, as delivered', () => {
    const post = norm({
      name: 'post',
      sections: {
        card: { brief: true, fields: { title: 'string' } },
        body: { fields: { content: { type: 'markdown' } } },
      },
    })
    expect(contentBodyField(post)).toMatchObject({ section: 'body', fileSection: 'body', key: 'content' })
    expect(contentBodyField(norm({ name: 'bio', fields: { text: { type: 'richtext' } } }))).toMatchObject({
      section: null,
      fileSection: null,
      key: 'text',
    })
    // In the brief: at the top once delivered, under the brief's name in the file.
    const card = norm({
      name: 'card',
      sections: {
        card: { brief: true, fields: { title: 'string', text: { type: 'markdown' } } },
        extra: { fields: { note: 'string' } },
      },
    })
    expect(contentBodyField(card)).toMatchObject({ section: null, fileSection: 'card', key: 'text' })
  })
})

// ⛔ Any string was a date until 2026-09-24 — `joined: March 2021` passed here, and a
// backend refuses it ("is not a valid date").
describe('date and datetime values', () => {
  const s = norm({ fields: { day: { type: 'date' }, at: { type: 'datetime' } } })
  const rules = (item) => validateItem(s, item).map((f) => `${f.field}:${f.rule}`)

  it('a date is a real YYYY-MM-DD day', () => {
    expect(rules({ day: '2026-10-15' })).toEqual([])
    expect(rules({ day: 'March 2021' })).toEqual(['day:format'])
    expect(rules({ day: '2026-02-30' })).toEqual(['day:format'])
    expect(rules({ day: '2026-10-15T00:00:00Z' })).toEqual(['day:format'])
  })

  it('a datetime is a day and a time; the offset is optional here', () => {
    expect(rules({ at: '2026-10-15T09:00' })).toEqual([])
    expect(rules({ at: '2026-10-15T09:00:30.5Z' })).toEqual([])
    expect(rules({ at: '2026-10-15 09:00+02:00' })).toEqual([])
    expect(rules({ at: 'noon on launch day' })).toEqual(['at:format'])
    expect(rules({ at: '2026-10-15T25:00' })).toEqual(['at:format'])
  })
})

describe('references in a record — found and rewritten, in its file or as delivered', () => {
  // A talk names its speaker by handle; a course lists its instructors, and each module
  // names a reviewer — a reference at the top, in a list, and inside a list of records.
  const talk = norm({ name: 'talk', fields: { title: 'string', speaker: { ref: '@/speaker' } } })
  const course = norm({
    name: 'course',
    sections: {
      identity: {
        brief: true,
        fields: { title: 'string', instructors: { ref: '@/person', many: true } },
      },
      modules: { many: true, fields: { title: 'string', reviewer: { ref: '@/person' } } },
    },
  })

  it('finds each reference with its path, its target and its value — in the file', () => {
    expect(referencesOf(talk, { title: 'Opening', speaker: 'ada' })).toEqual([
      { path: 'speaker', ref: '@/speaker', value: 'ada' },
    ])
    expect(
      referencesOf(course, {
        identity: { title: 'Rust', instructors: ['ada', 'grace'] },
        modules: [{ title: 'A', reviewer: 'alan' }, { title: 'B' }],
      })
    ).toEqual([
      { path: 'identity.instructors[0]', ref: '@/person', value: 'ada' },
      { path: 'identity.instructors[1]', ref: '@/person', value: 'grace' },
      { path: 'modules[0].reviewer', ref: '@/person', value: 'alan' },
    ])
  })

  it('reads a delivered record by its delivered shape — the brief at the top', () => {
    const delivered = { title: 'Rust', instructors: ['ada'], modules: [{ reviewer: 'alan' }] }
    expect(referencesOf(course, delivered, { delivered: true }).map((r) => r.path)).toEqual([
      'instructors[0]',
      'modules[0].reviewer',
    ])
  })

  it('rewrites each reference, copying only what holds one, and drops what the rewrite leaves out', () => {
    const file = { identity: { title: 'Rust', instructors: ['ada', 'nobody'] }, modules: [{ title: 'A' }] }
    const out = mapReferences(course, file, (v) => (v === 'nobody' ? undefined : { brief: { name: v } }))
    expect(out.identity.instructors).toEqual([{ brief: { name: 'ada' } }])
    expect(out.modules).toBe(file.modules) // held no reference — not copied
    expect(file.identity.instructors).toEqual(['ada', 'nobody']) // the record itself is untouched
  })
})

describe('a `file` value — a path, or an asset (2026-09-28)', () => {
  const schema = validateAndNormalizeSchema({ name: 'doc', fields: { file: { type: 'file', required: true } } }, '@/doc')
  it('a path or URL string conforms', () => {
    expect(validateItem(schema, { file: '/files/brochure.pdf' })).toEqual([])
  })
  it('an asset object — `{ url, … }`, what a file record holds — conforms', () => {
    const asset = { url: '/records/uniweb/file/brochure.pdf', name: 'brochure.pdf', mime: 'application/pdf', size: 48213 }
    expect(validateItem(schema, { file: asset })).toEqual([])
    expect(validateItem(schema, { file: { ...asset, assetId: 'a1', assetExt: 'pdf' } })).toEqual([])
  })
  it('CONTROL — an object with no url does not', () => {
    expect(validateItem(schema, { file: { name: 'brochure.pdf' } }).length).toBeGreaterThan(0)
  })
})

// ⭐ The value a key holds, checked as the key declares it: how many records, and how much of each
// (ruled 2026-10-07 [Diego]).
describe('validateKeyValue — a list, or one record; briefs, or whole', () => {
  const article = norm({
    name: 'article',
    sections: {
      brief: { brief: true, fields: { title: { type: 'string', required: true } } },
      body: { fields: { content: { type: 'string', required: true } } },
    },
  })
  const check = (value, declaration) => validateKeyValue(article, value, declaration).map((f) => `${f.field}:${f.rule}`)

  it('a key holds a LIST by default — each record its brief', () => {
    expect(check([{ title: 'A' }, { title: 'B' }])).toEqual([])
    expect(check([{ title: 'A' }, {}])).toEqual(['[1].title:required'])
  })

  it('one record under a list key is refused, naming single', () => {
    const [finding] = validateKeyValue(article, { title: 'A' })
    expect(finding).toMatchObject({ field: '', rule: 'type' })
    expect(finding.message).toMatch(/expected a list of records, got object — a key that holds one record is declared `single: true`/)
  })

  it('single: true holds ONE record; a list there is refused', () => {
    expect(check({ title: 'A' }, { single: true })).toEqual([])
    expect(check({}, { single: true })).toEqual(['title:required'])
    expect(check([{ title: 'A' }], { single: true })).toEqual([':type'])
  })

  it('whole: true checks each record as stored — the brief under its name', () => {
    const whole = { brief: { title: 'A' }, body: { content: 'Text' } }
    expect(check(whole, { single: true, whole: true })).toEqual([])
    expect(check([whole, { brief: {} }], { whole: true })).toEqual(['[1].brief.title:required'])
    // CONTROL — a brief is not a whole record: its title is not under `brief`
    expect(check({ title: 'A' }, { single: true, whole: true })).toEqual(['brief.title:required'])
  })

  it('a list schema holds its list whatever the flags — validateBound', () => {
    expect(validateKeyValue(norm(LIST), [{ label: 'Home' }, {}]).map((f) => `${f.field}:${f.rule}`)).toEqual(['[1].label:required'])
    expect(validateKeyValue(norm(LIST), { label: 'Home' }).map((f) => f.rule)).toEqual(['type'])
  })

  it('validateStoredRecord — the `fields:` shorthand stores its one section as `brief`', () => {
    const flat = norm({ name: 'note', fields: { title: { type: 'string', required: true } } })
    expect(validateStoredRecord(flat, { brief: { title: 'A' } })).toEqual([])
    expect(validateStoredRecord(flat, { title: 'A' }).map((f) => f.field)).toEqual(['brief.title'])
  })
})

// ⭐ The rules a registry checks on write, checked before a value is sent (2026-10-15) — and only
// those: `markdown`, `prosemirror` and `scene` say what a value is, and nothing checks them.
describe('validateItem — a date at its precision, and a field\'s rules', () => {
  const check = (f, value) =>
    validateItem(validateAndNormalizeSchema({ fields: { f } }, '@/x'), { f: value }).map((v) => `${v.rule}: ${v.message}`)

  it('a date holds a day; with format year-month a month; with format year a year', () => {
    expect(check({ type: 'date' }, '2024-05-14')).toEqual([])
    expect(check({ type: 'date' }, '2024-05')).toEqual(['format: "2024-05" is not a date (YYYY-MM-DD)'])
    expect(check({ type: 'date', format: 'year-month' }, '2024-05')).toEqual([])
    expect(check({ type: 'date', format: 'year-month' }, '2024-13')).toEqual(['format: "2024-13" is not a month (YYYY-MM)'])
    expect(check({ type: 'date', format: 'year-month' }, '2024-05-14')).toEqual(['format: "2024-05-14" is not a month (YYYY-MM)'])
    expect(check({ type: 'date', format: 'year' }, '2024')).toEqual([])
    expect(check({ type: 'date', format: 'year' }, '24')).toEqual(['format: "24" is not a year (YYYY)'])
  })

  it('a year written as a number is refused, saying how to write it', () => {
    expect(check({ type: 'date', format: 'year' }, 2024)).toEqual(["type: 2024 is a number — a date is written as text: '2024'"])
  })

  it('max_length counts characters, not UTF-16 units', () => {
    expect(check({ type: 'string', max_length: 3 }, 'abcd')).toEqual(['max_length: "abcd" is 4 characters — at most 3'])
    expect(check({ type: 'string', max_length: 3 }, '😀😀😀')).toEqual([])
  })

  it('min and max', () => {
    expect(check({ type: 'int', min: 1, max: 5 }, 0)).toEqual(['min: 0 is below 1'])
    expect(check({ type: 'int', min: 1, max: 5 }, 6)).toEqual(['max: 6 is above 5'])
    expect(check({ type: 'int', min: 1, max: 5 }, 3)).toEqual([])
  })

  it('a currency code', () => {
    expect(check({ type: 'string', format: 'currency' }, 'CAD')).toEqual([])
    expect(check({ type: 'string', format: 'currency' }, 'cad')).toEqual(["format: \"cad\" is not a currency code (ISO 4217, like 'CAD')"])
  })

  it('an icon name is held as written — an icon name or not, as a registry holds it', () => {
    expect(check({ type: 'string', format: 'icon' }, 'lu-flame')).toEqual([])
    expect(check({ type: 'string', format: 'icon' }, 'not an icon')).toEqual([])
  })

  it("a file's type and size, where the value says them", () => {
    const f = { type: 'file', mime_types: ['image/*'], max_size: 100 }
    expect(check(f, { url: '/a.png', mime: 'image/png', size: 50 })).toEqual([])
    expect(check(f, { url: '/a.pdf', mime: 'application/pdf', size: 500 })).toEqual([
      'mime_types: "application/pdf" is not one of ["image/*"]',
      'max_size: 500 bytes is above 100',
    ])
    expect(check(f, '/a.pdf')).toEqual([])
  })

  it('CONTROL — a marker format is not checked', () => {
    expect(check({ type: 'markdown' }, '<not> *checked*')).toEqual([])
  })
})

// ⭐ A url is what a registry stores as one (ruled 2026-10-15): `http://` or `https://`, or an address
// written without a scheme that starts with a host name, which it stores with `https://`. ⛔ Until
// then any `scheme://…`, a path and a bare domain passed here — and a registry refused the first two.
describe('validateItem — a url is a web address', () => {
  const rules = (value) =>
    validateItem(validateAndNormalizeSchema({ fields: { site: 'url' } }, '@/x'), { site: value }).map((v) => v.rule)

  it.each([
    'https://example.com',
    'http://example.com/a?b=c#d',
    'HTTPS://Example.com',
    'https://localhost:3000',
    'example.com',
    'www.example.com/cv',
    'example.com:8080/a',
    '//example.com/x',
    'sub.example.co.uk?q=1',
    'bücher.de',
    '例え.jp/a',
    'example.1a',
  ])('passes %s', (value) => {
    expect(rules(value)).toEqual([])
  })

  it.each([
    'ftp://example.com/file',
    'javascript:alert(1)',
    'javascript://example.com/%0Aalert(1)',
    'mailto:a@example.com',
    'tel:+15551234567',
    '/about',
    './cv.pdf',
    'localhost:3000',
    'a@example.com',
    'https://',
    'https://example.com/a b',
    'example',
    '192.168.0.1/x',
    '-example.com',
    'example.com:80a',
    'my_site.example.com',
  ])('refuses %s', (value) => {
    expect(rules(value)).toEqual(['format'])
  })

  it('checks no empty value — presence is required\'s', () => {
    expect(rules('')).toEqual([])
  })

  it('says what to write', () => {
    const [finding] = validateItem(validateAndNormalizeSchema({ fields: { site: 'url' } }, '@/x'), { site: '/about' })
    expect(finding.message).toBe(`"/about" is not a web address — write http:// or https:// and a host, as in 'https://example.com/about'`)
  })
})

// ⭐ And one a browser can open (2026-10-17): the WHATWG URL parser accepts the address as stored.
// It only narrows — what passes is kept as written.
describe('validateItem — a url is one a browser can open', () => {
  const rules = (value) =>
    validateItem(validateAndNormalizeSchema({ fields: { site: 'url' } }, '@/x'), { site: value }).map((v) => v.rule)

  it.each([
    'https://example',
    'https://-example.com',
    'https://example..com',
    'https://example.com.',
    'https:///example.com',
    'https://example.com:65535',
    'https://[::1]:8080',
    'https://ex%41mple.com',
    'example.com:65535',
    'example.com:0',
  ])('passes %s', (value) => {
    expect(rules(value)).toEqual([])
  })

  it.each([
    'https://example.com:99999',
    'https://example.com:abc',
    'https://[::1',
    'https://exa<mple.com',
    'https://user@/',
    'https://ex%20ample.com',
    'https://example.123',
    'https://1.2.3.999',
    'example.com:99999',
  ])('refuses %s', (value) => {
    expect(rules(value)).toEqual(['format'])
  })

  it('says it cannot be opened, not how to write a web address', () => {
    const [finding] = validateItem(validateAndNormalizeSchema({ fields: { site: 'url' } }, '@/x'), { site: 'https://example.com:99999' })
    expect(finding.message).toBe(`"https://example.com:99999" is not an address a browser can open — its host or its port is not valid`)
  })

  it('keeps what passes as written, not as the parser rewrites it', () => {
    const site = validateAndNormalizeSchema({ fields: { site: 'url' } }, '@/x').fields.site
    expect(storedValue(site, 'https:///example.com')).toBe('https:///example.com')
    expect(storedValue(site, 'https://ex%41mple.com')).toBe('https://ex%41mple.com')
    expect(storedValue(site, 'example.com:0')).toBe('https://example.com:0')
  })
})

// What a registry keeps, which a file need not write (2026-10-15).
describe('storedValue', () => {
  const field = (f) => validateAndNormalizeSchema({ fields: { f } }, '@/x').fields.f

  it('a url with its scheme in small letters, or https:// in front, the host as written', () => {
    expect(storedValue(field('url'), 'HTTPS://Example.com/A')).toBe('https://Example.com/A')
    expect(storedValue(field('url'), 'bücher.de/cv')).toBe('https://bücher.de/cv')
    expect(storedValue(field('url'), '//example.com/x')).toBe('https://example.com/x')
  })

  it('a day in full', () => {
    expect(storedValue(field('date'), '2024-5-3')).toBe('2024-05-03')
  })

  it('CONTROL — anything else as it is', () => {
    expect(storedValue(field('url'), '/about')).toBe('/about')
    expect(storedValue(field({ type: 'date', format: 'year-month' }), '2024-5')).toBe('2024-5')
    expect(storedValue(field('date'), '2024-2-30')).toBe('2024-2-30')
    expect(storedValue(field('string'), 'example.com')).toBe('example.com')
  })
})

// A registry stores a day written short in full (2026-10-15), so it is a day here too.
describe('validateItem — a day written short', () => {
  const rules = (f, value) => validateItem(validateAndNormalizeSchema({ fields: { f } }, '@/x'), { f: value }).map((v) => v.rule)

  it('is a day', () => {
    expect(rules({ type: 'date' }, '2024-5-3')).toEqual([])
    expect(rules({ type: 'date' }, '2024-05-3')).toEqual([])
  })

  it('CONTROL — a short day the calendar lacks, and a short month, are not', () => {
    expect(rules({ type: 'date' }, '2024-2-30')).toEqual(['format'])
    expect(rules({ type: 'date', format: 'year-month' }, '2024-5')).toEqual(['format'])
  })
})

// ⭐ A string's pattern, matched whole as a registry matches it (2026-10-15).
describe('validateItem — a pattern', () => {
  const check = (f, value) =>
    validateItem(validateAndNormalizeSchema({ fields: { f } }, '@/x'), { f: value }).map((v) => `${v.rule}: ${v.message}`)

  it('matches the whole value', () => {
    const f = { type: 'string', pattern: '[A-Z]{2}\\d{4}' }
    expect(check(f, 'AB1234')).toEqual([])
    expect(check(f, 'xAB1234')).toEqual(['pattern: "xAB1234" does not match the pattern "[A-Z]{2}\\d{4}"'])
    expect(check(f, 'AB12345')).toHaveLength(1)
  })

  it('checks no empty value — presence is required\'s', () => {
    expect(check({ type: 'string', pattern: '\\d+' }, '')).toEqual([])
  })

  it('checks each value of a list', () => {
    expect(check({ type: 'string', many: true, pattern: '[a-z]+' }, ['ok', 'No'])).toEqual(['pattern: "No" does not match the pattern "[a-z]+"'])
  })

  it('matches a url as stored — with https:// in front of an address written without one', () => {
    const orcid = { type: 'url', pattern: 'https://orcid\\.org/\\d{4}-\\d{4}-\\d{4}-\\d{3}[\\dX]' }
    expect(check(orcid, 'orcid.org/0000-0002-1825-0097')).toEqual([])
    expect(check(orcid, 'HTTPS://orcid.org/0000-0002-1825-0097')).toEqual([])
    expect(check(orcid, 'example.com/0000')).toHaveLength(1)
  })
})

describe('briefSectionName — the brief every reader agrees on with the lowering', () => {
  const norm = (sections) => validateAndNormalizeSchema({ sections }, '@/x')

  it('names a brief marked at the top', () => {
    expect(briefSectionName(norm({ a: { fields: { x: 'string' } }, b: { brief: true, fields: { y: 'string' } } }))).toBe('b')
  })

  it('names none when the brief is marked inside a group — never another section in its place', () => {
    const schema = norm({
      personal: { sections: { identity: { brief: true, fields: { name: 'string' } } } },
      profile: { fields: { bio: 'string' } },
    })
    expect(markedBriefPath(schema)).toBe('personal/identity')
    expect(briefSectionName(schema)).toBeNull()
  })

  it('with none marked, takes the first top-level single section not marked `brief: false`', () => {
    const schema = norm({ a: { brief: false, fields: { x: 'string' } }, b: { fields: { y: 'string' } } })
    expect(markedBriefPath(schema)).toBeNull()
    expect(briefSectionName(schema)).toBe('b')
  })
})
