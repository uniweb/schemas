/**
 * Starter content — a section's `content:` declaration, turned into something
 * an author can edit instead of an empty box.
 *
 * ## ⭐ IT IS DERIVED, NEVER AUTHORED
 *
 * A developer declares what their component EXPECTS (`content: { title:
 * 'Headline', items: 'Feature cards [3-6]' }`). That declaration is the only
 * input. There is no `starter:` key in `meta.js` and there should not be
 * [Diego, 2026-09-16]: authored sample copy drifts against the declaration it is
 * meant to match, and — the reason that settles it — **it can never be
 * localized**, because a developer's string is the foundation's own words and is
 * shown verbatim in every UI language. Deriving the copy makes it framework's,
 * which is the one category we already translate. See `starter/registers.js`.
 *
 * ⭐ It reads the declaration through `describeContent`, so a `meta.js` and a
 * registered schema entry — whose `content` is the lowered list — give the same
 * starter.
 *
 * ## Why this package
 *
 * It is the zero-dependency leaf that already owns both standard vocabularies
 * this reads — the section FAMILIES (`./families`) and the content declaration.
 * It is browser-safe, and `frontend` already depends on it. `@uniweb/core` was
 * the wrong home for the same reason `editor-form.js` is not there: core is
 * loaded by every site in every lane and is not tree-shaken on the hosted one, so
 * an editor-only function on its entry is paid for by every visitor of every site.
 *
 * ## ⛔ IT RETURNS A STRUCTURE, NOT A DOCUMENT
 *
 * The output is the flat content shape — the same vocabulary `parseContent`
 * emits and `buildDoc` accepts. Serializing is one call in a package every
 * caller already has, and keeping it out of here is what keeps this package a
 * true leaf:
 *
 *     import { buildDoc } from '@uniweb/semantic-parser'       // → ProseMirror
 *     import { serializeSection } from '@uniweb/content-writer' // → markdown
 *
 *     const { params, content } = starterContent(entry)
 *     const doc = buildDoc(content)
 *     const md  = serializeSection(params, doc)
 *
 * It also means a caller that wants neither serialization — a preview, a test,
 * an editor filling its own model — reads the structure directly.
 */

import { resolveFamily } from './families.js'
import { describeContent } from './content.js'
import { registerFor } from './starter/registers.js'
import { starterImage } from './starter/placeholder.js'
import { sampleRecord } from './starter/sample-record.js'

/**
 * Elements this generator does not fill, though the vocabulary allows them.
 *
 * - `documents`: a document is a real file, which a generator cannot make up.
 * - `tables`, `math`, `quotes`: `buildDoc` writes none of them, so filling one
 *   here would put content in the structure that no serialization keeps.
 */
const UNFILLABLE = new Set(['documents', 'tables', 'math', 'quotes'])

/** How many to generate when the declaration states no count, by element. */
const DEFAULT_ARITY = {
  paragraphs: 2,
  links: 2,
  lists: 1,
  items: 3,
  media: 1,
  icons: 1,
  snippets: 1,
}

/** Generating more than this is noise, whatever the declaration asks for. */
const ARITY_CAP = 8

/**
 * How many of an element to generate, from its lowered count.
 *
 * ⛔ A declared `[0-n]` still generates n, not zero. The floor is the author's
 * option, not our instruction — a starter section that renders nothing teaches
 * nothing, and removing content is the one edit that needs no explanation.
 */
function arityFor(entry) {
  const min = typeof entry.min === 'number' ? entry.min : null
  const max = typeof entry.max === 'number' ? entry.max : null
  const fallback = DEFAULT_ARITY[entry.element] ?? 1
  let n
  if (max !== null) n = max
  // A count with a floor and no ceiling is `[n+]` — open.
  else if (min !== null) n = Math.max(min + 1, fallback)
  else n = fallback
  return Math.min(Math.max(n, 1), ARITY_CAP)
}

