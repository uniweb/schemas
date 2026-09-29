/**
 * What a component's schema entry declares about its PLACE — where it may go and what it
 * arranges — read once, here, so an editor does not learn framework's grammar.
 *
 * The same arrangement as `describeContent` (`./content`): the grammar is framework's,
 * the shapes returned below are the contract, and a consumer may switch on them.
 * ⭐ `children:` is registered LOWERED — `lowerChildren`, written into the entry by the
 * build (✅ ruled 2026-09-29) — and `describeChildren` reads that form as itself.
 *
 * ⚖️ **Guidance, never enforcement.** Every declaration read here is editor metadata.
 * The runtime renders any section type in any position, and `block.childBlocks` is
 * there whether or not `children` is declared.
 *
 * ⭐ **Absent is unknown, not "nothing"** — each function says whether the entry
 * `declared` anything, so a consumer narrows an offer only where a component spoke.
 *
 * Every function takes the same argument `describeContent` takes: a foundation schema
 * entry (or a `meta.js` default export).
 */

import { parseGrid, gridTemplate } from './grid.js'

/**
 * A component's display title, from its name — `TeamRoster` → "Team Roster", `CTA` →
 * "CTA", `FAQSection` → "FAQ Section".
 *
 * ⚠️ For a component whose `meta.js` declares no `title`. A declared title is the
 * developer's own words and is shown as written.
 *
 * @param {string} name - PascalCase component name
 * @returns {string}
 */
export function inferTitle(name) {
  return String(name)
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
}

/**
 * Where a component may be placed.
 *
 *     (no `inset`)                   a section — the default
 *     inset: true                    an inset only: placed inside another section's content
 *     inset: true, section: true     both
 *
 * `section` means something only beside `inset: true`: without it, a component is a
 * section whatever `section` says.
 *
 * @param {object} entry
 * @returns {{ section: boolean, inset: boolean }}
 */
export function describePlacement(entry) {
  const inset = Boolean(entry && typeof entry === 'object' && entry.inset === true)
  return { inset, section: !inset || entry.section === true }
}

const CHILDREN_KEYS = ['label', 'hint', 'min', 'max', 'types', 'grid']

/**
 * Text a developer may write in one language or several — a string, or an
 * `{ en, fr, … }` map of strings. The convention every `label`, `name` and
 * `description` in `meta.js` follows (the component-metadata reference, § Localized
 * labels); a consumer shows the active locale's.
 */
function isLocalizedText(value) {
  if (typeof value === 'string') return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entries = Object.values(value)
  return entries.length > 0 && entries.every((text) => typeof text === 'string')
}

/**
 * What a component says about the child sections it arranges.
 *
 *     children: true | 'many'         it arranges child sections, any number, any type
 *     children: 3                     up to 3, any type
 *     children: { label, hint, min, max, types, grid }
 *
 * `grid` lists the layouts the component offers for its children —
 * `grid: [2, 3, '40/60', '60/40']` — each a value of the section's reserved `grid:` key
 * (`./grid`). A single value offers one layout.
 *
 * `label` and `hint` are a string, or an `{ en, fr, … }` map of strings, returned as
 * written — show the active locale's.
 *
 * @param {object} entry
 * @returns {{
 *   declared: boolean,
 *   label: string|Object<string,string>|null, hint: string|Object<string,string>|null,
 *   min: number|null, max: number|null,
 *   types: string[]|null,
 *   grid: Array<{ value: number|string, columns: number, widths: number[], template: string }>|null,
 *   problems: string[],
 * }}
 *   `types: null` is any type; `grid: null` is no grid declared. `problems` says, in
 *   words, what could not be read — the rest is still returned.
 */
export function describeChildren(entry) {
  const spec = entry && typeof entry === 'object' ? entry.children : undefined
  const problems = []
  const out = { declared: false, label: null, hint: null, min: null, max: null, types: null, grid: null, problems }

  if (spec === undefined || spec === null || spec === false) return out
  out.declared = true
  if (spec === true || spec === 'many') return out

  if (typeof spec === 'number') {
    if (Number.isInteger(spec) && spec >= 1) out.max = spec
    else problems.push(`\`children: ${spec}\` is not a count — write a whole number of 1 or more.`)
    return out
  }

  if (typeof spec !== 'object' || Array.isArray(spec)) {
    problems.push(`\`children\` is ${JSON.stringify(spec)} — write true, 'many', a count, or { label, hint, min, max, types, grid }.`)
    return out
  }

  for (const key of Object.keys(spec)) {
    if (!CHILDREN_KEYS.includes(key)) problems.push(`\`children.${key}\` is not a children key — they are ${CHILDREN_KEYS.join(', ')}.`)
  }

  for (const key of ['label', 'hint']) {
    if (spec[key] === undefined) continue
    if (isLocalizedText(spec[key])) out[key] = spec[key]
    else problems.push(`\`children.${key}\` should be text, or a { en, fr, … } map of text.`)
  }

  if (spec.min !== undefined) {
    if (Number.isInteger(spec.min) && spec.min >= 0) out.min = spec.min
    else problems.push('`children.min` should be a whole number of 0 or more.')
  }
  if (spec.max !== undefined) {
    if (Number.isInteger(spec.max) && spec.max >= 1) out.max = spec.max
    else problems.push('`children.max` should be a whole number of 1 or more.')
  }
  if (out.min !== null && out.max !== null && out.min > out.max) {
    problems.push(`\`children.min\` (${out.min}) is more than \`children.max\` (${out.max}).`)
  }

  if (spec.types !== undefined) {
    const types = typeof spec.types === 'string' ? [spec.types] : spec.types
    if (Array.isArray(types) && types.length > 0 && types.every((type) => typeof type === 'string' && type)) {
      out.types = [...new Set(types)]
    } else {
      problems.push('`children.types` should be a section type name, or a list of them.')
    }
  }

  if (spec.grid !== undefined) {
    const offered = Array.isArray(spec.grid) ? spec.grid : [spec.grid]
    const grid = []
    for (const offer of offered) {
      // A lowered entry holds each layout as this function returns it — read its `value`.
      const value = offer && typeof offer === 'object' && 'value' in offer ? offer.value : offer
      const layout = parseGrid(value)
      if (layout) grid.push({ ...layout, template: gridTemplate(value) })
      else problems.push(`\`children.grid\` offers ${JSON.stringify(value)}, which is not a layout — write a column count (3) or relative widths ('40/60').`)
    }
    if (grid.length > 0) out.grid = grid
    else if (offered.length === 0) problems.push('`children.grid` offers no layout.')
  }

  return out
}

