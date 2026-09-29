import { describe, test, expect } from 'vitest'
import { markdownToProseMirror } from '@uniweb/content-reader'
import { parseContent } from '@uniweb/semantic-parser'
import {
  describeContent, parseExpectation, declarationKey, conceptTag, lowerData,
  CONTENT_KINDS, CONTENT_ELEMENTS, MEDIA_TYPES, SEQUENCE_KINDS, elementSpec,
} from '../src/content.js'

const lower = (content, rest = {}) => describeContent({ name: 'X', content, ...rest })

describe('describeContent — the lowering', () => {
  test('the worked example: one canonical list, in declaration order', () => {
    // The example the lowering was ruled on, verbatim.
    const { elements, problems } = lower({
      title: 'Headline [1]',
      paragraphs: 'Pitch [0-2]',
      image: 'Product shot [1]',
      icons: true,
    })
    expect(problems).toEqual([])
    expect(elements).toEqual([
      { element: 'title', kind: 'heading', label: 'Headline', min: 1, max: 1 },
      { element: 'paragraphs', kind: 'prose', label: 'Pitch', min: 0, max: 2 },
      { element: 'media', kind: 'media', types: ['image'], label: 'Product shot', min: 1, max: 1 },
      { element: 'icons', kind: 'icon' },
    ])
  })

  test('every media spelling becomes the media element, narrowed to its type', () => {
    const typesOf = (name) => lower({ [name]: 'L' }).elements[0]
    expect(typesOf('image')).toMatchObject({ element: 'media', types: ['image'] })
    expect(typesOf('images')).toMatchObject({ element: 'media', types: ['image'] })
    expect(typesOf('thumbnail')).toMatchObject({ element: 'media', types: ['image'] })
    expect(typesOf('videos')).toMatchObject({ element: 'media', types: ['video'] })
    expect(typesOf('insets')).toMatchObject({ element: 'media', types: ['inset'] })
  })

  test('`media` takes all three when none are written — narrowing is the extra work', () => {
    expect(lower({ media: 'Photo, video or diagram [1]' }).elements[0].types).toEqual(MEDIA_TYPES)
    expect(lower({ media: { label: 'Product photo [1]', types: ['image'] } }).elements[0]).toEqual({
      element: 'media', kind: 'media', types: ['image'], label: 'Product photo', min: 1, max: 1,
    })
    // …in one order, whatever order they were written in.
    expect(lower({ media: { types: ['inset', 'image'] } }).elements[0].types).toEqual(['image', 'inset'])
  })

  test('media is visual — a document is declared as `documents`', () => {
    const { elements, problems } = lower({ media: { types: ['image', 'document'] } })
    expect(elements[0].types).toEqual(['image'])
    expect(problems[0]).toMatch(/media is visual.*documents/)
  })

  test('a spelling is one type already, so it takes no `types`', () => {
    const { elements, problems } = lower({ image: { label: 'Photo', types: ['video'] } })
    expect(elements[0].types).toEqual(['image'])
    expect(problems[0]).toMatch(/`content.image`.types is not read.*media: \{ types \}/)
  })

  test('`icon` is `icons`', () => {
    expect(lower({ icon: 'Glyph [1]' }).elements).toEqual([
      { element: 'icons', kind: 'icon', label: 'Glyph', min: 1, max: 1 },
    ])
  })

  test('only what the developer wrote: no label, no count, no hint when none was written', () => {
    for (const value of [true, '', { label: '' }]) {
      expect(lower({ title: value }).elements).toEqual([{ element: 'title', kind: 'heading' }])
    }
    // A count-only label is no label of theirs.
    expect(lower({ paragraphs: '[1-2]' }).elements[0]).toEqual({ element: 'paragraphs', kind: 'prose', min: 1, max: 2 })
  })

  test("a declared label is the developer's words, kept as written", () => {
    expect(lower({ title: 'Nagłówek' }).elements[0].label).toBe('Nagłówek')
  })

  test('the counts: exact, range and open', () => {
    expect(lower({ items: 'Cards [3]' }).elements[0]).toMatchObject({ min: 3, max: 3 })
    expect(lower({ items: 'Cards [3-6]' }).elements[0]).toMatchObject({ min: 3, max: 6 })
    const open = lower({ items: 'Cards [2+]' }).elements[0]
    expect(open.min).toBe(2)
    expect(open).not.toHaveProperty('max')
  })

  test('the hint rides along from the object form', () => {
    expect(lower({ items: { label: 'Feature cards [3-6]', hint: 'Each H3 becomes a card' } }).elements[0]).toEqual({
      element: 'items', kind: 'entries', label: 'Feature cards', hint: 'Each H3 becomes a card', min: 3, max: 6,
    })
  })

  test('the new content types are declarable, by the names a component reads', () => {
    const { elements, problems } = lower({ tables: 'Pricing [1]', math: true, quotes: 'Testimonial [1-3]' })
    expect(problems).toEqual([])
    expect(elements.map((e) => [e.element, e.kind])).toEqual([['tables', 'table'], ['math', 'math'], ['quotes', 'quote']])
  })

  test('`headings` is never a section’s, so it is not an element', () => {
    expect(lower({ headings: 'H' }).problems[0]).toMatch(/not a content element/)
  })
})

