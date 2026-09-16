import { describe, test, expect } from 'vitest'
import { starterContent, parseExpectation } from '../src/starter.js'

describe('parseExpectation — the count syntax', () => {
  test('no count', () => {
    expect(parseExpectation('Headline')).toEqual({ label: 'Headline', min: null, max: null, open: false })
  })
  test('exact, range and open', () => {
    expect(parseExpectation('Image [1]')).toMatchObject({ label: 'Image', min: 1, max: 1 })
    expect(parseExpectation('Cards [3-6]')).toMatchObject({ label: 'Cards', min: 3, max: 6 })
    expect(parseExpectation('Points [2+]')).toMatchObject({ label: 'Points', min: 2, max: null, open: true })
  })
  test('the object form carries its label', () => {
    expect(parseExpectation({ label: 'Feature cards [3-6]', hint: 'Each H3 is a card' })).toMatchObject({
      label: 'Feature cards', min: 3, max: 6,
    })
  })
  test('a malformed bracket is part of the label, not a count', () => {
    expect(parseExpectation('Notes [see below]')).toMatchObject({ label: 'Notes [see below]', min: null })
  })
})

describe('arity follows the declaration', () => {
  const declare = (content) => starterContent({ name: 'Thing', content }).content

  test('the UPPER bound is what gets generated', () => {
    // A component is not obliged to render everything it is handed, and the
    // params that reduce simply render less — so surplus is free and a
    // shortfall leaves a hole.
    expect(declare({ items: 'Cards [3-6]' }).items).toHaveLength(6)
    expect(declare({ links: 'CTA [0-2]' }).links).toHaveLength(2)
  })

  test('a floor of 0 still generates one — the floor is the author\'s option', () => {
    expect(declare({ paragraphs: 'Body [0-1]' }).paragraphs).toHaveLength(1)
  })

  test('an open count generates more than its floor', () => {
    expect(declare({ items: 'Entries [2+]' }).items.length).toBeGreaterThanOrEqual(3)
  })

  test('no count falls back to a per-element default', () => {
    expect(declare({ paragraphs: 'Body' }).paragraphs).toHaveLength(2)
    expect(declare({ items: 'Entries' })).toHaveProperty('items')
  })

  test('nothing is ever repeated to reach the count', () => {
    const items = declare({ items: 'Entries [8-8]' }).items
    expect(new Set(items.map((i) => i.title)).size).toBe(items.length)
  })
})

describe('the declaration decides the slots', () => {
  test('only declared elements are filled', () => {
    const { content } = starterContent({ name: 'Thing', content: { title: 'T', links: 'L [1]' } })
    expect(Object.keys(content).sort()).toEqual(['links', 'title'])
  })

  test('`image` and `icon` declare, `images` and `icons` deliver', () => {
    // The declaration and the delivery do not use the same word, and a
    // component reads the plural.
    const { content } = starterContent({ name: 'Thing', content: { image: 'Photo [1]', icon: 'Glyph [1]' } })
    expect(content.images).toHaveLength(1)
    expect(content.icons).toHaveLength(1)
    expect(content).not.toHaveProperty('image')
  })

  test('an element this cannot fill is REPORTED, never silently dropped', () => {
    const { content, unfilled } = starterContent({
      name: 'Lesson',
      content: { title: 'T', snippets: 'Code', background: 'BG' },
    })
    expect(unfilled).toEqual(expect.arrayContaining(['snippets', 'background']))
    expect(content).toHaveProperty('title')
  })
})

describe('the family chooses the register', () => {
  test('a name that is a family resolves without a declaration', () => {
    expect(starterContent({ name: 'Pricing', content: { title: 'T' } }).family.id).toBe('pricing')
  })

  test('a declared family wins over the name', () => {
    const r = starterContent({ name: 'CvEntry', family: 'article', content: { title: 'T' } })
    expect(r.family.id).toBe('article')
    expect(r.family.source).toBe('declared')
  })

  test('two families give different copy for the same declaration', () => {
    const decl = { title: 'Heading', items: 'Entries [3]' }
    const team = starterContent({ name: 'Team', content: decl }).content
    const faq = starterContent({ name: 'FAQ', content: decl }).content
    expect(team.title).not.toBe(faq.title)
    expect(team.items[0].title).not.toBe(faq.items[0].title)
  })

  test('an unknown family still produces content, from the generic register', () => {
    const r = starterContent({ name: 'Zorblat', content: { title: 'T', paragraphs: 'P' } })
    expect(r.family.id).toBeNull()
    expect(r.content.title).toBeTruthy()
    expect(r.content.paragraphs.length).toBeGreaterThan(0)
  })
})

describe('a component that declares no `content:`', () => {
  test('gets its family\'s canonical elements, and SAYS so', () => {
    // 13 of the 92 sections in the official templates are in this state, several
    // with an unambiguous family. An empty box is the worse answer.
    const r = starterContent({ name: 'Hero' })
    expect(r.elementsInferred).toBe(true)
    expect(Object.keys(r.content)).toContain('title')
    expect(Object.keys(r.content)).toContain('links')
  })

  test('a real declaration is never reported as inferred', () => {
    expect(starterContent({ name: 'Hero', content: { title: 'T' } }).elementsInferred).toBe(false)
  })
})

describe('frontmatter', () => {
  test('the type is always there; declared param defaults follow', () => {
    const { params } = starterContent({
      name: 'Grid',
      content: { title: 'T' },
      params: { columns: { default: 3 }, gap: { default: '2rem' }, nodefault: { type: 'string' } },
    })
    expect(params).toEqual({ type: 'Grid', columns: 3, gap: '2rem' })
  })

  test('a preset replaces the defaults rather than merging over them', () => {
    const component = {
      name: 'Hero',
      content: { title: 'T' },
      params: { layout: { default: 'center' }, theme: { default: 'light' } },
      presets: { split: { label: 'Split', params: { layout: 'split-right' } } },
    }
    expect(starterContent(component, { preset: 'split' }).params).toEqual({
      type: 'Hero',
      layout: 'split-right',
    })
  })

  test('an unknown preset fails loudly and names the real ones', () => {
    expect(() =>
      starterContent({ name: 'Hero', presets: { split: { params: {} } } }, { preset: 'nope' }),
    ).toThrow(/Unknown preset 'nope'.*split/s)
  })
})

describe('images', () => {
  test('a placeholder is a self-contained data URI with no host in it', () => {
    // Framework never constructs a serve location. A data URI needs no host.
    const [img] = starterContent({ name: 'Figure', content: { image: 'Photo [1]' } }).content.images
    expect(img.url.startsWith('data:image/svg+xml,')).toBe(true)
    expect(img.url).not.toMatch(/https?:/)
  })

  test('it is fully encoded — a raw space is silently dropped by the markdown lane', () => {
    const [img] = starterContent({ name: 'Figure', content: { image: 'Photo [1]' } }).content.images
    expect(img.url).not.toMatch(/\s/)
  })

  test('a caller may supply real assets, and they are used first', () => {
    const { content } = starterContent(
      { name: 'Gallery', content: { image: 'Photo [2]' } },
      { assets: [{ url: '/uploads/a.jpg', alt: 'A real one' }] },
    )
    expect(content.images[0].url).toBe('/uploads/a.jpg')
    expect(content.images[0].alt).toBe('A real one')
    // …then the built-ins take over rather than running out.
    expect(content.images[1].url.startsWith('data:')).toBe(true)
  })
})

describe('contract', () => {
  test('a component with no name is refused', () => {
    expect(() => starterContent({})).toThrow(/name/)
    expect(() => starterContent(null)).toThrow(/name/)
  })
})
