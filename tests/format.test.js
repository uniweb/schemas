/**
 * The format lives here now — so it is tested here.
 *
 * `@uniweb/build` has the deep normalizer suite (`resolve-data-schema.test.js`),
 * and it still passes, because it exercises this code through the build's
 * re-export. This file is not a copy of it. It covers the two things that are
 * true *only* of this package:
 *
 *   1. the format is reachable from here at all (the export surface build and
 *      every foundation depend on), and
 *   2. every schema this package SHIPS is valid in the format this package
 *      DEFINES — a self-consistency check that had no home while the two halves
 *      lived in different packages.
 */

import { describe, expect, it } from 'vitest'
import {
  validateAndNormalizeSchema,
  flatRecordFields,
  parseSchemaRef,
  SCALAR_KINDS,
  STRUCTURAL_KINDS,
  FORMAT_TYPES,
  AUTHORING_TYPES,
} from '../src/index.js'
import { schemas, getSchemaNames } from '../src/index.js'

describe('the format is exported from this package', () => {
  it('exposes the vocabulary the conformance checker pairs with', () => {
    // Not a tautology: `conform.js` throws at module load if a scalar kind has no
    // conformance predicate, so importing at all proves the pair agrees.
    expect(SCALAR_KINDS.has('decimal')).toBe(true)
    expect(SCALAR_KINDS.has('richtext')).toBe(false) // an alias, never a kind
    expect(FORMAT_TYPES.has('richtext')).toBe(true)
  })

  it('AUTHORING_TYPES is the whole vocabulary, and is derived from it', () => {
    // Derived rather than listed, so adding a kind cannot leave a copy behind.
    // It exists because the set had only ever been an expression inside the
    // "unknown type" error — meaning anything else that wanted it (a schema
    // constraining a `type` field, a doc, a tool) had to restate it.
    for (const kind of SCALAR_KINDS) expect(AUTHORING_TYPES.has(kind)).toBe(true)
    for (const kind of STRUCTURAL_KINDS) expect(AUTHORING_TYPES.has(kind)).toBe(true)
    for (const alias of FORMAT_TYPES) expect(AUTHORING_TYPES.has(alias)).toBe(true)
    // The friendly aliases are not separately exported; assert the folding words.
    for (const alias of ['number', 'integer', 'boolean', 'image']) {
      expect(AUTHORING_TYPES.has(alias)).toBe(true)
    }
    expect(AUTHORING_TYPES.has('richtext')).toBe(true) // an alias, never a kind
  })

  it('every word in it is actually accepted by the normalizer', () => {
    // The set would be worthless if it advertised a word the normalizer rejects.
    for (const word of AUTHORING_TYPES) {
      const spec = word === 'object' ? { type: word, fields: { a: 'string' } }
        : word === 'ref' ? { type: word, ref: '@/x' }
        : { type: word }
      expect(() => validateAndNormalizeSchema({ fields: { f: spec } }, '@/x'), `type: ${word}`).not.toThrow()
    }
  })

  it('the unknown-type error lists the set rather than a copy of it', () => {
    let message = ''
    try {
      validateAndNormalizeSchema({ fields: { f: { type: 'nonsense' } } }, '@/x')
    } catch (e) {
      message = e.message
    }
    for (const word of AUTHORING_TYPES) expect(message).toContain(word)
  })

  it('parses refs by namespace', () => {
    expect(parseSchemaRef('@/member')).toEqual({ scope: '', name: 'member' })
    expect(parseSchemaRef('@std/person')).toEqual({ scope: 'std', name: 'person' })
    expect(() => parseSchemaRef('person')).toThrow(/must start with '@'/)
  })
})

describe('every shipped standard is valid in this format', () => {
  const names = getSchemaNames()

  it('ships at least one standard', () => {
    expect(names.length).toBeGreaterThan(0)
  })

  it.each(names)("'%s' normalizes without throwing", (name) => {
    const out = validateAndNormalizeSchema(schemas[name], `@std/${name}`)
    // Exactly one of the two structural forms, never both.
    expect(out.fields !== undefined).not.toBe(out.sections !== undefined)
    expect(out.name).toBe(schemas[name].name)
  })
})

/**
 * `label` and `description` are plain strings at every tier.
 *
 * They are carried inline as the SOURCE-LOCALE string; other locales live in
 * translation rows. So `label: { en: 'Name' }` is not a shorthand — it is a
 * different shape, and the registry rejects it. Catching it here is the whole
 * point: the author sees it at their own screen rather than as a publish failure.
 *
 * This belongs at build time because it is a type check in our OWN format — the
 * same class as the checks on `many`, `tree`, `enum` and `options` — rather than a
 * rule that merely reflects what a downstream consumer has no slot for. Those are
 * deliberately NOT build errors, because a project that never registers should
 * still build.
 */