describe('sequence — content rendered as written', () => {
  test('an element inside content:, beside the rest', () => {
    const { elements, problems } = lower({ title: 'Headline [1]', sequence: 'Prose and media' })
    expect(problems).toEqual([])
    expect(elements[1]).toEqual({ element: 'sequence', kind: 'sequence', label: 'Prose and media' })
  })

  test('`except` names the kinds it leaves out, in one order', () => {
    const [el] = lower({ sequence: { label: 'Rich content', except: ['table', 'math'] } }).elements
    expect(el).toEqual({ element: 'sequence', kind: 'sequence', label: 'Rich content', except: ['table', 'math'] })
  })

  test('`except` takes the kind names, and says what it cannot read', () => {
    const { elements, problems } = lower({ sequence: { except: ['math', 'chart', 'media'] } })
    expect(elements[0].except).toEqual(['math'])
    expect(problems).toHaveLength(2)
    expect(problems.join('\n')).toMatch(/"chart", which is not a kind/)
    expect(problems.join('\n')).toMatch(/media, a slot rather than a kind.*image, video and inset/)
  })

  test('a count on sequence means nothing, and is said', () => {
    const { elements, problems } = lower({ sequence: 'Prose [1]' })
    expect(elements[0]).toEqual({ element: 'sequence', kind: 'sequence', label: 'Prose' })
    expect(problems[0]).toMatch(/count.*means nothing/)
  })
})

describe('problems — said, never merged, never thrown', () => {
  test('`media` beside a spelling that shares a type is an overlap', () => {
    const { elements, problems } = lower({ media: 'Hero media [1]', image: 'Photo [1]' })
    expect(elements).toHaveLength(2)
    expect(problems).toEqual([expect.stringMatching(/`content.media` and `content.image` both take an image/)])
  })

  test('two spellings of disjoint types are two slots, not an overlap', () => {
    const { elements, problems } = lower({ image: 'Photo [1]', videos: 'Clip [0-1]' })
    expect(problems).toEqual([])
    expect(elements.map((e) => e.types)).toEqual([['image'], ['video']])
  })

  test('one element under two spellings is an overlap too', () => {
    expect(lower({ icon: 'A', icons: 'B' }).problems[0]).toMatch(/both declare `icons`/)
    expect(lower({ image: 'A', thumbnail: 'B' }).problems[0]).toMatch(/both take an image/)
  })

  test('`background` is reported as the real mistake it is, not as a typo', () => {
    // It IS a meta.js key — just a top-level one — so "unrecognized" would hide
    // that there is a correct place for it.
    const { elements, problems } = lower({ title: 'T', background: 'BG' })
    expect(elements).toHaveLength(1)
    expect(problems[0]).toMatch(/frontmatter/)
  })

  test('the `data` element is retired, and says where the tag goes', () => {
    const { elements, problems } = lower({ title: 'T', data: 'API definition (yaml:api block)' })
    expect(elements.map((e) => e.element)).toEqual(['title'])
    expect(problems[0]).toMatch(/retired.*'md:<tag>'/)
  })

  test('an unrecognized name is reported and never throws', () => {
    const { elements, problems } = lower({ title: 'T', zork: 'Z' })
    expect(elements.map((e) => e.element)).toEqual(['title'])
    expect(problems[0]).toMatch(/`content.zork` is not a content element/)
  })

  test('an unreadable value is reported, the rest returned', () => {
    const { elements, problems } = lower({ title: 3, paragraphs: 'Body' })
    expect(elements.map((e) => e.element)).toEqual(['paragraphs'])
    expect(problems[0]).toMatch(/`content.title` is 3/)
  })
})

describe('what an entry holds — `content:` on `items`', () => {
  test('lowers to the list a section’s does', () => {
    const [el] = lower({
      items: { label: 'Feature cards [3-6]', content: { title: 'Feature', paragraphs: 'Description', image: 'Icon art [0-1]' } },
    }).elements
    expect(el).toEqual({
      element: 'items', kind: 'entries', label: 'Feature cards', min: 3, max: 6,
      content: [
        { element: 'title', kind: 'heading', label: 'Feature' },
        { element: 'paragraphs', kind: 'prose', label: 'Description' },
        { element: 'media', kind: 'media', types: ['image'], label: 'Icon art', min: 0, max: 1 },
      ],
    })
  })

  test('an entry holds neither items nor a sequence', () => {
    const { elements, problems } = lower({ items: { content: { title: 'T', items: 'I', sequence: 'S' } } })
    expect(elements[0].content).toEqual([{ element: 'title', kind: 'heading', label: 'T' }])
    expect(problems).toHaveLength(2)
    expect(problems[0]).toMatch(/`content.items.content.items`: an entry holds no items/)
  })
})

