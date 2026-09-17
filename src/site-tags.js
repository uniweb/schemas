/**
 * Site tags — the standard words for what a site is for, so a list of sites can
 * be filtered and labelled the same way everywhere.
 *
 * A site declares them in `site.yml`:
 *
 *   tags: [blog, personal]
 *
 * ⭐ THE ID IS WHAT A DEVELOPER TYPES; THE LABEL IS WHAT AN AUTHOR READS. Ids are
 * plain, non-localized tokens, so authors filtering in different languages reach
 * the same sites. Labels are translated in `locales/`, keyed by id.
 *
 * ⛔ A TAG SAYS WHAT A SITE IS FOR — never what it can do. Search, forms, sign-in
 * and live data are capabilities, declared elsewhere, so there is no
 * `multilingual` or `searchable` tag: `store` is a site whose job is selling,
 * whatever it sells with.
 *
 * ⛔ THE LIST IS APPEND-ONLY. A `site.yml` in the wild declares these ids, so
 * removing or renaming one breaks that declaration. A label may be reworded.
 *
 * ⚖️ AN UNKNOWN TAG IS LEGAL. It stays on the site and has no standard label, so
 * a picker shows nothing for it. Nothing fails.
 *
 * ⭐ FLAT, FOR NOW. Families need groups to cut 67 illustrations down to a
 * scannable dozen; a filter over two dozen words does not. Nobody declares a
 * group, so adding one later breaks nothing.
 */

/**
 * Every standard tag, in picker order: what a site is, then who it serves.
 *
 * ⛔ NO SLASHES IN A LABEL — the families rule, for the same reason: a slash
 * hedges between two readings. `&` joins two things into one category and is
 * fine.
 *
 * @type {{id: string, label: string}[]}
 */
export const SITE_TAGS = [
  ['business', 'Business'],
  ['landing-page', 'Landing Page'],
  ['portfolio', 'Portfolio'],
  ['personal', 'Personal'],
  ['resume', 'Résumé'],
  ['blog', 'Blog'],
  ['store', 'Online Store'],
  ['documentation', 'Documentation'],
  ['event', 'Event'],
  ['publication', 'Publication'],
  ['community', 'Community'],
  ['technology', 'Technology'],
  ['academic', 'Academic'],
  ['education', 'Education'],
  ['nonprofit', 'Nonprofit'],
  ['local-business', 'Local Business'],
  ['professional-services', 'Professional Services'],
  ['health', 'Health & Wellness'],
  ['food', 'Food & Drink'],
  ['real-estate', 'Real Estate'],
  ['arts', 'Arts & Culture'],
  ['photography', 'Photography'],
  ['music', 'Music'],
  ['travel', 'Travel'],
].map(([id, label]) => ({ id, label }))

const BY_ID = new Map(SITE_TAGS.map(t => [t.id, t]))

/** The tag with this id, or undefined. */
export function getSiteTag(id) {
  return BY_ID.get(id)
}

/** Whether `id` is a standard tag. */
export function isSiteTag(id) {
  return BY_ID.has(id)
}

/**
 * Split a site's declared `tags` into the standard ones and the rest.
 *
 * Declared order is kept and duplicates are dropped. Matching is exact after
 * trimming — `Blog` is not `blog` — because an id is a token, not a word to
 * guess at.
 *
 * ⭐ `unknown` IS NOT AN ERROR LIST. An unrecognized tag is legal; it is reported
 * so a tool can say "this site declares a tag nobody standardized", which is
 * usually a typo.
 *
 * @param {unknown} tags - `site.yml::tags`: a list, or a single id
 * @returns {{tags: {id: string, label: string}[], unknown: string[]}}
 */
export function resolveSiteTags(tags) {
  const list = typeof tags === 'string' ? [tags] : Array.isArray(tags) ? tags : []
  const seen = new Set()
  const out = { tags: [], unknown: [] }
  for (const raw of list) {
    if (typeof raw !== 'string') continue
    const id = raw.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const hit = BY_ID.get(id)
    if (hit) out.tags.push(hit)
    else out.unknown.push(id)
  }
  return out
}
