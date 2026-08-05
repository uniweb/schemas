# @uniweb/schemas

Two things, and it helps to know which one you're reaching for:

- **The data-schema format** — the language schemas are written in: its type vocabulary, the normalizer that folds friendly type names to canonical kinds, and the conformance checker that validates a record against a schema.
- **The standard schemas** — a shared vocabulary of common content types (`person`, `article`, `event`, …) written in that format, referenced as `@std/<name>`.

A data schema describes a structured content type: its fields, their types, their defaults. Write the shape once and it does three jobs — `uniweb validate` **checks** your data before it ships, the runtime **delivers** each record with defaults applied, and the visual editor renders a **form** authors fill in.

```bash
pnpm add @uniweb/schemas
```

Add it wherever a `@std/<name>` ref is used. Foundations that only use `@/`-refs (their own schema files) or inline schemas don't need it.

---

## Binding a schema

A foundation component declares its structured-data shape with a single `data:` key in `meta.js`. Each entry maps a `content.data` key to a schema:

```js
// foundation/sections/TeamGrid/meta.js
export default {
  title: 'Team Grid',

  data: {
    team:    '@/member',                                  // named ref (this foundation)
    authors: '@std/person',                               // named ref (shared standard)
    specs:   { cpu: { type: 'string', default: '' } },    // inline field map
    signup:  { fields: [{ id: 'email', type: 'text' }] }, // inline rich-form (editor form)
  },
}
```