describe('concept blocks — `md:<tag>` keys in `data:`', () => {
  test('the key says which block; the value is the author’s label; it joins the list', () => {
    const { declared, elements, problems } = lower(
      { title: 'Headline' },
      { data: { 'md:faq': 'Questions and answers [3+]', team: '@std/person' } },
    )
    expect(problems).toEqual([])
    expect(declared).toBe(true)
    expect(elements).toEqual([
      { element: 'title', kind: 'heading', label: 'Headline' },
      // A count on its label counts the entries.
      { key: 'faq', kind: 'concept', label: 'Questions and answers', min: 3 },
    ])
  })

  test('`{ label, hint, content }` — `content:` says what each entry holds', () => {
    const { elements, problems } = describeContent({
      name: 'FAQ',
      data: { 'md:faq': { label: 'Questions and answers [3+]', hint: 'One ### per question', content: { title: 'Question', paragraphs: 'Answer' } } },
    })
    expect(problems).toEqual([])
    expect(elements).toEqual([
      {
        key: 'faq', kind: 'concept', label: 'Questions and answers', hint: 'One ### per question', min: 3,
        content: [
          { element: 'title', kind: 'heading', label: 'Question' },
          { element: 'paragraphs', kind: 'prose', label: 'Answer' },
        ],
      },
    ])
  })

  test('a concept block alone is a declaration', () => {
    expect(describeContent({ name: 'X', data: { 'md:faq': {} } })).toMatchObject({
      declared: true,
      elements: [{ key: 'faq', kind: 'concept' }],
    })
  })

  test('never a data schema', () => {
    expect(lower({}, { data: { 'md:faq': '@std/faq' } }).problems[0]).toMatch(/reads as a schema/)
    expect(lower({}, { data: { 'md:faq': { schema: '@/faq' } } }).problems[0]).toMatch(/no schema/)
  })

  test('a key declared both ways is said', () => {
    expect(lower({}, { data: { 'md:faq': 'Q', faq: {} } }).problems[0]).toMatch(/both declare content.data.faq/)
  })

  test('a prefix with no tag is not a key', () => {
    const { elements, problems } = lower({}, { data: { 'md:': 'Q' } })
    expect(elements).toEqual([])
    expect(problems[0]).toMatch(/names no tag/)
  })

  test('an entry of a concept block holds neither items nor a sequence', () => {
    const { problems } = lower({}, { data: { 'md:faq': { content: { title: 'Q', items: 'I' } } } })
    expect(problems[0]).toMatch(/`data.md:faq.content.items`: an entry holds no items/)
  })
})

describe('a lowered list is read as itself', () => {
  test('describeContent of a registered entry returns its content unchanged', () => {
    const meta = {
      name: 'X',
      content: { title: 'Headline [1]', media: 'Hero [1]', items: { label: 'Cards', content: { title: 'T' } } },
      data: { 'md:faq': 'Q&A' },
    }
    const once = describeContent(meta)
    const twice = describeContent({ name: 'X', content: once.elements })
    expect(twice.elements).toEqual(once.elements)
    expect(twice.problems).toEqual([])
    expect(twice.summary).toBe(once.summary)
  })
})

describe('declared, and the summary', () => {
  test('a component that declares nothing is a supported state, not an error', () => {
    for (const component of [{ name: 'X' }, { name: 'X', content: {} }]) {
      const d = describeContent(component)
      expect(d.declared).toBe(false)
      expect(d.elements).toEqual([])
      expect(d.problems).toEqual([])
      expect(d.summary).toBeTruthy()
    }
  })

  test('the summary names counts only where one was declared', () => {
    expect(lower({ title: 'Headline', items: 'Cards [3-6]' }).summary).toBe('Headline · Cards (3–6)')
  })

  test('where no label was written, framework’s standard one', () => {
    expect(lower({ title: true, image: '[1]' }).summary).toBe('Headline · Image (exactly one)')
  })
})

describe('the vocabulary', () => {
  test('every element lowers to a kind in the published closed set', () => {
    for (const name of CONTENT_ELEMENTS) expect(CONTENT_KINDS).toContain(elementSpec(name).kind)
  })

  test('types and except are kind names too', () => {
    for (const type of MEDIA_TYPES) expect(CONTENT_KINDS).toContain(type)
    for (const kind of SEQUENCE_KINDS) expect(CONTENT_KINDS).toContain(kind)
  })

  test('the retired `data` element is gone from the vocabulary', () => {
    expect(CONTENT_ELEMENTS).not.toContain('data')
    expect(CONTENT_KINDS).not.toContain('data')
  })
})

