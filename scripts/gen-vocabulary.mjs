#!/usr/bin/env node
/**
 * Generate the checked-in forms of the standard vocabularies:
 *
 *   src/families.json    from src/families.js
 *   src/site-tags.json   from src/site-tags.js
 *   src/locales/en.json  the English strings of both
 *
 * ⭐ WHY A SECOND FORM AT ALL. The JS is the source of truth and serves every JS
 * consumer. The JSON subpaths exist for readers that cannot import an ES module,
 * and for any tool that wants a list without a bundler.
 *
 * ⛔ NEVER HAND-EDIT THE OUTPUTS. They are checked in so consumers can read them
 * straight from the package, and the tests regenerate and diff, so drift fails
 * the suite.
 *
 * ⭐ ONE SCRIPT, BECAUSE `en.json` IS ONE FILE. Both vocabularies' strings live in
 * it; a generator per vocabulary would each rewrite the file without the other's
 * keys.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { FAMILIES, GROUPS } from '../src/families.js'
import { SITE_TAGS } from '../src/site-tags.js'

export function renderFamiliesJson() {
  return JSON.stringify({ groups: GROUPS, families: FAMILIES }, null, 2) + '\n'
}

export function renderSiteTagsJson() {
  return JSON.stringify({ tags: SITE_TAGS }, null, 2) + '\n'
}

/**
 * The English strings, as the source every other locale is keyed against.
 *
 * ⭐ WHY FRAMEWORK SHIPS THESE AT ALL. They are framework's own words —
 * "Spotlight", "Logo Cloud", "Landing Page" — and editors translating them
 * independently would diverge. A vocabulary that differs per editor is not a
 * standard vocabulary, which is the whole reason the lists exist.
 *
 * ⛔ KEY BY ID, NEVER BY LABEL. A label may be reworded; an id may not.
 *
 * ⛔ EVERY KEY ENDS IN A LEAF (`.label`, `.description`), never in the id alone.
 * Many i18n pipelines auto-nest on the dot, and `group.opening` holding a string
 * beside `group.opening.description` holding another would collide there — one
 * name would have to be both a string and an object.
 */
export function renderLocaleJson() {
  const out = {}
  for (const g of GROUPS) {
    out[`group.${g.id}.label`] = g.label
    out[`group.${g.id}.description`] = g.description
  }
  for (const f of FAMILIES) out[`family.${f.id}.label`] = f.label
  for (const t of SITE_TAGS) out[`site-tag.${t.id}.label`] = t.label
  return JSON.stringify(out, null, 2) + '\n'
}

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
export const FAMILIES_JSON = join(SRC, 'families.json')
export const SITE_TAGS_JSON = join(SRC, 'site-tags.json')
export const LOCALE_EN = join(SRC, 'locales', 'en.json')

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(FAMILIES_JSON, renderFamiliesJson())
  writeFileSync(SITE_TAGS_JSON, renderSiteTagsJson())
  mkdirSync(dirname(LOCALE_EN), { recursive: true })
  writeFileSync(LOCALE_EN, renderLocaleJson())
  console.log(
    `families.json — ${GROUPS.length} groups, ${FAMILIES.length} families\n` +
      `site-tags.json — ${SITE_TAGS.length} tags\n` +
      `locales/en.json — ${Object.keys(JSON.parse(renderLocaleJson())).length} strings`
  )
}
