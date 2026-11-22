/**
 * `@std/session`: something held every week at a set time, its own card, naming what is held, where
 * and with whom by reference.
 */
import { describe, it, expect } from 'vitest'
import { validateBound } from '../src/conform.js'
import { validateAndNormalizeSchema } from '../src/format.js'
import { schemas } from '../src/index.js'

const session = validateAndNormalizeSchema(schemas.session, '@std/session')

describe('@std/session', () => {
  it('is a standard schema, the record its own card, with its service, location and people as references', () => {
    // The flat form: one section, which is the card (`docs/development/data-schemas.md` § The brief).
    expect(session.sections).toBeUndefined()
    const fields = session.fields
    expect(fields.service).toMatchObject({ type: 'ref', ref: '@std/service' })
    expect(fields.location).toMatchObject({ type: 'ref', ref: '@std/location' })
    expect(fields.people).toMatchObject({ type: 'array', items: { type: 'ref', ref: '@std/person' } })
    expect(fields.days).toMatchObject({ type: 'array', required: true })
  })

  it('takes a class held on three days for a term, a session held online, and one named without a service', () => {
    const weekly = {
      service: 'warm-flow',
      days: ['mon', 'wed', 'fri'],
      time: '06:30-07:30',
      location: 'harbourfront',
      room: 'The heated room',
      people: ['rania-nassif'],
      audience: 'All levels',
      status: 'held',
      note: 'Bring a mat',
      from: '2026-09-08',
      until: '2027-06-18',
      except: ['2026-12-25', '2027-01-01'],
      link: 'https://example.com/book',
    }
    expect(validateBound(session, weekly)).toEqual([])
    expect(validateBound(session, { service: 'unwind', days: ['sun'], time: '20:00-20:45', online: true, link: 'https://example.com/join', timezone: 'America/Toronto' })).toEqual([])
    expect(validateBound(session, { name: 'Open swim', days: ['sat', 'sun'], time: '23:00-01:00', status: 'full' })).toEqual([])
  })

  it('refuses a day, a time or a status written another way, and a session with no days or no time', () => {
    expect(validateBound(session, { days: ['monday'], time: '06:30-07:30' })).toEqual([expect.objectContaining({ rule: 'enum' })])
    expect(validateBound(session, { days: ['mon'], time: '6:30pm' })).toEqual([expect.objectContaining({ field: 'time', rule: 'pattern' })])
    expect(validateBound(session, { days: ['mon'], time: '06:30-07:30', status: 'cancelled' })).toEqual([expect.objectContaining({ field: 'status', rule: 'enum' })])
    expect(validateBound(session, { time: '06:30-07:30' })).toEqual([expect.objectContaining({ field: 'days', rule: 'required' })])
    expect(validateBound(session, { days: ['mon'] })).toEqual([expect.objectContaining({ field: 'time', rule: 'required' })])
  })
})