describe('⭐ every published syntax sample produces the element it claims', () => {
  // A sample that does not parse is worse than none: it is copy-pasteable, it
  // looks authoritative, and it fails silently. `items` is why this exists — the
  // first sample used `## Entry` under an `# H1` title, which the parser reads
  // as the SUBTITLE, so it yielded one entry where it promised two.
  //
  // What each element is read as: the key a component reads — for a media
  // spelling, the array its type arrives in.
  const readAs = {
    image: 'images', images: 'images', thumbnail: 'images', videos: 'videos', insets: 'insets', icon: 'icons',
    media: 'images',
  }

  for (const name of CONTENT_ELEMENTS) {
    test(name, () => {
      const spec = elementSpec(name)
      const doc = markdownToProseMirror(spec.syntax)

      if (name === 'insets') {
        // ⛔ An inset is resolved by the BUILD, not by a parse: the markdown
        // yields an `inset_ref` node that core later lifts into a placeholder
        // plus a `block.insets` entry. Asserting on `content.insets` here would
        // fail against correct markdown.
        expect(doc.content.some((n) => n.type === 'inset_ref')).toBe(true)
        return
      }

      const parsed = parseContent(doc)
      const got = parsed[readAs[name] || spec.element]
      const count = Array.isArray(got)
        ? got.length
        : got && typeof got === 'object'
          ? Object.keys(got).length
          : got
            ? 1
            : 0
      // `items` promises repetition, so one is not enough to prove the sample —
      // nor is one for the sequence, which is the whole section in order.
      expect(count).toBeGreaterThanOrEqual(name === 'items' || name === 'sequence' ? 2 : 1)
    })
  }
})

// ⛔ THE SAMPLE-PRODUCES-ITS-ELEMENT GUARD ABOVE CANNOT CATCH THIS. Both the
// label line and the old positional form parse to a pretitle, so a sample that
// silently regressed to `### Eyebrow` + `# Headline` would still pass it. The
// spelling has to be asserted on its own.
describe('the pretitle sample teaches the label line, not the positional form', () => {
  test('it is `#>`', () => {
    expect(elementSpec('pretitle').syntax).toMatch(/^#+>/)
  })

  test('and the node it produces carries the role, rather than being a smaller heading', () => {
    const doc = markdownToProseMirror(elementSpec('pretitle').syntax)
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
  test('maps a delivered array back to the spelling a developer writes', () => {
    expect(declarationKey('images')).toBe('image')
    expect(declarationKey('icons')).toBe('icon')
    expect(declarationKey('videos')).toBe('videos')
    expect(declarationKey('title')).toBe('title')
    expect(declarationKey('nonesuch')).toBe('nonesuch')
  })
})

describe('elementSpec — framework’s words, for a reader that wants them', () => {
  test('a canonical element and a spelling', () => {
    expect(elementSpec('media')).toMatchObject({ element: 'media', kind: 'media', label: 'Media' })
    expect(elementSpec('media').description).toMatch(/^An image, a video, or an embedded component/)
    expect(elementSpec('image')).toMatchObject({ element: 'media', types: ['image'], label: 'Image' })
    expect(elementSpec('zork')).toBeNull()
  })
})

describe('the data: map, lowered', () => {
  test('conceptTag reads the prefix', () => {
    expect(conceptTag('md:faq')).toBe('faq')
    expect(conceptTag('faq')).toBeNull()
    expect(conceptTag('md:')).toBe('')
  })

  test('a concept key becomes the key a component reads, with no schema', () => {
    expect(lowerData({ 'md:faq': 'Questions and answers', team: '@std/person' })).toEqual({
      faq: {},
      team: '@std/person',
    })
  })

  test('a map with no concept key comes back as it was', () => {
    const data = { team: '@std/person' }
    expect(lowerData(data)).toBe(data)
    expect(lowerData(false)).toBe(false)
    expect(lowerData(undefined)).toBe(undefined)
  })

  test('declared both ways, the bare declaration is kept', () => {
    expect(lowerData({ 'md:faq': 'Q', faq: '@/faq' })).toEqual({ faq: '@/faq' })
  })
})

describe('documents', () => {
  test('a documents declaration is an element of kind document, counted like any', () => {
    const { elements, problems } = describeContent({ content: { documents: 'Reports [2+]' } })
    expect(problems).toEqual([])
    expect(elements).toEqual([{ element: 'documents', kind: 'document', label: 'Reports', min: 2 }])
  })
})
