/**
 * The `content:` declaration — read once, here, so nobody else has to.
 *
 * ## ⭐ WHAT THIS IS FOR
 *
 * A section type says what content it expects:
 *
 *     content: {
 *       title:      'Headline [1]',
 *       paragraphs: 'Short pitch [0-1]',
 *       media:      'Photo, video or diagram [1]',
 *       items:      { label: 'Feature cards [3-6]', content: { title: 'Feature', paragraphs: 'Description' } },
 *     }
 *
 * That is a grammar — an element vocabulary, a count syntax, several authoring
 * forms for a value, and spellings that read naturally (`image:`, `videos:`)
 * for what is one element (`media`). ⛔ **No consumer should have to learn it.**
 *
 * `describeContent` LOWERS it into one canonical list — the form a foundation
 * registers, written into each component's schema entry by the build — and says
 * what it could not read:
 *
 *     [
 *       { element: 'title',      kind: 'heading', label: 'Headline', min: 1, max: 1 },
 *       { element: 'paragraphs', kind: 'prose',   label: 'Short pitch', min: 0, max: 1 },
 *       { element: 'media',      kind: 'media',   types: ['image', 'video', 'inset'], label: 'Photo, video or diagram', min: 1, max: 1 },
 *       { element: 'items',      kind: 'entries', label: 'Feature cards', min: 3, max: 6,
 *         content: [{ element: 'title', kind: 'heading', label: 'Feature' }, …] },
 *     ]
 *
 * ✅ Ruled [Diego, 2026-09-29]: what a foundation registers is a normalized,
 * lowered version of what the build collects — one predictable form for every
 * reader, while a developer writes naturally and hears about mistakes at build.
 * The same arrangement data schemas have: authored sugar, lowered on the way to
 * the registry.
 *
 * ## ⚖️ WHAT THE LOWERED FORM CARRIES — only what the developer wrote
 *
 * - `element` is what the component reads — `content.<element>` — and `kind` is
 *   one of `CONTENT_KINDS`. A concept block (`'md:faq'` in `data:`) is the one
 *   entry keyed otherwise: `{ key: 'faq', kind: 'concept' }`, read as
 *   `content.data.faq`.
 * - `label` and `hint` appear only where written. ⛔ A declared label is the
 *   foundation's own words, in whatever language the developer chose: show it
 *   verbatim, never translate it. Where there is none, a reader supplies its own
 *   words — framework's English ones are `elementSpec(element).label`.
 * - `min` / `max` only where a count was written. Absent is UNKNOWN, never
 *   "optional".
 * - `types` on every `media` element — all three when none were written.
 *
 * Framework's English descriptions and syntax samples are not in the list; they
 * are `elementSpec`'s, for a reader that wants them.
 *
 * ⭐ **A lowered list is read as itself**: `describeContent` on a registered entry
 * returns its `content` unchanged, so one call serves a `meta.js` and a schema.
 */

/**
 * The kinds a media slot takes — `types` on a `media` element. Visual media:
 * ⛔ never a document, which is declared as `documents` [Diego, 2026-09-29].
 */
export const MEDIA_TYPES = ['image', 'video', 'inset']

/**
 * The kinds of content a section's sequence holds — what `except` on `sequence`
 * may name. One vocabulary with `kind` and `types` (✅ ruled 2026-09-29).
 */
export const SEQUENCE_KINDS = [
  'heading', 'prose', 'list', 'link', 'image', 'video', 'inset', 'icon', 'document', 'code', 'table', 'math', 'quote',
]

/** The closed set of kind names a consumer may switch on. */
export const CONTENT_KINDS = [
  'heading', 'prose', 'list', 'link', 'entries', 'media', 'image', 'video', 'inset', 'icon', 'document', 'code',
  'table', 'math', 'quote', 'sequence', 'concept',
]

/**
 * The canonical elements — what a component reads, with framework's words for
 * each. `label` is framework's standard name for an element nobody labelled;
 * `syntax` is a markdown sample and deliberately not prose (a test asserts each
 * one produces its element); `description` is framework's English, a
 * convenience default.
 */