- The **key** (`team`) is the `content.data` key — where the data lands and where the schema's defaults are applied. The site, author, or editor decides *how* that key gets filled (a fetched collection, a tagged code block, an editor form); the schema is the same regardless of source.
- The **value** is a **named ref**, an **inline field map**, or an **inline rich-form** (distinguished by a `fields` **array** rather than a keyed object — it drives the editor's form UI).

A `data:` declaration is a hint, **not a delivery gate**: delivery is default-on, so a component receives `content.data` whether or not it declares `data:`. A component that should receive no ambient data declares `data: false`.

There is no separate `schemas:` key, no `entity:` field, and no `inheritData` — all folded into this one `data:` surface.

---

## Three namespaces

A ref names a **namespace, never a package path**:

| Ref | Namespace | Resolves to |
|---|---|---|
| `@/member` | **self** — this foundation | `foundation/schemas/member.{js,json,yml,yaml}` |
| `@std/person` | **shared standards** | the matching standard in this package |
| `@acme/event` | **an org** | that org's `@acme/schemas` package (a workspace package locally; a registry scope once published) |

The empty scope in `@/member` means "this foundation." Because an org scope is assigned only at publish time, a foundation **never writes its own org name in source** — `@/`-refs are portable and travel with the foundation, and the build resolves them to a real org scope when published.

`@uniweb` is reserved for the platform system namespace and is **not** a data-schema source — use `@std` for shared standards.

Refs resolve **on disk at build time**. Nothing is fetched.

### Routing a scope elsewhere — `schemas.config.js`

A foundation can point a scope at a plain folder of schema files, or override a single schema to an exact file — no package, no install:

```js
// <foundation>/schemas.config.js
export default {
  '@agency':        '../shared/agency-schemas',    // scope  → a directory
  '@agency/person': './schemas/agency-person.yml', // schema → an exact file
  '@brand':         process.env.BRAND_SCHEMAS,     // machine-specific, via env
}
```

Most specific wins: **file › directory › package**. Relative paths resolve against the foundation source dir; a key whose value is null/undefined (an unset env var) is skipped and falls through to the next source. A routed scope does **not** fall back to the `@org/schemas` package — failing loudly beats silently loading a different definition. `@/` and `@uniweb` are never routable.

---

## Writing a schema

A schema file lives in your foundation's `schemas/` folder and may be `.js`, `.json`, `.yml`, or `.yaml`. It declares **either** `fields:` (one flat record — the common case) **or** `sections:` (a structured type), never both.

```yaml
# foundation/schemas/member.yml   — referenced as '@/member'
name: member
version: 1.0.0
description: A research group member
fields:
  name:       { type: string, required: true }
  role:       { type: string, default: '' }
  rank:       { type: string, enum: [assistant, associate, full] }
  tenured:    { type: boolean, default: false }
  start_year: { type: number }
```

`name` and `version` are the schema's **identity** — which named schema at which version a foundation depends on. They are not `content.data` keys; the `content.data` key is whatever the section's `data:` binding names it.

| Schema key | Meaning |
|---|---|
| `name` | Schema identity (short name) |
| `version` | Schema version |
| `description` | Human-readable description |
| `fields` | A flat record's fields — **xor** `sections` |
| `sections` | Named sections of a structured type — **xor** `fields` |
| `sort_date` | Names a **date field** records sort by (see [The sort axis](#the-sort-axis)). `sortDate` is an accepted alias |

### Field types

The friendly type you write folds to a small set of **canonical kinds**. Write the word that fits the content — or write the canonical kind directly; both work.

| You write | Canonical kind | Holds |
|---|---|---|
| `string` | `string` | A short, single-line value |
| `text` | `text` | Long-form text |
| `number` | `decimal` | A number |
| `integer` | `int` | A whole number |
| `boolean` | `bool` | `true` / `false` |
| `date` / `datetime` | `date` / `datetime` | An ISO-8601 date / timestamp |
| `image` | `file` | A path or URL to a file |
| `url` / `email` | `string` + `format` | A validated string |
| `markdown` / `html` | `text` + `format` | A rich-content body (a source string) |
| `richtext` | `json` + `format: prosemirror` | A rich document edited in the visual app |
| `json` | `json` | An opaque structured value |
| `object`, `group` | `object` | A nested record — declare `fields:` or `values:`. `group` is the author-facing spelling |
| `array` | `array` | A list — declare `items:` (or just use `many:`). Without `items:` the element type is genuinely unknown, and a registered schema records it as opaque `json` rather than guessing |
| `ref` | `ref` | A reference to another schema — `{ ref: '@/person' }` |

A bare type string is shorthand for `{ type: … }`: `title: string` is `title: { type: string }`.

### Lists — `many: true`

Any field or section becomes a list by adding `many: true`. This is the idiom to reach for; `array` + `items` is the lower-level form it normalizes to.

```yaml
fields:
  tags:    { type: string, many: true }          # a list of strings
  courses: { ref: '@/course', many: true }       # a list of references
  results:                                       # a list of records
    type: object
    many: true
    fields:
      metric: { type: string }
      value:  { type: string }
```

Collection-level metadata (`required`, `default`, `label`, `help`, `description`) rides on the **list**; the type-bearing keys (`type`, `ref`, `options`, `enum`, `fields`, `items`, `format`) describe **each item**.

> **One limit worth knowing about `required`.** It is enforced on a list of *values* — `{ type: string, many: true, required: true }` — and on a list of references. It is **not** enforced on a list of *records*, or on a nested `object`: those become sections when the schema is registered, and `required` binds the record that is *written* — it cannot force a record to *exist*. Put the flag on a field *inside* the record, where it holds, and reach for `min_items` below when you mean "don't let this become empty".

### Nested records and open maps

An `object` field describes its shape one of two ways, and they answer different questions:

```yaml
fields:
  address:                          # KNOWN keys
    type: object
    fields:
      street: { type: string }
      city:   { type: string }

  controls:                         # an OPEN MAP — keys belong to the author
    type: object
    values:
      type: object
      fields:
        type:  { type: string, required: true }
        label: { type: string }
```

- **`fields:`** — the object's known keys.
- **`values:`** — a map whose keys are the author's and whose values all conform to one shape. `values` is to an object what `items` is to an array.

Declaring both is an error. `values:` is what `@std/form` is built on: a form's controls are keyed by the field names the author invented, which no `fields:` list could enumerate.

### References and picklists

```yaml
fields:
  author:  { ref: '@/person' }                                   # a reference
  status:  { type: string, enum: [draft, published, archived] }  # inline choices
  country: { type: string, options: '@/countries' }              # curated, shared
```

- **`ref:`** — a reference to another schema. `type: ref` is inferred, so `{ ref: '@/person' }` is enough.
- **`enum:`** — an **inline** list of allowed values. Best for a short, fixed set that belongs to the type.
- **`options:`** — a **`@/<name>` ref** to a curated options schema. Best when the choices are a managed list reused across fields.

An inline array always belongs on `enum:`; `options:` always takes a ref.

### Rich content — `format`

`format` marks a field as carrying rich content, and it is **type-bound** — a mismatch is rejected when the schema is read:

| `format` | Valid on | Use it for |
|---|---|---|
| `markdown` | `text` | A markdown body that round-trips as plain source |
| `html` | `text` | An HTML body |
| `prosemirror` | `json` | A rich document edited through a structured editor |
| `scene` | `json` | A visual scene composition (rendered by `@uniweb/scene`) |
| `email`, `url` | `string` | Value validation, not rich content |

The friendly aliases set these for you: `type: markdown` is exactly `type: text, format: markdown`, and `type: richtext` is exactly `type: json, format: prosemirror`.

**Use `richtext` for a rich body edited in the visual app** — it's the editor's native, lossless document. Use `markdown` / `html` for a **source body** authored as text (file-based projects, or content you want readable as raw source). Don't reach for `markdown` just because it's the familiar word.

### Translatable fields

Text and rich-content fields are **translatable by default** — one value per locale. Set `translatable: false` to opt out: an ID, a slug, a machine token that's identical in every language.

```yaml
fields:
  title: { type: string }                        # translatable by default
  body:  { type: markdown }                      # translatable by default
  sku:   { type: string, translatable: false }   # one value across all locales
```

Fields constrained by `enum:`, and strings carrying a value-validator `format` (`email` / `url`), are treated as machine values and are not translated. A *content* format (`markdown` / `html` / `prosemirror`) still translates.

### Field options

| Option | Type | Description |
|---|---|---|
| `type` | string | The field type (required, unless inferred from `ref:` or `options:`) |
| `many` | boolean | Make it a list; the other keys describe each item |
| `required` | boolean | The field must have a value |
| `default` | any | Value used when none is supplied |
| `label` | string | Short human-readable name (editor UI) |
| `description` | string | Human-readable description |
| `help` | string | Additional guidance (editor UI) |
| `format` | string | Content or validation format — see [Rich content](#rich-content--format) |
| `enum` | array | Inline list of allowed values |
| `options` | string | A `@/<name>` ref to a curated options schema |
| `translatable` | boolean | Set `false` to opt a text field out of localization |
| `fields` | object | Nested fields — `object` type |
| `values` | object | Value shape of an open map — `object` type |
| `items` | object | Item definition — `array` type (or use `many:`) |
| `ref` | string | Target schema — `ref` type |
| `constraints` | array | Rules for the section this field becomes — `object` and `many`-of-`object` only (see below) |
| `tree` | boolean | The records nest under each other — a `many`-of-`object` field only |
| `append_only` | boolean | The records are insert-only — a `many`-of-`object` field only |

`tree` and `append_only` describe how a *list of records* behaves, so they need one: a `many: true` field whose items are objects, or a `many: true` section. On a single object or a list of plain values they're rejected rather than ignored — they'd be stating something that can't be true. Both are documented under [Structured types](#structured-types--sections), and mean the same thing wherever you declare them.

### Constraints

A nested record and a list of records become **sections** when a schema is registered, and a section can carry rules a single field can't express. Declare them with `constraints:` — on the section in the `sections:` form, or on the field itself:

```yaml
fields:
  authors:
    type: object
    many: true
    constraints:
      - { kind: min_items, value: 1 }
    fields:
      name: { type: string, required: true }
```

`min_items` is the common one, and it is worth reading precisely:

- **It is a delete floor, not a fill requirement.** It refuses a delete that would take the section below N. It does *not* force an author to populate the section in the first place.
- **It is a write guarantee, never a render guarantee.** Your component still handles an empty list — the same schema can be rendered by a foundation that never saw the constraint, so content and code stay independent.

Constraints on a plain leaf field are ignored: a leaf narrows with `enum` and `format` instead. They take effect once the schema is [registered](#registering-schemas); for file-based collections there is no write step.

---

## Structured types — `sections:`

When a single flat record genuinely can't express the content, declare named `sections:` instead of `fields:`. Each section is one record by default, or a repeating list with `many: true`.

```yaml
# foundation/schemas/handbook.yml
name: handbook
sections:
  identity:
    brief: true                    # the card shown when this type is referenced
    fields:
      title: { type: string, required: true }
  chapters:
    many: true                     # a repeating list of records
    tree: true                     # …that can nest under each other
    fields:
      title: { type: string }
      body:  richtext
```

The flat `fields:` form is the common case. Reach for `sections:` only when you need one of the capabilities below.

| Section key | Meaning |
|---|---|
| `fields` | The section's fields |
| `sections` | Child sections (a section carrying only these is a grouping container) |
| `brief` | This section is the card a reference to this type hydrates into. **Optional** — at most one per schema, and it must be a single record (not `many`). Without one the type simply isn't referenceable; see [A schema whose root is a list](#a-schema-whose-root-is-a-list) |
| `many` | A repeating list of records rather than one |
| `tree` | A `many` section whose records nest **under each other**. `nestable` is the lower-level spelling |
| `append_only` | A `many` section whose records are insert-only — added, never edited or deleted |
| `constraints` | Cross-cutting write rules for the section |
| `label`, `description` | Display prose for the section itself. Plain strings — translations live in `locales/`, never as an inline `{ en: … }` object |

### The brief

The **brief** is the section that represents the whole record when something references it — the card. At most one section may be marked `brief: true`, and it must be a single record. A schema with no brief is not referenceable as a target (there's no card to show), which is fine for types that are pure lists — `@std/nav` is exactly that.

### A schema whose root is a list

Some content isn't a record with parts — it *is* a list. A navigation menu is a list of items; a form is a list of controls. Declare that as **one `many: true` section and nothing else**:

```yaml
# @std/nav, in full
name: nav
sections:
  items:
    many: true
    tree: true
    fields:
      label: { type: string, required: true }
      href:  { type: string, translatable: false }
```

The content is then a bare list, with no wrapping key:

````markdown
```yaml:nav
- label: Home
  href: /
- label: Docs
  href: /docs
```
````

Two consequences worth knowing:

- **No brief, and that's correct.** There's no single record to be the card, so the schema isn't referenceable as an `entity_ref` target. `uniweb validate` and the runtime treat this as a normal shape, not a missing one.
- **Exactly one section.** Two `many` sections and no single one would leave "which one is the value?" unanswerable, so it isn't treated as a root list — nothing would be checked.

Everything else works the same: `validate` checks each record and names its index (`[1].label`), and `applyDefaults` fills each entry's defaults.

### Tree sections

`tree: true` lets a `many` section's records nest under one another — a chapter tree, a category hierarchy, a threaded discussion. **There is no field to declare** for the parent/child link and no ID to wire up.

This is what separates `tree:` from child `sections:`. A child section nests one *named* section inside another — a fixed shape you spell out. `tree:` lets records of a **single** section nest under one another, so the shape is decided by the author as they write.

Authors nest records under a reserved **`children:`** key — the schema declares only one record's fields, and `children` holds more of the same:

```yaml
- label: Products
  href: /products
  children:
    - label: Widgets
      href: /products/widgets
```

You never declare `children`; declaring `tree: true` is what makes it meaningful. `uniweb validate` descends into it to any depth and names the full path — `[1].children[0].label` — so a deep entry is findable in a large tree.

`tree:` is only valid on a `many: true` section — but "section" includes a **nested** one, and a list of records authored as a *field* (`chapters: { type: object, many: true, tree: true }`) works the same way.

### Append-only sections

`append_only: true` marks a `many` section insert-only: records may be added, but never edited or deleted. Because the rule lives in the content type rather than in a form, it holds for every writer — which makes such a section **tamper-evident**. Reach for it for activity logs, submissions, and audit trails.

`append_only:` is only valid on a `many: true` section, and takes effect once the schema is registered (file-based collections have no write step).

### The sort axis

`sort_date` is a **schema-level** key naming a **date field** — the axis a feed, an archive, or a "latest first" listing orders on:

```yaml
name: post
sort_date: published_on          # names a date field below
fields:
  title:        { type: string, required: true }
  published_on: { type: date }
```

Its value is a field *name*, not `true`/`false`, and it doesn't go on the field itself. With the `sections:` form, name a field in the **brief** section; a schema with no brief has no sort axis. (`sortDate` is an accepted alias.)

### How a source file maps onto sections

One source file — a `.md` with frontmatter, a `.yml`, one `.json` object — carries the fields of **every single section**, flat. Field names are unique across a schema's sections, so there's no prefixing. `many` sections are skipped: a repeating list can't be expressed by one flat record.

That's why `@std/article` splits `article` (the card) from `article_body` (the heavy body) and a single markdown file still populates both.

---

## The standard schemas

| Schema | Ref | Description |
|---|---|---|
| `person` | `@std/person` | Team members, authors, contacts |
| `article` | `@std/article` | Blog posts, news items, documentation |
| `event` | `@std/event` | Calendar events, conferences, webinars |
| `project` | `@std/project` | Portfolio items, case studies |
| `opportunity` | `@std/opportunity` | Jobs, grants, calls for proposals |
| `publication` | `@std/publication` | Academic papers, research documents |
| `nav` | `@std/nav` | Navigation menus (a nestable list) |
| `scene` | `@std/scene` | Visual scene composition (rendered by `@uniweb/scene`) |
| `form` | `@std/form` | A form **designed by an author** — the fields a visitor will be asked |

Reach for one of these before inventing your own, the same way you'd pull a well-known type off the shelf.

> **`@std/form` describes a form *definition*, not a *submission*.** A component that renders an authored form is the inverse of every other component: it doesn't declare the fields, it *receives* them and draws whatever it's given. So it can't declare the author's field names — it declares `data: { form: '@std/form' }`, which asks the only answerable question: *is this a well-formed form?* What a visitor actually answers arrives at runtime and is not knowable when the foundation is written.

---

## How bound data arrives

A `data:` binding describes the shape of *each item*. The runtime delivers a bound collection key as an **array**, always:

- A list page receives the full collection.
- A dynamic `[slug]` detail page receives a **single-element array** — the route-matched record — under the same collection key. A detail section reads `content.data.<key>[0]`.
- A detail page where nothing matches receives an empty array `[]`.

The runtime never coerces an array to a single object and never synthesizes a separate singular key. Reshaping a collection to a single record is the foundation's job — read `[0]`, or reshape `content.data` once via a foundation `handlers.data` hook.

---

## What gets published

When a foundation is built, every distinct ref across all section bindings is resolved and loaded into its canonical form — `{ name, version, description?, fields }` for a flat schema, or `{ name, version, description?, sections }` for a structured one — and emitted into the foundation's published metadata under a top-level `dataSchemas` map keyed by the ref. A consumer of that metadata has every data schema inline and versioned, with no refs left to resolve.

The lean runtime entry carries only what the runtime needs to apply defaults and shape data — `type`, `default`, `enum`, `options`, and nested `fields`/`items`. Descriptions, labels, and other editor hints stay in the full schema.

---

## Programmatic API

The format itself is exported, so tooling can read a schema the same way the framework does. `@uniweb/build` re-exports these, so `uniweb validate` and this package run **one** implementation.

```js
// Standard schema objects (tree-shakeable)
import { person, article, event } from '@uniweb/schemas'

// …or look them up by name
import { schemas, getSchema, getSchemaNames, isStandardSchema } from '@uniweb/schemas'

// Validate a record against a schema (name or object)
import { validate } from '@uniweb/schemas'
const { valid, errors } = validate(data, 'person')
// errors: [{ path: 'email', rule: 'format', message: '"x" is not a valid email' }]

// Apply a schema's defaults
import { applyDefaults, getDefaults } from '@uniweb/schemas'
const filled = applyDefaults(data, person)
const blanks = getDefaults('person')
```

`validate` and `applyDefaults` accept a schema **as authored** — the friendly vocabulary (`many:`, `number`, `richtext`, `{ ref: '@/x' }`) and both schema forms are normalized first. They check a record against the flat surface described in [How a source file maps onto sections](#how-a-source-file-maps-onto-sections), so a `sections:`-form schema works too.

They **throw** when the *schema* is malformed — a bad schema is a programming error, and the message names the offending field. Invalid *data* comes back as findings.

Lower-level entry points, for tooling that needs the format directly:

```js
import { validateAndNormalizeSchema, parseSchemaRef, collectNestedRefs } from '@uniweb/schemas/format'
import { validateItem, isStaticallyCheckable, flatRecordFields } from '@uniweb/schemas/conform'
```

| Export | Does |
|---|---|
| `validateAndNormalizeSchema(schema, ref)` | Validates the authoring format and returns the normalized schema (friendly aliases folded to canonical kinds). Throws, naming the offending field |
| `parseSchemaRef(ref)` | `'@std/person'` → `{ scope: 'std', name: 'person' }` |
| `collectNestedRefs(schema)` | Every `ref`/`options` target a normalized schema depends on |
| `validateItem(schema, item)` | Findings for one **record** against a normalized schema |
| `validateBound(schema, value)` | Findings for a whole bound **value** — a record or a list. Dispatches on the schema's root shape and descends into a `tree`'s children |
| `flatRecordFields(schema)` | The field map one flat source file is checked against |
| `rootListSection(schema)` | The section whose records *are* the value, when the root is a list |
| `AUTHORING_TYPES` | Every word valid as a `type:` — derived from the vocabulary, so it never drifts |
| `SCALAR_KINDS`, `FORMAT_TYPES`, … | The type vocabulary |

These are utilities for tooling — none is required to use a schema in a foundation. There you reference a schema by its namespace ref in `meta.js` and the build does the resolution and default application for you.

---

## See also

- **Data Schemas** — the authoring guide, with worked examples: `development/data-schemas.md`
- **Designing Data Schemas** — modeling decisions across related types: `development/designing-data-schemas.md`
- **Schemas in Practice** — where a schema file lives, and how a second project consumes it: `development/schemas-in-practice.md`
- **Component Metadata** — the full `data:` binding reference: `reference/component-metadata.md`

Full documentation index: <https://www.uniweb.io/llms.txt>

## License

Apache 2.0
