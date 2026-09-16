#!/usr/bin/env node
/**
 * Generate `src/families.json` from `src/families.js`.
 *
 * ⭐ WHY A SECOND FORM AT ALL. The JS is the source of truth and serves every JS
 * consumer. The JSON subpath exists for readers that cannot import an ES module,
 * and for any tool that wants the list without a bundler.
 *
 * ⛔ NEVER HAND-EDIT `src/families.json`. It is checked in so consumers can read
 * it straight from the package, and `tests/families.test.js` regenerates and
 * diffs, so drift fails the suite.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { FAMILIES, GROUPS } from '../src/families.js'

export function renderFamiliesJson() {
  return JSON.stringify({ groups: GROUPS, families: FAMILIES }, null, 2) + '\n'
}

/**
 * The English strings, as the source every other locale is keyed against.
 *
 * ⭐ WHY FRAMEWORK SHIPS THESE AT ALL. They are framework's own nouns —
 * "Spotlight", "Logo Cloud", "Pathways" — and three editors translating them
 * independently would diverge. A vocabulary that differs per editor is not a
 * standard vocabulary, which is the whole reason the list exists.
 *
 * ⛔ KEY BY ID, NEVER BY LABEL. A label may be reworded; an id may not.
 *
 * Flat dotted keys so any i18n pipeline can consume or transform them. A
 * `locales/<lang>.json` carries the same keys and nothing else.
 */
export function renderLocaleJson() {
  const out = {}
  for (const g of GROUPS) out[`group.${g.id}`] = g.label
  for (const f of FAMILIES) out[`family.${f.id}`] = f.label
  return JSON.stringify(out, null, 2) + '\n'
}

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const OUT = join(SRC, 'families.json')
export const LOCALE_EN = join(SRC, 'locales', 'en.json')

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OUT, renderFamiliesJson())
  mkdirSync(dirname(LOCALE_EN), { recursive: true })
  writeFileSync(LOCALE_EN, renderLocaleJson())
  console.log(
    `families.json — ${GROUPS.length} groups, ${FAMILIES.length} families\n` +
      `locales/en.json — ${GROUPS.length + FAMILIES.length} strings`
  )
}

export { OUT }
