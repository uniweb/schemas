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
 * ## Why this package
 *
 * It is the zero-dependency leaf that already owns both standard vocabularies
 * this reads — the section FAMILIES (`./families`) and the data SCHEMAS. It is
 * browser-safe, and `frontend` already depends on it. `@uniweb/core` was the
 * wrong home for the same reason `editor-form.js` is not there: core is loaded
 * by every site in every lane and is not tree-shaken on the hosted one, so an
 * editor-only function on its entry is paid for by every visitor of every site.
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
import { registerFor } from './starter/registers.js'
import { starterImage } from './starter/placeholder.js'
import { sampleRecord } from './starter/sample-record.js'
// ⚖️ The package BARREL, deliberately: it is the one registry of `@std/*`, so a
// standard added there is samplable here with no second list to update. Safe
// because `index.js` does not import this module — a subpath export, not part of
// the entry — and adding such an import there would be the cycle to avoid.
import { schemas as STANDARD_SCHEMAS } from './index.js'

/**
 * A `content:` key → the key the structure (and the component) uses.
 *
 * ⛔ THE DECLARATION AND THE DELIVERY DO NOT USE THE SAME WORD for images and
 * icons: a developer declares `image:` and `icon:` (singular, a role) and the
 * component reads `content.images` and `content.icons` (plural, the arrays).
 * `thumbnail` is a third spelling for the same array — it names the ROLE the
 * image plays, not a separate slot; the parser has no `thumbnails`.
 *
 * ⛔ `background` is NOT a content element. It is the top-level `background:`
 * key in `meta.js` and is rendered by the runtime from frontmatter, so a
 * declaration that lists it here is naming something this cannot fill.
 */
const ELEMENT_TO_SLOT = {
  title: 'title',
  pretitle: 'pretitle',
  subtitle: 'subtitle',
  paragraphs: 'paragraphs',
  links: 'links',
  lists: 'lists',
  items: 'items',
  videos: 'videos',
  snippets: 'snippets',
  data: 'data',
  image: 'images',
  images: 'images',
  thumbnail: 'images',
  icon: 'icons',
  icons: 'icons',
}

/**
 * A slot → the `content:` key a developer writes for it.
 *
 * ⛔ THE INVERSE OF THE TABLE ABOVE, AND EXPORTED SO THERE IS ONLY ONE. A caller
 * that scaffolds a declaration needs to go back the other way, and the CLI was
 * doing it with two hand-written ternaries — a second copy of a mapping that
 * lives here, which rots silently the moment a row is added above.
 *
 * Several elements map to one slot (`image` / `images` / `thumbnail` → `images`),
 * so this names the canonical spelling to WRITE: the first key that maps to each
 * slot, which is the singular role name a developer declares.
 */
const SLOT_TO_ELEMENT = Object.entries(ELEMENT_TO_SLOT).reduce((out, [element, slot]) => {
  if (!(slot in out)) out[slot] = element
  return out
}, {})

/**
 * The `content:` key a developer writes to declare this slot.
 *
 * @param {string} slot - a key of the structure `starterContent` returns
 * @returns {string} the declaration spelling, or the slot itself when it has none
 */
export function declarationKey(slot) {
  return SLOT_TO_ELEMENT[slot] || slot
}

/** Elements a declaration may legally carry that this generator does not fill. */
const UNFILLABLE = new Set(['background', 'insets', 'quotes', 'headings'])

/** How many to generate when the declaration states no count. */
const DEFAULT_ARITY = {
  title: 1,
  pretitle: 1,
  subtitle: 1,
  paragraphs: 2,
  links: 2,
  lists: 1,
  items: 3,
  images: 1,
  icons: 1,
  videos: 1,
  snippets: 1,
}

/**
 * Slots a count cannot describe, so no arity is computed for them.
 *
 * A heading is one string — ⚠️ `buildDoc` does accept a string ARRAY for a
 * multi-line title, and a declared `title: 'Headline [2]'` would be the way to
 * ask for one. Nothing in the official templates does (the only count on a
 * heading is `[0-1]`, meaning optional), and the registers carry one headline
 * per family, so asking would produce a repeat. Left unsupported deliberately
 * rather than by oversight.
 *
 * `data` is a MAP keyed by tag: its size is how many keys the component
 * declares in `data:`, never a number in the label.
 */
const UNCOUNTED = new Set(['title', 'pretitle', 'subtitle', 'data'])

/** Generating more than this is noise, whatever the declaration asks for. */
const ARITY_CAP = 8

