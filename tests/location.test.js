/**
 * `@std/location`: one Model for a place people come to and an area a business serves.
 */
import { describe, it, expect } from 'vitest'
import { validateBound } from '../src/conform.js'
import { validateAndNormalizeSchema } from '../src/format.js'
import { schemas } from '../src/index.js'

const location = validateAndNormalizeSchema(schemas.location, '@std/location')

describe('@std/location', () => {
  it('is a standard schema, with its card in `brief` and its page in `body`', () => {
    expect(Object.keys(location.sections)).toEqual(['brief', 'body'])
    expect(location.sections.brief.brief).toBe(true)
    expect(location.sections.body.fields.people).toMatchObject({ type: 'array', items: { type: 'ref', ref: '@std/person' } })
  })

  it('takes a place with its address, coordinates and the week, and an area with what it gets', () => {
    const place = {
      name: 'Downtown',
      kind: 'place',
      status: 'open',
      address: { street: '14 Alder Street', locality: 'Calder Bay', region: 'NS', postal_code: 'B3J 1A1', country: 'CA' },
      latitude: 44.65,
      longitude: -63.57,
      timezone: 'America/Halifax',
      phone: '902-555-0142',
      email: 'downtown@linden.example',
      hours: { week: [{ day: 'tue', open: ['10:00-18:00'] }, { day: 'fri', open: ['10:00-14:00', '17:00-01:00'] }], closed: ['2026-12-25'] },
      hours_note: 'Summer hours from June',
    }
    expect(validateBound(location, place)).toEqual([])
    expect(validateBound(location, { name: 'Westside', kind: 'area', coverage: 'Weekly crews, every service', reach: '22 min from the yard' })).toEqual([])
  })

  it('refuses a kind or a status it does not know, and hours written another way', () => {
    expect(validateBound(location, { name: 'X', kind: 'office' })).toEqual([expect.objectContaining({ field: 'kind', rule: 'enum' })])
    expect(validateBound(location, { name: 'X', status: 'shut' })).toEqual([expect.objectContaining({ field: 'status', rule: 'enum' })])
    expect(validateBound(location, { name: 'X', hours: { week: [{ day: 'mon', open: ['9am-5pm'] }] } })).toEqual([expect.objectContaining({ field: 'hours.week[0].open[0]', rule: 'pattern' })])
  })
})
