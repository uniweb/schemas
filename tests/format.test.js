/**
 * The format lives here now — so it is tested here.
 *
 * `@uniweb/build` has the deep normalizer suite (`resolve-data-schema.test.js`),
 * and it still passes, because it exercises this code through the build's
 * re-export. This file is not a copy of it. It covers the two things that are
 * true *only* of this package:
 *
 *   1. the format is reachable from here at all (the export surface build and
 *      every foundation depend on), and
 *   2. every schema this package SHIPS is valid in the format this package
 *      DEFINES — a self-consistency check that had no home while the two halves
 *      lived in different packages.
 */

import { describe, expect, it } from 'vitest'
import {
  validateAndNormalizeSchema,
  flatRecordFields,
  parseSchemaRef,
  parseOptionsRef,
  collectNestedRefs,
  SCALAR_KINDS,
  STRUCTURAL_KINDS,
  FORMAT_TYPES,
  AUTHORING_TYPES,
} from '../src/index.js'
import { schemas, getSchemaNames } from '../src/index.js'

describe('the format is exported from this package', () => {
  it('exposes the vocabulary the conformance checker pairs with', () => {
    // Not a tautology: `conform.js` throws at module load if a scalar kind has no
    // conformance predicate, so importing at all proves the pair agrees.
    expect(SCALAR_KINDS.has('decimal')).toBe(true)
    expect(SCALAR_KINDS.has('richtext')).toBe(false) // an alias, never a kind
    expect(FORMAT_TYPES.has('richtext')).toBe(true)
  })

  it('AUTHORING_TYPES is the whole vocabulary, and is derived from it', () => {
    // Derived rather than listed, so adding a kind cannot leave a copy behind.
    // It exists because the set had only ever been an expression inside the
    // "unknown type" error — meaning anything else that wanted it (a schema
    // constraining a `type` field, a doc, a tool) had to restate it.
    for (const kind of SCALAR_KINDS) expect(AUTHORING_TYPES.has(kind)).toBe(true)
    for (const kind of STRUCTURAL_KINDS) expect(AUTHORING_TYPES.has(kind)).toBe(true)
    for (const alias of FORMAT_TYPES) expect(AUTHORING_TYPES.has(alias)).toBe(true)
    // The friendly aliases are not separately exported; assert the folding words.
    for (const alias of ['number', 'integer', 'boolean', 'image']) {
      expect(AUTHORING_TYPES.has(alias)).toBe(true)
    }
    expect(AUTHORING_TYPES.has('richtext')).toBe(true) // an alias, never a kind
  })

  it('every word in it is actually accepted by the normalizer', () => {
    // The set would be worthless if it advertised a word the normalizer rejects.
    //
    // Supplies every structural companion at once rather than special-casing the
    // words that need one — a structural kind reads the one it needs and a scalar
    // reads none of them. Listing "the words that need `fields`" would be the same
    // hand-maintained copy this set exists to eliminate, and it would go stale the
    // moment an alias is added. (It did: `group` was added and a special-cased
    // version of this test failed, which is the mechanism working.)
    const companions = { fields: { a: 'string' }, items: { type: 'string' }, ref: '@/x' }
    for (const word of AUTHORING_TYPES) {
      expect(
        () => validateAndNormalizeSchema({ fields: { f: { type: word, ...companions } } }, '@/x'),
        `type: ${word}`
      ).not.toThrow()
    }
  })

  it('`group` is the author-facing spelling of `object`, and folds to it', () => {
    // The aliases exist because the canonical kinds are storage words. `group` is
    // the same move as `image` → `file`: who has to understand the word decides
    // which word is offered, and schemas are written by people who are not always
    // developers.
    const asGroup = validateAndNormalizeSchema({ fields: { a: { type: 'group', fields: { b: 'string' } } } }, '@/x')
    const asObject = validateAndNormalizeSchema({ fields: { a: { type: 'object', fields: { b: 'string' } } } }, '@/x')
    expect(asGroup).toEqual(asObject)
    expect(asGroup.fields.a.type).toBe('object') // folds before anything downstream sees it
  })

  it('the unknown-type error lists the set rather than a copy of it', () => {
    let message = ''
    try {
      validateAndNormalizeSchema({ fields: { f: { type: 'nonsense' } } }, '@/x')
    } catch (e) {
      message = e.message
    }
    for (const word of AUTHORING_TYPES) expect(message).toContain(word)
  })

  it('parses refs by namespace', () => {
    expect(parseSchemaRef('@/member')).toEqual({ scope: '', name: 'member' })
    expect(parseSchemaRef('@std/person')).toEqual({ scope: 'std', name: 'person' })
    expect(() => parseSchemaRef('person')).toThrow(/must start with '@'/)
  })
})

