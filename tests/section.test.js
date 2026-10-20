import { describe, test, expect } from 'vitest'
import { SECTION_PARAMS, isSectionParam, SECTION_KEYS, isSectionKey, stickyDeclaration } from '../src/section.js'

describe('SECTION_PARAMS', () => {
  test('names the settings of a section that framework applies', () => {
    expect(Object.keys(SECTION_PARAMS).sort()).toEqual(['background', 'fetch', 'grid', 'sticky', 'theme', 'vars'])
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
    expect(isSectionParam('sticky')).toBe(true)
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

describe("stickyDeclaration — a section type's `sticky`, in one shape", () => {
  test('writes every declaration as { default }, with `top` when the type has one', () => {
    expect(stickyDeclaration(true)).toEqual({ default: true })
    expect(stickyDeclaration(false)).toEqual({ default: false })
    expect(stickyDeclaration({})).toEqual({ default: false })
    expect(stickyDeclaration({ default: true })).toEqual({ default: true })
    expect(stickyDeclaration({ top: '4rem' })).toEqual({ default: false, top: '4rem' })
    expect(stickyDeclaration({ default: true, top: ' var(--header-height) ' })).toEqual({ default: true, top: 'var(--header-height)' })
  })

  test('never fills `top` in — without one, the runtime places the section', () => {
    expect('top' in stickyDeclaration(true)).toBe(false)
    expect('top' in stickyDeclaration({ default: true })).toBe(false)
  })

  test('reads its own shape back as itself', () => {
    for (const declared of [true, false, {}, { top: '4rem' }, { default: true, top: ' 2rem ' }]) {
      const once = stickyDeclaration(declared)
      expect(stickyDeclaration(once), JSON.stringify(declared)).toEqual(once)
    }
  })

  test('refuses any other shape, and a `top` that is more than one CSS value', () => {
    expect(() => stickyDeclaration('yes')).toThrow(/^Invalid 'sticky': write true, false or \{ default, top \}/)
    expect(() => stickyDeclaration(null)).toThrow(/Invalid 'sticky'/)
    expect(() => stickyDeclaration([true])).toThrow(/Invalid 'sticky'/)
    expect(() => stickyDeclaration({ default: true, offset: '4rem' })).toThrow(/offset — it takes default and top/)
    expect(() => stickyDeclaration({ default: 'yes' })).toThrow(/sticky\.default/)
    expect(() => stickyDeclaration({ top: '' })).toThrow(/sticky\.top/)
    expect(() => stickyDeclaration({ top: 4 })).toThrow(/sticky\.top/)
    expect(() => stickyDeclaration({ top: '0; background: red' })).toThrow(/sticky\.top/)
  })
})