/**
 * Read a content expectation's label and count.
 *
 * ⭐ THIS IS THE FIRST READER OF THE COUNT SYNTAX. `'Feature cards [3-6]'` has
 * been documented since the beginning and parsed NOWHERE — `docs/reference/
 * component-metadata.md` calls it "guidance for content authors, not
 * validation". Generating content needs an arity, so from here the brackets are
 * load-bearing: a developer who writes one is now telling us how much to make.
 *
 * ⭐ AND THE NUMBER WE TAKE IS THE UPPER BOUND, deliberately. A component is not
 * obliged to render everything it is handed, and the params that reduce (a
 * `layout: compact`) simply render less — so surplus content costs nothing and
 * is the free A/B a preset gives you, while a shortfall leaves a visible hole.
 * `[0-2]` generates 2. `[2+]` generates 3.
 *
 * @param {string|object} expectation - `'Label [1-2]'` or `{ label, hint }`
 * @returns {{label: string, min: number|null, max: number|null, open: boolean}}
 */
export function parseExpectation(expectation) {
  const raw =
    typeof expectation === 'string'
      ? expectation
      : (expectation && typeof expectation === 'object' && expectation.label) || ''

  const match = String(raw).match(/^(.*?)\s*\[\s*(\d+)\s*(?:(-)\s*(\d+)|(\+))?\s*\]\s*$/)
  if (!match) return { label: String(raw).trim(), min: null, max: null, open: false }

  const [, label, first, dash, second, plus] = match
  const min = Number(first)
  if (dash) return { label: label.trim(), min, max: Number(second), open: false }
  if (plus) return { label: label.trim(), min, max: null, open: true }
  return { label: label.trim(), min, max: min, open: false }
}

/**
 * How many of an element to generate.
 *
 * ⛔ A declared `[0-n]` still generates n, not zero. The floor is the author's
 * option, not our instruction — a starter section that renders nothing teaches
 * nothing, and removing content is the one edit that needs no explanation.
 */