describe('label and description must be plain strings', () => {
  const norm = (s) => () => validateAndNormalizeSchema(s, '@/x')

  it('rejects a per-locale object on a field', () => {
    expect(norm({ fields: { a: { type: 'string', label: { en: 'Name' } } } })).toThrow(
      /'label' on 'a' must be a plain string, got an object/
    )
  })

  it('rejects one on a section, which carries prose too', () => {
    expect(norm({ sections: { s: { label: { en: 'Identity' }, fields: { a: 'string' } } } })).toThrow(
      /'label' on 'sections.s' must be a plain string/
    )
  })

  it('rejects a list, and says where translations actually live', () => {
    expect(norm({ fields: { a: { type: 'string', description: ['x'] } } })).toThrow(/got a list/)
    expect(norm({ fields: { a: { type: 'string', description: ['x'] } } })).toThrow(/locales\/ folder/)
  })

  it('accepts a plain string, which is the whole supported shape', () => {
    const out = validateAndNormalizeSchema({ fields: { a: { type: 'string', label: 'Name' } } }, '@/x')
    expect(out.fields.a.label).toBe('Name')
  })
})

describe('constraints', () => {
  it('are carried on a field, for the section it lowers into', () => {
    const out = validateAndNormalizeSchema(
      { fields: { a: { type: 'object', constraints: [{ kind: 'min_items', value: 1 }], fields: { b: 'string' } } } },
      '@/x'
    )
    expect(out.fields.a.constraints).toEqual([{ kind: 'min_items', value: 1 }])
  })

  it('must be a list, on a field and on a section alike', () => {
    expect(() =>
      validateAndNormalizeSchema({ fields: { a: { type: 'object', constraints: 'min_items', fields: { b: 'string' } } } }, '@/x')
    ).toThrow(/'constraints' must be a list/)
    expect(() =>
      validateAndNormalizeSchema({ sections: { s: { constraints: {}, fields: { a: 'string' } } } }, '@/x')
    ).toThrow(/'constraints' must be a list/)
  })
})

/**
 * `tree` / `append_only` on a field are validated the way `normalizeSection`
 * validates them, because a section-shaped field becomes a section.
 *
 * These reject rather than drop — and the distinction from `constraints` on a leaf
 * is deliberate. A leaf constraint is well-formed authoring the registry has no
 * slot for, so failing a build over it would punish a project that never
 * registers. `tree: true` on a single object is not that: it is a statement that
 * cannot be true at any tier, so saying so is the only useful response.
 */
describe('tree and append_only describe a list of records', () => {
  const norm = (f) => () => validateAndNormalizeSchema({ fields: { f } }, '@/x')
  const ok = (f) => validateAndNormalizeSchema({ fields: { f } }, '@/x').fields.f

  it('normalizes the friendly `tree` to the IR `nestable`', () => {
    expect(ok({ type: 'object', many: true, tree: true, fields: { a: 'string' } }).nestable).toBe(true)
    expect(ok({ type: 'object', many: true, nestable: true, fields: { a: 'string' } }).nestable).toBe(true)
  })

  it('rejects them on a single object — it cannot nest under itself', () => {
    expect(norm({ type: 'object', tree: true, fields: { a: 'string' } })).toThrow(/describes a list of records/)
    expect(norm({ type: 'object', append_only: true, fields: { a: 'string' } })).toThrow(/describes a list of records/)
  })

  it('rejects them on a list of plain values', () => {
    expect(norm({ type: 'string', many: true, tree: true })).toThrow(/describes a list of records/)
  })

  it('rejects a non-boolean', () => {
    expect(norm({ type: 'object', many: true, tree: 'yes', fields: { a: 'string' } })).toThrow(/must be a boolean/)
  })

  it('leaves `false` as the no-op it is', () => {
    expect(ok({ type: 'object', many: true, tree: false, fields: { a: 'string' } })).not.toHaveProperty('nestable')
  })
})

describe('flatRecordFields — the surface one source file can populate', () => {
  it('is the field map itself for a fields-form schema', () => {
    const norm = validateAndNormalizeSchema({ fields: { a: 'string' } }, '@/x')
    expect(Object.keys(flatRecordFields(norm))).toEqual(['a'])
  })

  it('unions the SINGLE sections of a sections-form schema', () => {
    // `@std/article` splits the card (`article`) from the body (`article_body`)
    // so a reference card never drags the ProseMirror body along. A source file
    // still carries both, which is the whole point of this function.
    const norm = validateAndNormalizeSchema(schemas.article, '@std/article')
    const keys = Object.keys(flatRecordFields(norm))
    expect(keys).toContain('title') // from the brief section
    expect(keys).toContain('content') // from the body section
  })

  it('skips multi sections — a list cannot be expressed by one flat record', () => {
    const norm = validateAndNormalizeSchema(
      {
        sections: {
          identity: { brief: true, fields: { name: 'string' } },
          chapters: { many: true, fields: { heading: 'string' } },
        },
      },
      '@/handbook'
    )
    expect(Object.keys(flatRecordFields(norm))).toEqual(['name'])
  })

  it('returns null when a schema has no flat-record surface at all', () => {
    // `@std/nav` is one `many: true` section and nothing else. There is no
    // single record to check, and saying so beats inventing one.
    const norm = validateAndNormalizeSchema(schemas.nav, '@std/nav')
    expect(flatRecordFields(norm)).toBeNull()
  })

  it('keeps the first occurrence when two sections declare one name', () => {
    const norm = validateAndNormalizeSchema(
      {
        sections: {
          a: { brief: true, fields: { title: { type: 'string', description: 'first' } } },
          b: { fields: { title: { type: 'string', description: 'second' } } },
        },
      },
      '@/x'
    )
    expect(flatRecordFields(norm).title.description).toBe('first')
  })
})
