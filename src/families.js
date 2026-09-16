/**
 * Section families — the standard section types a foundation's component can
 * claim, so an editor can show the right illustration and a translated label.
 *
 * ⭐ THE SECTION TYPE IS THE COMPONENT NAME. `type: Hero` in frontmatter is what
 * an author picks, so the name is the signal that matters. A component named
 * from this list needs no declaration at all; `family:` in `meta.js` exists for
 * the ones whose name does not give it away — `ProfileHero`, `CvEntry`,
 * `PublicationsByYear`.
 *
 * ⛔ A FAMILY IS A CLAIM ABOUT SHAPE — never about entitlement, quality or
 * behaviour. Nothing in the build, the runtime or the wire reads it. A
 * foundation that declares none renders identically, and an unrecognized value
 * is legal: it falls back, it does not fail. Nobody waits on this list.
 *
 * ⛔ EXACT MATCHING ONLY, HERE. An alias in the resolver is a silent guess —
 * map `Banner -> hero` and someone whose Banner is a cookie notice gets a
 * confidently wrong picture with no signal. Aliases, suffix-stripping and
 * near-miss suggestions live in `uniweb doctor`, where a human approves each
 * edit and a bad entry can be deleted. That boundary is the design, not a
 * detail — a change that moves alias matching in here undoes it.
 *
 * ⚖️ TWO DIFFERENT CONTRACTS LIVE IN ONE TABLE:
 *   - a family `id` is DECLARED in a `meta.js` in the wild, so the list is
 *     APPEND-ONLY. Removing or renaming one breaks that declaration.
 *   - a `group` is declared by NOBODY. Moving a family between groups breaks
 *     nothing — the picker draws a different heading — so the grouping is
 *     freely revisable and is expected to be revised.
 */

/**
 * The groups, in picker order.
 *
 * ⭐ A GROUP IS A SCAN-REDUCTION DEVICE, NOT AN ONTOLOGY. Every family has an
 * illustration, so an author's real mode is visual scanning; the group's only
 * job is to cut 67 pictures down to a dozen. The test is therefore "holding
 * intent X, does an author land in the right bucket on the first try?" — not
 * "is this the philosophically correct home?"
 *
 * ⛔ WHICH REQUIRES ONE AXIS, CONSISTENTLY. Groups sorted several ways at once
 * — some by who the section is for, some by how it is built, some by what is
 * inside it, some by what it does — cannot be predicted: an author guesses
 * wrong twice and stops browsing. `testimonials` is the case that shows it.
 * Filed by who it is for, it lands somewhere nobody narrowing toward "something
 * that builds trust" would ever look; filed by the move it makes, `convincing`.
 *
 * ⭐ THE AXIS IS THE MOVE THE AUTHOR IS MAKING ON THE PAGE, never what is inside
 * the section: a `hero` and a `statement` contain the same things and differ
 * entirely in purpose.
 *
 * ⚠️ The labels are English DEFAULTS and translation seeds, not the UI. They are
 * gerunds, and the series is what makes them work — "Acting" alone is ambiguous
 * in English; read after Opening, Explaining, Listing, Convincing it can only be
 * the gerund of `act`.
 */
export const GROUPS = [
  { id: 'opening', label: 'Opening', move: 'say what this page is' },
  { id: 'explaining', label: 'Explaining', move: 'your own words and pictures' },
  { id: 'listing', label: 'Listing', move: 'show many of something' },
  { id: 'convincing', label: 'Convincing', move: 'evidence and proof' },
  { id: 'acting', label: 'Acting', move: 'get the visitor to do something' },
  { id: 'navigating', label: 'Navigating', move: 'help them get around' },
  { id: 'embedding', label: 'Embedding', move: 'bring in something external' },
  { id: 'building', label: 'Building', move: 'you supply the substance' },
]

/**
 * The families, grouped for readability. `FAMILIES` below is the flat form.
 *
 * ⭐ THE LABEL IS WHAT AN AUTHOR READS; THE ID IS WHAT A DEVELOPER TYPES. They
 * diverge on purpose where the spoken word is not the natural token — `toc` /
 * "Table of Contents", `cta` / "Call to Action", `auth` / "Sign In".
 *
 * ⛔ NO SLASHES IN A LABEL. A slash hedges between two readings and a picker
 * heading cannot hedge. `estimate` carries the longer id for the same reason:
 * the bare word `quote` is ambiguous with a pull-quote, and a developer
 * reading it would declare the wrong one every time.
 *
 * ⭐ `building` MEANS THE AUTHOR SUPPLIES THE SUBSTANCE, and it is the
 * tie-breaker for the next ambiguous family. The test: does it come with an
 * OPINION about what goes in it? `hero` does — a headline, an image, a call to
 * action. `grid`, `scene` and `app` hand you a surface instead, so what the
 * section becomes is the author's doing. ⇒ When a family's group depends on how
 * it is USED rather than what it IS, it belongs in `building`.
 */
