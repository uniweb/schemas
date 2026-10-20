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
 * ⭐ `SECTION_KEYS`, below, are the rest of a section's frontmatter that is not a param —
 * taken out before the params are stored. The two lists together are every name a
 * component cannot declare as a param [Diego, 2026-09-28], and the build warns on each.
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

  /**
   * Whether the section stays in view as the page scrolls: `true` or `false`. A section type
   * may default it in its `meta.js` — `sticky: true`, or `{ default, top }` for a type that
   * must sit at a set distance from the top, `top` a CSS length (`stickyDeclaration`). The
   * runtime makes sticky the box that can stick, since no box a component draws can: the
   * layout area's, for a section in the header or any other area — when any of its sections
   * is sticky — and the section's own wrapper, for a section in the body or a child section
   * its parent renders as a section, which stays in view within the box its parent places it
   * in. Without a `top`, a section stays below whatever is stuck at the top. On the block as
   * `block.sticky` and `block.stickyTop`.
   */
  sticky: Object.freeze({ component: false }),
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

/**
 * A section type's `sticky` — the default its sections take unless an author says otherwise —
 * checked, and written in one shape: `{ default }`, with `top` when the type has one. A `meta.js`
 * writes `true` or `false`, or `{ default, top }` with either left out: `default` a boolean,
 * `false` when absent; `top` how far below the top the section stays — one CSS value, `4rem` or
 * `var(--header-height)`, written into the style of the box that sticks, so a declaration (`;`, a
 * brace) is refused.
 *
 * ⭐ `top` is never filled in: without one the runtime places the section — below whatever is
 * stuck at the top, or, for an area, at the very top — and `'0px'` would say the very top, under a
 * stuck header.
 *
 * The one reading of a declaration: the build checks a `meta.js` with it and writes the result
 * into the lean runtime schema, and `normalizeFoundationSchema` (`./foundation`) writes a
 * registered entry's. Idempotent — the shape it returns reads back as itself.
 *
 * @param {*} declared - a section type's `sticky`
 * @returns {{ default: boolean, top?: string }}
 * @throws {Error} for any other shape
 */
export function stickyDeclaration(declared) {
  if (typeof declared === 'boolean') return { default: declared }
  if (!declared || typeof declared !== 'object' || Array.isArray(declared)) {
    throw new Error(`Invalid 'sticky': write true, false or { default, top } — got ${JSON.stringify(declared)}`)
  }
  const unknown = Object.keys(declared).filter((key) => key !== 'default' && key !== 'top')
  if (unknown.length) throw new Error(`Invalid 'sticky': ${unknown.join(', ')} — it takes default and top`)
  if (declared.default !== undefined && typeof declared.default !== 'boolean') {
    throw new Error(`Invalid 'sticky.default': write true or false`)
  }
  const out = { default: declared.default === true }
  if (declared.top !== undefined) {
    if (typeof declared.top !== 'string' || !declared.top.trim() || /[;{}]/.test(declared.top)) {
      throw new Error(`Invalid 'sticky.top': one CSS length, such as '4rem' or 'var(--header-height)'`)
    }
    out.top = declared.top.trim()
  }
  return out
}

/**
 * The keys of a section's frontmatter that are not params at all. The build takes each out
 * before the section's params are stored, so a param of the same name never receives what an
 * author writes. `is` says what the key is.
 */
export const SECTION_KEYS = Object.freeze({
  /** The section type — the component that renders the section. */
  type: Object.freeze({ is: 'the section type' }),
  /** The section's own id — the target a link to the section scrolls to. */
  id: Object.freeze({ is: "the section's id" }),
  /** A draft: `hidden: true` leaves the section out of a published build; `uniweb dev` keeps it. */
  hidden: Object.freeze({ is: 'a draft section (hidden: true)' }),
  /** The shorthand for `fetch: { query }` — the section's data, stored as `fetch`. */
  query: Object.freeze({ is: "the section's data — the shorthand for fetch:" }),
  /** Params written as one map: its keys are merged into the params, and `props` is not one. */
  props: Object.freeze({ is: 'params written as one map, merged into the params' }),
  /** Refused — `query:`'s old name. */
  data: Object.freeze({ is: "refused — the old name of query:" }),
  /** Ignored, with a warning: nothing reads it. A preset is offered by `meta.js`. */
  preset: Object.freeze({ is: 'ignored, with a warning' }),
  /** Ignored, with a warning: nothing reads it. */
  input: Object.freeze({ is: 'ignored, with a warning' }),
})

/**
 * Whether `name` is a key of a section's frontmatter that is not a param.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isSectionKey(name) {
  return Object.hasOwn(SECTION_KEYS, name)
}
