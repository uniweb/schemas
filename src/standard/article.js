/**
 * Article schema - blog posts, news items, documentation
 *
 * Two sections. The `brief` is the card: what a list of articles, a reference to one
 * and the page about one are made from — its title, summary, author, dates, picture and
 * tags. `body` holds what only the article's own page needs: the content, as a
 * ProseMirror document per language, kept out of every list and reference.
 *
 * A site's own choices about an article are not fields of it. Whether the site features
 * it, and how the site groups it, belong to where the site places it — a folder entry's
 * tags and label, and the branch a query selects with `scope:`. Whether it is live is
 * the record's draft state.
 *
 * ⛔ Until version 4.0.0 `body` also held `thumbnail`, `author`, `updated`, `category`,
 * `status`, `featured`, `seo` and `readTime`. `author` and `updated` moved to the brief,
 * where a list can show them. The rest are gone: a list never receives a body field,
 * so a thumbnail there reached no card; a folder entry says what `featured` and
 * `category` said, and the draft state what `status` said; a reading time is the
 * component's to work out from the content; and the page about an article takes its
 * title, description and shared image from the brief, so `seo` reached no page.
 *
 * ⛔ The sections were named `article` and `article_body` until version 3.0.0: every
 * standard schema names its brief section `brief`, and a section name needs no
 * prefix, since sections are namespaces of their own.
 */
export default {
  name: 'article',
  version: '4.0.0',
  plural: 'Articles',
  description: 'A blog post, news item, or documentation page',

  sections: {
    // The card — what a list and a reference (an entity_ref) carry.
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
        author: {
          type: 'string',
          translatable: false, // a name is the same in every language, and a list may filter by it
          description: 'Author, as the byline shows it',
        },
        date: {
          type: 'date',
          description: 'Publication date',
        },
        updated: {
          type: 'date',
          description: 'Date of the last substantive revision',
        },
        image: {
          type: 'image',
          description: 'Featured image — the article\'s picture in a list, on its page and on a shared link',
        },
        tags: {
          type: 'string',
          many: true,
          translatable: false, // a grouping key, not prose
          description: 'Tags or keywords',
        },
      },
    },

    // What only the article's own page needs — never carried by a list or a reference.
    body: {
      fields: {
        // A ProseMirror document on the wire (md authoring side).
        content: {
          type: 'json',
          format: 'prosemirror',
          description: 'Full article content',
        },
      },
    },
  },
}
