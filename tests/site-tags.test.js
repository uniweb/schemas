import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { SITE_TAGS, getSiteTag, isSiteTag, resolveSiteTags } from '../src/site-tags.js'
import { renderSiteTagsJson, SITE_TAGS_JSON, LOCALE_EN } from '../scripts/gen-vocabulary.mjs'

describe('the list', () => {
  it('has unique ids and unique labels', () => {
    const ids = SITE_TAGS.map(t => t.id)
    const labels = SITE_TAGS.map(t => t.label)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('uses kebab ids', () => {
    for (const { id } of SITE_TAGS) expect(id, id).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
  })

  it('writes no slash in a label', () => {
    // A slash hedges between two readings, and a filter chip cannot hedge.
    for (const { id, label } of SITE_TAGS) expect(label, id).not.toContain('/')
  })

  it('never loses an id it has shipped', () => {
    // ⛔ APPEND-ONLY. A `site.yml` in the wild declares these, so removing or
    // renaming one breaks that declaration. Add new ids to the list, never
    // delete from this one.
    const shipped = [
      'business', 'landing-page', 'portfolio', 'personal', 'resume', 'blog', 'store',
      'documentation', 'event', 'publication', 'community', 'technology', 'academic',
      'education', 'nonprofit', 'local-business', 'professional-services', 'health',
      'food', 'real-estate', 'arts', 'photography', 'music', 'travel',
    ]
    for (const id of shipped) expect(isSiteTag(id), id).toBe(true)
  })
})

describe('lookups', () => {
  it('finds a tag by id', () => {
    expect(getSiteTag('store')).toEqual({ id: 'store', label: 'Online Store' })
    expect(getSiteTag('shop')).toBeUndefined()
    expect(isSiteTag('landing-page')).toBe(true)
    expect(isSiteTag('Landing Page')).toBe(false)
  })
})

describe('resolveSiteTags', () => {
  it('keeps the declared order', () => {
    const { tags, unknown } = resolveSiteTags(['personal', 'blog'])
    expect(tags.map(t => t.id)).toEqual(['personal', 'blog'])
    expect(unknown).toEqual([])
  })

  it('reports an unrecognized tag instead of dropping it silently', () => {
    const { tags, unknown } = resolveSiteTags(['blog', 'landingpage'])
    expect(tags.map(t => t.id)).toEqual(['blog'])
    expect(unknown).toEqual(['landingpage'])
  })

  it('matches exactly, after trimming', () => {
    const { tags, unknown } = resolveSiteTags([' blog ', 'Blog'])
    expect(tags.map(t => t.id)).toEqual(['blog'])
    expect(unknown).toEqual(['Blog'])
  })

  it('drops duplicates', () => {
    expect(resolveSiteTags(['blog', 'blog', ' blog']).tags).toHaveLength(1)
    expect(resolveSiteTags(['x', 'x']).unknown).toEqual(['x'])
  })

  it('accepts a single id', () => {
    expect(resolveSiteTags('event').tags.map(t => t.id)).toEqual(['event'])
  })

  it('survives junk input', () => {
    const empty = { tags: [], unknown: [] }
    for (const junk of [undefined, null, 42, {}, true]) expect(resolveSiteTags(junk)).toEqual(empty)
    expect(resolveSiteTags(['', '  ', 7, null, { id: 'blog' }])).toEqual(empty)
  })
})

describe('locales/en.json', () => {
  it('keys every tag by ID, never by label', () => {
    const en = JSON.parse(readFileSync(LOCALE_EN, 'utf8'))
    const ours = Object.keys(en).filter(k => k.startsWith('site-tag.'))
    expect(ours).toHaveLength(SITE_TAGS.length)
    for (const t of SITE_TAGS) expect(en[`site-tag.${t.id}.label`], t.id).toBe(t.label)
  })
})

describe('site-tags.json', () => {
  it('matches the module it is generated from', () => {
    // ⛔ It is checked in so consumers can read it straight from the package,
    // which makes it a cache — this is its invalidation.
    expect(readFileSync(SITE_TAGS_JSON, 'utf8')).toBe(renderSiteTagsJson())
  })
})
