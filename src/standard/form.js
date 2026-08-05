/**
 * `@std/form` — a form DESIGNED BY AN AUTHOR, not a form's answers.
 *
 * There are two orders of schema here and this one describes the first:
 *
 *   ```yaml:form```   a form DEFINITION — an author says what a visitor will be
 *                     asked. Schema-shaped, but it is CONTENT.
 *        ↓ describes
 *   a submission      what a visitor actually answers, at runtime.
 *
 * **This schema validates the definition. Nothing can validate the submission at
 * build time** — its shape is whatever the author designed, and is not knowable
 * when a foundation is written. A form-rendering component is therefore the
 * inverse of every other one: it does not declare the fields, it RECEIVES them
 * and draws whatever it is given. So it declares `data: { form: '@std/form' }`,
 * which asks the only answerable question: *is this a well-formed form?*
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A FORM IS A LIST OF CONTROLS
 *
 *      ```yaml:form
 *      - name: contact
 *        type: string
 *        format: email
 *        label: Email
 *      - name: problem
 *        type: text
 *        label: Describe the problem
 *      ```
 *
 * No envelope: a form's heading and intro are the SECTION's own content, written
 * as markdown and read from `content.title` / `content.paragraphs` like any other
 * section. v1 carried `title` and `description` inside the block, which gave a
 * section two titles — one editable as content and one buried in a data block,
 * with nothing to say which won.
 *
 * That makes this the shape `@std/nav` has always had: one `many` section, no
 * brief, and the content is a bare list.
 *
 * Agreed with the editor in channel `framework-frontend-204a` (2026-08-05), which
 * also settled that the list is the builder's NATIVE shape — v1's map was a
 * conversion on the way out, adopted to mimic how foundations spell `fields:`.
 * A v1 block is still read by the editor and upgrades on save, dropping the two
 * strings; breaking authored content on this lane was authorized by Diego, and
 * nothing in the workspace binds `@std/form` today.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE UNION CEILING — named and ACCEPTED
 *
 * A control is a DISCRIMINATED UNION on `type`: `enum` means something only for a
 * select, `accept`/`multiple` only for a file, `format` only for a string,
 * `children` only for a container. This vocabulary has no union construct, so the
 * union flattens into one record where most keys are meaningless for most
 * variants, and `{ type: 'bool', accept: 'image/*' }` validates clean.
 *
 * Accepted rather than worked around, for three reasons. HTML has the same
 * ceiling in the same domain — `<input>` carries ~30 attributes, most meaningless
 * for most `type` values, and the spec answers it with a prose table. The cost is
 * inert: a renderer branches on `type` and ignores the rest. And a union
 * construct added for one schema would be designing for a consumer rather than on
 * the framework's own principles.
 *
 * The editor discriminates where it belongs — its builder shows `enum` only for a
 * select and `accept`/`multiple` only for a file, via conditions evaluated
 * against the row's own siblings. `condition` is editor-only and never written.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STILL OPEN, and not this schema's to answer
 *
 * `default` is declared here; WHO HONORS IT at render time is not settled. Kit's
 * `useFormValues` seeds it into a form's initial state, which is the intended
 * home — a foundation should not have to know it was a question.
 *
 * Localizing a choice `label` is possible now that the split exists, and is not
 * yet delivered: the editor's translation traversal deliberately excludes data
 * blocks, so no form content is offered for translation today. The
 * `translatable: false` markers below are what that work will read when it is
 * scheduled. Do not describe this schema as "localizes choices".
 */

import { AUTHORING_TYPES } from '../format.js'

