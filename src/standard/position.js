/**
 * Position schema - a role someone held
 *
 * A job, an appointment, a volunteer post: the entries of a CV's experience and of an
 * academic career. `startDate` and `endDate` say when; a position with no `endDate` is
 * current. `highlights` are what the person did there, one per entry, and `skills` the
 * tools and methods it used.
 *
 * How a site groups positions — work and volunteering, say — is where it places them, a
 * folder branch a query selects with `scope:`, not a field of the position.
 *
 * Flat: a position is small, and a list shows all of it.
 */
export default {
  name: 'position',
  version: '1.0.0',
  plural: 'Positions',
  icon: 'lu-briefcase',
  description: 'A role someone held: a job, an appointment or a volunteer post',
  fields: {
    title: {
      type: 'string',
      required: true,
      description: 'The role, e.g. "Lead data architect"',
    },
    organization: {
      type: 'string',
      translatable: false, // a name is the same in every language
      description: 'Where — the company, institution or group',
    },
    location: {
      type: 'string',
      description: 'The city, or "Remote"',
    },
    startDate: {
      type: 'date',
      description: 'When it began',
    },
    endDate: {
      type: 'date',
      description: 'When it ended — leave it empty while the role continues',
    },
    summary: {
      type: 'string',
      description: 'A line about the role',
    },
    highlights: {
      type: 'string',
      many: true,
      description: 'What was achieved there, one per entry',
    },
    skills: {
      type: 'string',
      many: true,
      description: 'Tools and methods it used, e.g. "Python"',
    },
    url: {
      type: 'url',
      description: "The organization's website",
    },
  },
}
