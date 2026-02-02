/**
 * Event schema - calendar events, conferences, webinars
 */
export default {
  name: 'event',
  version: '1.0.0',
  description: 'A calendar event, conference, or webinar',

  fields: {
    // Identity
    title: {
      type: 'string',
      required: true,
      description: 'Event title',
    },
    slug: {
      type: 'string',
      description: 'URL-friendly identifier',
    },
    description: {
      type: 'markdown',
      description: 'Event description',
    },
    shortDescription: {
      type: 'string',
      description: 'Brief summary for listings',
    },

    // Timing
    startDate: {
      type: 'datetime',
      required: true,
      description: 'Start date and time',
    },
    endDate: {
      type: 'datetime',
      description: 'End date and time',
    },
    timezone: {
      type: 'string',
      translatable: false,
      description: 'Timezone (e.g., America/New_York)',
    },
    allDay: {
      type: 'boolean',
      default: false,
      description: 'All-day event (no specific time)',
    },

    // Location
    location: {
      type: 'object',
      description: 'Event location',
      fields: {
        name: { type: 'string', description: 'Venue name' },
        address: { type: 'string', description: 'Street address' },
        city: { type: 'string' },
        country: { type: 'string' },
        virtual: { type: 'boolean', default: false, description: 'Online event' },
        url: { type: 'url', description: 'Virtual meeting URL' },
      },
    },

    // Media
    image: {
      type: 'image',
      description: 'Event banner or featured image',
    },

    // Registration
    registration: {
      type: 'object',
      description: 'Registration details',
      fields: {
        required: { type: 'boolean', default: false },
        url: { type: 'url', description: 'Registration link' },
        deadline: { type: 'datetime', description: 'Registration deadline' },
        capacity: { type: 'number', description: 'Maximum attendees' },
        price: { type: 'string', description: 'Price or "Free"' },
      },
    },

    // Categorization
    type: {
      type: 'string',
      enum: ['conference', 'workshop', 'webinar', 'meetup', 'social', 'other'],
      description: 'Event type',
    },
    category: {
      type: 'string',
      description: 'Event category',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Tags or keywords',
    },

    // Status
    status: {
      type: 'string',
      enum: ['scheduled', 'cancelled', 'postponed', 'completed'],
      default: 'scheduled',
      description: 'Event status',
    },
    featured: {
      type: 'boolean',
      default: false,
      description: 'Feature prominently',
    },

    // Organizer
    organizer: {
      type: 'object',
      description: 'Event organizer',
      fields: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email', translatable: false },
        url: { type: 'url' },
      },
    },
  },
}