describe('every shipped standard is valid in this format', () => {
  const names = getSchemaNames()

  it('ships at least one standard', () => {
    expect(names.length).toBeGreaterThan(0)
  })

  it.each(names)("'%s' normalizes without throwing", (name) => {
    const out = validateAndNormalizeSchema(schemas[name], `@std/${name}`)
    // Exactly one of the two structural forms, never both.
    expect(out.fields !== undefined).not.toBe(out.sections !== undefined)
    expect(out.name).toBe(schemas[name].name)
  })

  // Every standard says what many of its entries are called (2026-09-30 [Diego]) —
  // a plural is written, never derived from the name.
  it.each(names)("'%s' declares its plural", (name) => {
    const out = validateAndNormalizeSchema(schemas[name], `@std/${name}`)
    expect(typeof out.plural).toBe('string')
    expect(out.plural.trim()).not.toBe('')
  })

  // …and its icon (2026-10-05 [Diego]) — a framework icon name; the normalizer checks the
  // spelling, and `_contracts/std-schema-icons.test.js` that the corpus has the icon.
  it.each(names)("'%s' declares its icon", (name) => {
    const out = validateAndNormalizeSchema(schemas[name], `@std/${name}`)
    expect(out.icon).toMatch(/^[a-z][a-z0-9]*-[a-z0-9-]+$/)
  })
})

/**
 * `label` and `description` are plain strings at every tier.
 *
 * They are carried inline as the SOURCE-LOCALE string; other locales live in
 * translation rows. So `label: { en: 'Name' }` is not a shorthand — it is a
 * different shape, and the registry rejects it. Catching it here is the whole
 * point: the author sees it at their own screen rather than as a publish failure.
 *
 * This belongs at build time because it is a type check in our OWN format — the
 * same class as the checks on `many`, `tree`, `enum` and `options` — rather than a
 * rule that merely reflects what a downstream consumer has no slot for. Those are
 * deliberately NOT build errors, because a project that never registers should
 * still build.
 */
describe('label and description must be plain strings', () => {
  const norm = (s) => () => validateAndNormalizeSchema(s, '@/x')

  it('rejects a per-locale object on a field', () => {
    expect(norm({ fields: { a: { type: 'string', label: { en: 'Name' } } } })).toThrow(
      /'label' on 'a' must be a plain string, got an object/
    )
  })

  it('rejects one on a section, which carries prose too', () => {
    expect(norm({ sections: { s: { label: { en: 'Identity' }, fields: { a: 'string' } } } })).toThrow(
      /'label' on 'sections.s' must be a plain string/
    )
  })

  it('rejects a list, and says where translations actually live', () => {
    expect(norm({ fields: { a: { type: 'string', description: ['x'] } } })).toThrow(/got a list/)
    expect(norm({ fields: { a: { type: 'string', description: ['x'] } } })).toThrow(/locales\/ folder/)
  })

  it('accepts a plain string, which is the whole supported shape', () => {
    const out = validateAndNormalizeSchema({ fields: { a: { type: 'string', label: 'Name' } } }, '@/x')
    expect(out.fields.a.label).toBe('Name')
  })
})

