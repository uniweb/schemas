/**
 * Article schema - blog posts, news items, documentation
 */
export default {
  name: 'article',
  version: '1.0.0',
  description: 'A blog post, news item, or documentation page',

  fields: {
    // Identity
    title: {
      type: 'string',
      required: true,
      description: 'Article title',
    },
    slug: {
      type: 'string',
      translatable: false,
      description: 'URL-friendly identifier',
    },
    excerpt: {
      type: 'string',
      description: 'Short summary or teaser',
    },

    // Content
    body: {
      type: 'markdown',
      description: 'Full article content',
    },

    // Media
    image: {
      type: 'image',
      description: 'Featured/hero image',
    },
    thumbnail: {
      type: 'image',
      description: 'Thumbnail for listings',
    },

    // Metadata
    author: {
      type: 'string',
      description: 'Author name or reference',
    },
    date: {
      type: 'date',
      description: 'Publication date',
    },
    updated: {
      type: 'date',
      description: 'Last updated date',
    },

    // Categorization
    category: {
      type: 'string',
      description: 'Primary category',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Tags or keywords',
    },

    // Status
    status: {
      type: 'string',
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      description: 'Publication status',
    },
    featured: {
      type: 'boolean',
      default: false,
      description: 'Feature on homepage or listings',
    },

    // SEO
    seo: {
      type: 'object',
      description: 'SEO metadata',
      fields: {
        title: { type: 'string', description: 'SEO title override' },
        description: { type: 'string', description: 'Meta description' },
        image: { type: 'image', description: 'Open Graph image' },
        noindex: { type: 'boolean', default: false },
      },
    },

    // Reading
    readTime: {
      type: 'number',
      description: 'Estimated read time in minutes',
    },
  },
}
