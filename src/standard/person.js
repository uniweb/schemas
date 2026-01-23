/**
 * Person schema - team members, authors, contacts
 */
export default {
  name: 'person',
  version: '1.0.0',
  description: 'A person, team member, or contact',

  fields: {
    // Identity
    name: {
      type: 'string',
      required: true,
      description: 'Full name',
    },
    role: {
      type: 'string',
      description: 'Job title or role',
    },
    department: {
      type: 'string',
      description: 'Department or team',
    },

    // Bio
    bio: {
      type: 'markdown',
      description: 'Biography or description',
    },
    shortBio: {
      type: 'string',
      description: 'Short one-line bio',
    },

    // Media
    avatar: {
      type: 'image',
      description: 'Profile photo',
    },

    // Contact
    email: {
      type: 'string',
      format: 'email',
      description: 'Email address',
    },
    phone: {
      type: 'string',
      description: 'Phone number',
    },
    location: {
      type: 'string',
      description: 'City, office, or location',
    },

    // Links
    website: {
      type: 'url',
      description: 'Personal website',
    },
    social: {
      type: 'object',
      description: 'Social media profiles',
      fields: {
        twitter: { type: 'string', description: 'Twitter/X handle' },
        linkedin: { type: 'string', description: 'LinkedIn profile URL' },
        github: { type: 'string', description: 'GitHub username' },
        mastodon: { type: 'string', description: 'Mastodon handle' },
        bluesky: { type: 'string', description: 'Bluesky handle' },
      },
    },

    // Metadata
    featured: {
      type: 'boolean',
      default: false,
      description: 'Highlight this person',
    },
    order: {
      type: 'number',
      description: 'Display order',
    },
  },
}
