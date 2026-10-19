/**
 * Testimonial schema - what a customer, client or patient said
 *
 * One quote and who said it. `context` says what it was about — the job, the service, or
 * the person's role — so one field reads "Kitchen refit" for a plumber's customer and
 * "CTO at Northwind" for a software client. A rating is optional, and whether to show it
 * is the component's choice.
 *
 * Flat: a testimonial is its own card, so there is nothing a list should leave out.
 */
export default {
  name: 'testimonial',
  version: '1.0.0',
  plural: 'Testimonials',
  icon: 'lu-quote',
  description: 'What a customer, client or patient said',
  fields: {
    quote: {
      type: 'text',
      required: true,
      description: 'What they said',
    },
    name: {
      type: 'string',
      required: true,
      translatable: false, // a name is the same in every language
      description: 'Who said it, as it should appear',
    },
    context: {
      type: 'string',
      description: 'What it was about — the job, the service, or their role',
    },
    avatar: {
      type: 'image',
      description: 'Their photo, or their company logo',
    },
    rating: {
      type: 'integer',
      min: 1,
      max: 5,
      description: 'Star rating, from 1 to 5',
    },
    date: {
      type: 'date',
      description: 'When they said it',
    },
    url: {
      type: 'url',
      description: 'Where it was first posted',
    },
  },
}
