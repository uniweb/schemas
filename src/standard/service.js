/**
 * Service schema - a service a business offers
 *
 * Two sections, like `@std/article`. The `brief` is the card: what a list of services and
 * a booking page are made from — its name, a line about it, an icon or a picture, and,
 * where the business shows them, its price and how long it takes. `body` holds what only
 * the service's own page needs.
 *
 * Price and duration are written as a visitor should read them ("From $95", "$45 / hour",
 * "45 min"), because a trade's prices are rarely one number.
 *
 * How a site groups its services — cuts, colour, treatments — is where it places them, a
 * folder branch a query selects with `scope:`, not a field of the service.
 */
export default {
  name: 'service',
  version: '1.0.0',
  plural: 'Services',
  icon: 'lu-concierge-bell',
  description: 'A service a business offers',
  sections: {
    // The card — what a list and a reference carry.
    brief: {
      brief: true,
      fields: {
        name: {
          type: 'string',
          required: true,
          description: 'Service name',
        },
        summary: {
          type: 'string',
          description: 'One or two lines about it, for a list or a card',
        },
        icon: {
          type: 'string',
          // A framework icon name, `family-name` — the spelling `![](lu-flame)` uses in content.
          format: 'icon',
          translatable: false,
          description: 'Icon (library ref like lu-flame)',
        },
        image: {
          type: 'image',
          description: 'A picture of it',
        },
        price: {
          type: 'string',
          description: 'Price as it should appear, e.g. "From $95" or "$45 / hour"',
        },
        duration: {
          type: 'string',
          description: 'How long it takes, as it should appear, e.g. "45 min"',
        },
      },
    },
    // What only the service's own page needs.
    body: {
      fields: {
        description: {
          type: 'richtext',
          description: 'The full description, for a page about the service',
        },
      },
    },
  },
}
