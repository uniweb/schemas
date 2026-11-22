/**
 * Location schema - a place a business or organization is found at, or serves
 *
 * One Model for two kinds of place, told apart by `kind`:
 * - a place people come to: a shop, an office, a studio, a clinic, a branch;
 * - an area the business goes to: a town or a neighbourhood a trade serves.
 * They share their identity (a named place, often with a page of its own), their lifecycle and who
 * may change them, so they are one Model, and the fields that don't apply to a kind stay empty.
 *
 * Two sections, like `@std/service`. The `brief` is the card, and it holds nearly everything,
 * because a list carries only the brief and a location's lists need these fields:
 * - a finder shows each place's address, its status and whether it is open now, nearest first;
 * - a contact page lists every office with its phone, email and hours;
 * - a map needs the coordinates, and a list of areas what each gets and how soon.
 * `body` holds what only the place's own page needs: its page, how to get there, and the people
 * and services found there, as references.
 *
 * Hours are structured, so a section can say "open now" on the place's own clock (`timezone`):
 * a line per day with its open intervals, and the dates it is closed whatever the week says.
 * `hours_note` carries what the structure can't ("By appointment", "Summer hours from June").
 * The address is in parts, so a list can show the town alone and a page the whole of it; the
 * country is a code, which a page names in its own language.
 */
export default {
  name: 'location',
  version: '1.0.0',
  plural: 'Locations',
  icon: 'lu-map-pin',
  description: 'A place a business or organization is found at, or serves',
  sections: {
    // The card: what a list, a map, a finder and a reference carry.
    brief: {
      brief: true,
      fields: {
        name: {
          type: 'string',
          required: true,
          description: 'The place as people know it, such as Downtown, or Calder Bay',
        },
        kind: {
          type: 'string',
          translatable: false,
          enum: [
            { value: 'place', label: 'A place people come to' },
            { value: 'area', label: 'An area you serve' },
          ],
          description: 'A place people come to, such as a shop or an office, or an area you serve, such as a town. Left empty, a place.',
        },
        summary: {
          type: 'string',
          description: 'One or two lines about it, for a list or a card',
        },
        image: {
          type: 'image',
          description: 'A picture of the place',
        },
        status: {
          type: 'string',
          translatable: false,
          enum: [
            { value: 'open', label: 'Open' },
            { value: 'opening-soon', label: 'Opening soon' },
            { value: 'temporarily-closed', label: 'Closed for now' },
            { value: 'closed', label: 'Closed' },
          ],
          description: 'Whether it is open. Left empty, open.',
        },
        status_note: {
          type: 'string',
          description: 'What a visitor should know about its status, such as "Opens in April" or "Closed for repairs until May 3"',
        },
        address: {
          type: 'object',
          description: 'Where it is',
          fields: {
            street: { type: 'string', translatable: false, description: 'The street address, with the unit' },
            locality: { type: 'string', description: 'The town or city' },
            region: { type: 'string', description: 'The province, state or county' },
            postal_code: { type: 'string', translatable: false, description: 'The postal code' },
            country: { type: 'string', translatable: false, description: 'The country, as its two-letter code, such as CA or FR' },
          },
        },
        latitude: {
          type: 'number',
          description: 'Where it is on a map: its latitude, copied from any map app',
        },
        longitude: {
          type: 'number',
          description: 'Its longitude',
        },
        timezone: {
          type: 'string',
          translatable: false,
          description: 'Its time zone, such as America/Toronto, so its hours read on its own clock',
        },
        phone: {
          type: 'string',
          translatable: false,
          description: 'Its phone number, as it should appear',
        },
        email: {
          type: 'string',
          format: 'email',
          translatable: false,
          description: 'Its email address',
        },
        link: {
          type: 'url',
          description: 'Its own page elsewhere, or where to book it',
        },
        hours: {
          type: 'object',
          description: 'When it is open',
          fields: {
            week: {
              type: 'object',
              many: true,
              description: 'A line per day; a day with no hours is closed',
              fields: {
                day: {
                  type: 'string',
                  translatable: false,
                  enum: [
                    { value: 'mon', label: 'Monday' },
                    { value: 'tue', label: 'Tuesday' },
                    { value: 'wed', label: 'Wednesday' },
                    { value: 'thu', label: 'Thursday' },
                    { value: 'fri', label: 'Friday' },
                    { value: 'sat', label: 'Saturday' },
                    { value: 'sun', label: 'Sunday' },
                  ],
                  description: 'The day',
                },
                open: {
                  type: 'string',
                  many: true,
                  translatable: false,
                  pattern: '^\\d{2}:\\d{2}-\\d{2}:\\d{2}$',
                  description: 'When it is open that day, each as 09:00-17:00; one that ends past midnight, as 18:00-01:00',
                },
              },
            },
            closed: {
              type: 'date',
              many: true,
              description: 'Days it is closed, whatever the week says, such as holidays',
            },
          },
        },
        hours_note: {
          type: 'string',
          description: 'What the hours can’t say, such as "By appointment" or "Summer hours from June"',
        },
        coverage: {
          type: 'string',
          description: 'For an area you serve: what it gets, such as "Weekly crews, every service"',
        },
        reach: {
          type: 'string',
          description: 'For an area you serve: how soon you get there, such as "22 min from the yard"',
        },
      },
    },
    // What only the place's own page needs.
    body: {
      fields: {
        description: {
          type: 'richtext',
          description: 'The page about the place',
        },
        directions: {
          type: 'text',
          description: 'How to get there: parking, transit, the entrance',
        },
        people: {
          ref: '@std/person',
          many: true,
          description: 'The people who work there',
        },
        services: {
          ref: '@std/service',
          many: true,
          description: 'The services offered there',
        },
      },
    },
  },
}
