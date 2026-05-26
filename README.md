# @uniweb/schemas

Standard schema definitions for Uniweb components. These schemas define common content types — people, articles, events, projects — that components can consume from various data sources.

## Overview

A data schema describes a structured content type: its fields, their types, and their defaults. Components declare which schema each `content.data` key follows; the build applies the schema's field defaults at runtime and carries the resolved schema in the foundation's published metadata.

This package ships the **shared standard schemas** — a common vocabulary (`person`, `article`, `event`, …) that any foundation can reference by name. Foundations can also define their own schemas locally and reference them, or declare a schema inline in `meta.js`.

## The `data:` declaration

A foundation component declares its structured-data shape with a single `data:` key in `meta.js`. Each entry maps a `content.data` key to a schema:

```js
// foundation/sections/TeamGrid/meta.js
export default {
  title: 'Team Grid',
  category: 'showcase',

  data: {
    team:    '@/member',                                  // named ref (this foundation)
    authors: '@std/person',                               // named ref (shared standard)
    specs:   { cpu: { type: 'string', default: '' } },    // inline field map
    signup:  { fields: [{ id: 'email', type: 'text' }] }, // inline rich-form (editor form)
  },
}
```

- The **key** (`team`) is the `content.data` key — where the data lands and where the schema's field defaults are applied. The site, author, or editor decides *how* that key gets filled (a fetched collection, a tagged code block, an editor form); the schema is the same regardless of source.
- The **value** is one of three forms: a **named ref**, an **inline field map**, or an **inline rich-form**.

A `data:` declaration is a hint — it tells the editor and the runtime what shape to expect and which defaults to apply. It is **not** a delivery gate: data delivery is default-on, so a component receives `content.data` whether or not it declares `data:`. A component that should receive no ambient data at all declares `data: false`.

There is no separate `schemas:` key, no `entity:` field, and no `inheritData` — they have all been folded into this one `data:` surface.

## The three `data:` value forms

### 1. Named ref

A ref points at a schema module on disk, resolved at build time (no network). Refs use **Uniweb namespacing**, not npm package paths:

| Ref | Namespace | Resolves to |
|---|---|---|
| `@/member` | **self** — this foundation | `foundation/schemas/member.{js,json,yml,yaml}` |
| `@std/person` | **shared standards** | the matching standard schema, shipped in the `@uniweb/schemas` package |
| `@acme/event` | **an org** (publisher) | that org's schema, from its `@acme/schemas` package (a workspace package locally; a registry scope once published) |

The empty scope in `@/member` means "this foundation." Because an org scope is assigned only at publish time, a foundation **never writes its own org name in source** — `@/`-refs are portable and travel with the foundation, and the build resolves them to a real org scope when published.

A ref names a **namespace, never a package path**. `@std/<name>` maps to the standard schema shipped in `@uniweb/schemas`; `@org/<name>` maps to that org's `@org/schemas` package — so a team can define schemas once and reference them across foundations, locally, with no backend. (`@uniweb` is reserved for the platform system namespace and is not a data-schema source — use `@std` for shared standards.)

### 2. Inline field map

A flat keyed object of field definitions, written directly in `meta.js`. Good for one-off, foundation-local shapes that don't warrant a shared schema file:

```js
data: {
  pricing: {
    name:        { type: 'string', required: true },
    price:       { type: 'number', required: true },
    period:      { type: 'string', default: 'month' },
    features:    { type: 'array', of: 'string' },
    highlighted: { type: 'boolean', default: false },
  },
}
```

### 3. Inline rich-form

An editor form, distinguished by a `fields` **array** (rather than a keyed object). A rich-form drives the editor's form UI for non-technical authors *and* supplies runtime defaults:

```js
data: {
  signup: {
    name: 'Signup form',
    fields: [
      { id: 'email', type: 'text', label: 'Email', required: true },
      { id: 'plan',  type: 'select', options: ['free', 'pro'], default: 'free' },
    ],
  },
}
```