describe('constraints', () => {
  it('are carried on a field, for the section it lowers into', () => {
    const out = validateAndNormalizeSchema(
      { fields: { a: { type: 'object', constraints: [{ kind: 'min_items', value: 1 }], fields: { b: 'string' } } } },
      '@/x'
    )
    expect(out.fields.a.constraints).toEqual([{ kind: 'min_items', value: 1 }])
  })

  it('must be a list, on a field and on a section alike', () => {
    expect(() =>
      validateAndNormalizeSchema({ fields: { a: { type: 'object', constraints: 'min_items', fields: { b: 'string' } } } }, '@/x')
    ).toThrow(/'constraints' must be a list/)
    expect(() =>
      validateAndNormalizeSchema({ sections: { s: { constraints: {}, fields: { a: 'string' } } } }, '@/x')
    ).toThrow(/'constraints' must be a list/)
  })
})

/**
 * `tree` / `append_only` on a field are validated the way `normalizeSection`
 * validates them, because a section-shaped field becomes a section.
 *
 * These reject rather than drop — and the distinction from `constraints` on a leaf
 * is deliberate. A leaf constraint is well-formed authoring the registry has no
 * slot for, so failing a build over it would punish a project that never
 * registers. `tree: true` on a single object is not that: it is a statement that
 * cannot be true at any tier, so saying so is the only useful response.
 */
describe('tree and append_only describe a list of records', () => {
  const norm = (f) => () => validateAndNormalizeSchema({ fields: { f } }, '@/x')
  const ok = (f) => validateAndNormalizeSchema({ fields: { f } }, '@/x').fields.f

  it('normalizes the friendly `tree` to the IR `nestable`', () => {
    expect(ok({ type: 'object', many: true, tree: true, fields: { a: 'string' } }).nestable).toBe(true)
    expect(ok({ type: 'object', many: true, nestable: true, fields: { a: 'string' } }).nestable).toBe(true)
  })

  it('rejects them on a single object — it cannot nest under itself', () => {
    expect(norm({ type: 'object', tree: true, fields: { a: 'string' } })).toThrow(/describes a list of records/)
    expect(norm({ type: 'object', append_only: true, fields: { a: 'string' } })).toThrow(/describes a list of records/)
  })

  it('rejects them on a list of plain values', () => {
    expect(norm({ type: 'string', many: true, tree: true })).toThrow(/describes a list of records/)
  })

  it('rejects a non-boolean', () => {
    expect(norm({ type: 'object', many: true, tree: 'yes', fields: { a: 'string' } })).toThrow(/must be a boolean/)
  })

  it('leaves `false` as the no-op it is', () => {
    expect(ok({ type: 'object', many: true, tree: false, fields: { a: 'string' } })).not.toHaveProperty('nestable')
  })
})

describe('flatRecordFields — the surface one source file can populate', () => {
  it('is the field map itself for a fields-form schema', () => {
    const norm = validateAndNormalizeSchema({ fields: { a: 'string' } }, '@/x')
    expect(Object.keys(flatRecordFields(norm))).toEqual(['a'])
  })

  it('unions the SINGLE sections of a sections-form schema', () => {
    // `@std/article` splits the card (`brief`) from the body (`body`)
    // so a reference card never drags the ProseMirror body along. A source file
    // still carries both, which is the whole point of this function.
    const norm = validateAndNormalizeSchema(schemas.article, '@std/article')
    const keys = Object.keys(flatRecordFields(norm))
    expect(keys).toContain('title') // from the brief section
    expect(keys).toContain('content') // from the body section
  })

  it('skips multi sections — a list cannot be expressed by one flat record', () => {
    const norm = validateAndNormalizeSchema(
      {
        sections: {
          identity: { brief: true, fields: { name: 'string' } },
          chapters: { many: true, fields: { heading: 'string' } },
        },
      },
      '@/handbook'
    )
    expect(Object.keys(flatRecordFields(norm))).toEqual(['name'])
  })

  it('returns null when a schema has no flat-record surface at all', () => {
    // `@std/nav` is one `many: true` section and nothing else. There is no
    // single record to check, and saying so beats inventing one.
    const norm = validateAndNormalizeSchema(schemas.nav, '@std/nav')
    expect(flatRecordFields(norm)).toBeNull()
  })

  it('keeps the first occurrence when two sections declare one name', () => {
    const norm = validateAndNormalizeSchema(
      {
        sections: {
          a: { brief: true, fields: { title: { type: 'string', description: 'first' } } },
          b: { fields: { title: { type: 'string', description: 'second' } } },
        },
      },
      '@/x'
    )
    expect(flatRecordFields(norm).title.description).toBe('first')
  })
})

