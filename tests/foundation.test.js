import { describe, test, expect } from 'vitest'
import {
  FOUNDATION_SCHEMA_FORMAT,
  normalizeFoundationSchema,
  normalizeData,
  normalizeParams,
  qualifyRef,
} from '../src/foundation.js'

// A built schema as the build writes it — format 2: `content` and `children` lowered, a
// `'md:<tag>'` key of `data:` lowered to `<tag>: {}`, everything else as written.
const built = () => ({
  _self: { name: '@acme/marketing', version: '1.0.0', schemaFormat: 2, data: { profile: {} } },
  _layouts: { Default: { name: 'Default', data: { menu: '@std/nav' }, params: { sticky: { type: 'boolean' } } } },
  Team: { name: 'Team', path: 'sections/Team', data: { team: '@/member', posts: '@std/article/*' } },
  Faq: {
    name: 'Faq',
    path: 'sections/Faq',
    content: [{ key: 'faq', kind: 'concept', label: 'Questions', min: 2 }],
    data: { faq: {} },
  },
  Article: { name: 'Article', path: 'sections/Article', content: [], data: { article: { schema: '@/post' } } },
  Hero: {
    name: 'Hero',
    path: 'sections/Hero',
    params: { variant: { type: 'select', options: ['glass', { value: 'gradient', label: 'Gradient' }] } },
    data: false,
  },
})

describe('normalizeFoundationSchema — format 3', () => {
  const out = normalizeFoundationSchema(built(), { scope: '@acme' })

  test('says it is format 3', () => {
    expect(FOUNDATION_SCHEMA_FORMAT).toBe(3)
    expect(out._self.schemaFormat).toBe(3)
  })

  test('a ref is { kind: schema } — @/x in the FOUNDATION\'s scope, a standard ref as written, /* as whole', () => {
    expect(out.Team.data).toEqual({
      team: { kind: 'schema', schema: '@acme/member', whole: false },
      posts: { kind: 'schema', schema: '@std/article', whole: true },
    })
    expect(out.Article.data.article).toEqual({ kind: 'schema', schema: '@acme/post', whole: false })
  })

  test('the scope is the foundation\'s, whatever it is — never @std by default', () => {
    const other = normalizeFoundationSchema(built(), { scope: 'globex' })
    expect(other.Team.data.team.schema).toBe('@globex/member')
    expect(other.Team.data.posts.schema).toBe('@std/article')
  })

  test('without a scope, @/x stays as written', () => {
    expect(normalizeFoundationSchema(built()).Team.data.team.schema).toBe('@/member')
  })

  test('a concept block\'s key is { kind: concept }; a key with no schema is { kind: untyped }', () => {
    expect(out.Faq.data).toEqual({ faq: { kind: 'concept' } })
    expect(out._self.data).toEqual({ profile: { kind: 'untyped' } })
  })

  test('a component that declares no key has no data, however that was spelled', () => {
    expect('data' in out.Hero).toBe(false)
    const empty = normalizeFoundationSchema({ ...built(), Hero: { name: 'Hero', data: {} } })
    expect('data' in empty.Hero).toBe(false)
  })

  test('a select\'s options are { value, label } — the shorthand says the two are one', () => {
    expect(out.Hero.params.variant.options).toEqual([
      { value: 'glass', label: 'glass' },
      { value: 'gradient', label: 'Gradient' },
    ])
  })

  test('layouts and the foundation\'s own data are normalized as an entry is', () => {
    expect(out._layouts.Default.data).toEqual({ menu: { kind: 'schema', schema: '@std/nav', whole: false } })
    expect(out._layouts.Default.params).toEqual({ sticky: { type: 'boolean' } })
  })

  test('content as format 2 has it: [] takes no content, absent is unknown', () => {
    expect(out.Article.content).toEqual([])
    expect('content' in out.Team).toBe(false)
  })

  test('is idempotent', () => {
    expect(normalizeFoundationSchema(out, { scope: '@acme' })).toEqual(out)
  })

  test('changes nothing it was given', () => {
    const input = built()
    const copy = JSON.parse(JSON.stringify(input))
    normalizeFoundationSchema(input, { scope: '@acme' })
    expect(input).toEqual(copy)
  })

  test('leaves the keys beside the entries where they are', () => {
    const withSchemas = normalizeFoundationSchema({ ...built(), dataSchemas: { '@/member': { fields: {} } } }, { scope: '@acme' })
    expect(withSchemas.dataSchemas).toEqual({ '@/member': { fields: {} } })
    expect(withSchemas._self.name).toBe('@acme/marketing')
  })
})

