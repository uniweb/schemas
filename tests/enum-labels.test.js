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

// A registry takes an entry as a value or `{ value, label }`, its label a plain string in the
// schema's source locale, and refuses anything else at register, naming the field. The build
// refuses the same, so an author meets it at their own screen [backend, 2026-11-23].
describe('what an entry may be', () => {
  const lower = (entries) => () =>
    validateAndNormalizeSchema({ name: 'post', fields: { status: { type: 'string', enum: entries } } }, '@/post')

  it('a value, or { value, label }, mixed — a number or a boolean as a value too', () => {
    expect(lower(['a', { value: 'b', label: 'B' }, { value: 'c' }, 1, { value: true, label: 'Yes' }])).not.toThrow()
  })

  it('refuses a label in several languages, saying where another language goes', () => {
    expect(lower([{ value: 'open', label: { en: 'Open', fr: 'Ouvert' } }])).toThrow(
      /field 'status' 'enum' entry 'open' has a label that is not a plain string.*'i18n', at section\.<path>\.field\.<key>\.option\.open\.label/
    )
  })

  it('refuses an entry with no value, or with a key of its own', () => {
    expect(lower([{ label: 'Open' }])).toThrow(/entry \{"label":"Open"\} has no value/)
    expect(lower([{ value: 'open', label: 'Open', icon: 'lu-door-open' }])).toThrow(/entry holds 'icon'/)
    expect(lower([['open']])).toThrow(/holds a list/)
  })

  it('refuses a value listed twice in a set with labels', () => {
    expect(lower([{ value: 'open', label: 'Open' }, { value: 'open', label: 'Opened' }])).toThrow(/lists "open" twice/)
  })

  it('CONTROL — a set of bare values is as before, a repeat included', () => {
    expect(lower(['a', 'b', 'a'])).not.toThrow()
  })
})
