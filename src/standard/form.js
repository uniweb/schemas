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
 * Also caught, since `values:` landed: a field with no `type`, and a per-field
 * key holding the wrong kind of value (`required: "yes"`, `enum: "a,b"`).
 *
 * Not caught, deliberately: an unknown per-field key, and an unknown `type`
 * word. A form may carry keys this builder cannot author — hand-written, or
 * from a newer editor — and the boundary passes them through; the producer
 * states as much via `fieldKeysAreNotExhaustive`. Rejecting them would fail
 * builds on good content, which is worse than not checking.
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
      description: 'The form controls, as a map keyed by field name',
      // An OPEN MAP: the keys are the author's field names, every value is a
      // field spec. `values` is to an object what `items` is to an array; it
      // was added to the vocabulary for exactly this shape.
      //
      // Deliberately PERMISSIVE. Only `type` is required, and unknown keys pass
      // — a form may legitimately carry per-field keys this builder cannot
      // author (hand-written, or from a newer editor), and the editor's
      // boundary passes them through untouched. `fieldKeysAreNotExhaustive` in
      // the shared fixture states this from the producer's side. A stricter
      // check would fail builds on good content, which is worse than no check.
      //
      // `enum` is an untyped array on purpose: a choice is EITHER a bare string
      // or `{ value, label }`, and both may appear in one list, which no single
      // `items` type can express.
      values: {
        type: 'object',
        fields: {
          // `translatable: false` on the machine tokens. A string field is localized
          // by DEFAULT — right for anything the visitor reads, wrong for a token a
          // renderer branches on. Translating `type: number` to `type: numéro`, or
          // `accept: image/*`, produces a form that silently stops working in that
          // locale, and the per-locale copies make it look deliberate.
          //
          // The test is who consumes the value: the visitor (`label`,
          // `description`, `placeholder` — and `enum`'s choice labels) or the code.
          type: { type: 'string', required: true, translatable: false, description: 'Control kind — string, text, number, bool, date, file' },
          label: { type: 'string', description: 'What the visitor sees' },
          description: { type: 'string', description: 'Help text under the control' },
          placeholder: { type: 'string', description: 'Ghost text inside the control' },
          required: { type: 'bool', description: 'The visitor must answer' },
          format: { type: 'string', translatable: false, description: 'Refines a string — `email` today' },
          enum: { type: 'array', description: 'Choices — bare strings and/or { value, label }' },
          accept: { type: 'string', translatable: false, description: 'File fields — the HTML accept attribute' },
          multiple: { type: 'bool', description: 'File fields — the HTML multiple attribute' },
        },
      },
    },
  },
}
