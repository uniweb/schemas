/**
 * Session schema - something held every week at a set time
 *
 * A class on a studio's timetable, a swimming lesson, a weekly service, a doctor's clinic hours, a
 * club's meeting night: something held on the same days at the same time, for a season. It is not
 * an event: an event happens once, on its dates, and passes, while a session stands, held week
 * after week until the timetable changes. Their identity and lifecycle differ, so each is its own
 * Model. Something held on one date is an event, and so is each date of something held monthly.
 *
 * One section, the record its own card, since a timetable lists sessions and a list carries only
 * the card. What a timetable shows of each comes through its references, which carry the card of
 * the record they name: the class's name, icon and length from its service (`@std/service`), the
 * place and its clock from its location (`@std/location`), and the teacher from its people
 * (`@std/person`). So a session holds what is its own: its days, its time, where in the place,
 * who it is for, and whether it is held.
 *
 * One record can be held on several days (`days`), so a class at the same time Monday, Wednesday
 * and Friday is one session; one that differs on a day, a teacher or a time, is another. Its time
 * is an interval on the clock of the place it is held, written as a location's hours are
 * (`18:30-19:30`), so a timetable can say what is on now; a session with no location, or one held
 * online, gives its own `timezone`. A season is `from` and `until`, and `except` holds the days it
 * is not held, as a location's closed days are.
 *
 * Left out, as another record's or another system's: a price, which is its service's or a
 * membership's; places left, which a booking system knows (`full` says when there are none); and
 * something held every other week or on the first Saturday of a month, which is an event per date.
 */
const DAYS = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
]

export default {
  name: 'session',
  version: '1.0.0',
  plural: 'Sessions',
  icon: 'lu-calendar-clock',
  description: 'Something held every week at a set time: a class, a lesson, a service or office hours',

  fields: {
    name: {
      type: 'string',
      description: 'Its own name, such as Open swim, when it isn’t its service’s. Left empty, its service names it.',
    },
    service: {
      ref: '@std/service',
      description: 'What is held: the class, the lesson or the service',
    },
    days: {
      type: 'string',
      many: true,
      required: true,
      translatable: false,
      enum: DAYS,
      description: 'The days of the week it is held',
    },
    time: {
      type: 'string',
      required: true,
      translatable: false,
      pattern: '^\\d{2}:\\d{2}-\\d{2}:\\d{2}$',
      description: 'From when to when, on the clock of the place it is held, as 18:30-19:30; one that ends past midnight, as 23:00-01:00',
    },
    location: {
      ref: '@std/location',
      description: 'Where it is held',
    },
    room: {
      type: 'string',
      description: 'Where in the place, such as Studio 2 or the small pool',
    },
    people: {
      ref: '@std/person',
      many: true,
      description: 'Who leads it',
    },
    audience: {
      type: 'string',
      description: 'Who it is for, such as Beginners, All levels or Ages 6 to 9',
    },
    status: {
      type: 'string',
      translatable: false,
      enum: [
        { value: 'held', label: 'Held as listed' },
        { value: 'full', label: 'Full' },
        { value: 'paused', label: 'Not held for now' },
      ],
      description: 'Whether it is held. Left empty, held as listed.',
    },
    note: {
      type: 'string',
      description: 'A line shown beside it, such as Bring a mat, or Back in September',
    },
    from: {
      type: 'date',
      description: 'The first day it is held, for one that starts on a date',
    },
    until: {
      type: 'date',
      description: 'The last day it is held, for one that ends on a date, such as the end of a term',
    },
    except: {
      type: 'date',
      many: true,
      description: 'Days it is not held, whatever its days say, such as holidays',
    },
    online: {
      type: 'boolean',
      description: 'Held online, joined by its link',
    },
    link: {
      type: 'url',
      description: 'Where to book it, or to join it when it is held online',
    },
    timezone: {
      type: 'string',
      translatable: false,
      description: 'The clock its time is on, such as America/Toronto, for one with no location to say so',
    },
  },
}
