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
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { FAMILIES, GROUPS } from '../src/families.js'

export function renderFamiliesJson() {
  return JSON.stringify({ groups: GROUPS, families: FAMILIES }, null, 2) + '\n'
}

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'families.json')

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(OUT, renderFamiliesJson())
  console.log(`families.json — ${GROUPS.length} groups, ${FAMILIES.length} families`)
}

export { OUT }
