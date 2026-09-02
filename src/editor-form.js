/**
 * Authored `data:` schema → the rich form shape an editor renders.
 *
 * ## Why this is here and not in `@uniweb/core`
 *
 * It lived in `core/src/schemas.js` until 2026-09-01, next to `isRichSchema`,
 * and that adjacency was the only thing holding it there — it does not call
 * `isRichSchema` and never did; it re-inlines the same three checks. The two
 * functions answer different questions for different audiences:
 *
 *   `isRichSchema`    "is this ALREADY the rich shape?" — a dispatch predicate,
 *                     read at RENDER by `runtime/src/prepare-props.js` and at
 *                     build by `build/src/runtime-schema.js`. Stays in core.
 *   `normalizeSchema` "can this be EDITED, and as what?" — read only by an
 *                     editor. Lives here.
 *
 * `@uniweb/core` is loaded by every site in every lane and is not tree-shaken
 * on the hosted one (the import-map bridge re-exports its entry by name), so
 * an editor-only function on its entry is paid for by every visitor of every
 * site. This package is the zero-dependency leaf that already owns what a
 * data-schema MEANS, which makes it the honest home.
 *
 * ## Why not in `./format.js`
 *
 * That file owns exactly one arrow — authoring → IR — and says so. This is a
 * different arrow with a different target (a form to render, not a shape for
 * tooling to read), and folding it in would blur a model that is load-bearing
 * there. Same package, separate module.
 *
 * ## What it accepts
 *
 * THREE authored shapes reach an editor, and `isRichSchema` accepts exactly one:
 *
 *   { fields: [ {id, …} ] }        meta.js inline rich-form      isRich → true
 *   { fields: { name: spec } }     a RESOLVED NAMED REF          isRich → FALSE
 *   { name: spec }                 meta.js inline field map      isRich → false
 *
 * The middle row is the reason this function exists. A named ref (`'@/article'`,
 * `'@std/person'`) is the FIRST authoring form the docs show, and
 * `validateAndNormalizeSchema` resolves it to `{ fields: <MAP> }` — a map, not
 * an array. Filtering with `isRichSchema` therefore discards not merely
 * "simple" schemas but the primary documented one, and any consumer that wants
 * to render it has to re-derive the conversion.
 *
 * A field map is an unordered `fields[]`, so the conversion is mechanical.
 * Ordering comes from `Object.entries`, which is insertion order for string
 * keys — i.e. the order the author wrote, which is the order a form should show.
 *
 * `sections` returns null on purpose: a sectioned data-schema describes a Model
 * with several sections, which is not one form. Flattening it would invent a
 * layout the author never expressed.
 *
 * @param {*} schema - any authored or resolved `data:` schema value
 * @returns {{ fields: Array<object> } | null} the rich shape, or null
 */
export function normalizeSchema(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema))
    return null

  // Already rich — hand back untouched. Composite/childSchema variants are
  // rich by `isRichSchema`'s definition and are not ours to reshape.
  if (Array.isArray(schema.fields)) return schema
  if (schema.isComposite === true || schema.childSchema) return schema

  // A sectioned Model is not a single form.
  if (schema.sections !== undefined) return null

  const mapToFields = (map) =>
    Object.entries(map).map(([id, spec]) =>
      typeof spec === 'string' ? { id, type: spec } : { id, ...spec }
    )

  // A resolved named ref: `fields` present, as a map.
  if (schema.fields && typeof schema.fields === 'object') {
    const { fields, ...rest } = schema
    return { ...rest, fields: mapToFields(fields) }
  }

  // An inline field map: no `fields` key, so every value must be an OBJECT
  // carrying `type`.
  //
  // The bare-type string shorthand (`{ cpu: 'string' }`) is deliberately NOT
  // accepted here, even though schema FILES support it. Without a `fields` key
  // there is nothing to distinguish it from ordinary data: `{ name: 'Acme' }`
  // and `{ cpu: 'string' }` are the same shape, and an earlier cut of this
  // function turned `{ name, description }` into a two-field form. Erring
  // toward null costs an author the object spelling; erring the other way
  // invents a form out of a config block.
  const entries = Object.entries(schema)
  if (!entries.length) return null
  const isFieldSpec = ([, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) && v.type !== undefined
  if (!entries.every(isFieldSpec)) return null
  return { fields: mapToFields(schema) }
}
