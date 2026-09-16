/**
 * The `content:` declaration — read once, here, so nobody else has to.
 *
 * ## ⭐ WHAT THIS IS FOR
 *
 * A section type says what content it expects:
 *
 *     content: {
 *       title:      'Headline',
 *       paragraphs: 'Short pitch [0-1]',
 *       items:      { label: 'Feature cards [3-6]', hint: 'Each H3 becomes a card' },
 *     }
 *
 * That is a grammar — an element vocabulary, a count syntax, two authoring forms
 * for a value, and a set of names whose singular declares what their plural
 * delivers. ⛔ **No consumer should have to learn it.** An editor rendering
 * *"what does this component expect?"* needs a list it can draw, not a parser.
 *
 * `describeContent` returns that list. The grammar stays framework's; the shape
 * below is the contract.
 *
 * ## ⚖️ WHAT IS CONTRACT AND WHAT IS CONVENIENCE
 *
 * ⭐ **The DATA is the contract** — `key`, `kind`, the `arity` numbers, `syntax`,
 * `labelSource`. Those are framework's own facts about its own format, and a
 * consumer may switch on them.
 *
 * ⚠️ **The English STRINGS are convenience defaults** — `description`, and
 * `arity.text`. They are framework's words, which is what makes them
 * translatable later (`locales/*.json` already carries the family labels), and
 * they are literals today. Render them if they help; replace them the day you
 * need another language, and tell us so they move behind keys.
 *
 * ⛔ **`label` IS NEITHER, and the difference is load-bearing.** When a developer
 * wrote it, it is the foundation's own words in whatever language they chose:
 * show it verbatim and never translate it. When they did not, it is ours.
 * `labelSource` is how you tell — the same statement `titleInferred` makes about
 * a section title the build invented.
 */

/**
 * The element vocabulary.
 *
 * ⛔ THE DECLARED NAME AND THE DELIVERED NAME DIFFER, and both are real. A
 * developer declares `image:` (singular — the ROLE the media plays) and the
 * component reads `content.images` (plural — the array). Measured across the
 * seven official templates on 2026-09-16: `images` appears 4 times and `image`
 * 3, so both spellings are in the wild and neither is a mistake. `thumbnail` is
 * a third spelling for the same array; the parser has no `thumbnails`.
 *
 * ⇒ `key` is what the COMPONENT reads. `declaredAs` (the map key here) is what
 * the DEVELOPER wrote. A consumer showing a developer their own declaration
 * wants the second; one describing what arrives wants the first.
 *
 * `syntax` is a markdown sample and is deliberately not prose — it is the same
 * in every language, and it is the single most useful thing to show an author
 * asking what a section wants.
 */
const ELEMENTS = {
  title: {
    key: 'title', kind: 'heading', repeatable: false, label: 'Headline',
    syntax: '# Headline',
    description: 'A level-1 heading. The section’s main line.',
  },
  pretitle: {
    key: 'pretitle', kind: 'heading', repeatable: false, label: 'Eyebrow',
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
    key: 'subtitle', kind: 'heading', repeatable: false, label: 'Subheading',
    syntax: '# Headline\n## Subheading',
    description: 'A secondary line — a heading written after the headline.',
  },
  paragraphs: {
    key: 'paragraphs', kind: 'prose', repeatable: true, label: 'Body text',
    syntax: 'Plain paragraphs of text.',
    description: 'Ordinary prose. Each blank-line-separated block is one paragraph.',
  },
  links: {
    key: 'links', kind: 'link', repeatable: true, label: 'Links',
    syntax: '[Get started](/start)',
    description: 'Markdown links. A component usually renders them as buttons.',
  },
  lists: {
    key: 'lists', kind: 'list', repeatable: true, label: 'Bullet list',
    syntax: '- First point\n- Second point',
    description: 'A bulleted or numbered list.',
  },
  items: {
    key: 'items', kind: 'entries', repeatable: true, label: 'Entries',
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
  image: {
    key: 'images', kind: 'image', repeatable: true, label: 'Image',
    syntax: '![A description](photo.jpg)',
    description: 'A content image, with its description as alt text.',
  },
  images: {
    key: 'images', kind: 'image', repeatable: true, label: 'Image',
    syntax: '![A description](photo.jpg)',
    description: 'A content image, with its description as alt text.',
  },
  thumbnail: {
    key: 'images', kind: 'image', repeatable: true, label: 'Thumbnail',
    syntax: '![A description](thumb.jpg)',
    description: 'A small preview image. It arrives in the same array as other images.',
  },
  icon: {
    key: 'icons', kind: 'icon', repeatable: true, label: 'Icon',
    syntax: '![](lu-star)',
    description: 'An icon by library and name, or your own SVG with {role=icon}.',
  },
  icons: {
    key: 'icons', kind: 'icon', repeatable: true, label: 'Icon',
    syntax: '![](lu-star)',
    description: 'An icon by library and name, or your own SVG with {role=icon}.',
  },
  videos: {
    key: 'videos', kind: 'video', repeatable: true, label: 'Video',
    syntax: '![A description](clip.mp4){role=video}',
    description: 'A video, marked with the video role.',
  },
  snippets: {
    key: 'snippets', kind: 'code', repeatable: true, label: 'Code sample',
    syntax: '```js\nconst x = 1\n```',
    description: 'A fenced code block, shown with syntax highlighting.',
  },
  data: {
    key: 'data', kind: 'data', repeatable: false, label: 'Data block',
    syntax: '```yaml:name\nfield: value\n```',
    description: 'A tagged block the author fills in. Its tag names the key it lands under.',
  },
  insets: {
    key: 'insets', kind: 'inset', repeatable: true, label: 'Inline component',
    syntax: '![A description](@ComponentName){param=value}',
    description: 'Another component placed inline in this one’s content.',
  },
}

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
}