const CANONICAL = {
  title: {
    element: 'title', kind: 'heading', repeatable: false, label: 'Headline',
    syntax: '# Headline',
    description: 'A level-1 heading. The section’s main line.',
  },
  pretitle: {
    element: 'pretitle', kind: 'heading', repeatable: false, label: 'Eyebrow',
    // ⛔ A LABEL LINE, not a smaller heading before the title. The positional
    // form still parses, but it means "pretitle" only by sitting before a bigger
    // heading — so the same line moved, or left alone, stops being one. `#>` says
    // what it is wherever it lands, and the `#` count means nothing: `#>`, `##>`
    // and `###>` are the same thing.
    syntax: '#> Eyebrow\n# Headline',
    description:
      'A small line above the headline — write it as a label line, `#> Text`. Any number of leading # works; the count carries no meaning.',
  },
  subtitle: {
    element: 'subtitle', kind: 'heading', repeatable: false, label: 'Subheading',
    syntax: '# Headline\n## Subheading',
    description: 'A secondary line — a heading written after the headline.',
  },
  paragraphs: {
    element: 'paragraphs', kind: 'prose', repeatable: true, label: 'Body text',
    syntax: 'Plain paragraphs of text.',
    description: 'Ordinary prose. Each blank-line-separated block is one paragraph.',
  },
  links: {
    element: 'links', kind: 'link', repeatable: true, label: 'Links',
    syntax: '[Get started](/start)',
    description: 'Markdown links. A component usually renders them as buttons.',
  },
  lists: {
    element: 'lists', kind: 'list', repeatable: true, label: 'Bullet list',
    syntax: '- First point\n- Second point',
    description: 'A bulleted or numbered list.',
  },
  items: {
    element: 'items', kind: 'entries', repeatable: true, label: 'Entries',
    // ⛔ H3 UNDER AN H1 TITLE, NOT H2, AND THE DIFFERENCE IS SILENT. A heading
    // exactly one level below the title, written directly after it, is read as
    // the SUBTITLE — so `# Title` + `## First` + `## Second` yields a subtitle
    // and ONE item, not two. Two levels down always starts an entry, with or
    // without body text between. Measured 2026-09-16; it is why the store
    // template's own hint says H3.
    syntax: '# Section title\n\n### First entry\n\nIts text.\n\n### Second entry\n\nIts text.',
    description:
      'Repeated groups within one file — a heading starts each one. Keep entry headings at least two levels below the title (### under a #): a heading one level down, written straight after the title, is read as the subtitle instead.',
  },
  media: {
    element: 'media', kind: 'media', repeatable: true, label: 'Media',
    // ⭐ The same words wherever the element is taught — the reference,
    // AGENTS.md, and here [Diego, 2026-09-29]: an image, a video, or an embedded
    // component. The error the name invites is rendering the slot with an image
    // or video component and dropping a component an author placed there.
    syntax: '![A description](photo.jpg)',
    description: 'An image, a video, or an embedded component — each on its own line, shown in the order written.',
  },
  icons: {
    element: 'icons', kind: 'icon', repeatable: true, label: 'Icon',
    syntax: '![](lu-star)',
    description: 'An icon by library and name, or your own SVG with {role=icon}.',
  },
  documents: {
    element: 'documents', kind: 'document', repeatable: true, label: 'Document',
    syntax: '![Annual report](report.pdf){role=pdf}',
    description: 'A file — a PDF — marked with the pdf role, with an optional preview image, author and description.',
  },
  snippets: {
    element: 'snippets', kind: 'code', repeatable: true, label: 'Code sample',
    syntax: '```js\nconst x = 1\n```',
    description: 'A fenced code block, shown with syntax highlighting.',
  },
  tables: {
    element: 'tables', kind: 'table', repeatable: true, label: 'Table',
    syntax: '| Plan | Price |\n| --- | --- |\n| Basic | $10 |',
    description: 'A markdown table.',
  },
  math: {
    element: 'math', kind: 'math', repeatable: true, label: 'Equation',
    syntax: '$$\nE = mc^2\n$$',
    description: 'A displayed equation, written in LaTeX between `$$` lines.',
  },
  quotes: {
    element: 'quotes', kind: 'quote', repeatable: true, label: 'Quote',
    syntax: '> The words quoted.',
    description: 'A block quote.',
  },
  sequence: {
    element: 'sequence', kind: 'sequence', repeatable: false, label: 'Content',
    syntax: '# Headline\n\nA paragraph.\n\n![A description](photo.jpg)\n\nAnother paragraph.',
    description:
      'The whole section, in the order written — the headline included. Every kind of content reaches the page, less what `except` names.',
  },
}

