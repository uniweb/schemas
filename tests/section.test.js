import { describe, test, expect } from 'vitest'
import { SECTION_PARAMS, isSectionParam } from '../src/section.js'

describe('SECTION_PARAMS', () => {
  test('names the settings of a section that framework applies', () => {
    expect(Object.keys(SECTION_PARAMS).sort()).toEqual(['background', 'grid', 'theme', 'vars'])
  })

  test('a component receives none of them as a param', () => {
    for (const [name, entry] of Object.entries(SECTION_PARAMS)) expect(entry.component, name).toBe(false)
  })

  test('cannot be changed by a consumer', () => {
    expect(Object.isFrozen(SECTION_PARAMS)).toBe(true)
    expect(Object.isFrozen(SECTION_PARAMS.grid)).toBe(true)
  })
})

describe('isSectionParam', () => {
  test('is true for a reserved name and false for any other', () => {
    expect(isSectionParam('grid')).toBe(true)
    expect(isSectionParam('theme')).toBe(true)
    expect(isSectionParam('vars')).toBe(true)
    expect(isSectionParam('layout')).toBe(false)
    expect(isSectionParam('toString')).toBe(false)
  })
})