/**
 * Take up to n from a list.
 *
 * ⛔ IT DOES NOT REPEAT TO REACH n. Wrapping around looked reasonable and read
 * as a bug: a footer asking for four column groups got "Product · Developers ·
 * Company · Product", and a one-sentence register asked for two paragraphs
 * printed the same sentence twice. Duplicated filler does not say "replace me",
 * it says "something is broken". A short register gives what it has — which
 * still satisfies the declaration's minimum in every case the templates show —
 * and the fix for a register that is genuinely too thin is more copy, here.
 */
function take(list, n) {
  if (!Array.isArray(list) || list.length === 0) return []
  return list.slice(0, n)
}

/**
 * The frontmatter for a starter section: the section type, then a preset's
 * params if one was asked for, else each param's declared default.
 *
 * ⭐ A PRESET IS A CHOICE OF STARTER, which is why it is an option rather than
 * something merged in. `presets: { split: { label, params } }` is a named
 * param combination the developer already curated — an editor offering one
 * starter per preset is offering the A/B the developer designed.
 */
function frontmatterFor(component, presetName) {
  const params = {}
  const presets = component.presets || {}
  const preset = presetName ? presets[presetName] : null

  if (presetName && !preset) {
    throw new Error(
      `[uniweb] Unknown preset '${presetName}' for ${component.name}. ` +
        (Object.keys(presets).length
          ? `Declared presets: ${Object.keys(presets).join(', ')}.`
          : `${component.name} declares no presets.`),
    )
  }

  if (preset && preset.params && typeof preset.params === 'object') {
    Object.assign(params, preset.params)
  } else {
    for (const [key, spec] of Object.entries(component.params || {})) {
      if (spec && typeof spec === 'object' && spec.default !== undefined) {
        params[key] = spec.default
      }
    }
  }

  return { type: component.name, ...params }
}

/** A name for an unfilled entry: the element, or a concept block's key as its fence is written. */
function nameOf(entry) {
  return entry.kind === 'concept' ? `md:${entry.key}` : entry.element
}

/**
 * Generate starter content for one section type.
 *
 * @param {object} component - a `meta.js` default export, or a `schema.json`
 *   component entry. It needs `name`, and reads `content` (a declaration, or the
 *   lowered list), `params`, `presets` and `family` when present. This is the
 *   same argument `resolveFamily` takes, on purpose: a consumer holding a
 *   foundation schema passes an entry straight through to either one.
 * @param {object} [options]
 * @param {string} [options.preset] - use this preset's params as the frontmatter.
 * @param {Array}  [options.assets] - images the CALLER can offer, as
 *   `{ url, alt?, width?, height? }`. Used in order, then the built-in
 *   placeholders. ⛔ Framework never constructs an image address; this is the
 *   only way a real one gets in.
 * @returns {{params: object, content: object, family: object, unfilled: string[],
 *   elementsInferred: boolean}}
 *   `content` is the flat structure — feed it to `buildDoc`. `unfilled` names
 *   declared elements this cannot fill (by their canonical name; a concept block
 *   as `md:<tag>`), so a caller can say so rather than silently omit them.
 *   `elementsInferred` is true when the component declared no `content:` and the
 *   element list came from its family instead.
 */
