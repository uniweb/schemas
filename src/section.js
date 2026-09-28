/**
 * The names framework reserves in a section's params.
 *
 * Every key an author writes in a section's frontmatter, other than `type`, `id` and the
 * section's data (`query:` / `fetch:`), is one of its params, and is stored and synced
 * with the rest. A few of those names are framework's own: the runtime reads them to
 * lay out, paint or theme the section, whatever its component. An editor offers them as
 * the section's settings rather than the component's.
 *
 * `component` says whether the component also receives the value as a param. A
 * component that declares one of these in its `meta.js` `params:` shares it with
 * framework, and the runtime reads the value either way. It never receives `grid` at
 * all, which the build warns about.
 *
 * Dependency-free, like `./grid`.
 */

export const SECTION_PARAMS = Object.freeze({
  /**
   * What the runtime draws behind the section: an image or video URL, a CSS color or
   * gradient, or `{ mode, image, video, gradient, color, overlay }`.
   */
  background: Object.freeze({ component: true }),

  /**
   * The layout of the section's child sections, `3` or `'40/60'` (read with `./grid`).
   * Lifted to `block.grid`, where kit's `ChildGrid` reads it.
   */
  grid: Object.freeze({ component: false }),

  /**
   * The section's color context: `light`, `medium` or `dark`, or `{ mode, ...tokens }`
   * to override tokens too. Left out, the section follows the site. The component
   * receives the mode.
   */
  theme: Object.freeze({ component: true }),
})

/**
 * Whether framework reserves `name` in a section's params.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isSectionParam(name) {
  return Object.hasOwn(SECTION_PARAMS, name)
}
