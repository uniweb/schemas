/**
 * Project schema - portfolio items, case studies
 */
export default {
  name: 'project',
  version: '1.0.0',
  description: 'A portfolio item, case study, or project showcase',

  fields: {
    // Identity
    title: {
      type: 'string',
      required: true,
      description: 'Project title',
    },
    slug: {
      type: 'string',
      description: 'URL-friendly identifier',
    },
    tagline: {
      type: 'string',
      description: 'Short tagline or subtitle',
    },

    // Content
    description: {
      type: 'markdown',
      description: 'Full project description',
    },
    summary: {
      type: 'string',
      description: 'Brief summary for listings',
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
    gallery: {
      type: 'array',
      items: { type: 'image' },
      description: 'Project image gallery',
    },
    video: {
      type: 'url',
      description: 'Demo or showcase video URL',
    },

    // Links
    url: {
      type: 'url',
      description: 'Live project URL',
    },
    repository: {
      type: 'url',
      description: 'Source code repository',
    },
    caseStudy: {
      type: 'url',
      description: 'Full case study URL',
    },

    // Details
    client: {
      type: 'string',
      description: 'Client name',
    },
    role: {
      type: 'string',
      description: 'Your role in the project',
    },
    team: {
      type: 'array',
      items: { type: 'string' },
      description: 'Team members',
    },

    // Timeline
    startDate: {
      type: 'date',
      description: 'Project start date',
    },
    endDate: {
      type: 'date',
      description: 'Project end/launch date',
    },
    duration: {
      type: 'string',
      description: 'Project duration (e.g., "3 months")',
    },

    // Technical
    technologies: {
      type: 'array',
      items: { type: 'string' },
      description: 'Technologies and tools used',
    },
    category: {
      type: 'string',
      description: 'Project category',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Tags or keywords',
    },

    // Results
    results: {
      type: 'array',
      description: 'Key results or metrics',
      items: {
        type: 'object',
        fields: {
          metric: { type: 'string', description: 'What was measured' },
          value: { type: 'string', description: 'The result' },
        },
      },
    },
    testimonial: {
      type: 'object',
      description: 'Client testimonial',
      fields: {
        quote: { type: 'string' },
        author: { type: 'string' },
        role: { type: 'string' },
      },
    },

    // Status
    status: {
      type: 'string',
      enum: ['in-progress', 'completed', 'archived'],
      default: 'completed',
      description: 'Project status',
    },
    featured: {
      type: 'boolean',
      default: false,
      description: 'Feature prominently',
    },
    order: {
      type: 'number',
      description: 'Display order',
    },
  },
}