See [Component Metadata](https://github.com/uniweb/docs/blob/main/reference/component-metadata.md) for the full rich-form field reference (field types, conditions, localized labels, composite arrays).

## Standard Schemas

| Schema | Ref | Description |
|--------|-----|-------------|
| `person` | `@std/person` | Team members, authors, contacts |
| `article` | `@std/article` | Blog posts, news items, documentation |
| `event` | `@std/event` | Calendar events, conferences, webinars |
| `project` | `@std/project` | Portfolio items, case studies |
| `opportunity` | `@std/opportunity` | Jobs, grants, calls for proposals |
| `publication` | `@std/publication` | Academic papers, research documents |

## Installation

Add this package wherever a `@std/<name>` ref is used:

```bash
pnpm add @uniweb/schemas
```

Foundations that only use `@/`-refs (their own schema files) or inline schemas don't need this dependency.

## Schema File Format

A foundation-local schema file's default export (or a standard schema in this package) uses one canonical shape:

```js
// foundation/schemas/member.js   — referenced as '@/member'
export default {
  name: 'member',          // schema identity (for the published metadata) — NOT a runtime key
  version: '1.0.0',
  description: 'A research group member',
  fields: {
    name:       { type: 'string', required: true },
    role:       { type: 'string', default: '' },
    rank:       { type: 'string', options: ['assistant', 'associate', 'full'], default: 'assistant' },
    tenured:    { type: 'boolean', default: false },
    start_year: { type: 'number' },
  },
}
```

Schema files may be authored as `.js`, `.json`, `.yml`, or `.yaml` — the build loads any of them. The YAML form of the same schema:

```yaml
# foundation/schemas/member.yml   — referenced as '@/member'
name: member
version: 1.0.0
description: A research group member
fields:
  name:       { type: string, required: true }
  role:       { type: string, default: '' }
  rank:       { type: string, options: [assistant, associate, full], default: assistant }
  tenured:    { type: boolean, default: false }
  start_year: { type: number }
```

The `name` and `version` are the schema's identity — they record *which* named schema at *which* version a foundation depends on. They are not `content.data` keys; the `content.data` key is whatever the section's `data:` binding names it.

### Field Types

| Type | Description |
|------|-------------|
| `string` | Plain text |
| `number` | Numeric value |
| `boolean` | True/false |
| `markdown` | Rich text with markdown formatting |
| `image` | Image reference (path or URL) |
| `date` | ISO date string |
| `datetime` | ISO datetime string |
| `url` | URL string |
| `email` | Email address |
| `object` | Nested object with `fields` |
| `array` | Array with `of` item type |

### Field Options

| Option | Type | Description |
|--------|------|-------------|
| `type` | string | Field type (required) |
| `required` | boolean | Field must have a value |
| `default` | any | Default value if not provided |
| `description` | string | Human-readable description |
| `format` | string | Validation format (email, url, etc.) |
| `options` | array | Allowed values (enum) |
| `fields` | object | Nested fields for `object` type |
| `of` | string or object | Item type for `array` type |

## Collections always arrive as arrays

A `data:` binding describes the shape of *each item*. The runtime delivers a bound collection key as an **array**, always:

- A list page receives the full collection.
- A dynamic `[slug]` detail page receives a **single-element array** — the route-matched record — under the same collection key. A detail section reads the focused record with `content.data.<key>[0]`.
- A detail page where nothing matches receives an empty array `[]`.

The runtime never coerces an array to a single object and never synthesizes a separate singular key. Reshaping a collection to a single record is the foundation's job — read `[0]`, or reshape `content.data` once via a foundation `handlers.data` hook.

## What's published

When a foundation is built, every distinct ref across all section bindings is resolved and loaded into its canonical `{ name, version, fields }` form, and emitted into the foundation's published metadata under a top-level `dataSchemas` map keyed by the ref. A consumer of that metadata has every data schema inline and versioned, with no refs left to resolve. The lean runtime entry carries only the field defaults per key — not the full schema metadata.

## Programmatic API

The package also exposes the standard schema objects and helpers for code that needs to work with schemas directly (validation tooling, scripts):

```js
// Import standard schema objects (tree-shakeable)
import { person, article, event } from '@uniweb/schemas'

// Or look them up by name
import { schemas, getSchema, isStandardSchema } from '@uniweb/schemas'
const personSchema = schemas.person

// Validate data against a schema (name or object)
import { validate } from '@uniweb/schemas'
const { valid, errors } = validate(data, 'person')
// errors: [{ path: 'email', message: 'Invalid email format' }]

// Apply a schema's defaults to data
import { applyDefaults, getDefaults } from '@uniweb/schemas'
const filled = applyDefaults(data, person)
const blanks = getDefaults('person')
```

These are utilities for tooling — they are not required to use a schema in a foundation. In a foundation you reference a standard schema by its namespace ref (`@std/person`) in `meta.js`, and the build does the resolution and default application for you.

## License

Apache 2.0