describe('an inline data shape — one tagged form each', () => {
  const norm = (value) => normalizeData({ key: value }, { scope: '@acme' }).key

  test('a field map is normalized as a data schema file is: shorthand written out, aliases folded', () => {
    expect(
      norm({
        label: { type: 'string' },
        icon: 'string',
        count: { type: 'number', default: 0 },
        links: { type: 'array', items: { type: 'object', fields: { label: 'string', href: 'url' } } },
      })
    ).toEqual({
      kind: 'fields',
      fields: {
        label: { type: 'string' },
        icon: { type: 'string' },
        count: { type: 'decimal', default: 0 },
        links: {
          type: 'array',
          items: { type: 'object', fields: { label: { type: 'string' }, href: { type: 'string', format: 'url' } } },
        },
      },
    })
  })

  test('a field map written as a whole schema is the same shape', () => {
    expect(norm({ fields: { icon: 'string' } })).toEqual({ kind: 'fields', fields: { icon: { type: 'string' } } })
  })

  test('a Model a field names is qualified too', () => {
    expect(norm({ author: { ref: '@/person' }, topic: { options: '@/topics' } }).fields).toEqual({
      author: { type: 'ref', ref: '@acme/person' },
      topic: { type: 'string', options: '@acme/topics' },
    })
  })

  test('a field map that is not a valid data schema is refused, naming where', () => {
    expect(() =>
      normalizeData({ articles: { content: { type: 'object', default: null } } }, { owner: 'Article' })
    ).toThrow(/Article: data\.articles is an inline field map that is not a valid data schema: object field 'content'/)
  })

  test('a form keeps its fields, options and conditions written out, all the way down', () => {
    expect(
      norm({
        name: 'Side',
        fields: [
          { id: 'for', type: 'select', options: ['scholar', { label: 'News', value: 'news' }] },
          { id: 'dept', type: 'text', condition: { for: 'scholar' } },
          { id: 'head', type: 'text', condition: { for: { $in: ['news'] } } },
          { id: 'place', type: 'nestedObject', fields: [{ id: 'kind', type: 'select', options: ['a'] }] },
        ],
      })
    ).toEqual({
      kind: 'form',
      name: 'Side',
      fields: [
        { id: 'for', type: 'select', options: [{ value: 'scholar', label: 'scholar' }, { label: 'News', value: 'news' }] },
        { id: 'dept', type: 'text', condition: { for: { $eq: 'scholar' } } },
        { id: 'head', type: 'text', condition: { for: { $in: ['news'] } } },
        { id: 'place', type: 'nestedObject', fields: [{ id: 'kind', type: 'select', options: [{ value: 'a', label: 'a' }] }] },
      ],
    })
  })

  test('a composite form is a form', () => {
    expect(norm({ isComposite: true, childSchema: { fields: [{ id: 'n', type: 'select', options: ['x'] }] } })).toEqual({
      kind: 'form',
      isComposite: true,
      childSchema: { fields: [{ id: 'n', type: 'select', options: [{ value: 'x', label: 'x' }] }] },
    })
  })

  // ⭐ The ONE test of what makes a `data:` value a form. `@uniweb/core` carried the same three
  // markers as `isRichSchema` until 2026-10-05, when its last readers went (the runtime stopped
  // filling field defaults) and the editor, its last outside reader, read `kind` instead.
  test('each of the three markers alone makes a form — a fields LIST, isComposite, childSchema', () => {
    expect(norm({ fields: [{ id: 'a', type: 'text' }] }).kind).toBe('form')
    expect(norm({ isComposite: true }).kind).toBe('form')
    expect(norm({ childSchema: { fields: [{ id: 'n', type: 'text' }] } }).kind).toBe('form')
  })

  test('CONTROL — a field map is not a form, keyed or written as a whole schema', () => {
    expect(norm({ label: { type: 'string' }, href: { type: 'string' } }).kind).toBe('fields')
    expect(norm({ name: 'person', fields: { name: { type: 'string' } } }).kind).toBe('fields')
  })

  test('null is untyped; a value that is no schema at all is refused', () => {
    expect(norm(null)).toEqual({ kind: 'untyped' })
    expect(() => normalizeData({ inherit: ['a'] })).toThrow(/data\.inherit is not a schema/)
  })

  test('an unlowered concept key — a format-1 entry — is lowered, the bare declaration winning', () => {
    expect(normalizeData({ 'md:faq': 'Questions [2+]' })).toEqual({ faq: { kind: 'concept' } })
    expect(normalizeData({ 'md:faq': 'Questions', faq: '@/qa' }, { scope: 'acme' })).toEqual({
      faq: { kind: 'schema', schema: '@acme/qa', whole: false },
    })
  })
})