/**
 * `children:` as a foundation registers it: always the object form, holding only what
 * was said — `true` and `'many'` become `{}`, a count `{ max }`, and `grid` each layout
 * as `describeChildren` reads it (`{ value, columns, widths, template }`), so a reader
 * needs no framework code to draw one. `undefined` when nothing is declared.
 *
 * ✅ Ruled [Diego, 2026-09-29]: `children:` lowers with `content:` — one predictable
 * form in what a foundation registers. What could not be read is left out, and said in
 * `describeChildren(entry).problems`.
 *
 * @param {object} entry - a `meta.js` default export, or a schema entry
 * @returns {{ label?, hint?, min?, max?, types?, grid? }|undefined}
 */
export function lowerChildren(entry) {
  const described = describeChildren(entry)
  if (!described.declared) return undefined
  const out = {}
  for (const key of ['label', 'hint', 'min', 'max', 'types', 'grid']) {
    if (described[key] !== null) out[key] = described[key]
  }
  return out
}

const VISUAL_TYPES = ['image', 'video', 'inset']

/**
 * The visual a component takes — ⛔ RETIRED DECLARATION.
 *
 * `visuals` is retired [Diego, 2026-09-29]: a component declares its media slot as the
 * `media` element of `content:` (`describeContent`), and the build refuses the top-level
 * key, naming the move. This reads a schema built before. It goes once its readers
 * confirm they read the element — a confirmation, not a version.
 *
 *     visuals: 1 | 2 | …                 up to that many, any type
 *     visuals: 'many'                    any number, any type
 *     visuals: 'image'                   one, of that type
 *     visuals: ['image', 'video']        one, of a listed type
 *     visuals: { types, count }          `count` a number or 'many'; without one, one
 *
 * The types are `image`, `video` and `inset`.
 *
 * @param {object} entry
 * @returns {{ declared: boolean, max: number|null, types: string[]|null, problems: string[] }}
 *   `max: null` on a declared entry is any number; `types: null` is any of the three.
 */
export function describeVisuals(entry) {
  const spec = entry && typeof entry === 'object' ? entry.visuals : undefined
  const problems = []
  const out = { declared: false, max: null, types: null, problems }

  if (spec === undefined || spec === null || spec === false) return out
  out.declared = true

  const readTypes = (value) => {
    const list = typeof value === 'string' ? [value] : value
    if (!Array.isArray(list) || list.length === 0) {
      problems.push(`\`visuals\` types should be one of ${VISUAL_TYPES.join(', ')}, or a list of them.`)
      return null
    }
    const known = []
    for (const type of list) {
      if (VISUAL_TYPES.includes(type)) known.push(type)
      else problems.push(`\`${type}\` is not a visual type — they are ${VISUAL_TYPES.join(', ')}.`)
    }
    return known.length > 0 ? [...new Set(known)] : null
  }

  if (typeof spec === 'number') {
    if (Number.isInteger(spec) && spec >= 1) out.max = spec
    else problems.push(`\`visuals: ${spec}\` is not a count — write a whole number of 1 or more.`)
    return out
  }
  if (spec === 'many') return out
  if (typeof spec === 'string' || Array.isArray(spec)) {
    out.types = readTypes(spec)
    out.max = 1
    return out
  }
  if (typeof spec === 'object') {
    if (spec.types !== undefined) out.types = readTypes(spec.types)
    if (spec.count === undefined) out.max = 1
    else if (spec.count === 'many') out.max = null
    else if (Number.isInteger(spec.count) && spec.count >= 1) out.max = spec.count
    else problems.push("`visuals.count` should be a whole number of 1 or more, or 'many'.")
    return out
  }

  problems.push(`\`visuals\` is ${JSON.stringify(spec)} — write a count, 'many', a type, a list of types, or { types, count }.`)
  return out
}
