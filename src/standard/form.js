/**
 * Form schema — a form DESIGNED BY AN AUTHOR, not a form's answers.
 *
 * There are two orders of schema here and this one describes the first:
 *
 *   ```yaml:form ```  a form DEFINITION — an author says what a visitor will be
 *                     asked. Schema-shaped, but it is CONTENT.
 *        ↓ describes
 *   a submission      what a visitor actually answers, at runtime.
 *
 * **This schema validates the definition. Nothing can validate the submission
 * at build time** — its shape is whatever the author designed, and is not
 * knowable when a foundation is written.
 *
 * That distinction is the whole reason this file exists. A component that
 * renders an authored form is the inverse of every other component: it does not
 * declare the fields, it RECEIVES them and draws whatever it is given. So it
 * cannot declare `data: { form: { name: …, email: … } }` — those are the
 * author's field names. What it can declare is `data: { form: '@std/form' }`,
 * which asks the only answerable question: *is this a well-formed form?*
 *
 * ```js
 * // meta.js — a form-rendering section
 * export default {
 *   data: { form: '@std/form' },
 * }
 * ```
 *
 * The editor supplies its own builder UI for this content regardless of what a
 * foundation declares (its `builtinSchemas()` takes precedence for the `form`
 * key), so declaring this changes validation, not the authoring surface.
 *
 * ── What this catches, and what it does not ──
 *
 * Caught: a missing `fields`, a `fields` that is a list rather than a map (the
 * likeliest authoring slip, since the NORMALIZED shape is an array — see
 * `mapToFields` in `@uniweb/core/src/schemas.js`), and a non-string `title`.
 *
 * Not caught: anything about an individual field. Our data-schema vocabulary can
 * describe an object's NAMED keys (`type: object` + `fields`) and every element
 * of an array (`type: array` + `items`), but it has no construct for *a map
 * whose values all conform to X* — and a form's field names are the author's, so
 * a map is exactly what this is. The per-field grammar below is therefore
 * documented rather than enforced. Closing that gap needs an `items`-for-objects
 * construct in the vocabulary; raised with the editor team 2026-07-31.
 *
 * ── The per-field grammar (documentation, not enforcement) ──
 *
 * Diffed against `collab/context/std-form-shape.json` — a GENERATED fixture the
 * editor derives from its own builder and re-asserts on drift. That file is the
 * authority on what a form definition actually contains; this comment tracks it
 * and is not an independent claim. Re-diff rather than hand-syncing.
 *
 * `fields` is a map keyed by field name. Each value carries:
 *
 *   type         string   REQUIRED. What the builder emits today:
 *                         string · text · number · bool · date · file
 *   label        string   what the visitor sees
 *   description  string   help text under the control
 *   required     bool     the visitor must answer
 *   format       string   refines a string. Emitted today: `email` only
 *   enum         array    choices; either `{ value, label }` or a bare string
 *                         when the two are the same. BOTH spellings may appear
 *                         in one list
 *   accept       string   file fields only — the HTML accept attribute
 *   multiple     bool     file fields only — the HTML multiple attribute
 *
 * A validator must accept MORE than this list, not exactly it: the wire carries
 * the framework's authoring vocabulary, so `int`, `datetime`, `image`, `url` and
 * the rest are legal in a hand-written form even though the builder has no
 * control that emits them. The list above is what the only current PRODUCER
 * emits, which is a narrower thing and the one that can drift.
 *
 * Absent is normal, not missing: `label: ""`, `required: false`, `multiple:
 * false` and friends are dropped on the way out rather than written empty.
 * `condition` never appears — conditional visibility is an editor-only concern
 * (`@uniweb/core/src/schemas.js:14`).
 *
 * A long answer is `type: text` and a date is `type: date`, in the framework's
 * own spelling — not `format: multiline` / `format: date`. Both spellings were
 * briefly written; the editor canonicalized on 2026-07-31 and still reads the
 * old ones so existing blocks open. A renderer branches on one.
 *
 * Kept deliberately in step with the editor's builder. If this needs to change,
 * tell them rather than diverging — one contract, two implementations.
 */
export default {
  name: 'form',
  version: '1.0.0',
  description: 'A form designed by an author — the fields a visitor will be asked',

  fields: {
    title: {
      type: 'string',
      description: 'Heading shown above the form',
    },
    description: {
      type: 'string',
      description: 'Short explanation shown under the title',
    },
    fields: {
      type: 'object',
      required: true,
      translatable: false,
      description:
        'The form controls, as a map keyed by field name. Values follow the ' +
        'per-field grammar in this file\'s header; the map is not validated ' +
        'per-value because the vocabulary has no construct for an open map.',
    },
  },
}
