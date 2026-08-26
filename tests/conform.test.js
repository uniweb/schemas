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
 * `validateItem` and `isStaticallyCheckable` are deliberately NOT widened to
 * cover this — both answer "does one RECORD match?", and `@uniweb/build` relies
 * on exactly that when it checks each concept-block item and each collection
 * record. A root-list schema applied per-item would mean the opposite of what it
 * says.
 */

import { describe, expect, it } from 'vitest'
import { rootListSection, validateBound, validateItem, isStaticallyCheckable } from '../src/conform.js'
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

describe('the per-record entry points are untouched', () => {
  it('validateItem still reports nothing for a root-list schema', () => {
    // Widening it would make the list apply per element of some outer list.
    expect(validateItem(norm(LIST), [{ label: 'Home' }, {}])).toEqual([])
  })

  it('isStaticallyCheckable still answers about a RECORD', () => {
    expect(isStaticallyCheckable(norm(LIST))).toBe(false)
    expect(isStaticallyCheckable(norm({ fields: { a: 'string' } }))).toBe(true)
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