// ⭐ A READER OF AN OLDER VERSION never gets an exception: it was registered before anything checked
// its inline maps, so one may not be a valid data schema. `register` is strict; a reader is not.
describe('read mode — strict: false', () => {
  const older = () => ({
    _self: { name: '@acme/old', schemaFormat: 2 },
    Article: {
      name: 'Article',
      data: {
        articles: { title: 'string', author: { ref: '@/person' }, content: { type: 'object', default: null } },
        junk: 3,
      },
    },
  })

  test('CONTROL — strict, what register runs, refuses it', () => {
    expect(() => normalizeFoundationSchema(older(), { scope: 'acme' })).toThrow(/data\.articles is an inline field map/)
  })

  test('normalizes field by field, keeps a refused field as written, and says why', () => {
    const out = normalizeFoundationSchema(older(), { scope: 'acme', strict: false })
    expect(out.Article.data.articles).toEqual({
      kind: 'fields',
      fields: {
        title: { type: 'string' },
        author: { type: 'ref', ref: '@acme/person' },
        content: { type: 'object', default: null },
      },
      problems: [expect.stringMatching(/object field 'content' must declare nested 'fields'/)],
    })
    expect(out.Article.data.junk).toEqual({ kind: 'untyped', problems: [expect.stringMatching(/data\.junk is not a schema/)] })
  })

  test('is idempotent, problems kept', () => {
    const once = normalizeFoundationSchema(older(), { scope: 'acme', strict: false })
    expect(normalizeFoundationSchema(once, { scope: 'acme', strict: false })).toEqual(once)
  })

  test('a valid schema reads the same in either mode — no problems key', () => {
    const valid = { _self: {}, Team: { name: 'Team', data: { team: '@/member', links: { href: 'url' } } } }
    expect(normalizeFoundationSchema(valid, { scope: 'acme', strict: false })).toEqual(normalizeFoundationSchema(valid, { scope: 'acme' }))
  })
})

describe('a format-1 schema — each entry its meta.js as written', () => {
  const out = normalizeFoundationSchema(
    {
      _self: { name: '@acme/old', version: '0.1.0' },
      Article: { name: 'Article', content: {}, data: { 'md:faq': 'Questions' } },
      Hero: { name: 'Hero', content: { title: 'Headline [1]' }, children: true },
    },
    { scope: 'acme' }
  )

  test('is lowered first, as the build lowers one', () => {
    expect(out.Hero.content).toEqual([{ element: 'title', kind: 'heading', label: 'Headline', min: 1, max: 1 }])
    expect(out.Hero.children).toEqual({})
    expect(out.Article.data).toEqual({ faq: { kind: 'concept' } })
  })

  test('its empty content map stays unknown — format 1 wrote {} where nothing was declared', () => {
    expect(out.Article.content).toEqual([{ key: 'faq', kind: 'concept', label: 'Questions' }])
    const bare = normalizeFoundationSchema({ _self: {}, Article: { name: 'Article', content: {} } })
    expect('content' in bare.Article).toBe(false)
  })
})

describe('the parts', () => {
  test('qualifyRef — @/x into a scope written either way; anything else as given', () => {
    expect(qualifyRef('@/member', '@acme')).toBe('@acme/member')
    expect(qualifyRef('@/member', 'acme')).toBe('@acme/member')
    expect(qualifyRef('@std/person', '@acme')).toBe('@std/person')
    expect(qualifyRef('@/member')).toBe('@/member')
  })

  test('normalizeParams — only options move; a param that is not an object is left alone', () => {
    expect(normalizeParams({ key: 'front-matter', size: { type: 'select', options: [1, 2] } })).toEqual({
      key: 'front-matter',
      size: { type: 'select', options: [{ value: 1, label: '1' }, { value: 2, label: '2' }] },
    })
  })
})