/**
 * The media spellings — each is the `media` element narrowed to one type.
 *
 * ⛔ THE DECLARED NAME AND THE DELIVERED ARRAY DIFFER, and both are real. A
 * developer declares `image:` (the ROLE the media plays) and the component reads
 * `content.images` (the array) — or `content.media`, the slot's items in the order
 * written. Measured across the official templates on 2026-09-16: `images` appears
 * 4 times and `image` 3, so both spellings are in the wild and neither is a
 * mistake. `thumbnail` is a third spelling for the same array.
 */
const MEDIA_SPELLINGS = {
  image: { types: ['image'], array: 'images', label: 'Image',
    syntax: '![A description](photo.jpg)', description: 'A content image, with its description as alt text.' },
  images: { types: ['image'], array: 'images', label: 'Image',
    syntax: '![A description](photo.jpg)', description: 'A content image, with its description as alt text.' },
  thumbnail: { types: ['image'], array: 'images', label: 'Thumbnail',
    syntax: '![A description](thumb.jpg)', description: 'A small preview image. It arrives in the same array as other images.' },
  videos: { types: ['video'], array: 'videos', label: 'Video',
    syntax: '![A description](clip.mp4){role=video}', description: 'A video, marked with the video role.' },
  insets: { types: ['inset'], array: 'insets', label: 'Inline component',
    syntax: '![A description](@ComponentName){param=value}', description: 'Another component placed in this one’s content.' },
}

/** `icon` is `icons`, spelled for the role. */
const ICON_SPELLINGS = { icon: 'icons' }

/**
 * Names that may appear in a `content:` block and are not content elements.
 *
 * ⛔ `background` is the case that matters: it IS a real `meta.js` key, just a
 * top-level one the runtime renders from frontmatter. A developer who writes it
 * under `content:` has made a real mistake, and reporting it as merely
 * "unrecognized" would hide that there is a correct place for it.
 */
const NOT_CONTENT = {
  background: 'a top-level `meta.js` key, not a content element — the runtime renders it from the section’s frontmatter',
  data:
    'retired — it named no tag, and declaring it delivered nothing. Declare the block’s tag as a key in `data:` — `\'md:<tag>\': \'<label>\'` for a concept block, `<tag>: {}` for a data block',
}

/** Every name a `content:` block may declare, in the order they are documented. */
export const CONTENT_ELEMENTS = [
  'title', 'pretitle', 'subtitle', 'paragraphs', 'links', 'lists', 'items',
  'media', 'image', 'images', 'thumbnail', 'videos', 'insets', 'icon', 'icons',
  'documents', 'snippets', 'tables', 'math', 'quotes', 'sequence',
]

/** A concept block's key in `data:` is written as its fence is: `'md:<tag>'`. */
const CONCEPT_PREFIX = 'md:'

/**
 * The tag of a concept-block key — `'md:faq'` → `'faq'` — or null for any other
 * key. `''` for a prefix with no tag, which is a problem, not a key.
 *
 * @param {string} key - a `data:` key
 * @returns {string|null}
 */
export function conceptTag(key) {
  return typeof key === 'string' && key.startsWith(CONCEPT_PREFIX) ? key.slice(CONCEPT_PREFIX.length) : null
}

