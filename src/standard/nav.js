/**
 * Nav schema - navigation menus, sidebars, hierarchical link structures
 *
 * A navigation is a `multi`, `nestable` section: many items, and any item may
 * carry a reserved `children:` list of the same items (recursion). The schema
 * declares only an item's fields; authors supply `children` per item.
 *
 * Use cases: navbar menus with dropdowns, sidebars, footer link columns,
 * tables of contents, sitemaps.
 *
 * Example:
 * ```yaml:nav
 * - icon: lu-home
 *   label: Home
 *   href: /
 * - label: Products
 *   href: /products
 *   text: Browse our catalog
 *   children:
 *     - label: Widgets
 *       href: /products/widgets
 *     - label: Gadgets
 *       href: /products/gadgets
 * ```
 */
export default {
  name: 'nav',
  version: '1.0.0',
  description: 'Navigation menu or hierarchical link structure',

  sections: {
    items: {
      kind: 'multi',
      nestable: true, // items may carry a reserved `children:` list (recursion)
      fields: {
        // Visual
        icon: {
          type: 'string',
          translatable: false,
          description: 'Icon (library ref like lu-home, or a path)',
        },

        // Text
        label: {
          type: 'string',
          required: true,
          description: 'Primary text label',
        },
        text: {
          type: 'string',
          description: 'Secondary text (description, subtitle)',
        },

        // Link
        href: {
          type: 'string',
          translatable: false,
          description: 'Link destination (URL or path)',
        },
        target: {
          type: 'string',
          translatable: false,
          default: '_self',
          description: 'Link target (_self, _blank)',
        },

        // Metadata
        order: {
          type: 'int',
          description: 'Display order',
        },
        hidden: {
          type: 'bool',
          default: false,
          description: 'Hide this item from display',
        },
        current: {
          type: 'bool',
          default: false,
          description: 'Mark as current/active page',
        },
      },
    },
  },
}
