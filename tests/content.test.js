import { describe, test, expect } from 'vitest'
import { markdownToProseMirror } from '@uniweb/content-reader'
import { parseContent } from '@uniweb/semantic-parser'
import {
  describeContent, parseExpectation, declarationKey,
  CONTENT_KINDS, CONTENT_ELEMENTS, elementSpec,
} from '../src/content.js'

describe('describeContent', () => {
  test('an element carries what a UI needs to draw it', () => {
    const [el] = describeContent({ name: 'X', content: { title: 'Headline' } }).elements
    expect(el).toMatchObject({
      key: 'title',
      declaredAs: 'title',
      label: 'Headline',
      labelSource: 'declared',
      kind: 'heading',
      arity: { repeatable: false, required: false },
    })
    expect(typeof el.syntax).toBe('string')
  })

  test('elements come back in declaration order', () => {
    const d = describeContent({ name: 'X', content: { items: 'I', title: 'T', links: 'L' } })
    expect(d.elements.map((e) => e.declaredAs)).toEqual(['items', 'title', 'links'])
  })

  test('`image` declares and `images` delivers — both spellings are in the wild', () => {
    for (const declaredAs of ['image', 'images', 'thumbnail']) {
      const [el] = describeContent({ name: 'X', content: { [declaredAs]: 'Photo' } }).elements
      expect(el.key).toBe('images')
      expect(el.declaredAs).toBe(declaredAs)
    }
  })

  test("a declared label is the developer's words; ours is marked as ours", () => {
    // The distinction decides whether a consumer may translate the string.
    const mine = describeContent({ name: 'X', content: { title: 'Nagłówek' } }).elements[0]
    expect(mine).toMatchObject({ label: 'Nagłówek', labelSource: 'declared' })

    const ours = describeContent({ name: 'X', content: { title: '' } }).elements[0]
    expect(ours).toMatchObject({ label: 'Headline', labelSource: 'standard' })

    // A count-only label is still no label of theirs.
    const counted = describeContent({ name: 'X', content: { paragraphs: '[1-2]' } }).elements[0]
    expect(counted.labelSource).toBe('standard')
  })

  test('the hint rides along from the object form', () => {
    const [el] = describeContent({
      name: 'X',
      content: { items: { label: 'Feature cards [3-6]', hint: 'Each H3 becomes a card' } },
    }).elements
    expect(el).toMatchObject({ label: 'Feature cards', hint: 'Each H3 becomes a card' })
    expect(el.arity).toMatchObject({ min: 3, max: 6, required: true, repeatable: true, text: '3–6' })
  })

  test('a count nobody wrote states nothing — absent is unknown, not optional', () => {
    const [el] = describeContent({ name: 'X', content: { paragraphs: 'Body' } }).elements
    expect(el.arity).toMatchObject({ min: null, max: null, required: false })
  })

  test('`background` is reported as the real mistake it is, not as a typo', () => {
    // It IS a meta.js key — just a top-level one — so "unrecognized" would hide
    // that there is a correct place for it.
    const d = describeContent({ name: 'X', content: { title: 'T', background: 'BG' } })
    expect(d.elements).toHaveLength(1)
    expect(d.unknown).toEqual([
      { declaredAs: 'background', reason: 'not-a-content-element', message: expect.stringContaining('frontmatter') },
    ])
  })

  test('an unrecognized name is reported and never throws', () => {
    const d = describeContent({ name: 'X', content: { title: 'T', zork: 'Z' } })
    expect(d.elements.map((e) => e.declaredAs)).toEqual(['title'])
    expect(d.unknown[0]).toMatchObject({ declaredAs: 'zork', reason: 'unrecognized' })
  })

  test('a component that declares nothing is a supported state, not an error', () => {
    for (const component of [{ name: 'X' }, { name: 'X', content: {} }]) {
      const d = describeContent(component)
      expect(d.declared).toBe(false)
      expect(d.elements).toEqual([])
      expect(d.summary).toBeTruthy()
    }
  })

  test('the summary names counts only where one was declared', () => {
    const d = describeContent({ name: 'X', content: { title: 'Headline', items: 'Cards [3-6]' } })
    expect(d.summary).toBe('Headline · Cards (3–6)')
  })

  test('every kind is in the published closed set', () => {
    for (const name of CONTENT_ELEMENTS) expect(CONTENT_KINDS).toContain(elementSpec(name).kind)
  })
})

describe('⭐ every published syntax sample produces the element it claims', () => {
  // A sample that does not parse is worse than none: it is copy-pasteable, it
  // looks authoritative, and it fails silently. `items` is why this exists — the
  // first sample used `## Entry` under an `# H1` title, which the parser reads
  // as the SUBTITLE, so it yielded one entry where it promised two.
  const declared = CONTENT_ELEMENTS

  for (const declaredAs of declared) {
    test(declaredAs, () => {
      const [el] = describeContent({ name: 'X', content: { [declaredAs]: 'L' } }).elements
      const doc = markdownToProseMirror(el.syntax)

      if (declaredAs === 'insets') {
        // ⛔ An inset is resolved by the BUILD, not by a parse: the markdown
        // yields an `inset_ref` node that content-collector later turns into a
        // placeholder plus a `block.insets` entry. Asserting on `content.insets`
        // here would fail against correct markdown.
        expect(doc.content.some((n) => n.type === 'inset_ref')).toBe(true)
        return
      }

      const parsed = parseContent(doc)
      const got = parsed[el.key]
      const count = Array.isArray(got)
        ? got.length
        : got && typeof got === 'object'
          ? Object.keys(got).length
          : got
            ? 1
            : 0
      // `items` promises repetition, so one is not enough to prove the sample.
      expect(count).toBeGreaterThanOrEqual(declaredAs === 'items' ? 2 : 1)
    })
  }
})

// ⛔ THE SAMPLE-PRODUCES-ITS-ELEMENT GUARD ABOVE CANNOT CATCH THIS. Both the
// label line and the old positional form parse to a pretitle, so a sample that
// silently regressed to `### Eyebrow` + `# Headline` would still pass it. The
// spelling has to be asserted on its own.
describe('the pretitle sample teaches the label line, not the positional form', () => {
  test('it is `#>`', () => {
    const [el] = describeContent({ name: 'X', content: { pretitle: 'Eyebrow' } }).elements
    expect(el.syntax).toMatch(/^#+>/)
  })

  test('and the node it produces carries the role, rather than being a smaller heading', () => {
    const [el] = describeContent({ name: 'X', content: { pretitle: 'Eyebrow' } }).elements
    const doc = markdownToProseMirror(el.syntax)
    expect(doc.content[0].attrs.role).toBe('pretitle')
  })
})

describe('parseExpectation', () => {
  test('the three count forms', () => {
    expect(parseExpectation('Image [1]')).toMatchObject({ label: 'Image', min: 1, max: 1 })
    expect(parseExpectation('Cards [3-6]')).toMatchObject({ min: 3, max: 6 })
    expect(parseExpectation('Points [2+]')).toMatchObject({ min: 2, max: null, open: true })
  })

  test('a bracket that is not a count stays part of the label', () => {
    expect(parseExpectation('Notes [see below]')).toMatchObject({
      label: 'Notes [see below]',
      min: null,
    })
  })
})

describe('declarationKey', () => {
  test('maps a delivery key back to the spelling a developer writes', () => {
    expect(declarationKey('images')).toBe('image')
    expect(declarationKey('icons')).toBe('icon')
    expect(declarationKey('title')).toBe('title')
    expect(declarationKey('nonesuch')).toBe('nonesuch')
  })
})