const BY_GROUP = {
  opening: [
    ['hero', 'Hero'],
    ['profile', 'Profile'],
    ['statement', 'Statement'],
    ['announcement', 'Announcement'],
    ['countdown', 'Countdown'],
    ['marquee', 'Marquee'],
  ],
  explaining: [
    ['article', 'Article'],
    ['rich-text', 'Rich Text'],
    ['story', 'Story'],
    ['editorial', 'Editorial'],
    ['figure', 'Figure'],
    ['gallery', 'Gallery'],
    ['video', 'Video'],
    ['code-block', 'Code Block'],
    ['callout', 'Callout'],
    ['steps', 'Steps'],
    ['accordion', 'Accordion'],
    ['process', 'Process'],
    ['roadmap', 'Roadmap'],
    ['faq', 'FAQ'],
  ],
  listing: [
    ['card-grid', 'Card Grid'],
    ['team', 'Team'],
    ['products', 'Products'],
    ['jobs', 'Jobs'],
    ['schedule', 'Schedule'],
    ['menu', 'Menu'],
    ['social-feed', 'Social Feed'],
    ['changelog', 'Changelog'],
    ['downloads', 'Downloads'],
    ['bibliography', 'Bibliography'],
    ['teaser', 'Teaser'],
    ['recommendations', 'Recommendations'],
  ],
  convincing: [
    ['features', 'Features'],
    ['testimonials', 'Testimonials'],
    ['evidence', 'Evidence'],
    ['logo-cloud', 'Logo Cloud'],
    ['integrations', 'Integrations'],
    ['spotlight', 'Spotlight'],
    ['hotspots', 'Hotspots'],
    ['pricing', 'Pricing'],
    ['stats', 'Stats'],
    ['metrics', 'Metrics'],
    ['data-table', 'Data Table'],
    ['comparison', 'Comparison'],
  ],
  acting: [
    ['cta', 'Call to Action'],
    ['contact', 'Contact Form'],
    ['newsletter', 'Newsletter Signup'],
    ['booking', 'Booking'],
    ['wizard', 'Wizard'],
    ['quiz', 'Quiz'],
    ['calculator', 'Calculator'],
    ['estimate', 'Estimate Request'],
    ['search', 'Search'],
    ['auth', 'Sign In'],
    ['paywall', 'Paywall'],
  ],
  navigating: [
    ['header', 'Header'],
    ['footer', 'Footer'],
    ['tabs', 'Tabs'],
    ['pathways', 'Pathways'],
    ['toc', 'Table of Contents'],
  ],
  embedding: [
    ['map', 'Map'],
    ['embed', 'Embed'],
    ['raw-code', 'Raw HTML'],
    ['widget', 'Widget'],
  ],
  building: [
    ['grid', 'Grid'],
    ['scene', 'Scene'],
    ['app', 'App'],
  ],
}

/** Every family, flat, in picker order. @type {{id: string, label: string, group: string}[]} */
export const FAMILIES = GROUPS.flatMap(({ id: group }) =>
  BY_GROUP[group].map(([id, label]) => ({ id, label, group })),
)

const BY_ID = new Map(FAMILIES.map(f => [f.id, f]))
const GROUP_BY_ID = new Map(GROUPS.map(g => [g.id, g]))

/** The family with this id, or undefined. */
export function getFamily(id) {
  return BY_ID.get(id)
}

/** Whether `id` is a known family. */
export function isFamily(id) {
  return BY_ID.has(id)
}

/** The group with this id, or undefined. */
export function getGroup(id) {
  return GROUP_BY_ID.get(id)
}

/**
 * A component name, in kebab.
 *
 * ⛔ EXPORTED BECAUSE IT MUST EXIST ONCE. `uniweb doctor` normalizes the same
 * names before its alias and suffix steps; a second implementation would give
 * two answers to "which illustration is this", and they would drift silently
 * because a wrong illustration is not an error.
 *
 * `CardGrid` -> `card-grid` · `search_modal` -> `search-modal` · `FAQ` -> `faq`
 * · `APIReference` -> `api-reference` (the second regex is what splits a run of
 * capitals before a word, without which it would be `apireference`).
 */
export function normalizeName(name) {
  if (typeof name !== 'string') return ''
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

/**
 * Resolve a component to its family.
 *
 * A declaration always beats the name; an unrecognized declaration resolves to
 * nothing and is reported in `unknown` rather than thrown — §1 of the contract:
 * an unrecognized value is legal.
 *
 * ⭐ `source` IS NOT DECORATION. `doctor`'s coverage line has to say HOW each
 * section resolved, and a picker may treat a name-inferred match differently
 * from a declared one.
 *
 * @param {{name?: string, family?: string}} component - a schema.json entry
 * @returns {{id: string|null, label: string|null, group: string|null,
 *            source: 'declared'|'name'|null, unknown: string|null}}
 */
export function resolveFamily(component) {
  const miss = { id: null, label: null, group: null, source: null, unknown: null }
  if (!component || typeof component !== 'object') return miss

  const declared = typeof component.family === 'string' ? component.family.trim() : ''
  if (declared) {
    const hit = BY_ID.get(declared)
    return hit
      ? { id: hit.id, label: hit.label, group: hit.group, source: 'declared', unknown: null }
      : { ...miss, unknown: declared }
  }

  const hit = BY_ID.get(normalizeName(component.name))
  return hit
    ? { id: hit.id, label: hit.label, group: hit.group, source: 'name', unknown: null }
    : miss
}
