import { describe, test, expect } from 'vitest'
import { PLACEMENTS as READER_PLACEMENTS } from '@uniweb/content-reader'
import {
  PLACEMENTS,
  PLACEMENT_KINDS,
  SEQUENCE_KINDS,
  describeContent,
  placementsOf,
  placementsNotOffered,
} from '../src/content.js'
import { normalizeFoundationSchema } from '../src/foundation.js'

const ALL = ['left', 'right', 'wide', 'full']
const sequenceOf = (meta) => describeContent(meta).elements.find((e) => e.element === 'sequence')
const problemsOf = (meta) => describeContent(meta).problems

describe('the words', () => {
  test("are the reader's — what markdown can say, kept here because this package has no dependencies", () => {
    expect(PLACEMENTS).toEqual([...READER_PLACEMENTS])
  })

  test('the kinds that take one are kinds a sequence holds', () => {
    expect(PLACEMENT_KINDS).toEqual(['image', 'video', 'table'])
    for (const kind of PLACEMENT_KINDS) expect(SEQUENCE_KINDS).toContain(kind)
  })
})

describe("a sequence's placement, lowered to one form — a map from each kind to its values", () => {
  test('true: every value, on every kind', () => {
    const seq = sequenceOf({ content: { title: 'Headline', sequence: { label: 'The article', placement: true } } })
    expect(seq).toEqual({
      element: 'sequence',
      kind: 'sequence',
      label: 'The article',
      placement: { image: ALL, video: ALL, table: ALL },
    })
  })

  test('a list: those values, on every kind, in the order of the words', () => {
    expect(sequenceOf({ content: { sequence: { placement: ['full', 'wide'] } } }).placement).toEqual({
      image: ['wide', 'full'],
      video: ['wide', 'full'],
      table: ['wide', 'full'],
    })
  })

  test('one value is a list of one', () => {
    expect(sequenceOf({ content: { sequence: { placement: 'wide' } } }).placement.table).toEqual(['wide'])
  })

  test('a map: those values, per kind — a kind it does not name takes none', () => {
    expect(sequenceOf({ content: { sequence: { placement: { image: ['left', 'right'], table: true } } } }).placement).toEqual({
      image: ['left', 'right'],
      table: ALL,
    })
  })

  test('a kind the sequence excepts takes none', () => {
    const seq = sequenceOf({ content: { sequence: { except: ['table'], placement: true } } })
    expect(seq.except).toEqual(['table'])
    expect(seq.placement).toEqual({ image: ALL, video: ALL })
  })

  test('absent, false, or a sequence written as a label: none', () => {
    for (const sequence of [{ label: 'x' }, { placement: false }, 'The article', true]) {
      expect(sequenceOf({ content: { sequence } })).not.toHaveProperty('placement')
    }
  })

  test('what it cannot read, it says — and keeps the rest', () => {
    const meta = { content: { sequence: { except: 'video', placement: { image: ['middle', 'wide'], icon: true, video: ['wide'] } } } }
    expect(sequenceOf(meta).placement).toEqual({ image: ['wide'] })
    expect(problemsOf(meta)).toEqual([
      '`content.sequence`.placement.image names "middle", which is not a placement — they are left, right, wide, full.',
      '`content.sequence`.placement.icon: "icon" takes no placement — the kinds that do are image, video, table.',
      "`content.sequence`.placement.video: the sequence's except leaves video out, so none is placed.",
    ])
  })

  test('a value of the wrong shape is a problem', () => {
    expect(problemsOf({ content: { sequence: { placement: 5 } } })).toHaveLength(1)
    expect(problemsOf({ content: { sequence: { placement: [] } } })).toHaveLength(1)
  })

  test('only a sequence takes one', () => {
    expect(problemsOf({ content: { media: { label: 'Photo', placement: true } } })).toEqual([
      '`content.media`.placement is not read — the keys are label, hint, types.',
    ])
  })

  test('a lowered list is read as itself', () => {
    const lowered = describeContent({ content: { sequence: { placement: { image: ['left'] } } } }).elements
    expect(describeContent({ content: lowered }).elements).toEqual(lowered)
  })
})

