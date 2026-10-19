/**
 * Qualification schema - a degree, diploma or certificate someone earned
 *
 * The entries of a CV's education and certifications. `endDate` is when it was awarded, and
 * `startDate`, for a course of study, when it began. `note` holds what a CV adds beside
 * one: honours, a grade, a specialization.
 *
 * How a site groups them — education and certifications — is where it places them, a
 * folder branch a query selects with `scope:`, not a field of the qualification.
 *
 * Flat: a qualification is small, and a list shows all of it.
 */
export default {
  name: 'qualification',
  version: '1.0.0',
  plural: 'Qualifications',
  icon: 'lu-graduation-cap',
  description: 'A degree, diploma or certificate someone earned',
  fields: {
    title: {
      type: 'string',
      required: true,
      description: 'The qualification, e.g. "MSc in Computer Science"',
    },
    institution: {
      type: 'string',
      translatable: false, // a name is the same in every language
      description: 'Who awarded it — the university, school or body',
    },
    location: {
      type: 'string',
      description: 'Where it was studied',
    },
    startDate: {
      type: 'date',
      description: 'When the studies began',
    },
    endDate: {
      type: 'date',
      description: 'When it was awarded',
    },
    note: {
      type: 'string',
      description: 'Honours, a grade or a specialization',
    },
    url: {
      type: 'url',
      description: "Where it can be verified, or the institution's website",
    },
  },
}
