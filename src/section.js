/**
 * The names framework reserves in a section's params.
 *
 * Every key an author writes in a section's frontmatter, other than `type`, `id` and
 * `hidden`, is one of its params, and is stored and synced with the rest — the section's
 * data too, which its `query:` or `fetch:` declares, stored as `fetch`. A few of those
 * names are framework's own: they are settings OF the section, which framework applies —
 * a component does not interpret them. An editor offers them as the section's settings
 * rather than the component's.
 *
 * ⭐ A component never receives them as params [2026-09-28]. Core lifts each onto the
 * section's block, normalized once for every renderer, and framework applies it: the
 * runtime paints the background and the color context around the component, the page
 * stylesheet applies the section's theme and component variables, and kit's `ChildGrid`
 * lays out the child sections. A component that needs one reads it from the block — or
 * with kit: `useColorContext`, `SectionBackground`, `ChildGrid`. ⛔ Until 2026-09-28 a
 * component received `theme` (the mode), `background` and `vars` as params too, and
 * nothing read them there.
 *
 * `component` says whether the component also receives the value as a param — `false`
 * for every name here. A component that declares one in its `meta.js` `params:` never
 * receives what an author writes, which the build warns about. An inset is built the same
 * way, so the same holds for an inset's params.
 *
 * Dependency-free, like `./grid`.
 */

export const SECTION_PARAMS = Object.freeze({
  /**
   * What the runtime draws behind the section: an image or video URL, a CSS color or
   * gradient, or `{ image, video, gradient, color, overlay }`. On the block as
   * `block.background`, normalized.
   */
  background: Object.freeze({ component: false }),

  /**
   * The layout of the section's child sections, `3` or `'40/60'` (read with `./grid`).
   * On the block as `block.grid`, where kit's `ChildGrid` reads it.
   */
  grid: Object.freeze({ component: false }),

  /**
   * The section's theme: `theme.yml`'s own keys, scoped to the section — `colors`,
   * `contexts`, `vars` — plus `mode`, the color context it pins (`light`, `medium`,
   * `dark`; left out, it follows the site's scheme). `theme: dark` is the shorthand for
   * `{ mode: dark }`, and a token written beside `mode` applies to the section in any
   * context. On the block as `block.themeName` and `block.themeOverrides`.
   */
  theme: Object.freeze({ component: false }),

  /**
   * Values for the CSS variables the section's component declares in its `meta.js`
   * `vars:`. The page stylesheet scopes them to the section.
   */
  vars: Object.freeze({ component: false }),

  /**
   * The section's own data — what its `query:` or `fetch:` declares, as framework resolves
   * it. The runtime fetches it and hands the component `content.data`. On the block as
   * `block.fetch`.
   */
  fetch: Object.freeze({ component: false }),
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
