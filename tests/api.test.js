/**
 * The package's public API — `validate`, and the standard schemas it ships.
 *
 * Every case in the first block is a REGRESSION. Each one used to give a wrong
 * answer, and none of them was caught, because this package shipped no tests and
 * its utilities were a second, simplified reader of a format that had moved on
 * without them. They are written as the wrong answers they used to give, so a
 * future edit that reintroduces a private reader fails here loudly.
 *
 * The root cause, recorded so the fix is not undone: the format's normalizer and
 * conformance checker lived in `@uniweb/build`, which a foundation cannot depend
 * on (it pulls Vite, esbuild, sharp). Anything wanting to *understand* a schema
 * therefore reimplemented it. Both now live in this package and the build
 * re-exports them — one implementation, in the leaf everyone can reach.
 */

import { describe, expect, it } from 'vitest'
import * as api from '../src/index.js'

const { validate, schemas } = api

const paths = (result) => result.errors.map((e) => `${e.path}:${e.rule}`)

/** A map whose keys belong to the author — the shape `values:` exists for. */
const OPEN_MAP = {
  name: 'open',
  fields: {
    m: {
      type: 'object',
      values: { type: 'object', fields: { type: { type: 'string', required: true }, required: { type: 'bool' } } },
    },
  },
}

describe('regressions — answers this API used to get wrong', () => {
  it('a `many: true` field accepts a list (was: "Expected string, got object")', () => {
    // The old reader never learned `many:`, so it checked the LIST against the
    // ITEM type and reported a failure on correct data — the worst kind of bug in
    // a validator, because it teaches you to stop trusting it.
    expect(validate({ title: 'T', tags: ['a', 'b'] }, 'project')).toEqual({ valid: true, errors: [] })
  })

  it('a sections-form schema actually checks the record (was: silently valid)', () => {
    // `if (!schema.fields) return { valid: true }` — so `@std/article` and
    // `@std/nav` passed anything at all, including nothing at all.
    expect(paths(validate({}, 'article'))).toContain('title:required')
    expect(paths(validate({ title: 42 }, 'article'))).toContain('title:type')
  })

  it('canonical kinds are type-checked (was: no case in the switch)', () => {
    // `@std/nav` writes `int` and `bool` — the canonical spellings. The old
    // reader's switch knew only the friendly words, so these fell through to "no
    // check at all" while looking like they were covered.
    const navItem = { fields: schemas.nav.sections.items.fields }
    expect(paths(validate({ label: 'Home', order: 'first', hidden: 'yes' }, navItem))).toEqual([
      'order:type',
      'hidden:type',
    ])
  })

  it('an open map validates each entry (was: unvisited)', () => {
    // `values:` describes a map whose keys belong to the author. The old reader
    // only descended into `fields`, so every entry of such a map went unchecked.
    //
    // Uses a schema of its own rather than a standard: this was written against
    // `@std/form` v1, which was built on `values:` — and v2 is a list of controls,
    // so borrowing it made a test of the CONSTRUCT depend on one schema's shape.
    // `values:` is still in the vocabulary; it just has no standard using it today.
    expect(paths(validate({ m: { a: { label: 'nameless' } } }, OPEN_MAP))).toEqual(['m.a.type:required'])
  })
})