/**
 * A `data:` map with each concept-block key lowered to the key a component reads.
 *
 * `'md:faq': 'Questions and answers'` becomes `faq: {}` — a key with no schema,
 * which is what it is: the fence fixes a concept block's shape, and what the
 * author writes in one is declared in the `content` list (`describeContent`). ⭐ So
 * the runtime, and every reader of `data:`, sees the key a component reads and no
 * label mistaken for a schema ref.
 *
 * A key declared both ways — `'md:faq'` and `faq` — keeps the bare declaration,
 * and `describeContent` reports the pair.
 *
 * @param {object|false|undefined} data - a `meta.js` `data:` value
 * @returns {object|false|undefined} the same value when it holds no concept key
 */
export function lowerData(data) {
  if (!isPlainObject(data) || !Object.keys(data).some((key) => conceptTag(key) !== null)) return data
  const out = {}
  for (const [key, value] of Object.entries(data)) {
    const tag = conceptTag(key)
    if (tag === null) out[key] = value
    else if (isTag(tag) && !Object.hasOwn(data, tag)) out[tag] = {}
  }
  return out
}

/** A fence tag: something after `md:`, and no second colon — the reader splits on it. */
function isTag(tag) {
  return Boolean(tag) && !tag.includes(':')
}

/**
 * Read one expectation's label and count.
 *
 * ⭐ THE COUNT SYNTAX HAD NO READER UNTIL 2026-09-16. `'Feature cards [3-6]'` has
 * been documented since the beginning and was "guidance for content authors, not
 * validation" while nothing parsed it. Anything that describes or generates
 * content needs an arity, so the brackets carry meaning.
 *
 * ⛔ A bracket that is not a count stays part of the label: `'Notes [see below]'`
 * is a label, not a malformed count. Guessing would silently rewrite the
 * developer's words.
 *
 * @param {string|{label?: string, hint?: string}} expectation
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
 * The spelling a developer writes for a delivered array — `images` → `image`,
 * `icons` → `icon`. For scaffolding a `content:` declaration from generated
 * content.
 */
export function declarationKey(key) {
  for (const [declaredAs, spec] of Object.entries(MEDIA_SPELLINGS)) {
    if (spec.array === key) return declaredAs
  }
  for (const [declaredAs, element] of Object.entries(ICON_SPELLINGS)) {
    if (element === key) return declaredAs
  }
  return key
}

/**
 * Framework's words for an element — a canonical one (`media`) or a spelling
 * (`image`): its standard label, its kind, a markdown sample and an English
 * description. Null for a name that is not an element.
 *
 * ⚠️ The English strings are convenience defaults, framework's words: render them
 * if they help; replace them the day you need another language.
 *
 * @param {string} name
 * @returns {{ element: string, kind: string, types?: string[], repeatable: boolean,
 *   label: string, syntax: string, description: string }|null}
 */
export function elementSpec(name) {
  if (Object.hasOwn(CANONICAL, name)) return { ...CANONICAL[name] }
  if (Object.hasOwn(MEDIA_SPELLINGS, name)) {
    const { types, label, syntax, description } = MEDIA_SPELLINGS[name]
    return { element: 'media', kind: 'media', types: [...types], repeatable: true, label, syntax, description }
  }
  if (Object.hasOwn(ICON_SPELLINGS, name)) return { ...CANONICAL[ICON_SPELLINGS[name]] }
  return null
}

/** The object-form keys each element takes, beyond `label` and `hint`. */
const EXTRA_KEYS = { media: ['types'], sequence: ['except'], items: ['content'] }

/** Framework's standard label for a lowered entry nobody labelled. */
function standardLabel(entry) {
  if (entry.kind === 'concept') return entry.key
  if (entry.element === 'media' && Array.isArray(entry.types) && entry.types.length === 1) {
    const spelling = { image: 'image', video: 'videos', inset: 'insets' }[entry.types[0]]
    return MEDIA_SPELLINGS[spelling].label
  }
  return CANONICAL[entry.element]?.label || entry.element
}