function arityFor(slot, expectation) {
  const { min, max, open } = parseExpectation(expectation)
  const fallback = DEFAULT_ARITY[slot] ?? 1
  let n
  // `[n+]` always parses a digit before the `+`, so `min` is a number here.
  if (max !== null) n = max
  else if (open) n = Math.max(min + 1, fallback)
  else if (min !== null) n = min
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

/**
 * Resolve one `data:` value to a schema this can sample.
 *
 * A value is a named ref (`'@std/person'`, `{ schema: '@/member' }`), an inline
 * field map, an inline rich-form, or `{}` for a key with no schema at all.
 *
 * ⭐ `@std/*` RESOLVES HERE, WITH NO HELP. Those schemas are this package's own,
 * so the commonest ref in the wild costs a caller nothing. ⛔ `@/x` and `@org/x`
 * cannot: they live on the foundation's disk, and resolving them is the build's
 * job (`dataSchemas` in `schema.json`). A caller holding that map passes it in;
 * one that does not gets no block for those keys rather than a wrong one.
 */
function resolveDataSchema(value, dataSchemas) {
  const ref =
    typeof value === 'string'
      ? value
      : value && typeof value === 'object' && typeof value.schema === 'string'
        ? value.schema
        : null

  if (ref) {
    if (dataSchemas && dataSchemas[ref]) return dataSchemas[ref]
    const std = ref.startsWith('@std/') ? STANDARD_SCHEMAS[ref.slice('@std/'.length)] : null
    return std || null
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  // `{}` declares a key and no shape — there is nothing to sample.
  return Object.keys(value).length > 0 ? value : null
}

/**
 * One tagged block per key the component declares in `data:`, keyed by the tag
 * an author would write (```yaml:<key>). Returns null when nothing resolved, so
 * the caller can report the element unfilled rather than emit an empty map.
 */
function sampleDataBlocks(declared, dataSchemas) {
  if (!declared || typeof declared !== 'object' || Array.isArray(declared)) return null
  const blocks = {}
  for (const [tag, value] of Object.entries(declared)) {
    const schema = resolveDataSchema(value, dataSchemas)
    if (!schema) continue
    const record = sampleRecord(schema)
    if (record !== null) blocks[tag] = record
  }
  return Object.keys(blocks).length > 0 ? blocks : null
}

/**
 * Generate starter content for one section type.
 *
 * @param {object} component - a `schema.json` component entry. It needs `name`,
 *   and reads `content`, `params`, `presets` and `family` when present. This is
 *   the same argument `resolveFamily` takes, on purpose: a consumer holding a
 *   foundation schema passes an entry straight through to either one.
 * @param {object} [options]
 * @param {string} [options.preset] - use this preset's params as the frontmatter.
 * @param {object} [options.dataSchemas] - resolved schemas by ref, as
 *   `schema.json`'s `dataSchemas` carries them. Needed only for `@/x` and
 *   `@org/x` refs; `@std/*` resolves without it.
 * @param {Array}  [options.assets] - images the CALLER can offer, as
 *   `{ url, alt?, width?, height? }`. Used in order, then the built-in
 *   placeholders. ⛔ Framework never constructs an image address; this is the
 *   only way a real one gets in.
 * @returns {{params: object, content: object, family: object, unfilled: string[],
 *   elementsInferred: boolean}}
 *   `content` is the flat structure — feed it to `buildDoc`. `unfilled` names
 *   declared elements this cannot fill, so a caller can say so rather than
 *   silently omit them. `elementsInferred` is true when the component declared
 *   no `content:` and the element list came from its family instead.
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
  // rather than the developer's — the same statement `titleInferred` makes about
  // a title the build invented, and for the same reason: a consumer cannot tell
  // from the output alone, and the two deserve different treatment.
  const elementsInferred = !component.content || Object.keys(component.content).length === 0
  const declared = elementsInferred
    ? Object.fromEntries((register.elements || []).map((el) => [el, '']))
    : component.content

  const content = {}
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

  for (const [element, expectation] of Object.entries(declared)) {
    if (UNFILLABLE.has(element)) {
      unfilled.push(element)
      continue
    }
    const slot = ELEMENT_TO_SLOT[element]
    if (!slot) {
      unfilled.push(element)
      continue
    }

    const n = UNCOUNTED.has(slot) ? 0 : arityFor(slot, expectation)

    switch (slot) {
      case 'title':
        content.title = register.headline
        break
      case 'pretitle':
        content.pretitle = register.eyebrow
        break
      case 'subtitle':
        content.subtitle = register.subhead
        break
      case 'paragraphs':
        content.paragraphs = take(register.sentences, n)
        break
      case 'links':
        content.links = take(register.actions, n).map((a) => ({ label: a.label, href: a.href }))
        break
      case 'lists':
        // One list of several entries — `n` counts the LISTS, and the bullets
        // inside one are the register's, not a second arity to invent.
        content.lists = Array.from({ length: n }, () => [...register.bullets])
        break
      case 'items':
        content.items = take(register.records, n).map((r) => ({
          title: r.title,
          ...(r.line ? { paragraphs: [r.line] } : {}),
        }))
        break
      case 'images':
        content.images = Array.from({ length: n }, () =>
          nextImage(register.image?.alt || 'Placeholder image'),
        )
        break
      case 'icons':
        content.icons = take(register.icons, n).map((name) => ({ library: 'lu', name }))
        break
      case 'snippets':
        content.snippets = take(register.snippets, n)
        break
      case 'data': {
        // ⭐ `content: { data: … }` IS THE DISCRIMINATOR, and it is the whole
        // reason this is not filled whenever `data:` exists.
        //
        // `data:` in meta.js declares the `content.data` keys a component
        // RECEIVES — and a key is filled either by a FETCH the site declares or
        // by a tagged block the author writes. `store/ProductGrid` declares
        // `data: { products: … }` filled by a query; writing a ```yaml:products
        // block for it would invent content the site is supposed to supply.
        // `docs/ApiReference` declares `content: { data: 'API definition' }`,
        // which says the author writes it inline. Only that says so.
        //
        // ⚠️ It cannot separate two keys of ONE component when some are fetched
        // and some authored — nothing in meta.js distinguishes them. A component
        // in that position gets a block per key and its developer deletes the
        // ones a query fills.
        const blocks = sampleDataBlocks(component.data, options.dataSchemas)
        if (blocks) content.data = blocks
        else unfilled.push(element)
        break
      }
      case 'videos':
        // No placeholder video exists and inventing an address is exactly what
        // this package must not do — so a declared video slot is reported
        // unfilled rather than filled with a URL nobody can serve.
        unfilled.push(element)
        break
      default:
        unfilled.push(element)
    }
  }

  return {
    params: frontmatterFor(component, options.preset),
    content,
    family,
    unfilled,
    elementsInferred,
  }
}

export { registerFor, starterImage, sampleRecord }
