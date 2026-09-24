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
} from '../src/conform.js'
import { validateAndNormalizeSchema } from '../src/format.js'
import { validate, applyDefaults, getDefaults, nav } from '../src/index.js'

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

  it('applies its per-item defaults to each entry', () => {
    // `target: '_self'`, `hidden: false`, `current: false` are declared per item;
    // applying them means applying them to every element.
    const out = applyDefaults([{ label: 'Home' }, { label: 'Docs' }], 'nav')
    expect(out).toEqual([
      { label: 'Home', target: '_self', hidden: false, current: false },
      { label: 'Docs', target: '_self', hidden: false, current: false },
    ])
  })

  it('reports its defaults as the record defaults they are', () => {
    expect(getDefaults('nav')).toMatchObject({ target: '_self', hidden: false, current: false })
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