/**
 * Describe what a section type expects: the canonical list it registers.
 *
 * @param {object} component - a `meta.js` default export, or a foundation schema
 *   entry. It reads `content` and the concept-block keys of `data`; a `content`
 *   that is already a list is read as itself. The same argument `resolveFamily`
 *   and `starterContent` take.
 * @returns {{
 *   declared: boolean,
 *   elements: Array<object>,
 *   problems: string[],
 *   summary: string,
 * }}
 *   `elements` is the canonical list, in declaration order, concept blocks after
 *   the `content:` elements. `declared` is false when the component says nothing
 *   about its content — a supported, common state, never an error. `problems`
 *   says, in words, what could not be read or reads two ways — the rest is still
 *   returned. Nothing throws: a foundation is third-party, and one odd key should
 *   not cost a section its panel.
 */
export function describeContent(component) {
  const entry = component && typeof component === 'object' ? component : {}
  const content = entry.content

  // ⭐ A lowered list is read as itself — a registered schema entry, or anything
  // this function already returned.
  if (Array.isArray(content)) {
    const elements = content.filter(
      (e) => isPlainObject(e) && typeof e.kind === 'string' && (typeof e.element === 'string' || typeof e.key === 'string'),
    )
    return { declared: elements.length > 0, elements, problems: [], summary: summarize(elements, elements.length > 0) }
  }

  const problems = []
  let elements = []
  if (isPlainObject(content)) {
    elements = lowerList(content, 'content', problems, false)
  } else if (content !== undefined && content !== null && content !== false) {
    problems.push(`\`content\` is ${JSON.stringify(content)} — write a map of elements: { title: 'Headline', … }.`)
  }
  const concepts = lowerConcepts(entry.data, problems)

  const declared = (isPlainObject(content) && Object.keys(content).length > 0) || concepts.length > 0
  const all = [...elements, ...concepts]
  return { declared, elements: all, problems, summary: summarize(all, declared) }
}

/**
 * Lower one `content:` map — a section's, or an entry's (`inEntry`) — into the
 * canonical list, reporting what it cannot read into `problems`.
 */
function lowerList(map, path, problems, inEntry) {
  const lowered = []
  const declaredAs = []

  for (const [name, value] of Object.entries(map)) {
    if (value === undefined || value === null || value === false) continue
    const at = `\`${path}.${name}\``

    if (Object.hasOwn(NOT_CONTENT, name)) {
      problems.push(`${at} is ${NOT_CONTENT[name]}.`)
      continue
    }

    const spec = elementSpec(name)
    if (!spec) {
      problems.push(`${at} is not a content element — they are ${CONTENT_ELEMENTS.join(', ')}.`)
      continue
    }

    // ⛔ An entry — an item, or one entry of a concept block — is built as a
    // section is, less the grouping: `flattenGroup` gives it neither `items` nor
    // `sequence` (`semantic-parser/src/processors/groups.js`).
    if (inEntry && (spec.element === 'items' || spec.element === 'sequence')) {
      problems.push(`${at}: an entry holds no ${spec.element} — declare what one entry holds.`)
      continue
    }

    const out = { element: spec.element, kind: spec.kind }
    // `image`, `videos`, `icon`, … — a spelling of another element, fixed to what it names.
    const isSpelling = name !== spec.element
    let label = ''
    let hint = null
    let min = null
    let max = null

    if (value === true || typeof value === 'string') {
      ;({ label, min, max } = parseExpectation(value === true ? '' : value))
    } else if (isPlainObject(value)) {
      const allowed = ['label', 'hint', ...(isSpelling ? [] : EXTRA_KEYS[spec.element] || [])]
      for (const key of Object.keys(value)) {
        if (allowed.includes(key)) continue
        const why =
          key === 'types' && spec.kind === 'media'
            ? ` — \`${name}\` takes one type already; write \`media: { types }\` to choose`
            : ` — the keys are ${allowed.join(', ')}`
        problems.push(`${at}.${key} is not read${why}.`)
      }
      if (value.label !== undefined && typeof value.label !== 'string') {
        problems.push(`${at}.label should be text — the label an author sees, with an optional count: 'Feature cards [3-6]'.`)
      }
      ;({ label, min, max } = parseExpectation(typeof value.label === 'string' ? value.label : ''))
      if (typeof value.hint === 'string') hint = value.hint.trim() || null
      else if (value.hint !== undefined) problems.push(`${at}.hint should be text.`)
    } else {
      problems.push(
        `${at} is ${JSON.stringify(value)} — write a label ('Headline'), a label with a count ('Cards [3-6]'), true, or { label, hint }.`,
      )
      continue
    }

    if (spec.element === 'media') {
      out.types = isSpelling ? spec.types : readTypes(isPlainObject(value) ? value.types : undefined, at, problems)
    }
    if (label) out.label = label
    if (hint) out.hint = hint

    if (spec.element === 'sequence') {
      // ⛔ A count on `sequence` means nothing — it is the whole section.
      if (min !== null) problems.push(`${at} has a count, which means nothing on the whole section — remove it.`)
      const except = isPlainObject(value) ? readExcept(value.except, at, problems) : null
      if (except) out.except = except
    } else {
      if (min !== null) out.min = min
      if (max !== null) out.max = max
    }

    if (spec.element === 'items' && isPlainObject(value) && value.content !== undefined) {
      const entryList = readEntryContent(value.content, `${path}.${name}.content`, problems)
      if (entryList) out.content = entryList
    }

    lowered.push(out)
    declaredAs.push(name)
  }

  reportOverlaps(lowered, declaredAs, path, problems)
  return lowered
}