/**
 * Model-level keys — the ones that used to vanish.
 *
 * ⛔ Measured 2026-09-01: this validator's allowlist held `name`, `version` and
 * `description`, so `label`, `source_locale` and `linkable` were dropped with no error.
 *
 * ⛔ `creatable_by` is RETIRED (2026-09-23) — Models are open — and refused by name, so a
 * restriction an author believes they declared is never silently absent.
 */
describe('model-level keys', () => {
  const withSections = (extra) => ({
    name: '@demo/session',
    sections: { identity: { brief: true, fields: { title: { type: 'string' } } } },
    ...extra
  })

  it('keeps the keys that used to be dropped', () => {
    const out = validateAndNormalizeSchema(
      withSections({
        label: 'Session',
        description: 'A conference talk.',
        source_locale: 'en',
        linkable: false
      }),
      '@demo/session'
    )
    expect(out.label).toBe('Session')
    expect(out.description).toBe('A conference talk.')
    expect(out.sourceLocale).toBe('en')
    expect(out.linkable).toBe(false)
  })

  it('accepts either spelling, normalizing to one key each', () => {
    // Same rule as `sort_date`/`sortDate`: the authoring vocabulary is snake_case,
    // the camel alias is accepted, and exactly one key reaches the producer —
    // carrying both through is how an authored value gets silently ignored.
    const out = validateAndNormalizeSchema(withSections({ sourceLocale: 'fr' }), '@demo/session')
    expect(out.sourceLocale).toBe('fr')
    expect(out.source_locale).toBeUndefined()
  })

  it('⛔ refuses creatable_by by name — any value, either spelling — because Models are open', () => {
    for (const extra of [
      { creatable_by: 'unit_members' },
      { creatable_by: 'any_user' },
      { creatableBy: 'unit_members' }
    ]) {
      expect(() => validateAndNormalizeSchema(withSections(extra), '@demo/session')).toThrow(
        /'creatable_by' is retired — Models are open/
      )
    }
  })

  it('refuses a non-boolean linkable and a non-string source_locale', () => {
    expect(() => validateAndNormalizeSchema(withSections({ linkable: 'yes' }), '@x')).toThrow(/linkable/)
    expect(() => validateAndNormalizeSchema(withSections({ source_locale: 2 }), '@x')).toThrow(/source_locale/)
  })

  it('refuses a per-locale object for the model label, like every other tier', () => {
    expect(() =>
      validateAndNormalizeSchema(withSections({ label: { en: 'Session' } }), '@demo/session')
    ).toThrow(/must be a plain string/)
  })

  // ⛔ Until 2026-09-30 `plural` was warned about and dropped: "'plural' is not a
  // model-level key and will not be carried".
  it('carries plural, the name for many entries, as a model-level key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const out = validateAndNormalizeSchema(withSections({ label: 'Person', plural: 'People' }), '@demo/person')
    expect(out.plural).toBe('People')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('refuses a per-locale object for plural, as for the label', () => {
    expect(() =>
      validateAndNormalizeSchema(withSections({ plural: { en: 'People' } }), '@demo/person')
    ).toThrow(/'plural' on 'the model' must be a plain string/)
  })

  // ⛔ Until 2026-10-05 `icon` was warned about and dropped, like `plural` before it.
  it('carries icon, a framework icon name, as a model-level key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const out = validateAndNormalizeSchema(withSections({ label: 'Person', icon: 'lu-user' }), '@demo/person')
    expect(out.icon).toBe('lu-user')
    // a name may hold hyphens of its own; the family is what comes before the first
    expect(validateAndNormalizeSchema(withSections({ icon: 'lu-calendar-days' }), '@x').icon).toBe('lu-calendar-days')
    expect(validateAndNormalizeSchema(withSections({ icon: 'hi2-academic-cap' }), '@x').icon).toBe('hi2-academic-cap')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it.each([
    ['a bare name, no family', 'user'],
    ['the colon spelling content also takes', 'lu:user'],
    ['capitals', 'Lu-User'],
    ['a path', './icons/user.svg'],
    ['a URL', 'https://example.com/user.svg'],
    ['a trailing hyphen', 'lu-user-'],
    ['an object', { family: 'lu', name: 'user' }],
  ])('refuses an icon that is not family-name: %s', (_, icon) => {
    expect(() => validateAndNormalizeSchema(withSections({ icon }), '@demo/person')).toThrow(
      /'icon' must be a framework icon name written family-name, like 'lu-user'/
    )
  })

  it('warns about an unknown model-level key rather than dropping it in silence', () => {
    // ⚖️ A warning, not an error: a schema written against a newer registry still
    // builds. But it must not be SILENT — unlike a decl's fields, a model key is
    // lowered by name, so there is nowhere to forward one we do not know.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateAndNormalizeSchema(withSections({ creatabe_by: 'any_user' }), '@demo/session')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('creatabe_by'))
    warn.mockRestore()
  })
})

// ⛔ A `$` name is the system's (ruled 2026-09-27): `$uuid`, `$name` and `$tags` sit beside a
// record's sections and a brief's fields, so no field or section may take one — at any level.
describe('a `$` name is the system\'s', () => {
  const refuses = (schema, pattern) => expect(() => validateAndNormalizeSchema(schema, '@demo/x')).toThrow(pattern)

  it('refuses a `$` field, in the shorthand and in a section', () => {
    refuses({ fields: { $name: 'string' } }, /field '\$name' starts with '\$'/)
    refuses({ sections: { brief: { brief: true, fields: { title: 'string', $tags: 'string' } } } }, /field 'sections\.brief\.\$tags'/)
  })

  it('refuses a `$` section, at the top and nested', () => {
    refuses({ sections: { brief: { brief: true, fields: { title: 'string' } }, $meta: { fields: { a: 'string' } } } }, /section 'sections\.\$meta'/)
    refuses({ sections: { layout: { sections: { $rooms: { many: true, fields: { name: 'string' } } } } } }, /section 'sections\.layout\.sections\.\$rooms'/)
  })

  it('refuses a `$` key inside an object field', () => {
    refuses({ fields: { born: { type: 'object', fields: { $place: 'string' } } } }, /field 'born\.\$place'/)
  })

  it('CONTROL — a `$` inside a name, not at its start, is a name like any other', () => {
    expect(() => validateAndNormalizeSchema({ fields: { price$: 'string', 'a$b': 'string' } }, '@demo/x')).not.toThrow()
  })
})

describe('there is no html', () => {
  // Content is never markup: a component decides how content renders, and an
  // HTML body is the one thing it cannot render without running what it holds.
  // `html` and `format: html` were offered until 2026-10-14.
  const schemaWith = (field) => ({ name: 'note', fields: { body: field } })

  it.each([[{ type: 'html' }], [{ type: 'text', format: 'html' }]])('%j is refused by name', (field) => {
    expect(() => validateAndNormalizeSchema(schemaWith(field), '@/note')).toThrow(/is HTML[\s\S]*richtext[\s\S]*markdown/)
  })

  it('CONTROL — markdown and richtext are what to use', () => {
    expect(() => validateAndNormalizeSchema(schemaWith({ type: 'markdown' }), '@/note')).not.toThrow()
    expect(() => validateAndNormalizeSchema(schemaWith({ type: 'richtext' }), '@/note')).not.toThrow()
    expect(FORMAT_TYPES.has('html')).toBe(false)
    expect(AUTHORING_TYPES.has('html')).toBe(false)
  })
})

describe('access a schema may declare (2026-10-14)', () => {
  it('`grantable` is a boolean on the schema', () => {
    expect(validateAndNormalizeSchema({ name: 'x', grantable: false, fields: { a: 'string' } }, '@/x').grantable).toBe(false)
    expect(() => validateAndNormalizeSchema({ name: 'x', grantable: 'no', fields: { a: 'string' } }, '@/x')).toThrow(/must be a boolean/)
  })

  it('`readable_with` is a level, on a reference or a list of them', () => {
    const out = validateAndNormalizeSchema(
      { name: 'submission', fields: { course: { ref: '@/course', readable_with: 'edit' }, peers: { ref: '@/person', many: true, readable_with: 'read' } } },
      '@/submission'
    )
    expect(out.fields.course.readable_with).toBe('edit')
    expect(out.fields.peers.readable_with).toBe('read')
    expect(() => validateAndNormalizeSchema({ name: 'x', fields: { a: { type: 'string', readable_with: 'read' } } }, '@/x')).toThrow(/only a reference can/)
    expect(() => validateAndNormalizeSchema({ name: 'x', fields: { c: { ref: '@/c', readable_with: 'owner' } } }, '@/x')).toThrow(/read, edit or admin/)
  })
})

// ⭐ A picklist names the SECTION whose items are its choices (2026-10-15): the Model's ref, then the
// section's path. ⛔ Until then `options:` took a Model alone, and a section path was refused — so a
// lists Model's second list could never be a field's choices.
describe('a picklist names a section of a Model', () => {
  it('parses the Model and the section path', () => {
    expect(parseOptionsRef('@/country')).toEqual({ model: '@/country', path: null })
    expect(parseOptionsRef('@/lists/countries')).toEqual({ model: '@/lists', path: 'countries' })
    expect(parseOptionsRef('@acme/lists/countries/subdivisions')).toEqual({ model: '@acme/lists', path: 'countries/subdivisions' })
  })

  it.each(['lists', '@acme', '@/lists/', '@/lists//x', '@/lists/$uuid'])('refuses %j', (ref) => {
    expect(() => parseOptionsRef(ref)).toThrow(/Invalid (options|data-schema) ref/)
  })

  it('a schema may name a section, a nested one by its path', () => {
    const out = validateAndNormalizeSchema(
      { fields: { country: { options: '@/lists/countries' }, province: { options: '@acme/lists/countries/subdivisions' } } },
      '@/cv'
    )
    expect(out.fields.country).toEqual({ type: 'string', options: '@/lists/countries' })
    expect(out.fields.province).toEqual({ type: 'string', options: '@acme/lists/countries/subdivisions' })
  })

  it('names the field when the path is malformed', () => {
    expect(() => validateAndNormalizeSchema({ fields: { country: { options: '@/lists/' } } }, '@/cv')).toThrow(
      /Data schema '@\/cv': field 'country' 'options': Invalid options ref/
    )
  })

  it('the Model is the dependency, not the section', () => {
    const schema = validateAndNormalizeSchema({ fields: { a: { options: '@/lists/countries' }, b: { options: '@std/lists/x/y' } } }, '@/cv')
    expect(collectNestedRefs(schema).sort()).toEqual(['@/lists', '@std/lists'])
  })

  it.each([
    ['item_ref', /'item_ref', the registry's word[\s\S]*`options:`/],
    ['entity_ref', /'entity_ref', the registry's word[\s\S]*`ref:`/],
    ['section', /'section', the registry's word[\s\S]*type: object/],
  ])("type '%s' is refused by name, saying what to write", (type, message) => {
    expect(() => validateAndNormalizeSchema({ fields: { country: { type, options: '@/lists/countries' } } }, '@/cv')).toThrow(message)
  })
})

// ⭐ A field's keys are a closed vocabulary (2026-10-15): one the format does not read is refused by
// name. ⛔ Until then it was dropped here without a word, and a rule an author wrote reached nothing.
describe('a field declares only the keys the format reads', () => {
  const norm = (f) => () => validateAndNormalizeSchema({ fields: { f } }, '@/x')

  it('refuses an unknown key by name, saying what a field takes', () => {
    expect(norm({ type: 'string', widget: 'textarea' })).toThrow(/field 'f' declares 'widget', which is not a field key\. A field takes: type, label/)
  })

  it('points a camelCase spelling at the key', () => {
    expect(norm({ type: 'string', maxLength: 10 })).toThrow(/Did you mean 'max_length'\?/)
    expect(norm({ type: 'string', minLength: 1 })).toThrow(/Did you mean 'min_length'\?/)
  })

  it.each([
    ['localized', true, /write `translatable`/],
    ['multiple', true, /write `many: true`/],
    ['min_length', 1, /does not check a minimum length yet/],
    ['languages', ['en'], /cannot require languages/],
  ])('refuses %s, saying why', (key, value, message) => {
    expect(norm({ type: 'string', [key]: value })).toThrow(message)
  })

  it('CONTROL — every key the standard schemas use is one it reads', () => {
    for (const name of getSchemaNames()) expect(() => validateAndNormalizeSchema(schemas[name], `@std/${name}`)).not.toThrow()
  })
})

// ⭐ A field's rules are its own keys (2026-10-15) — what a registry checks on every write, each
// on the kinds it applies to. ⛔ Until then the normalizer dropped them.
describe("a field's rules", () => {
  const field = (f) => validateAndNormalizeSchema({ fields: { f } }, '@/x').fields.f
  const norm = (f) => () => field(f)

  it('carries each on its kinds', () => {
    expect(field({ type: 'string', max_length: 250 })).toEqual({ type: 'string', max_length: 250 })
    expect(field({ type: 'markdown', max_length: 5000 })).toEqual({ type: 'text', format: 'markdown', max_length: 5000 })
    expect(field({ type: 'integer', min: 0, max: 10 })).toEqual({ type: 'int', min: 0, max: 10 })
    expect(field({ type: 'number', min: 0.5 })).toEqual({ type: 'decimal', min: 0.5 })
    expect(field({ type: 'image', mime_types: ['image/*'], max_size: 2000000 })).toEqual({ type: 'file', mime_types: ['image/*'], max_size: 2000000 })
  })

  it('a list carries them on each value', () => {
    expect(field({ type: 'string', many: true, max_length: 40 })).toEqual({ type: 'array', items: { type: 'string', max_length: 40 } })
  })

  it('refuses one on a kind it does not apply to', () => {
    expect(norm({ type: 'string', min: 1 })).toThrow(/'min', which applies to int and decimal values, not string/)
    expect(norm({ type: 'int', max_length: 3 })).toThrow(/'max_length', which applies to string and text values, not int/)
    expect(norm({ options: '@/lists/countries', max_length: 3 })).toThrow(/a field that picks from a list holds a choice from it/)
  })

  it('checks each value', () => {
    expect(norm({ type: 'string', max_length: 0 })).toThrow(/'max_length' must be a whole number above zero/)
    expect(norm({ type: 'int', min: 1.5 })).toThrow(/'min' must be a whole number on an int/)
    expect(norm({ type: 'decimal', max: '9' })).toThrow(/'max' must be a number/)
    expect(norm({ type: 'file', mime_types: ['image'] })).toThrow(/'mime_types' must be a list of media types/)
    expect(norm({ type: 'int', min: 5, max: 1 })).toThrow(/'min' 5 above 'max' 1/)
  })
})

// ⭐ `pattern` on a string (2026-10-15): a registry checks it on every write, and refuses at register
// what its engine and JavaScript would read differently — so a build refuses it first, saying which
// construct. ⛔ Until then `pattern` was refused by name: no registry checked one.
describe("a string's pattern", () => {
  const field = (f) => validateAndNormalizeSchema({ fields: { f } }, '@/x').fields.f
  const norm = (f) => () => field(f)

  it('is carried on a string, a url and each value of a list', () => {
    expect(field({ type: 'string', pattern: '[A-Z]{2}\\d{4}' })).toEqual({ type: 'string', pattern: '[A-Z]{2}\\d{4}' })
    expect(field({ type: 'url', pattern: 'https://orcid\\.org/.+' })).toEqual({ type: 'string', format: 'url', pattern: 'https://orcid\\.org/.+' })
    expect(field({ type: 'string', many: true, pattern: '[a-z]+' })).toEqual({ type: 'array', items: { type: 'string', pattern: '[a-z]+' } })
  })

  it('applies to a string only', () => {
    expect(norm({ type: 'text', pattern: 'a' })).toThrow(/'pattern', which applies to string values, not text/)
    expect(norm({ type: 'int', pattern: '\\d+' })).toThrow(/'pattern', which applies to string values, not int/)
    expect(norm({ options: '@/lists/countries', pattern: 'a' })).toThrow(/a field that picks from a list holds a choice from it/)
  })

  it('refuses one a registry does not read, naming the construct', () => {
    expect(norm({ type: 'string', pattern: '(?<=a)b' })).toThrow(/field 'f' 'pattern' "\(\?<=a\)b" uses look-around/)
    expect(norm({ type: 'string', pattern: '(a)\\1' })).toThrow(/refers back to a group/)
    expect(norm({ type: 'string', pattern: '[a-z_-]' })).toThrow(/a `-` that ends no range/)
    expect(norm({ type: 'string', pattern: '' })).toThrow(/is not a regular expression/)
    expect(norm({ type: 'string', pattern: 5 })).toThrow(/'pattern' must be a regular expression, written as text/)
  })
})

describe('a format is one its kind takes', () => {
  const field = (f) => validateAndNormalizeSchema({ fields: { f } }, '@/x').fields.f
  const norm = (f) => () => field(f)

  it("a date's precision — a month or a year", () => {
    expect(field({ type: 'date', format: 'year-month' })).toEqual({ type: 'date', format: 'year-month' })
    expect(field({ type: 'date', format: 'year' })).toEqual({ type: 'date', format: 'year' })
    expect(norm({ type: 'date', format: 'month-day' })).toThrow(/format "month-day", which a 'date' field does not take — it takes year-month, year/)
  })

  it('currency on a string', () => {
    expect(field({ type: 'string', format: 'currency' })).toEqual({ type: 'string', format: 'currency' })
  })

  it('refuses one its kind does not take', () => {
    expect(norm({ type: 'string', format: 'phone' })).toThrow(/it takes email, url, currency/)
    expect(norm({ type: 'int', format: 'year' })).toThrow(/a 'int' field does not take — it takes none/)
  })

  it('a picklist takes neither an enum nor a format', () => {
    expect(norm({ options: '@/lists/countries', enum: ['ca'] })).toThrow(/picks from a list \('options:'\), so 'enum' does not apply/)
  })

  it('an enum belongs on a value', () => {
    expect(norm({ ref: '@/person', enum: ['a'] })).toThrow(/'enum' on a reference/)
  })
})

describe("a `fields:` schema's section rules sit beside its fields", () => {
  const RULE = [{ kind: 'exclusive', fields: ['a', 'b'] }]

  it('carries them', () => {
    expect(validateAndNormalizeSchema({ fields: { a: 'string', b: 'string' }, constraints: RULE }, '@/x').constraints).toEqual(RULE)
  })

  it('refuses them beside `sections:` — each section declares its own', () => {
    expect(() =>
      validateAndNormalizeSchema({ sections: { s: { fields: { a: 'string' } } }, constraints: RULE }, '@/x')
    ).toThrow(/'constraints' beside 'sections' rules no section/)
  })
})
