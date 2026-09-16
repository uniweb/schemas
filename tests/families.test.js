import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  FAMILIES,
  GROUPS,
  getFamily,
  getGroup,
  isFamily,
  normalizeName,
  resolveFamily,
} from '../src/families.js'
import { renderFamiliesJson, renderLocaleJson, OUT, LOCALE_EN } from '../scripts/gen-families-json.mjs'
import { ALIASES, AMBIGUOUS, SHAPE_SUFFIXES, suggestFamily } from '../src/family-aliases.js'

describe('the list', () => {
  it('has unique ids and unique labels', () => {
    // ⛔ A duplicate LABEL is the dangerous one: the list still loads, and two
    // rows read identically in the picker with no error anywhere.
    expect(new Set(FAMILIES.map(f => f.id)).size).toBe(FAMILIES.length)
    expect(new Set(FAMILIES.map(f => f.label)).size).toBe(FAMILIES.length)
    expect(new Set(GROUPS.map(g => g.id)).size).toBe(GROUPS.length)
  })

  it('puts every family in a declared group', () => {
    const groups = new Set(GROUPS.map(g => g.id))
    for (const f of FAMILIES) expect(groups.has(f.group), f.id).toBe(true)
  })

  it('leaves no group empty', () => {
    for (const g of GROUPS) {
      expect(FAMILIES.some(f => f.group === g.id), g.id).toBe(true)
    }
  })

  it('uses kebab ids that survive their own normalization', () => {
    // ⛔ THE BUG THIS CATCHES IS REAL, not hypothetical. The illustration
    // catalog mixed `cardgrid` with `header-nav`; a component named `CardGrid`
    // normalizes to `card-grid` and would have missed the concatenated id
    // silently — exactly the names most likely to be right.
    for (const f of FAMILIES) expect(normalizeName(f.id), f.id).toBe(f.id)
  })

  it('writes no slash in a label', () => {
    // A picker heading cannot hedge between two readings; the catalog's
    // "Quote / Estimate" is what forced the `estimate` rename.
    for (const f of FAMILIES) expect(f.label, f.id).not.toContain('/')
  })
})

describe('normalizeName', () => {
  it.each([
    ['CardGrid', 'card-grid'],
    ['SearchModal', 'search-modal'],
    ['Hero', 'hero'],
    ['FAQ', 'faq'],
    ['APIReference', 'api-reference'],
    ['code_block', 'code-block'],
    ['card-grid', 'card-grid'],
    ['Logo Cloud', 'logo-cloud'],
    [undefined, ''],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeName(input)).toBe(expected)
  })
})

describe('resolveFamily', () => {
  it('resolves a conventional name with no declaration', () => {
    expect(resolveFamily({ name: 'Hero' })).toMatchObject({
      id: 'hero',
      label: 'Hero',
      group: 'opening',
      source: 'name',
    })
  })

  it('resolves a multi-word name through normalization', () => {
    expect(resolveFamily({ name: 'CardGrid' })).toMatchObject({ id: 'card-grid', source: 'name' })
  })

  it('lets a declaration beat the name', () => {
    // The whole point of the field: ProfileHero is a fine name and is not on
    // the list, so the component says which family it is.
    expect(resolveFamily({ name: 'ProfileHero', family: 'profile' })).toMatchObject({
      id: 'profile',
      source: 'declared',
    })
  })

  it('lets a declaration beat a name that WOULD have matched', () => {
    expect(resolveFamily({ name: 'Hero', family: 'statement' })).toMatchObject({
      id: 'statement',
      source: 'declared',
    })
  })

  it('reports an unrecognized declaration instead of throwing', () => {
    // §1: an unrecognized value is legal — it falls back, it does not fail.
    // `unknown` carries the string so doctor can offer a near miss.
    expect(resolveFamily({ name: 'Hero', family: 'heros' })).toEqual({
      id: null,
      label: null,
      group: null,
      source: null,
      unknown: 'heros',
    })
  })

  it('returns a miss for a name nobody standardized', () => {
    expect(resolveFamily({ name: 'MemberBand' })).toEqual({
      id: null,
      label: null,
      group: null,
      source: null,
      unknown: null,
    })
  })

  it('does NOT resolve an alias', () => {
    // ⛔ Aliases are doctor's, never the resolver's. An alias here would be a
    // silent guess: map `Banner -> hero` and a cookie-notice Banner gets a
    // confidently wrong picture with no signal. If this test ever goes green
    // for the wrong reason, §4 of the contract has been undone.
    for (const name of ['Banner', 'CallToAction', 'Navbar', 'FeatureGrid']) {
      expect(resolveFamily({ name }).id, name).toBeNull()
    }
  })

  it('survives junk input', () => {
    for (const bad of [null, undefined, 'Hero', 42, {}]) {
      expect(resolveFamily(bad).id).toBeNull()
    }
  })
})

describe('lookups', () => {
  it('finds a family and a group by id', () => {
    expect(getFamily('toc')).toEqual({ id: 'toc', label: 'Table of Contents', group: 'navigating' })
    expect(getGroup('building').label).toBe('Building')
    expect(isFamily('app')).toBe(true)
    expect(isFamily('generic')).toBe(false) // a picker state, never a family
  })
})

describe('locales/en.json', () => {
  it('matches the labels it is generated from', () => {
    // ⛔ Same invalidation as families.json: it is checked in so a consumer can
    // read it straight from the package, which makes it a cache.
    expect(readFileSync(LOCALE_EN, 'utf8')).toBe(renderLocaleJson())
  })

  it('keys every family and group by ID, never by label', () => {
    // ⭐ A label may be reworded; an id may not. A locale file keyed on the
    // English string would break the day anyone improves the wording.
    const en = JSON.parse(readFileSync(LOCALE_EN, 'utf8'))
    expect(Object.keys(en)).toHaveLength(FAMILIES.length + GROUPS.length)
    for (const f of FAMILIES) expect(en[`family.${f.id}`], f.id).toBe(f.label)
    for (const g of GROUPS) expect(en[`group.${g.id}`], g.id).toBe(g.label)
  })
})