/** What one entry holds — an entry's `content:` map, lowered — or null. */
function readEntryContent(map, path, problems) {
  if (!isPlainObject(map)) {
    problems.push(`\`${path}\` should be a map of elements, as a section's \`content:\` is: { title: 'Question', paragraphs: 'Answer' }.`)
    return null
  }
  const list = lowerList(map, path, problems, true)
  return list.length > 0 ? list : null
}

/** A media slot's `types`: the kinds it takes, in `MEDIA_TYPES` order — all three when none were written. */
function readTypes(types, at, problems) {
  if (types === undefined) return [...MEDIA_TYPES]
  const list = typeof types === 'string' ? [types] : types
  if (!Array.isArray(list) || list.length === 0) {
    problems.push(`${at}.types should be one of ${MEDIA_TYPES.join(', ')}, or a list of them.`)
    return [...MEDIA_TYPES]
  }
  const known = new Set()
  for (const type of list) {
    if (MEDIA_TYPES.includes(type)) known.add(type)
    else if (type === 'document')
      problems.push(`${at}.types names document — media is visual; declare a document as \`documents\`.`)
    else problems.push(`${at}.types names ${JSON.stringify(type)}, which is not a media type — they are ${MEDIA_TYPES.join(', ')}.`)
  }
  return known.size > 0 ? MEDIA_TYPES.filter((type) => known.has(type)) : [...MEDIA_TYPES]
}

/** A sequence's `except`: the kinds it leaves out, in `SEQUENCE_KINDS` order, or null. */
function readExcept(except, at, problems) {
  if (except === undefined) return null
  const list = typeof except === 'string' ? [except] : except
  if (!Array.isArray(list)) {
    problems.push(`${at}.except should be a kind, or a list of them — ${SEQUENCE_KINDS.join(', ')}.`)
    return null
  }
  const known = new Set()
  for (const kind of list) {
    if (SEQUENCE_KINDS.includes(kind)) known.add(kind)
    else if (kind === 'media')
      problems.push(`${at}.except names media, a slot rather than a kind of content — name image, video and inset.`)
    else problems.push(`${at}.except names ${JSON.stringify(kind)}, which is not a kind of content — they are ${SEQUENCE_KINDS.join(', ')}.`)
  }
  return known.size > 0 ? SEQUENCE_KINDS.filter((kind) => known.has(kind)) : null
}

/**
 * Say, never merge, where two declarations would count one thing twice: two media
 * slots taking a common type (`media` beside `image`), or one element declared
 * under two spellings (`icon` beside `icons`).
 */
