import { describe, it, expect } from 'vitest'
import { patternRefusal, matchesPattern } from '../src/pattern.js'

// The syntax a registry reads, refused here first (2026-10-15). The whole of its answers — every
// construct it refuses and every value each accepted pattern matches — is checked where a copy of
// them is at hand; this pins the shape of the rule.
describe('patternRefusal', () => {
  it.each(['[A-Z]{2}\\d{4}', '\\d{5}(-\\d{4})?', '(?:a|b)+?', '[\\w\\-]+', '[a^]', '/', 'a|b|', '\\u{1F600}', '[😀-😂]'])(
    'reads %s',
    (pattern) => {
      expect(patternRefusal(pattern)).toBeNull()
    }
  )

  it.each([
    ['(?=a)', /look-around/],
    ['(?<name>a)', /names a group/],
    ['(?i)a', /sets a flag/],
    ['\\p{L}', /Unicode property class/],
    ['[a&&b]', /combines classes/],
    ['[..]', /`v` flag reserves/],
    ['[-a]', /a `-` that ends no range/],
    ['a**', /repeats a repetition/],
    ['^*', /repeats an anchor/],
    ['\\A', /uses `\\A`/],
    ['\\uD83D', /half of a character/],
    ['(a', /never closes/],
    ['a)', /never opened/],
  ])('refuses %s', (pattern, why) => {
    expect(patternRefusal(pattern)).toMatch(why)
  })
})

describe('matchesPattern', () => {
  it('matches the whole value', () => {
    expect(matchesPattern('[0-9]{4}', '2024')).toBe(true)
    expect(matchesPattern('[0-9]{4}', 'in 2024')).toBe(false)
    expect(matchesPattern('a|b', 'ab')).toBe(false)
  })

  it('reads a character outside the BMP as one character', () => {
    expect(matchesPattern('.', '😀')).toBe(true)
  })
})
