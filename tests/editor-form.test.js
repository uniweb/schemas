import { normalizeSchema } from '../src/editor-form.js'

// Moved here from `@uniweb/core` on 2026-09-01. The function is editor-only and
// core is loaded by every site in every lane, so it was being paid for by every
// visitor of every site. It never depended on core — it does not call
// `isRichSchema`, it re-inlines the same three checks — so the move is a
// relocation, not a refactor, and these assertions are unchanged.
describe('normalizeSchema', () => {
  // `isRichSchema` (which stays in core, for render-time dispatch) answers "is
  // this already rich?" — right for dispatch, wrong for "can this be edited".
  // Three authored shapes exist and it accepts one, rejecting a RESOLVED NAMED
  // REF, which is the first authoring form the docs show. That gap is this
  // function's whole reason to exist.
  it('converts a resolved named ref, whose fields are a MAP not an array', () => {
    const resolved = {
      name: 'P',
      fields: { title: { type: 'string' }, count: { type: 'int' } }
    }
    const norm = normalizeSchema(resolved)
    expect(norm.fields.map((f) => f.id)).toEqual(['title', 'count'])
    expect(norm.name).toBe('P') // siblings survive
  })

  it('preserves authored order, because a form shows fields in order', () => {
    const norm = normalizeSchema({
      fields: {
        z: { type: 'string' },
        a: { type: 'string' },
        m: { type: 'string' }
      }
    })
    expect(norm.fields.map((f) => f.id)).toEqual(['z', 'a', 'm'])
  })

  it('converts an inline field map', () => {
    expect(
      normalizeSchema({
        cpu: { type: 'string' },
        ram: { type: 'int' }
      }).fields.map((f) => f.id)
    ).toEqual(['cpu', 'ram'])
  })

  it('hands an already-rich schema back untouched', () => {
    const rich = { fields: [{ id: 'a', type: 'string' }] }
    expect(normalizeSchema(rich)).toBe(rich)
  })

  it('returns null for a sectioned Model — it is not one form', () => {
    // Flattening would invent a layout the author never expressed.
    expect(
      normalizeSchema({
        sections: { brief: { fields: { a: { type: 'string' } } } }
      })
    ).toBeNull()
  })

  it('does NOT invent a form out of an ordinary object', () => {
    // An earlier cut accepted the bare-type string shorthand in the no-`fields`
    // case, which made `{name, description}` a two-field form: without a
    // `fields` key there is nothing to distinguish `{cpu:'string'}` from
    // `{name:'Acme'}`.
    expect(normalizeSchema({ name: 'X', description: 'Y' })).toBeNull()
    expect(normalizeSchema({ cpu: 'string' })).toBeNull()
    expect(normalizeSchema({})).toBeNull()
    expect(normalizeSchema(null)).toBeNull()
    expect(normalizeSchema([])).toBeNull()
  })

  it('still accepts the shorthand when `fields` says they ARE fields', () => {
    expect(normalizeSchema({ fields: { cpu: 'string' } }).fields).toEqual([
      { id: 'cpu', type: 'string' }
    ])
  })
})

// Asserts the SUBPATH a consumer actually imports, not the module. Core's own
// suite learned this the expensive way: its tests imported `../src/schemas.js`
// directly, so they passed green while `import { normalizeSchema } from
// '@uniweb/core'` returned undefined and the frontend editor was blocked by it.
// A test that never goes through the path a consumer uses is testing a shape no
// consumer sees.
describe('public surface', () => {
  it('is reachable at the ./editor-form subpath declared in package.json', async () => {
    const pkg = await import('../package.json', { with: { type: 'json' } })
    expect(pkg.default.exports['./editor-form']).toBe('./src/editor-form.js')
    const mod = await import('../src/editor-form.js')
    expect(typeof mod.normalizeSchema).toBe('function')
  })
})