describe('validate', () => {
  it('accepts the friendly authoring vocabulary', () => {
    const schema = {
      name: 'thing',
      fields: {
        count: { type: 'number' },
        live: { type: 'boolean' },
        cover: { type: 'image' },
        site: { type: 'url' },
        body: { type: 'markdown' },
      },
    }
    expect(validate({ count: 2, live: true, cover: '/a.png', site: '/x', body: '# hi' }, schema).valid).toBe(true)
    // `number` folds to `decimal`, so the finding speaks the canonical kind.
    expect(paths(validate({ count: 'two' }, schema))).toEqual(['count:type'])
    expect(validate({ count: 'two' }, schema).errors[0].message).toMatch(/expected decimal/)
  })

  it('reports enum and format violations', () => {
    expect(paths(validate({ title: 'T', status: 'nope' }, 'event'))).toContain('status:enum')
    expect(paths(validate({ name: 'A', email: 'not-an-email' }, 'person'))).toContain('email:format')
  })

  it('does not flag an absent optional field', () => {
    expect(validate({ name: 'A' }, 'person')).toEqual({ valid: true, errors: [] })
  })

  it('names the entry in an open map, not just the field', () => {
    // "expected string" with no key is unactionable on a map of twenty entries.
    expect(paths(validate({ m: { email: { type: 'string', required: 'yes' } } }, OPEN_MAP))).toEqual([
      'm.email.required:type',
    ])
  })

  it('reports an unknown schema name rather than throwing', () => {
    expect(validate({}, 'nonesuch').valid).toBe(false)
  })

  it('throws on a malformed schema — that is a programming error, not a finding', () => {
    // Reporting `valid: true` for a schema nobody could read is how the old
    // behavior hid itself. A bad schema names its own offending field.
    expect(() => validate({}, { fields: { a: { type: 'nonsense' } } })).toThrow(/unknown type 'nonsense'/)
    expect(() => validate({}, { name: 'x' })).toThrow(/must declare 'fields' or 'sections'/)
  })

  it('checks a schema whose root is a LIST against the list it declared', () => {
    // This used to assert the opposite — that `@std/nav` had nothing to say —
    // on the reasoning that checking it against a record shape would be
    // inventing one. True as far as it went, and it hid the real gap: nav
    // never claimed a record shape, it claimed a LIST, and nothing checked
    // that either. See conform.test.js for the rule.
    expect(validate({ anything: true }, 'nav').errors.map((e) => e.rule)).toEqual(['type'])
    expect(validate([{ label: 'Home' }], 'nav')).toEqual({ valid: true, errors: [] })
  })
})

describe('no defaults', () => {
  // A named data schema declares no default (2026-10-05): a record reaches a component as it
  // is, and what an absent field renders as is the component's choice. The build refuses a
  // named schema that declares one, so a standard that did would refuse every foundation
  // binding it.
  const withDefaults = (schema) => {
    const found = []
    const spec = (s, path) => {
      if (!s || typeof s !== 'object') return
      if (Object.hasOwn(s, 'default')) found.push(path)
      fields(s.fields, `${path}.`)
      spec(s.items, `${path}[]`)
      spec(s.values, `${path}{}`)
    }
    const fields = (map, prefix) => {
      if (!map || typeof map !== 'object' || Array.isArray(map)) return
      for (const [name, s] of Object.entries(map)) spec(s, `${prefix}${name}`)
    }
    const sections = (map, prefix) => {
      for (const [name, section] of Object.entries(map || {})) {
        fields(section.fields, `${prefix}${name}.`)
        sections(section.sections, `${prefix}${name}.`)
      }
    }
    fields(schema.fields, '')
    sections(schema.sections, '')
    return found
  }

  it.each(Object.keys(schemas))('@std/%s declares no default', (name) => {
    expect(withDefaults(schemas[name])).toEqual([])
  })

  it('CONTROL — the walk finds a default where one is declared', () => {
    const schema = {
      fields: {
        a: { type: 'string', default: 'x' },
        b: { type: 'object', fields: { c: { type: 'bool', default: false } } },
      },
    }
    expect(withDefaults(schema)).toEqual(['a', 'b.c'])
  })

  it("a field NAMED `default` is not a default — @std/form keeps a control's starting value", () => {
    expect(withDefaults(schemas.form)).toEqual([])
    expect(JSON.stringify(schemas.form)).toContain('"default":{"type":"json"')
  })

  it('applyDefaults and getDefaults are gone', () => {
    expect(api).not.toHaveProperty('applyDefaults')
    expect(api).not.toHaveProperty('getDefaults')
  })
})
