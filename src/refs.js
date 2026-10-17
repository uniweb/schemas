/**
 * ⭐ `@/x` — A FOUNDATION'S OWN TYPE — AND THE ONE RULE THAT NAMES IT IN FULL.
 *
 * `@/x` is how a foundation names a data schema it defines itself, wherever it names one: a
 * section type's `data:`, a site's `queries.yml`, a call to the site's backend. A backend holds
 * that type under the name `register` stored it under, `@<scope>/x` — the scope in the
 * foundation's name (`@acme/marketing` → `@acme/x`), never `@std` and never a site's org
 * [Diego, 2026-09-22].
 *
 * Every path that sends a ref names it in full here: `register`, a push, and a foundation's own
 * calls to its backend — which get the scope from the foundation's build. Imports nothing, so a
 * foundation bundle that needs it carries this alone.
 *
 * @module @uniweb/schemas/refs
 */

/**
 * `@/x` in the foundation's scope — `@acme/x` for `@acme`, `acme` or `@acme/marketing`. Any other
 * ref, or no scope, as given.
 *
 * @param {string} ref
 * @param {string|null} [scope]
 * @returns {string}
 */
export function qualifyRef(ref, scope) {
  const handle = typeof scope === 'string' ? scope.replace(/^@/, '').replace(/\/.*$/, '') : ''
  return typeof ref === 'string' && ref.startsWith('@/') && handle ? `@${handle}/${ref.slice(2)}` : ref
}