/** Every name a `content:` block may declare, in the order they are documented. */
export const CONTENT_ELEMENTS = [
  'title', 'pretitle', 'subtitle', 'paragraphs', 'links', 'lists', 'items',
  'image', 'images', 'thumbnail', 'icon', 'icons', 'videos', 'snippets', 'data', 'insets',
]

/** The closed set a consumer may switch on. */
export const CONTENT_KINDS = [
  'heading', 'prose', 'list', 'link', 'image', 'icon', 'video', 'entries', 'code', 'data', 'inset',
]

/**
 * Read one expectation's label and count.
 *
 * ⭐ THE COUNT SYNTAX HAD NO READER UNTIL THIS. `'Feature cards [3-6]'` has been
 * documented since the beginning and `docs/reference/component-metadata.md` still
 * calls it "guidance for content authors, not validation" — which was true while
 * nothing parsed it. Anything that describes or generates content needs an
 * arity, so from here the brackets carry meaning.
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

/** The `content:` key a developer writes to declare this delivery key. */
export function declarationKey(key) {
  for (const [declaredAs, spec] of Object.entries(ELEMENTS)) {
    if (spec.key === key) return declaredAs
  }
  return key
}

/** The element vocabulary entry for a declared name, or null. */
export function elementSpec(declaredAs) {
  return ELEMENTS[declaredAs] || null
}

/** An English phrase for a count. A convenience default — see the header. */
function arityText({ min, max, open }, repeatable) {
  if (max !== null && min !== null && min === max) return max === 1 ? 'exactly one' : `exactly ${max}`
  if (max !== null && min !== null) return `${min}–${max}`
  if (max !== null) return `up to ${max}`
  if (open) return `${min} or more`
  if (min !== null) return `${min} or more`
  return repeatable ? 'any number' : 'one'
}

/**
 * Describe what a section type expects, as something an editor can render.
 *
 * @param {object} component - a foundation schema entry. It reads `content`;
 *   `name` is used only for error text. The same argument `resolveFamily` and
 *   `starterContent` take.
 * @returns {{
 *   elements: Array<{
 *     key: string, declaredAs: string, label: string,
 *     labelSource: 'declared'|'standard', hint: string|null,
 *     kind: string, syntax: string, description: string,
 *     arity: { min: number|null, max: number|null, required: boolean,
 *              repeatable: boolean, text: string },
 *   }>,
 *   unknown: Array<{ declaredAs: string, reason: 'not-a-content-element'|'unrecognized', message: string }>,
 *   declared: boolean,
 *   summary: string,
 * }}
 *   `elements` is in declaration order. `declared` is false when the component
 *   declares no `content:` at all — a supported, common state (13 of the 92
 *   section types in the official templates), never an error.
 */
export function describeContent(component) {
  const content = component && typeof component === 'object' ? component.content : null
  const declared = Boolean(content && typeof content === 'object' && Object.keys(content).length > 0)

  const elements = []
  const unknown = []

  for (const [declaredAs, expectation] of Object.entries(declared ? content : {})) {
    if (declaredAs in NOT_CONTENT) {
      unknown.push({
        declaredAs,
        reason: 'not-a-content-element',
        message: `\`${declaredAs}\` is ${NOT_CONTENT[declaredAs]}.`,
      })
      continue
    }

    const spec = ELEMENTS[declaredAs]
    if (!spec) {
      unknown.push({
        declaredAs,
        reason: 'unrecognized',
        message: `\`${declaredAs}\` is not a content element. The vocabulary is fixed: ${Object.keys(ELEMENTS).join(', ')}.`,
      })
      continue
    }

    const parsed = parseExpectation(expectation)
    const hint =
      expectation && typeof expectation === 'object' && typeof expectation.hint === 'string'
        ? expectation.hint
        : null

    elements.push({
      key: spec.key,
      declaredAs,
      // ⛔ A declared label is the DEVELOPER'S words, in whatever language they
      // chose, and is shown verbatim. Ours is a standard name and is not.
      label: parsed.label || spec.label,
      labelSource: parsed.label ? 'declared' : 'standard',
      hint,
      kind: spec.kind,
      syntax: spec.syntax,
      description: spec.description,
      arity: {
        min: parsed.min,
        max: parsed.max,
        // A count nobody wrote states nothing, so it cannot make a thing
        // required — absent is UNKNOWN, not "optional by default".
        required: parsed.min !== null && parsed.min >= 1,
        repeatable: spec.repeatable,
        text: arityText(parsed, spec.repeatable),
      },
    })
  }

  return { elements, unknown, declared, summary: summarize(elements, declared) }
}

/**
 * One line for a picker card. A convenience default — see the header.
 *
 * Counts only where a count was declared, because "Headline (one)" is noise and
 * "Feature cards (3–6)" is the thing an author wants to know.
 */
function summarize(elements, declared) {
  if (!declared) return 'Declares no content expectations.'
  if (elements.length === 0) return 'Declares no content elements.'
  return elements
    .map((e) => (e.arity.min === null && e.arity.max === null ? e.label : `${e.label} (${e.arity.text})`))
    .join(' · ')
}
