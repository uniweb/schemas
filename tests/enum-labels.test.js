/**
 * ⭐ AN ENUM WRITTEN `{ value, label }` ALLOWS ITS VALUES.
 *
 * The label is what an editor shows; the value is what a record stores. Until 2026-09-26 the
 * check compared the entry itself, so every value of such an enum was rejected — and a push,
 * which gates on this check, refused every record holding one.
 */
import { describe, it, expect } from 'vitest'
import { validateBound } from '../src/conform.js'
import { validateAndNormalizeSchema, enumValues } from '../src/format.js'
import { sampleRecord } from '../src/starter/sample-record.js'

const STATUS = [
  { value: 'draft', label: 'Draft' },
  { value: 'live', label: 'Live' },
]
const schema = validateAndNormalizeSchema(
  { name: 'post', fields: { title: { type: 'string' }, status: { type: 'string', enum: STATUS } } },
  '@/post'
)

describe('an enum of `{ value, label }` entries', () => {
  it('reads each entry’s value, and a bare entry as itself', () => {
    expect(enumValues(STATUS)).toEqual(['draft', 'live'])
    expect(enumValues(['a', { value: 'b', label: 'B' }])).toEqual(['a', 'b'])
  })

  it('⭐ a record holding one of its values conforms', () => {
    expect(validateBound(schema, { title: 'Hi', status: 'live' })).toEqual([])
  })

  it('CONTROL — a value it does not list is refused, and the refusal names the values', () => {
    const violations = validateBound(schema, { title: 'Hi', status: 'Live' })
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe('"Live" is not one of ["draft", "live"]')
  })

  it('a starter record takes its first value, not the entry', () => {
    expect(sampleRecord(schema).status).toBe('draft')
  })
})
