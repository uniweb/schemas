import { describe, test, expect } from 'vitest'
import { SECTION_PARAMS, isSectionParam, SECTION_KEYS, isSectionKey } from '../src/section.js'

describe('SECTION_PARAMS', () => {
  test('names the settings of a section that framework applies', () => {
    expect(Object.keys(SECTION_PARAMS).sort()).toEqual(['background', 'fetch', 'grid', 'theme', 'vars'])
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

describe('SECTION_KEYS', () => {
  it('names the frontmatter keys that are not params', () => {
    expect(Object.keys(SECTION_KEYS).sort()).toEqual(['data', 'hidden', 'id', 'input', 'preset', 'props', 'query', 'type'])
  })

  it('shares no name with SECTION_PARAMS — a key is one or the other', () => {
    for (const name of Object.keys(SECTION_KEYS)) expect(isSectionParam(name), name).toBe(false)
  })

  it('says what each key is, and is frozen', () => {
    for (const [name, entry] of Object.entries(SECTION_KEYS)) expect(typeof entry.is, name).toBe('string')
    expect(Object.isFrozen(SECTION_KEYS)).toBe(true)
    expect(Object.isFrozen(SECTION_KEYS.type)).toBe(true)
  })
})

describe('isSectionKey', () => {
  it('is true for a key that is not a param, and false otherwise', () => {
    expect(isSectionKey('type')).toBe(true)
    expect(isSectionKey('props')).toBe(true)
    expect(isSectionKey('theme')).toBe(false)
    expect(isSectionKey('layout')).toBe(false)
    expect(isSectionKey('toString')).toBe(false)
  })
})
