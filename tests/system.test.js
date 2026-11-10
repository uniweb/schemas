/**
 * The system Models a site's records may name — `@uniweb/link` today.
 */
import { SYSTEM_RECORD_SCHEMAS, isSystemRecordRef } from '../src/system.js'
import { validateAndNormalizeSchema } from '../src/format.js'

describe('@uniweb/link', () => {
  // One section, the brief, named `brief` and labelled, as the backend's is (2026-11-09).
  it('holds one field: a required `url`, of `format: url`', () => {
    const normalized = validateAndNormalizeSchema(SYSTEM_RECORD_SCHEMAS.link, '@uniweb/link')
    expect(normalized.label).toBe('Link')
    expect(Object.keys(normalized.sections)).toEqual(['brief'])
    expect(normalized.sections.brief).toMatchObject({ kind: 'single', brief: true, label: 'Details' })
    expect(Object.keys(normalized.sections.brief.fields)).toEqual(['url'])
    expect(normalized.sections.brief.fields.url).toMatchObject({ type: 'string', format: 'url', required: true, label: 'URL' })
  })

  it('declares no label or tags field of its own — those are its folder entry’s', () => {
    const { fields } = validateAndNormalizeSchema(SYSTEM_RECORD_SCHEMAS.link, '@uniweb/link').sections.brief
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
    expect(Object.keys(normalized.sections)).toEqual(['brief'])
    expect(normalized.sections.brief).toMatchObject({ kind: 'single', brief: true, label: 'Details' })
    expect(Object.keys(normalized.sections.brief.fields)).toEqual(['file'])
    expect(normalized.sections.brief.fields.file).toMatchObject({ type: 'file', required: true, label: 'File' })
  })
})
