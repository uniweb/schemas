import { readFileSync } from 'node:fs'
import { qualifyRef } from '../src/refs.js'
import { qualifyRef as fromFoundation } from '../src/foundation.js'
import { qualifyRef as fromIndex } from '../src/index.js'

describe('qualifyRef — `@/x` named in full', () => {
  it('a foundation’s own type takes its scope, written any way', () => {
    expect(qualifyRef('@/member', '@acme')).toBe('@acme/member')
    expect(qualifyRef('@/member', 'acme')).toBe('@acme/member')
    expect(qualifyRef('@/member', '@acme/marketing')).toBe('@acme/member')
  })

  it('any other ref is as given', () => {
    expect(qualifyRef('@std/person', '@acme')).toBe('@std/person')
    expect(qualifyRef('@other/member', '@acme')).toBe('@other/member')
  })

  it('with no scope — an unscoped foundation, or one being developed — `@/x` is as written', () => {
    for (const scope of [undefined, null, '', '@']) expect(qualifyRef('@/member', scope)).toBe('@/member')
  })

  it('is one function, wherever it is imported from', () => {
    expect(fromFoundation).toBe(qualifyRef)
    expect(fromIndex).toBe(qualifyRef)
  })

  it('⭐ imports nothing — a foundation bundle that names its own types carries this file alone', () => {
    const source = readFileSync(new URL('../src/refs.js', import.meta.url), 'utf8')
    expect(source).not.toMatch(/^\s*(import|export\s.*\sfrom)\s/m)
  })
})