export default {
  name: 'form',
  version: '2.0.0',
  description: 'A form designed by an author — the controls a visitor will be asked to fill',

  sections: {
    // ONE multi section and nothing else, so the authored content is a bare list.
    // No `brief:` — there is no single record to be the card, and a form
    // definition is not something another entity references. `@std/nav` is the
    // same shape for the same reason.
    fields: {
      many: true,

      // A control may contain controls — a fieldset, a wizard step, a repeating
      // group. The parent/child link is internal; authors supply `children` per
      // record and no field declares it. See OPEN (A): the wire carries this
      // today, the checker does not yet walk it.
      tree: true,

      // At least one control, or it is not a form. A delete floor rather than a
      // fill requirement — see the README on `min_items`.
      constraints: [{ kind: 'min_items', value: 1 }],

      fields: {
        // ── identity ────────────────────────────────────────────────────────
        // The control's name: what a submission is keyed by. An identifier, so
        // never localized — a per-locale name would make one control two.
        name: {
          type: 'string',
          required: true,
          translatable: false,
          description: 'Field name — what the visitor\'s answer is keyed by',
        },

        // CLOSED, against the authoring vocabulary itself.
        //
        // v1 left this open, reasoning that the wire "carries the framework's
        // whole authoring vocabulary, wider than the builder's controls and wider
        // than any list current when someone reads this file". The first half is
        // right and is exactly why the set must not be the builder's six controls.
        // The second half does not survive contact: the set is not unknowable, it
        // is `AUTHORING_TYPES`, and the normalizer already enumerates it — to tell
        // an author what is valid when they get one wrong.
        //
        // Deriving it means it cannot go stale. Add a kind to the vocabulary and
        // this closes over it in the same commit; there is no list to forget.
        //
        // What this buys is the typo. `strng`, `checkbox`, `select`, `textarea` —
        // all silently accepted before, all a finding now, reported as a warning by
        // default (`uniweb validate` is warn-unless-`--strict`), which is the
        // proportionate response to an editor that has moved ahead of us.
        //
        // (`group` was listed here as a typo until 2026-08-05 and is NOT one — it
        // is in `TYPE_ALIASES`, folding to `object`. Caught by the frontend reading
        // `format.js` rather than trusting this comment, which is the right
        // instinct and the reason the enum derives from the vocabulary instead of
        // from a list someone maintains by hand.)
        //
        // ⚠️ It also forced a question v1 could dodge — a CONTAINER control's type —
        // and the answer changed the vocabulary rather than this schema. `object`
        // is the canonical nested-record kind, but it is a STORAGE word, and a form
        // is authored in YAML by people who are not always developers. So `group`
        // was added as its friendly alias, exactly as `image` is `file`'s and
        // `number` is `decimal`'s. A fieldset is `type: group` + `children`; a
        // repeating group is `type: group` + `multiple`. Both fold to `object`
        // before anything downstream sees them.
        type: {
          type: 'string',
          required: true,
          translatable: false,
          enum: [...AUTHORING_TYPES],
          description: 'Control kind — a word from the authoring type vocabulary',
        },

        // ── what the visitor reads (all localized) ──────────────────────────
        label: { type: 'string', description: 'Shown next to the control' },
        description: { type: 'string', description: 'Help text under the control' },
        placeholder: { type: 'string', description: 'Ghost text inside the control' },

        // ── behaviour ───────────────────────────────────────────────────────
        required: { type: 'bool', description: 'The visitor must answer' },

        // The value the control starts with. `json` because a default must be
        // whatever the control's OWN `type` is — a string here, a bool there, a
        // token for a select — and this vocabulary cannot say "matches the type
        // of the field beside me". `json` accepts any of them and claims nothing
        // false; declaring `string` would be the same invented-element-type
        // mistake the untyped-array lowering used to make.
        //
        // Not localized, deliberately. A default for a text control is arguably
        // visitor-facing, but for a select it is a stored token, and the two are
        // indistinguishable from here. Getting it wrong the other way — a token
        // translated per locale — silently breaks the control, which is the
        // failure mode `type`/`format`/`accept` are already protected from.
        //
        // WHO HONORS IT is a real question and not this schema's to answer: the
        // foundation rendering the form can seed each control, or kit's
        // `useFormSubmit` / `submitForm` could seed the payload so a control the
        // visitor never touches still submits its default. Worth settling before
        // this ships, because "the default did nothing" is the obvious first bug.
        default: { type: 'json', description: 'Value the control starts with' },

        // Refines a string — `email` today. A value-validator format, so it is
        // machine-ish and does not localize.
        format: {
          type: 'string',
          translatable: false,
          description: 'Refines a string — `email` today',
        },

        // ── the closed set, for a select ────────────────────────────────────
        // Named `enum` because that is this vocabulary's word for an inline
        // closed set, and a control record mirrors a field spec throughout. A
        // record per choice: a stable token plus the text a visitor reads. The
        // split is the point — `value` is stored and branched on and must not
        // move between locales; `label` is content and must. A bare string is
        // authoring sugar the producer expands.
        enum: {
          type: 'object',
          many: true,
          description: 'The closed set of choices, for a select-like control',
          fields: {
            value: {
              type: 'string',
              required: true,
              translatable: false,
              description: 'The stored token — stable across locales',
            },
            label: { type: 'string', description: 'What the visitor reads' },
          },
        },

        // `options:` is deliberately NOT declared. It is this vocabulary's word
        // for a ref to a CURATED picklist — a managed list reused across forms,
        // as against `enum`'s set authored inline — and leaving the name free
        // keeps that capability available to say later without a rename.

        // ── file controls ───────────────────────────────────────────────────
        // Literal HTML attribute names, and machine values both.
        accept: {
          type: 'string',
          translatable: false,
          description: 'File controls — the HTML `accept` attribute',
        },
        multiple: {
          type: 'bool',
          description: 'File controls — the HTML `multiple` attribute',
        },
      },
    },
  },
}