describe('placementsOf — what an editor offers for a block of one kind', () => {
  const meta = { content: { sequence: { placement: { image: ['right', 'left'], table: ['wide'] } } } }

  test('the values the sequence lists for that kind', () => {
    expect(placementsOf(meta, 'image')).toEqual(['left', 'right'])
    expect(placementsOf(meta, 'table')).toEqual(['wide'])
  })

  test('none for a kind it does not list, a component with no sequence, or none declared', () => {
    expect(placementsOf(meta, 'video')).toEqual([])
    expect(placementsOf({ content: { title: 'Headline' } }, 'image')).toEqual([])
    expect(placementsOf({}, 'image')).toEqual([])
  })

  test('reads a registered entry as well as a meta.js', () => {
    const entry = { content: describeContent(meta).elements }
    expect(placementsOf(entry, 'image')).toEqual(['left', 'right'])
  })
})

describe('placementsNotOffered — a block asking for what its section type does not honour', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'image', attrs: { src: '/a.jpg', role: 'image', placement: 'wide' } },
      { type: 'image', attrs: { src: '/b.jpg', role: 'image', placement: 'left' } },
      { type: 'table', attrs: { placement: 'full' }, content: [] },
      { type: 'blockquote', content: [{ type: 'image', attrs: { src: '/t.mp4', role: 'video', placement: 'right' } }] },
      { type: 'image', attrs: { src: null, role: 'icon', library: 'lu', name: 'house', placement: 'left' } },
      { type: 'image', attrs: { src: '/c.jpg' } },
      { type: 'inset_ref', attrs: { component: 'Chart', placement: 'wide' } },
    ],
  }

  test('names each, where it is, what it asks, and what is offered', () => {
    const meta = { content: { sequence: { placement: { image: ['left', 'right'] } } } }
    expect(placementsNotOffered(doc, meta)).toEqual([
      { path: '/content/0', kind: 'image', placement: 'wide', offered: ['left', 'right'] },
      { path: '/content/2', kind: 'table', placement: 'full', offered: [] },
      { path: '/content/3/content/0', kind: 'video', placement: 'right', offered: [] },
      { path: '/content/4', kind: 'icon', placement: 'left', offered: [] },
    ])
  })

  test('nothing when every placement is offered — an icon still takes none', () => {
    const meta = { content: { sequence: { placement: true } } }
    expect(placementsNotOffered(doc, meta)).toEqual([{ path: '/content/4', kind: 'icon', placement: 'left', offered: [] }])
  })

  test("a component's content declared without a sequence offers none", () => {
    expect(placementsNotOffered(doc, { content: { title: 'Headline', image: 'Photo' } })).toHaveLength(5)
  })

  test('a component that says nothing about its content is unknown — nothing is found', () => {
    expect(placementsNotOffered(doc, {})).toEqual([])
    expect(placementsNotOffered(doc, { name: 'Legacy' })).toEqual([])
  })

  test("an inset's {placement=…} is its own param, not a placement", () => {
    const only = { type: 'doc', content: [doc.content[6]] }
    expect(placementsNotOffered(only, { content: { title: 'x' } })).toEqual([])
  })
})

describe('the registered schema keeps the map', () => {
  test("register's normalization copies a format-2 entry's lowered content as it is", () => {
    const lowered = describeContent({ content: { title: 'Headline', sequence: { label: 'The article', placement: true } } }).elements
    const built = { _self: { name: '@acme/docs', schemaFormat: 2 }, Article: { name: 'Article', content: lowered } }
    const out = normalizeFoundationSchema(built, { scope: '@acme' })
    expect(out.Article.content).toEqual(lowered)
    expect(placementsOf(out.Article, 'table')).toEqual(ALL)
  })

  test('a format-1 entry — its meta.js as written — is lowered, placement included', () => {
    const older = { _self: { name: '@acme/docs' }, Article: { name: 'Article', content: { sequence: { placement: ['wide'] } } } }
    const out = normalizeFoundationSchema(older, { scope: '@acme' })
    expect(placementsOf(out.Article, 'image')).toEqual(['wide'])
  })
})
