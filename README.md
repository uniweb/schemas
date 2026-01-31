# @uniweb/schemas

Standard schema definitions for Uniweb components. These schemas define common content types that components can consume from various data sources.

## Overview

Schemas describe structured content types like people, articles, events, and projects. They provide:

- **Field definitions** — names, types, validation rules
- **Defaults** — sensible fallback values
- **Documentation** — what each field represents

Components declare which schemas they accept in `meta.js`. Data matching these schemas can come from:

- Tagged code blocks in markdown (`yaml:person`, `json:event`)
- Page/site-level data fetching
- The Uniweb platform CMS

## Standard Schemas

| Schema | Description |
|--------|-------------|
| `person` | Team members, authors, contacts |
| `article` | Blog posts, news items, documentation |
| `event` | Calendar events, conferences, webinars |
| `project` | Portfolio items, case studies |
| `opportunity` | Jobs, grants, calls for proposals |
| `publication` | Academic papers, research documents |

## Installation

```bash
pnpm add @uniweb/schemas
```

## Usage

### In meta.js

Import and use standard schemas in your foundation components:

```js
// foundation/src/sections/TeamGrid/meta.js
import { person } from '@uniweb/schemas'

export default {
  title: 'Team Grid',
  category: 'showcase',

  // Use standard schema - the build extracts a lean runtime version
  schemas: {
    team: person,
  },

  // Opt into receiving cascaded data from page/site fetches
  inheritData: ['team'],
}
```

The foundation build automatically:
- Tree-shakes unused schemas from the bundle
- Extracts only the fields needed at runtime (strips metadata like `name`, `version`, `description`)
- Creates a lean schema with `type`, `default`, and `options`

### In markdown (tagged blocks)

```markdown
```yaml:person
name: Sarah Chen
role: Lead Architect
bio: 10+ years building distributed systems
avatar: /team/sarah.jpg
```
```

### From data fetching

```yaml
# page.yml
title: Our Team
fetch:
  path: /team
  schema: person
```

## Schema Definition Format

Each schema is defined with fields, types, and optional validation:

```js
export default {
  name: 'person',
  version: '1.0.0',
  description: 'A person or team member',

  fields: {
    name: {
      type: 'string',
      required: true,
      description: 'Full name',
    },
    role: {
      type: 'string',
      description: 'Job title or role',
    },
    bio: {
      type: 'markdown',
      description: 'Biography or description',
    },
    avatar: {
      type: 'image',
      description: 'Profile photo',
    },
    email: {
      type: 'string',
      format: 'email',
    },
    social: {
      type: 'object',
      fields: {
        twitter: { type: 'string' },
        linkedin: { type: 'string' },
        github: { type: 'string' },
      },
    },
  },
}
```

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
| `array` | Array with `items` type |

### Field Options

| Option | Type | Description |
|--------|------|-------------|
| `type` | string | Field type (required) |
| `required` | boolean | Field must have a value |
| `default` | any | Default value if not provided |
| `description` | string | Human-readable description |
| `format` | string | Validation format (email, url, etc.) |
| `fields` | object | Nested fields for `object` type |
| `items` | object | Item schema for `array` type |

## Custom Schemas

Define custom schemas inline in `meta.js`:

```js
export default {
  title: 'Pricing Table',

  schemas: {
    'pricing-tier': {
      name: { type: 'string', required: true },
      price: { type: 'number', required: true },
      period: { type: 'string', default: 'month' },
      features: { type: 'array', items: { type: 'string' } },
      highlighted: { type: 'boolean', default: false },
    },
  },
}
```

## API

### Schema Imports

```js
// Import individual schemas (tree-shakeable)
import { person, article, event } from '@uniweb/schemas'

// Import all schemas
import { schemas } from '@uniweb/schemas'
const personSchema = schemas.person
```

### Utilities

```js
import { validateAgainstSchema, applyDefaults } from '@uniweb/schemas'

// Validate data against a schema
const { valid, errors } = validateAgainstSchema(data, person)
// errors: [{ path: 'email', message: 'Invalid email format' }]

// Apply default values from schema
const dataWithDefaults = applyDefaults(data, person)
```

## License

Apache 2.0
