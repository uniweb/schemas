/**
 * Placeholder images for generated starter content.
 *
 * ## ⛔ WHY THESE ARE SVG DATA URIs AND NOT HOSTED FILES
 *
 * A serve location is read, never constructed — framework does not know where a
 * consumer's assets live and must not invent an address for one. A hosted
 * placeholder would need a host, and this package has no way to name one that is
 * correct for the editor, the CLI and a static build at the same time.
 *
 * A data URI needs no host at all. It renders identically wherever the content
 * lands, survives a `.md` file on disk, and costs a consumer nothing.
 *
 * ## ⭐ AND THEY ARE DELIBERATELY NOT PRETTY
 *
 * An attractive stock photo gets shipped to production. An obviously abstract
 * block reads as *replace me*, which is the whole job. They paint with
 * `currentColor` at low opacity, so they also take the section's theme context
 * and show an author that the component's theming works.
 *
 * ⛔ ENCODE FULLY. A data URI carrying raw spaces survives ProseMirror and is
 * SILENTLY DROPPED by the markdown lane — `![](data:image/svg+xml,<svg ...>)`
 * parses to zero images with no error, because the space ends the URL. Measured
 * 2026-09-16. `encodeURIComponent` over the whole document is what prevents it;
 * do not hand-roll a partial escape.
 */

/** Aspect ratios a starter image can ask for, as [width, height]. */
const RATIOS = {
  wide: [1600, 900],
  landscape: [1200, 800],
  square: [800, 800],
  portrait: [800, 1000],
}

/**
 * One abstract placeholder, as a fully-encoded SVG data URI.
 *
 * The figure is a rounded frame with a mountain-and-sun glyph — the universal
 * "an image goes here" mark — drawn in `currentColor` so it inherits the
 * section's text colour rather than declaring one.
 */
function placeholderSvg(w, h) {
  const cx = w / 2
  const cy = h / 2
  const s = Math.min(w, h) * 0.34
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-hidden="true">` +
    `<rect width="${w}" height="${h}" fill="currentColor" opacity="0.06"/>` +
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="2" rx="${Math.min(w, h) * 0.02}"/>` +
    `<g fill="currentColor" opacity="0.22">` +
    `<circle cx="${cx - s * 0.45}" cy="${cy - s * 0.42}" r="${s * 0.17}"/>` +
    `<path d="M${cx - s} ${cy + s * 0.62} L${cx - s * 0.28} ${cy - s * 0.16} L${cx + s * 0.18} ${cy + s * 0.34} L${cx + s * 0.5} ${cy + s * 0.02} L${cx + s} ${cy + s * 0.62} Z"/>` +
    `</g></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * A starter image for one slot.
 *
 * @param {string} [shape] - a key of RATIOS; unknown values fall back to `wide`.
 * @param {string} [alt]   - alt text; the caller supplies something the register
 *                           chose, because "Placeholder" tells an author nothing.
 * @returns {{url: string, alt: string, width: number, height: number}}
 */
export function starterImage(shape = 'wide', alt = 'Placeholder image') {
  const [width, height] = RATIOS[shape] || RATIOS.wide
  return { url: placeholderSvg(width, height), alt, width, height }
}

export { RATIOS }
