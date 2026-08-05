/**
 * The package's public API — `validate`, `applyDefaults`, `getDefaults`.
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
import { validate, applyDefaults, getDefaults, schemas } from '../src/index.js'

const paths = (result) => result.errors.map((e) => `${e.path}:${e.rule}`)

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

  it('a sections-form schema yields its defaults (was: {})', () => {
    // `status` is declared in `article_body`, a non-brief single section. A flat
    // record carries it, so a flat record's defaults must include it.
    expect(getDefaults('article')).toMatchObject({ status: 'published', featured: false })
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
    // `values:` is what `@std/form` is built on — `fields` keyed by the author's
    // own field names. The old reader only descended into `fields`, so a form
    // with a typeless control passed.
    expect(paths(validate({ fields: { a: { label: 'nameless' } } }, 'form'))).toEqual([
      'fields.a.type:required',
    ])
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
    expect(paths(validate({ title: 'T', status: 'nope' }, 'article'))).toContain('status:enum')
    expect(paths(validate({ name: 'A', email: 'not-an-email' }, 'person'))).toContain('email:format')
  })

  it('does not flag an absent optional field', () => {
    expect(validate({ name: 'A' }, 'person')).toEqual({ valid: true, errors: [] })
  })

  it('names the entry in an open map, not just the field', () => {
    // A twenty-field form with "expected string" and no key is unactionable.
    expect(paths(validate({ fields: { email: { type: 'string', required: 'yes' } } }, 'form'))).toEqual([
      'fields.email.required:type',
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

describe('defaults', () => {
  it('fills declared defaults without overwriting supplied values', () => {
    const filled = applyDefaults({ name: 'Ada', featured: true }, 'person')
    expect(filled).toMatchObject({ name: 'Ada', featured: true })
  })

  it('fills a default the record omits', () => {
    expect(applyDefaults({ name: 'Ada' }, 'person').featured).toBe(false)
  })

  it('does not mutate the input', () => {
    const input = { name: 'Ada' }
    applyDefaults(input, 'person')
    expect(input).toEqual({ name: 'Ada' })
  })

  it('materializes a nested record when the nested shape has defaults', () => {
    expect(getDefaults('article').seo).toEqual({ noindex: false })
  })

  it('applies item defaults to the elements of a list that exists', () => {
    const schema = {
      name: 'team',
      fields: {
        people: { type: 'object', many: true, fields: { name: 'string', active: { type: 'bool', default: true } } },
      },
    }
    expect(applyDefaults({ people: [{ name: 'Ada' }] }, schema).people).toEqual([{ name: 'Ada', active: true }])
  })

  it('does not invent a list element that is not there', () => {
    const schema = {
      name: 'team',
      fields: { people: { type: 'object', many: true, fields: { active: { type: 'bool', default: true } } } },
    }
    expect(applyDefaults({}, schema).people).toBeUndefined()
  })

  it('applies value-shape defaults to each entry of an open map', () => {
    const schema = {
      name: 'f',
      fields: {
        controls: {
          type: 'object',
          values: { type: 'object', fields: { type: 'string', required: { type: 'bool', default: false } } },
        },
      },
    }
    expect(applyDefaults({ controls: { email: { type: 'string' } } }, schema).controls).toEqual({
      email: { type: 'string', required: false },
    })
  })
})
