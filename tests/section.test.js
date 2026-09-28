import { describe, test, expect } from 'vitest'
import { SECTION_PARAMS, isSectionParam } from '../src/section.js'

describe('SECTION_PARAMS', () => {
  test('names what the runtime reads from a section’s params', () => {
    expect(Object.keys(SECTION_PARAMS).sort()).toEqual(['background', 'grid', 'theme'])
  })

  test('says which ones the component also receives', () => {
    expect(SECTION_PARAMS.grid.component).toBe(false)
    expect(SECTION_PARAMS.background.component).toBe(true)
    expect(SECTION_PARAMS.theme.component).toBe(true)
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
    expect(isSectionParam('layout')).toBe(false)
    expect(isSectionParam('toString')).toBe(false)
  })
})