function reportOverlaps(lowered, declaredAs, path, problems) {
  for (let i = 0; i < lowered.length; i++) {
    for (let j = i + 1; j < lowered.length; j++) {
      const a = lowered[i]
      const b = lowered[j]
      if (a.element !== b.element) continue
      const both = `\`${path}.${declaredAs[i]}\` and \`${path}.${declaredAs[j]}\``
      if (a.element === 'media') {
        const common = a.types.filter((type) => b.types.includes(type))
        if (common.length === 0) continue
        const named = common.map((type) => ({ image: 'an image', video: 'a video', inset: 'an inset' })[type])
        problems.push(`${both} both take ${named.join(' or ')} — one would count toward both. Declare one slot.`)
      } else {
        problems.push(`${both} both declare \`${a.element}\`. Declare it once.`)
      }
    }
  }
}

/**
 * The concept blocks a component reads — `'md:<tag>'` keys in `data:` — as
 * `{ key, kind: 'concept', label?, hint?, min?, max?, content? }`.
 *
 * ⭐ The key says which block, written as the author writes the fence; the value
 * is the author's label, or `{ label, hint, content }`, whose `content:` says what
 * each entry holds. A count on the label counts the ENTRIES — a key holds one
 * block. ⛔ Never a data schema: a concept block's shape is fixed by its fence.
 */
function lowerConcepts(data, problems) {
  if (!isPlainObject(data)) return []
  const concepts = []

  for (const [key, value] of Object.entries(data)) {
    const tag = conceptTag(key)
    if (tag === null) continue
    const at = `\`data.${key}\``

    if (!isTag(tag)) {
      problems.push(`${at} names no tag — write the key as the fence is written: 'md:faq' for \`\`\`md:faq.`)
      continue
    }
    if (Object.hasOwn(data, tag)) {
      problems.push(`${at} and \`data.${tag}\` both declare content.data.${tag}. Declare it once.`)
    }

    const out = { key: tag, kind: 'concept' }
    let label = ''
    let min = null
    let max = null
    let hint = null
    let entryList = null

    if (value === true || typeof value === 'string') {
      ;({ label, min, max } = parseExpectation(value === true ? '' : value))
      if (typeof value === 'string' && value.trim().startsWith('@')) {
        problems.push(`${at} is ${JSON.stringify(value)}, which reads as a schema — a concept block has none: its value is the author's label.`)
      }
    } else if (isPlainObject(value)) {
      for (const k of Object.keys(value)) {
        if (['label', 'hint', 'content'].includes(k)) continue
        problems.push(
          k === 'schema' || k === 'fields'
            ? `${at}.${k}: a concept block has no schema — its fence fixes its shape. Say what an entry holds with \`content:\`.`
            : `${at}.${k} is not read — the keys are label, hint, content.`,
        )
      }
      ;({ label, min, max } = parseExpectation(typeof value.label === 'string' ? value.label : ''))
      if (typeof value.hint === 'string') hint = value.hint.trim() || null
      if (value.content !== undefined) entryList = readEntryContent(value.content, `data.${key}.content`, problems)
    } else if (value !== null && value !== undefined) {
      // `null` says nothing about the block, as `{}` does; anything else is a mistake.
      problems.push(`${at} is ${JSON.stringify(value)} — write the author's label, or { label, hint, content }.`)
      continue
    }

    if (label) out.label = label
    if (hint) out.hint = hint
    if (min !== null) out.min = min
    if (max !== null) out.max = max
    if (entryList) out.content = entryList
    concepts.push(out)
  }
  return concepts
}

/** An English phrase for a count. A convenience default. */
function countText(min, max) {
  if (min !== null && max !== null && min === max) return max === 1 ? 'exactly one' : `exactly ${max}`
  if (min !== null && max !== null) return `${min}–${max}`
  if (max !== null) return `up to ${max}`
  if (min !== null) return `${min} or more`
  return ''
}

/**
 * One line for a picker card. A convenience default, in framework's English
 * where the developer wrote no label.
 *
 * Counts only where a count was declared, because "Headline (one)" is noise and
 * "Feature cards (3–6)" is the thing an author wants to know.
 */
function summarize(elements, declared) {
  if (!declared) return 'Declares no content expectations.'
  if (elements.length === 0) return 'Declares no content elements.'
  return elements
    .map((e) => {
      const label = e.label || standardLabel(e)
      const count = countText(e.min ?? null, e.max ?? null)
      return count ? `${label} (${count})` : label
    })
    .join(' · ')
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
