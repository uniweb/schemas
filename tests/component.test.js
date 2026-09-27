import { describe, test, expect } from 'vitest'
import { describeChildren, describeVisuals, describePlacement, inferTitle } from '../src/component.js'

describe('inferTitle', () => {
  test('splits a PascalCase name into words, keeping acronyms whole', () => {
    expect(inferTitle('TeamRoster')).toBe('Team Roster')
    expect(inferTitle('CTA')).toBe('CTA')
    expect(inferTitle('FAQSection')).toBe('FAQ Section')
    expect(inferTitle('Hero')).toBe('Hero')
  })
})

describe('describePlacement', () => {
  test('a component with no `inset` is a section only', () => {
    expect(describePlacement({ name: 'Hero' })).toEqual({ section: true, inset: false })
  })

  test('`inset: true` is an inset only', () => {
    expect(describePlacement({ inset: true })).toEqual({ section: false, inset: true })
  })

  test('`inset: true, section: true` is both', () => {
    expect(describePlacement({ inset: true, section: true })).toEqual({ section: true, inset: true })
  })

  test('`section` means nothing without `inset: true`', () => {
    expect(describePlacement({ section: false })).toEqual({ section: true, inset: false })
    expect(describePlacement({ inset: 'yes', section: false })).toEqual({ section: true, inset: false })
  })
})

describe('describeChildren', () => {
  const nothing = { declared: false, label: null, hint: null, min: null, max: null, types: null, grid: null, problems: [] }

  test('no declaration is unknown — declared: false, never an empty offer', () => {
    expect(describeChildren({ name: 'Hero' })).toEqual(nothing)
    expect(describeChildren({ children: false })).toEqual(nothing)
    expect(describeChildren(null)).toEqual(nothing)
  })

  test('the shorthands', () => {
    expect(describeChildren({ children: true })).toMatchObject({ declared: true, max: null, types: null })
    expect(describeChildren({ children: 'many' })).toMatchObject({ declared: true, max: null })
    expect(describeChildren({ children: 3 })).toMatchObject({ declared: true, max: 3, problems: [] })
  })

  test('the object form', () => {
    const d = describeChildren({
      children: { label: 'Tab panels', hint: 'One per tab', min: 2, max: 8, types: ['TabPanel'] },
    })
    expect(d).toMatchObject({
      declared: true, label: 'Tab panels', hint: 'One per tab', min: 2, max: 8, types: ['TabPanel'], grid: null,
    })
    expect(d.problems).toEqual([])
  })

  test('a label or hint may be written in several languages, and comes back as written', () => {
    const label = { en: 'Tab panels', fr: 'Panneaux' }
    const d = describeChildren({ children: { label, hint: 'One per tab' } })
    expect(d.label).toEqual(label)
    expect(d.hint).toBe('One per tab')
    expect(d.problems).toEqual([])
  })

  test('a label that is neither text nor a map of text is a problem', () => {
    for (const label of [3, { en: 3 }, {}, ['a']]) {
      const d = describeChildren({ children: { label } })
      expect(d.label, JSON.stringify(label)).toBeNull()
      expect(d.problems).toHaveLength(1)
    }
  })

  test('one type may be written without a list', () => {
    expect(describeChildren({ children: { types: 'Card' } }).types).toEqual(['Card'])
  })

  test('grid lists the layouts offered, each with the template kit renders', () => {
    const { grid, problems } = describeChildren({ children: { grid: [2, 3, '40/60'] } })
    expect(problems).toEqual([])
    expect(grid).toEqual([
      { value: 2, columns: 2, widths: [1, 1], template: 'repeat(2, minmax(0, 1fr))' },
      { value: 3, columns: 3, widths: [1, 1, 1], template: 'repeat(3, minmax(0, 1fr))' },
      { value: '40/60', columns: 2, widths: [40, 60], template: 'minmax(0, 40fr) minmax(0, 60fr)' },
    ])
  })

  test('a single grid value offers one layout', () => {
    expect(describeChildren({ children: { grid: '60/40' } }).grid).toHaveLength(1)
  })

  test('what cannot be read is said, and the rest still comes back', () => {
    const d = describeChildren({ children: { label: 'Items', min: 5, max: 2, grid: [2, '40/'], colums: 3 } })
    expect(d.label).toBe('Items')
    expect(d.grid).toHaveLength(1)
    expect(d.problems.join('\n')).toMatch(/children\.colums/)
    expect(d.problems.join('\n')).toMatch(/min.*more than.*max/)
    expect(d.problems.join('\n')).toMatch(/"40\/"/)
  })

  test('a malformed declaration is declared, with a problem', () => {
    const d = describeChildren({ children: 0 })
    expect(d.declared).toBe(true)
    expect(d.problems).toHaveLength(1)
  })
})

describe('describeVisuals', () => {
  test('no declaration is unknown', () => {
    expect(describeVisuals({ name: 'Hero' })).toEqual({ declared: false, max: null, types: null, problems: [] })
  })

  test('a count is up to that many, any type', () => {
    expect(describeVisuals({ visuals: 1 })).toEqual({ declared: true, max: 1, types: null, problems: [] })
  })

  test("'many' is any number, any type", () => {
    expect(describeVisuals({ visuals: 'many' })).toEqual({ declared: true, max: null, types: null, problems: [] })
  })

  test('a type, or a list of them, is one visual of those types', () => {
    expect(describeVisuals({ visuals: 'video' })).toMatchObject({ max: 1, types: ['video'] })
    expect(describeVisuals({ visuals: ['image', 'video'] })).toMatchObject({ max: 1, types: ['image', 'video'] })
  })

  test('the object form: count and types, one when no count is given', () => {
    expect(describeVisuals({ visuals: { types: ['image'], count: 'many' } })).toMatchObject({ max: null, types: ['image'] })
    expect(describeVisuals({ visuals: { types: 'inset', count: 2 } })).toMatchObject({ max: 2, types: ['inset'] })
    expect(describeVisuals({ visuals: { types: ['image'] } })).toMatchObject({ max: 1 })
  })

  test('an unknown type is a problem, and the known ones stand', () => {
    const d = describeVisuals({ visuals: ['image', 'chart'] })
    expect(d.types).toEqual(['image'])
    expect(d.problems.join('\n')).toMatch(/chart/)
  })
})
