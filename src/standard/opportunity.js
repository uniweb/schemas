/**
 * Opportunity schema - jobs, grants, calls for proposals
 */
export default {
  name: 'opportunity',
  version: '1.0.0',
  description: 'A job posting, grant, or call for proposals',

  fields: {
    // Identity
    title: {
      type: 'string',
      required: true,
      description: 'Opportunity title',
    },
    slug: {
      type: 'string',
      translatable: false,
      description: 'URL-friendly identifier',
    },

    // Content
    description: {
      type: 'markdown',
      description: 'Full description',
    },
    summary: {
      type: 'string',
      description: 'Brief summary for listings',
    },

    // Type
    type: {
      type: 'string',
      enum: ['job', 'internship', 'grant', 'fellowship', 'call', 'contract', 'volunteer'],
      required: true,
      description: 'Opportunity type',
    },

    // Organization
    organization: {
      type: 'string',
      description: 'Hiring organization or funder',
    },
    department: {
      type: 'string',
      description: 'Department or team',
    },

    // Location
    location: {
      type: 'object',
      description: 'Work location',
      fields: {
        city: { type: 'string' },
        country: { type: 'string' },
        remote: { type: 'boolean', default: false, description: 'Remote work available' },
        hybrid: { type: 'boolean', default: false, description: 'Hybrid arrangement' },
      },
    },

    // Timing
    posted: {
      type: 'date',
      description: 'Date posted',
    },
    deadline: {
      type: 'datetime',
      description: 'Application deadline',
    },
    startDate: {
      type: 'date',
      description: 'Expected start date',
    },
    duration: {
      type: 'string',
      description: 'Duration (for contracts/grants)',
    },

    // Compensation
    compensation: {
      type: 'object',
      description: 'Compensation details',
      fields: {
        salary: { type: 'string', description: 'Salary or range' },
        currency: { type: 'string', translatable: false, default: 'USD' },
        period: { type: 'string', enum: ['hour', 'month', 'year', 'total'], default: 'year' },
        benefits: { type: 'array', items: { type: 'string' } },
      },
    },

    // Requirements
    requirements: {
      type: 'array',
      items: { type: 'string' },
      description: 'Required qualifications',
    },
    preferred: {
      type: 'array',
      items: { type: 'string' },
      description: 'Preferred qualifications',
    },
    experience: {
      type: 'string',
      description: 'Experience level (e.g., "3-5 years")',
    },

    // Application
    application: {
      type: 'object',
      description: 'How to apply',
      fields: {
        url: { type: 'url', description: 'Application URL' },
        email: { type: 'string', format: 'email', translatable: false, description: 'Application email' },
        instructions: { type: 'string', description: 'Application instructions' },
        materials: {
          type: 'array',
          items: { type: 'string' },
          description: 'Required materials (CV, cover letter, etc.)',
        },
      },
    },

    // Categorization
    category: {
      type: 'string',
      description: 'Category or field',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Tags or keywords',
    },

    // Status
    status: {
      type: 'string',
      enum: ['open', 'closed', 'filled', 'expired'],
      default: 'open',
      description: 'Opportunity status',
    },
    featured: {
      type: 'boolean',
      default: false,
      description: 'Feature prominently',
    },

    // Contact
    contact: {
      type: 'object',
      description: 'Contact for questions',
      fields: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email', translatable: false },
        phone: { type: 'string', translatable: false },
      },
    },
  },
}