describe('families.json', () => {
  it('matches the module it is generated from', () => {
    // ⛔ It is checked in so consumers can read it straight from the package,
    // which makes it a cache — this is its invalidation.
    expect(readFileSync(OUT, 'utf8')).toBe(renderFamiliesJson())
  })
})

describe('family-aliases', () => {
  const ids = FAMILIES.map(f => f.id)

  it('points every alias at a family that exists', () => {
    // ⭐ THE REASON THIS FILE LIVES BESIDE THE LIST. While the table sat in the
    // CLI, removing a family here left an alias pointing at a dead id and no
    // test on either side of the package boundary could see it — `doctor --fix`
    // would have written a family nothing knows.
    for (const [alias, target] of Object.entries(ALIASES)) {
      expect(isFamily(target), `${alias} -> ${target}`).toBe(true)
    }
  })

  it('wastes no alias on a name the resolver already matches', () => {
    // A dead row: step 1 is exact and runs first, so an alias spelled like a
    // family id can never be reached.
    for (const alias of Object.keys(ALIASES)) {
      expect(isFamily(alias), `${alias} is already a family id`).toBe(false)
    }
  })

  it('normalizes every alias and suffix to its own key', () => {
    // A key that does not survive normalizeName() is unreachable: lookups are
    // done on the normalized name.
    for (const alias of Object.keys(ALIASES)) expect(normalizeName(alias), alias).toBe(alias)
    for (const suffix of SHAPE_SUFFIXES) expect(normalizeName(suffix), suffix).toBe(suffix)
  })

  it('bars an ambiguous STEM reached through the suffix rule', () => {
    // ⛔ THE BUG THIS EXISTS FOR, found 2026-09-15 by feeding the matcher names
    // it had never been shown. `CardList` stripped to `card`, hit the `cards`
    // alias, and came back FIXABLE — while `card` is on the ambiguous list
    // precisely as "a container word that names no shape". The guard read the
    // FULL name and the match used the STEM, so they checked different strings.
    //
    // ⚠️ The suite did not catch it because the test below feeds only bare
    // ambiguous names, which the guard handles. A fixture authored to match the
    // matcher can only confirm that the matcher matches itself.
    for (const name of ['CardList', 'CardBand', 'PanelGrid', 'SectionList', 'PageList']) {
      expect(suggestFamily(name, ids).fixable, name).toBe(false)
    }
  })

  it('lets an EXPLICIT alias beat the stem it contains', () => {
    // ⭐ The line between the two. `showcase` alone is ambiguous — features?
    // gallery? spotlight? — so it is refused. `showcase-grid` is a row somebody
    // WROTE in the table, which is a decision rather than a guess, and a
    // decision is allowed to be more specific than the word it contains.
    expect(suggestFamily('ShowcaseGrid', ids)).toMatchObject({
      id: 'card-grid',
      via: 'alias',
      fixable: true,
    })
    expect(suggestFamily('Showcase', ids).fixable).toBe(false)
  })

  it('bars every ambiguous name from --fix, however it is reached', () => {
    // ⛔ The discipline. A wrong auto-fix is worse than a fallback: a developer
    // approves it once and it is wrong in their source forever.
    for (const name of AMBIGUOUS.keys()) {
      const s = suggestFamily(name, ids)
      expect(s.fixable, name).toBe(false)
      expect(s.ambiguous, name).toBeTruthy()
    }
  })

  it('composes the alias table with the suffix rule', () => {
    // Why the table stays small: one subject reaches every shape of the word.
    for (const n of ['SponsorStrip', 'SponsorBand', 'SponsorGrid']) {
      expect(suggestFamily(n, ids).id, n).toBe('logo-cloud')
    }
    expect(suggestFamily('CtaBand', ids).via).toBe('suffix')
  })

  it('reads `<Singular>List` as a collection, not as the singular', () => {
    // ⛔ Measured on real foundations: the suffix rule strips `List` and lands
    // on `article`, which is ONE article. A list of them is a card grid. An
    // explicit row beats the rule, which is why step 2 runs before step 3.
    expect(suggestFamily('ArticleList', ids).id).toBe('card-grid')
    expect(suggestFamily('PostList', ids).id).toBe('card-grid')
    // and the collective subjects still strip correctly — `features` and
    // `stats` ARE the collection, so there is nothing to correct
    expect(suggestFamily('FeatureGrid', ids).id).toBe('features')
    expect(suggestFamily('StatsGrid', ids).id).toBe('stats')
  })

  it('suggests a near miss but never fixes one', () => {
    expect(suggestFamily('heros', ids)).toMatchObject({ id: 'hero', via: 'near', fixable: false })
  })
})

describe('the resolver stays exact', () => {
  it('imports nothing from family-aliases', async () => {
    // ⛔ THE BOUNDARY IS BEHAVIOURAL, NOT PHYSICAL — the two modules are
    // neighbours now, so this is the thing that keeps them apart. An alias
    // reaching `resolveFamily` would be a SILENT wrong illustration, forever,
    // because a wrong picture is not an error.
    const src = readFileSync(new URL('../src/families.js', import.meta.url), 'utf8')
    expect(src).not.toMatch(/family-aliases/)
  })

  it('still refuses every alias', () => {
    for (const alias of ['banner', 'call-to-action', 'navbar', 'logos']) {
      expect(resolveFamily({ name: alias }).id, alias).toBeNull()
    }
  })
})
