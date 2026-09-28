/**
 * The system Models a site's records may name — `@uniweb/link` today.
 */
import { SYSTEM_RECORD_SCHEMAS, isSystemRecordRef } from '../src/system.js'
import { validateAndNormalizeSchema } from '../src/format.js'

describe('@uniweb/link', () => {
  // The `fields:` form — one section, the brief, named `brief`, once lowered.
  it('holds one field: a required `url`, of `format: url`', () => {
    const normalized = validateAndNormalizeSchema(SYSTEM_RECORD_SCHEMAS.link, '@uniweb/link')
    expect(normalized.label).toBe('Link')
    expect(Object.keys(normalized.fields)).toEqual(['url'])
    expect(normalized.fields.url).toMatchObject({ type: 'string', format: 'url', required: true })
  })

  it('declares no label or tags of its own — those are its folder entry’s', () => {
    const { fields } = validateAndNormalizeSchema(SYSTEM_RECORD_SCHEMAS.link, '@uniweb/link')
    expect(fields).not.toHaveProperty('label')
    expect(fields).not.toHaveProperty('tags')
  })
})

describe('isSystemRecordRef', () => {
  it('names the system Models a record may name, and nothing else under @uniweb', () => {
    expect(isSystemRecordRef('@uniweb/link')).toBe(true)
    expect(isSystemRecordRef('@uniweb/file')).toBe(true)
    expect(isSystemRecordRef('@uniweb/folder')).toBe(false)
    expect(isSystemRecordRef('@std/link')).toBe(false)
    expect(isSystemRecordRef('@uniweb/link/*')).toBe(false)
  })
})

describe('@uniweb/file', () => {
  it('holds one field: a required `file`', () => {
    const normalized = validateAndNormalizeSchema(SYSTEM_RECORD_SCHEMAS.file, '@uniweb/file')
    expect(normalized.label).toBe('File')
    expect(Object.keys(normalized.fields)).toEqual(['file'])
    expect(normalized.fields.file).toMatchObject({ type: 'file', required: true })
  })
})