export function starterContent(component, options = {}) {
  if (!component || typeof component !== 'object' || !component.name) {
    throw new Error('[uniweb] starterContent: a component entry with a `name` is required.')
  }

  const family = resolveFamily(component)
  const register = registerFor(family.id, family.group)
  const assets = Array.isArray(options.assets) ? options.assets : []

  // ⭐ A COMPONENT THAT DECLARES NO `content:` IS NOT A COMPONENT THAT WANTS
  // NOTHING. 13 of the 92 sections in the official templates declare none, and
  // several have an unambiguous family — `marketing/Hero` is a hero. Handing an
  // author an empty box for a section whose shape we know is the worse answer,
  // so the family's canonical element set answers when the developer did not.
  //
  // ⛔ AND THE CALLER IS TOLD. `elementsInferred` says the element list is ours
  // rather than the developer's — the distinction a schema entry draws by carrying
  // `title` only when the developer wrote one, and for the same reason: a consumer
  // cannot tell from the output alone, and the two deserve different treatment.
  const described = describeContent(component)
  const elementsInferred = !described.declared
  const list = elementsInferred
    ? describeContent({ content: Object.fromEntries((register.elements || []).map((el) => [el, true])) }).elements
    : described.elements

  const unfilled = []
  let assetCursor = 0
  const nextImage = (alt) => {
    const supplied = assets[assetCursor++]
    if (supplied && supplied.url) {
      return { url: supplied.url, alt: supplied.alt || alt, width: supplied.width, height: supplied.height }
    }
    const shape = register.image?.shape || 'wide'
    return starterImage(shape, alt)
  }

  /**
   * Fill a group — the section, or one entry — from a lowered list. `record` is
   * the register's entry an item is made from: its title and line are the
   * entry's headline and text.
   */
  const fill = (entries, record = null) => {
    const group = {}
    for (const entry of entries) {
      if (entry.kind === 'concept' || UNFILLABLE.has(entry.element)) {
        // ⚠️ A concept block too: `buildDoc` writes a tagged prose fence as no
        // node yet, so a structure for one would not survive serializing.
        unfilled.push(nameOf(entry))
        continue
      }
      // An entry is one of several: one of each thing it holds.
      const n = record ? 1 : arityFor(entry)

      switch (entry.element) {
        case 'title':
          group.title = record ? record.title : register.headline
          break
        case 'pretitle':
          group.pretitle = register.eyebrow
          break
        case 'subtitle':
          group.subtitle = register.subhead
          break
        case 'paragraphs':
          group.paragraphs = record ? (record.line ? [record.line] : []) : take(register.sentences, n)
          break
        case 'links':
          group.links = take(register.actions, n).map((a) => ({ label: a.label, href: a.href }))
          break
        case 'lists':
          // One list of several entries — `n` counts the LISTS, and the bullets
          // inside one are the register's, not a second arity to invent.
          group.lists = Array.from({ length: n }, () => [...register.bullets])
          break
        case 'items': {
          // ⭐ What each entry holds is the entry's own `content:` when the
          // developer declared one — the same list a section's lowers to — and a
          // headline with a line of text when they did not.
          const holds = entry.content || [
            { element: 'title', kind: 'heading' },
            { element: 'paragraphs', kind: 'prose' },
          ]
          group.items = take(register.records, n).map((r) => fill(holds, r))
          break
        }
        case 'media':
          // Only an image can be made up: no placeholder video exists, and an
          // embedded component is the author's choice of component. A slot that
          // takes images gets images, whatever else it also takes.
          if (entry.types.includes('image')) {
            group.images = [
              ...(group.images || []),
              ...Array.from({ length: n }, () => nextImage(register.image?.alt || 'Placeholder image')),
            ]
          } else {
            unfilled.push(nameOf(entry))
          }
          break
        case 'icons':
          group.icons = take(register.icons, n).map((name) => ({ library: 'lu', name }))
          break
        case 'snippets':
          group.snippets = take(register.snippets, n)
          break
        case 'sequence':
          // The whole section, as written. Its prose is what a starter can
          // write; what else it takes, the author adds where they want it.
          if (!(entry.except || []).includes('prose') && !entries.some((e) => e.element === 'paragraphs')) {
            group.paragraphs = take(register.sentences, 2)
          }
          break
        default:
          unfilled.push(nameOf(entry))
      }
    }
    return group
  }

  const content = fill(list)

  return {
    params: frontmatterFor(component, options.preset),
    content,
    family,
    unfilled: [...new Set(unfilled)],
    elementsInferred,
  }
}

// Re-exported because `@uniweb/schemas/starter` is where a caller of this
// generator looks for them; `./content` is where they live.
export { parseExpectation, declarationKey } from './content.js'
export { registerFor, starterImage, sampleRecord }
