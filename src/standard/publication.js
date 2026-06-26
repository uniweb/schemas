/**
 * Publication schema - academic papers, research documents
 */
export default {
  name: 'publication',
  version: '1.0.0',
  description: 'An academic paper, research document, or publication',

  fields: {
    // Identity
    title: {
      type: 'string',
      required: true,
      description: 'Publication title',
    },
    slug: {
      type: 'string',
      translatable: false,
      description: 'URL-friendly identifier',
    },

    // Authors
    authors: {
      type: 'object',
      many: true,
      required: true,
      description: 'Publication authors',
      fields: {
        name: { type: 'string', required: true },
        affiliation: { type: 'string' },
        corresponding: { type: 'boolean', default: false },
        orcid: { type: 'string', translatable: false, description: 'ORCID identifier' },
      },
    },

    // Content
    abstract: {
      type: 'markdown',
      description: 'Abstract or summary',
    },
    keywords: {
      type: 'string',
      many: true,
      description: 'Keywords',
    },

    // Publication details
    venue: {
      type: 'object',
      description: 'Where published',
      fields: {
        name: { type: 'string', description: 'Journal, conference, or publisher' },
        type: { type: 'string', enum: ['journal', 'conference', 'book', 'preprint', 'thesis', 'report'] },
        volume: { type: 'string', translatable: false },
        issue: { type: 'string', translatable: false },
        pages: { type: 'string', translatable: false },
        publisher: { type: 'string' },
      },
    },

    // Dates
    date: {
      type: 'date',
      required: true,
      description: 'Publication date',
    },
    submitted: {
      type: 'date',
      description: 'Submission date',
    },
    accepted: {
      type: 'date',
      description: 'Acceptance date',
    },

    // Identifiers
    doi: {
      type: 'string',
      translatable: false,
      description: 'Digital Object Identifier',
    },
    arxiv: {
      type: 'string',
      translatable: false,
      description: 'arXiv identifier',
    },
    isbn: {
      type: 'string',
      translatable: false,
      description: 'ISBN for books',
    },
    pmid: {
      type: 'string',
      translatable: false,
      description: 'PubMed ID',
    },

    // Links
    pdf: {
      type: 'url',
      description: 'PDF download URL',
    },
    url: {
      type: 'url',
      description: 'Publication page URL',
    },
    code: {
      type: 'url',
      description: 'Source code repository',
    },
    data: {
      type: 'url',
      description: 'Dataset URL',
    },
    slides: {
      type: 'url',
      description: 'Presentation slides',
    },
    video: {
      type: 'url',
      description: 'Video presentation',
    },

    // Media
    image: {
      type: 'image',
      description: 'Featured figure or thumbnail',
    },

    // Categorization
    type: {
      type: 'string',
      enum: ['article', 'paper', 'book', 'chapter', 'thesis', 'preprint', 'report', 'poster'],
      default: 'paper',
      description: 'Publication type',
    },
    category: {
      type: 'string',
      description: 'Research area or category',
    },
    tags: {
      type: 'string',
      many: true,
      description: 'Tags or topics',
    },

    // Metrics
    citations: {
      type: 'number',
      description: 'Citation count',
    },

    // Status
    status: {
      type: 'string',
      enum: ['published', 'accepted', 'submitted', 'in-progress', 'preprint'],
      default: 'published',
      description: 'Publication status',
    },
    featured: {
      type: 'boolean',
      default: false,
      description: 'Feature prominently',
    },
    award: {
      type: 'string',
      description: 'Any awards received (e.g., "Best Paper")',
    },

    // Citation
    bibtex: {
      type: 'string',
      translatable: false,
      description: 'BibTeX citation',
    },
  },
}
