/**
 * ⚠️ PROPOSAL — committed for discussion, NOT WIRED IN. A v2 design for `@std/form`.
 *
 * Deliberately not exported from `index.js`, not in the `schemas` registry, and
 * not registered anywhere: nothing imports it and nothing consumes it. `@std/form`
 * v1 remains the shipped schema and is untouched.
 *
 * It is committed so the other side of the conversation can read the reasoning
 * rather than a summary of it. Everything below is the framework's own position,
 * arrived at before anyone else was asked — decide what is right, then discuss.
 * Delete this file, or promote it, once that conversation lands.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT CHANGED, AND WHY
 *
 * v1 describes a form as a RECORD with three keys — `title`, `description`, and
 * `fields`, the last being an open map (`values:`) keyed by the author's control
 * names. Three things fall out of that and all three are avoidable:
 *
 *   1. `title` and `description` are CONTENT sitting in a data block. The real
 *      plumber example carries `## Get in touch` in markdown AND
 *      `title: Request a quote` in the block — two titles for one form, one of
 *      them editable as content and one buried. Moving them out is not tidying;
 *      it is putting content back where content lives.
 *
 *   2. The open map forces `values:`, whose only user in the entire workspace is
 *      `@std/form`. It exists because a map keyed by author-chosen names could
 *      not otherwise be described.
 *
 *   3. `form.fields.fields` — the schema keyword and the data's key collide, and
 *      reading across the layers is needlessly hard.
 *
 * A form IS a list of controls. Said that way it is the shape `@std/nav` has had
 * since it shipped: one `many` section, no brief, and the content is a bare list.
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
 * ─────────────────────────────────────────────────────────────────────────────
 * THE UNION CEILING — named, measured, and ACCEPTED (decided here)
 *
 * A form control is a DISCRIMINATED UNION on `type`. Most props apply to one
 * variant only:
 *
 *      enum              a select
 *      accept, multiple  a file
 *      format            a string
 *      children          a container
 *
 * This vocabulary has no union construct — no `oneOf`, no discriminator, and
 * `required_when` / `show_when` are shape-ratified but unemitted — so the union
 * flattens into one record where most keys are meaningless for most variants.
 * `{ type: 'bool', accept: 'image/*' }` is nonsense and validates clean.
 *
 * DECISION: accept it. Three reasons, in order of weight.
 *
 *   1. HTML has the same ceiling, and it is the same domain. `<input>` carries
 *      ~30 attributes, most meaningless for most `type` values — `accept` on a
 *      checkbox, `step` on a text box — and the spec handles it with a prose
 *      table, not a type system. A form-definition schema inheriting that shape
 *      is the domain showing through, not a modelling failure.
 *
 *   2. The cost is bounded and inert. A nonsense combination does not corrupt
 *      anything: the renderer branches on `type` and ignores the rest, the wire
 *      stores an unused key, nothing downstream misbehaves. What is lost is a
 *      class of authoring TYPO caught — real, but small, and no worse than the
 *      unknown per-field keys we are already required to tolerate.
 *
 *   3. Fixing it fails our own test for a framework capability. A union
 *      construct would be a large addition to the language serving essentially
 *      one schema — the definition of designing for a consumer rather than on
 *      the framework's own principles. If a union is ever added it should be
 *      because several schemas want it, and it should be designed then.
 *
 * The honest mitigation is documentation, not machinery: state which props apply
 * to which `type` in prose, exactly as HTML does. That table belongs in the
 * public docs beside this schema, not in the schema.
 *
 * Revisit if — and only if — a second schema needs the same thing.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DECIDED, and the framework work is done
 *
 *   A. `tree: true` — hierarchical forms (a fieldset, a wizard step, a repeating
 *      group) with author-decided depth, exactly as `@std/nav` does dropdowns.
 *      The checker now DESCENDS into a tree's reserved `children:` to any depth
 *      and names the full path (`[1].children[0].label`), so declaring `tree`
 *      here buys real validation rather than only the wire shape.
 *
 *   C. `default` — ADDED. See the field for why it is `json` and why it does not
 *      localize. What is NOT settled is who honors it at render time; that is
 *      noted on the field and is a question for the foundation/kit side, not for
 *      this schema.
 *
 *   D. Container controls — folded into the union-ceiling decision above. A
 *      fieldset has children and no input of its own, so `label` means a legend
 *      and `format`/`accept` mean nothing. Same ceiling, one level up, and
 *      accepted on the same grounds.
 *
 *   B. `enum` keeps its name, and gains a described shape.
 *
 *      A FIELD NAME is unconstrained — it is a key in a `fields:` map, a different
 *      position from a spec keyword — so there is no such thing as a taken field
 *      name. v1 already proves it: it declares fields named `type`, `format`,
 *      `enum`, `required` and `multiple`, every one of them also a keyword in this
 *      language, and they all normalize, lower and validate. (An earlier draft of
 *      this file invented `choices` to dodge a collision that does not exist. The
 *      confusion is the recursion — our schema describing a thing that is itself
 *      schema-shaped — and it is worth naming, because it will recur.)
 *
 *      Names being free, the right ones are OUR OWN WORDS for our own concepts.
 *      A control record already mirrors a field spec — `name`, `type`, `format`,
 *      `required`, `multiple`, `label`, `description` are all this vocabulary,
 *      adopted deliberately. So:
 *
 *        enum:    an INLINE closed set — what this language calls one
 *        options: reserved for its usual meaning, a ref to a CURATED picklist,
 *                 which a form may well want later and which nothing else needs
 *
 *      What changes from v1 is the SHAPE, not the name. v1 documented the value as
 *      "a bare string OR { value, label }, both may appear in one list" — a union
 *      this vocabulary cannot express, which is why it was left untyped and then
 *      lowered to `{ type: string, multiple: true }`: a false claim about a list
 *      that may contain objects.
 *
 *      Here a choice is a record, because the split is the substance: `value` is
 *      the stored token and must be stable across locales; `label` is what a
 *      visitor reads and must translate. A flat array could never say that. The
 *      bare string stays authoring sugar the producer expands
 *      (`"flexible"` → `{ value: 'flexible', label: 'flexible' }`), the same way
 *      `many: true` is sugar the producer expands to `multiple: true`.
 *
 *      ⚠️ That false `{ type: string, multiple: true }` was a LOWERING defect in
 *      its own right, independent of this schema — `lowerField` invented
 *      `type: 'string'` for any array with no declared `items`. FIXED: an untyped
 *      array now lowers to `json`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS LEFT, and all of it is theirs rather than ours
 *
 *   1. The editor stores controls as a LIST, and moves `title`/`description` out
 *      of the block into the section's markdown.
 *   2. A bare-string choice is expanded to `{ value, label }` on write — the one
 *      genuine behaviour change being asked of the builder. It already
 *      canonicalizes on write (`format: multiline|date` → `type: text|date`,
 *      2026-07-31), so the mechanism exists.
 *   3. Whether the builder means to author `default` at all.
 *   4. Ours, and small: the prose table of which props apply to which `type`,
 *      for the public docs.
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
        // What this buys is the typo. `strng`, `checkbox`, `group`, `select` — all
        // silently accepted before, all a finding now, reported as a warning by
        // default (`uniweb validate` is warn-unless-`--strict`), which is the
        // proportionate response to an editor that has moved ahead of us.
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
