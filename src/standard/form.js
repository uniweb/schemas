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
 * `fields` is a map keyed by field name. Each value carries:
 *
 *   label        string   what the visitor sees
 *   type         string   string · text · int · integer · decimal · number ·
 *                         bool · boolean · date · datetime · file · image ·
 *                         object · array
 *   required     bool     the visitor must answer (absent means false)
 *   format       string   value refinement on a string — email · url · tel
 *   enum         array    choices; either `{ value, label }` or a bare string
 *                         when the two are the same
 *   default      any      pre-filled value
 *   description  string   help text under the control
 *   accept       string   `type: file` only — the HTML accept attribute
 *   multiple     bool     `type: file` only — the HTML multiple attribute
 *   items        object   `type: array` only — element spelling
 *
 * A long answer is `type: text` and a date is `type: date`, in the framework's
 * own spelling — not `format: multiline` / `format: date`. Both spellings were
 * briefly written; the editor canonicalized on 2026-07-31 and still reads the
 * old ones so existing blocks open. A renderer branches on one.
 *
 * Kept deliberately in step with what the editor's builder produces. If this
 * needs to change, tell them rather than diverging — the two are one contract
 * with two implementations.
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
