import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { richTextLength, isRichTextDocument } from '../src/rich-text-length.js'
import { validateAndNormalizeSchema } from '../src/format.js'
import { validateRecordFile } from '../src/conform.js'

/**
 * ⭐ `max_length` on a rich-text field (2026-11-17) — a long text's limit, as a CV's formatted fields
 * have one of 1,000, 500 or 250 characters. It counts the characters a reader
 * sees, as a string's are counted — formatting counts nothing; a line break or a new paragraph counts
 * one — and a registry checks it on every write, by this definition.
 */
const text = (t, ...marks) => ({ type: 'text', text: t, ...(marks.length ? { marks } : {}) })
const p = (...content) => ({ type: 'paragraph', content })
const doc = (...content) => ({ type: 'doc', content })

describe('how long a rich text is', () => {
  it('⭐ the characters a reader sees: "Research on CO₂", then "and m²", is 22', () => {
    expect(richTextLength(doc(p(text('Research on CO₂')), p(text('and m²'))))).toBe(22)
  })

  it('formatting counts nothing — CO₂ with its 2 a subscript is three characters', () => {
    expect(richTextLength(doc(p(text('CO'), text('2', { type: 'subscript' }))))).toBe(3)
    expect(richTextLength(doc(p(text('bold', { type: 'bold' }, { type: 'link', attrs: { href: 'https://x.test' } }))))).toBe(4)
  })

  it('a line break counts one, and so does each new line of a list, a heading, a quote or a table', () => {
    expect(richTextLength(doc(p(text('a'), { type: 'hardBreak' }, text('b'))))).toBe(3)
    const list = { type: 'bulletList', content: [{ type: 'listItem', content: [p(text('one'))] }, { type: 'listItem', content: [p(text('two'))] }] }
    expect(richTextLength(doc({ type: 'heading', attrs: { level: 2 }, content: [text('Title')] }, list))).toBe(5 + 1 + 3 + 1 + 3)
    const table = { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [p(text('ab'))] }, { type: 'tableCell', content: [p(text('cd'))] }] }] }
    expect(richTextLength(doc({ type: 'blockquote', content: [p(text('q'))] }, table))).toBe(1 + 1 + 2 + 1 + 2)
  })

  it('in code points, as a string is counted — an emoji is one character', () => {
    expect(richTextLength(doc(p(text('🙂 ok'))))).toBe(4)
  })

  it('a picture, a formula, an inset or a divider counts nothing', () => {
    const atoms = [{ type: 'image', attrs: { src: '/a.png' } }, { type: 'math_inline', attrs: { latex: 'x^2' } }, { type: 'inset_ref', attrs: { component: 'Chart' } }]
    expect(richTextLength(doc(p(text('a'), ...atoms), { type: 'divider', attrs: {} }))).toBe(1)
  })

  it('an empty paragraph is a new line too', () => {
    expect(richTextLength(doc(p(text('a')), p(), p(text('b'))))).toBe(1 + 1 + 0 + 1 + 1)
  })

  it('CONTROL — what is no document is no length', () => {
    expect(richTextLength(doc())).toBe(0)
    expect(richTextLength('a string')).toBe(0)
    expect(isRichTextDocument({ type: 'paragraph' })).toBe(false)
  })
})

describe('max_length on a rich-text field', () => {
  const schema = (f) => validateAndNormalizeSchema({ fields: { summary: f } }, '@/cv')

  it('⭐ is a rule of the field, in both spellings', () => {
    expect(schema({ type: 'richtext', max_length: 1000 }).fields.summary).toEqual({ type: 'json', format: 'richtext', max_length: 1000 })
    expect(schema({ type: 'json', format: 'richtext', max_length: 250 }).fields.summary.max_length).toBe(250)
  })

  it('CONTROL — on other json it is refused, naming the kinds it applies to', () => {
    expect(() => schema({ type: 'json', max_length: 10 })).toThrow(/'max_length', which applies to string, text and richtext values, not json/)
  })

  it('⭐ a record is checked by it: a document, or markdown read with the reader handed in', () => {
    const s = schema({ type: 'richtext', max_length: 5 })
    const long = doc(p(text('Hello')), p(text('world')))
    expect(validateRecordFile(s, { summary: long }).map((v) => [v.field, v.rule])).toEqual([['summary', 'max_length']])
    expect(validateRecordFile(s, { summary: doc(p(text('Hello'))) })).toEqual([])
    const readRichText = (md) => doc(...md.split('\n\n').map((line) => p(text(line))))
    expect(validateRecordFile(s, { summary: 'Hello\n\nworld' }, { readRichText }).map((v) => v.rule)).toEqual(['max_length'])
    // With no reader, markdown is not counted: this package reads none.
    expect(validateRecordFile(s, { summary: 'Hello\n\nworld' })).toEqual([])
  })
})

describe('the module', () => {
  it('⭐ imports nothing — a foundation bundle that counts a rich text carries this file alone', () => {
    const source = readFileSync(new URL('../src/rich-text-length.js', import.meta.url), 'utf8')
    expect(source).not.toMatch(/^\s*(import|export\s.*\sfrom)\s/m)
  })
})
