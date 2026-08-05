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
  FORMAT_TYPES,
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
