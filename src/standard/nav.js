/**
 * Nav schema - navigation menus, sidebars, hierarchical link structures
 *
 * Use cases:
 * - Navbar menus with dropdowns
 * - Sidebar navigation
 * - Footer link columns
 * - Table of contents
 * - Sitemap structures
 *
 * Example:
 * ```yaml
 * ```yaml:nav
 * - icon: /icons/home.svg
 *   label: Home
 *   href: /
 * - icon: /icons/products.svg
 *   label: Products
 *   href: /products
 *   text: Browse our catalog
 *   children:
 *     - label: Widgets
 *       href: /products/widgets
 *     - label: Gadgets
 *       href: /products/gadgets
 * ```
 * ```
 */
export default {
  name: 'nav',
  version: '1.0.0',
  description: 'Navigation menu or hierarchical link structure',

  // This schema is for arrays of nav items
  type: 'array',

  // Each item in the array has these fields
  fields: {
    // Visual
    icon: {
      type: 'string',
      translatable: false,
      description: 'Path to SVG icon (e.g., /icons/home.svg)',
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
      description: 'Link target (_self, _blank)',
      default: '_self',
    },

    // Hierarchy
    children: {
      type: 'nav',
      description: 'Nested navigation items (recursive)',
    },

    // Metadata
    order: {
      type: 'number',
      description: 'Display order',
    },
    hidden: {
      type: 'boolean',
      default: false,
      description: 'Hide this item from display',
    },
    current: {
      type: 'boolean',
      default: false,
      description: 'Mark as current/active page',
    },
  },
}
