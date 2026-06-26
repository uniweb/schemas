/**
 * Article schema - blog posts, news items, documentation
 *
 * Two sections. The brief `article` is the lean entity_ref card (title, slug,
 * excerpt, date, image, tags). The non-brief `article_body` holds the heavy
 * ProseMirror body plus the secondary metadata, so the body is never dragged
 * into a reference card. The visual app's article editor reads/writes
 * `article_body.content[lang]` as a ProseMirror document.
 */
export default {
  name: 'article',
  version: '2.0.0',
  description: 'A blog post, news item, or documentation page',

  sections: {
    // The card — what hydrates into an entity_ref reference.
    article: {
      brief: true,
      fields: {
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
          description: 'Tags or keywords',
        },
      },
    },

    // The full record — not pulled into reference cards.
    article_body: {
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
