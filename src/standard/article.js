/**
 * Article schema - blog posts, news items, documentation
 *
 * Two sections. The `brief` is the lean card a reference and a list carry (title,
 * excerpt, date, image, tags). `body` holds the heavy ProseMirror content and the
 * secondary metadata, so the content is never dragged into a reference card.
 * `body.content` is the article as a ProseMirror document, per language.
 *
 * ⛔ The sections were named `article` and `article_body` until version 3.0.0: every
 * standard schema names its brief section `brief`, and a section name needs no
 * prefix, since sections are namespaces of their own.
 */
export default {
  name: 'article',
  version: '3.0.0',
  description: 'A blog post, news item, or documentation page',

  sections: {
    // The card — what hydrates into an entity_ref reference.
    brief: {
      brief: true,
      fields: {
        title: {
          type: 'string',
          required: true,
          description: 'Article title',
        },
        excerpt: {
          type: 'string',
          description: 'Short summary or teaser',
        },
        date: {
          type: 'date',
          description: 'Publication date',
        },
        image: {
          type: 'image',
          description: 'Featured/hero image',
        },
        tags: {
          type: 'string',
          many: true,
          translatable: false, // a grouping key, not prose
          description: 'Tags or keywords',
        },
      },
    },

    // The full record — not pulled into reference cards.
    body: {
      fields: {
        // Content — a ProseMirror document on the wire (md authoring side).
        content: {
          type: 'json',
          format: 'prosemirror',
          description: 'Full article content',
        },

        // Media
        thumbnail: {
          type: 'image',
          description: 'Thumbnail for listings',
        },

        // Metadata
        author: {
          type: 'string',
          description: 'Author name or reference',
        },
        updated: {
          type: 'date',
          description: 'Last updated date',
        },
        category: {
          type: 'string',
          description: 'Primary category',
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
    },
  },
}
