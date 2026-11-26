/**
 * `@std/conversation`: a person's conversation with an AI agent, every message and part of it
 * typed and placed, written once, and closed to an organization's members.
 */
import { describe, it, expect } from 'vitest'
import { validateBound } from '../src/conform.js'
import { validateAndNormalizeSchema } from '../src/format.js'
import conversationSchema from '../src/standard/conversation.js'

const conversation = validateAndNormalizeSchema(conversationSchema, '@std/conversation')
const { brief, about, setup, messages } = conversation.sections
const parts = messages.sections.parts
const content = parts.sections.content

/** A conversation as a store holds it: a site made, a page read, an answer given. */
const held = {
  brief: { title: 'A bakery site' },
  about: [{ site: 'sunrise-bakery' }],
  setup: [
    {
      model: 'example-model',
      instructions_version: 1,
      system: 'You work on the sites of the person you act for.',
      tools: [
        {
          name: 'read_page',
          description: 'Read one page of a site, its sections as Markdown.',
          input_schema: { type: 'object', properties: { site: { type: 'string' }, route: { type: 'string' } }, required: ['site', 'route'] },
          strict: true,
        },
      ],
    },
  ],
  messages: [
    {
      index: 0,
      role: 'user',
      at: '2026-11-25T20:13:58Z',
      parts: [
        { index: 0, kind: 'text', text: 'Make me a site for my bakery, like this photo.' },
        { index: 1, kind: 'image', image: { url: 'https://files.example.com/9f2c.jpg', mime: 'image/jpeg', size: 482113 } },
      ],
    },
    {
      index: 1,
      role: 'assistant',
      at: '2026-11-25T20:14:03Z',
      stop_reason: 'tool_use',
      parts: [
        { index: 0, kind: 'thinking', thinking: '', signature: 'EqQBCkgIBhABGAIiQL…' },
        { index: 1, kind: 'text', text: 'I’ll start from the home page.' },
        { index: 2, kind: 'tool_use', tool_use_id: 'toolu_01A', tool: 'read_page', input: { site: 'sunrise-bakery', route: '/' } },
      ],
    },
    {
      index: 2,
      role: 'user',
      at: '2026-11-25T20:14:04Z',
      parts: [{ index: 0, kind: 'tool_result', tool_use_id: 'toolu_01A', content: [{ index: 0, kind: 'text', text: '# Sunrise Bakery\n\nFresh every morning.' }] }],
    },
    {
      index: 3,
      role: 'assistant',
      at: '2026-11-25T20:14:07Z',
      stop_reason: 'end_turn',
      parts: [{ index: 0, kind: 'text', text: 'Your home page has a title and one line. Shall I add your opening hours?' }],
    },
  ],
}

/** The conversation with its messages replaced. */
const withMessages = (...list) => ({ ...held, messages: list })
const at = '2026-11-25T20:13:58Z'

describe('@std/conversation', () => {
  it('declares its own Model: a brief, what it is about, its setup and its messages, closed to members and referenced by nothing', () => {
    expect(Object.keys(conversation.sections)).toEqual(['brief', 'about', 'setup', 'messages'])
    expect(brief.brief).toBe(true)
    expect(Object.keys(brief.fields)).toEqual(['title'])
    expect(conversation.sortDate).toBeUndefined()
    expect(conversation.openToMembers).toBe(false)
    expect(conversation.linkable).toBe(false)
    expect(about.fields.site).toMatchObject({ type: 'ref', ref: '@uniweb/site-content', required: true })
  })

  it('is never rewritten: its setup is written once, and its messages, their parts, a result’s content, the tools and about only grow', () => {
    for (const section of [about, setup, setup.sections.tools, messages, parts, content]) expect(section.append_only).toBe(true)
    expect(setup.constraints).toEqual([{ kind: 'max_items', value: 1 }])
  })

  it('holds its order as a value: a message’s place is unique in the conversation, a part’s among its siblings', () => {
    expect(messages.constraints).toEqual([{ kind: 'unique_field', field: 'index' }])
    expect(parts.constraints).toContainEqual({ kind: 'unique_field', field: 'index', scope: 'siblings' })
    expect(content.constraints).toContainEqual({ kind: 'unique_field', field: 'index', scope: 'siblings' })
  })

  it('holds no text in more than one language, and only a tool call’s input and a tool’s input schema as opaque values', () => {
    const leaves = []
    const walk = (section) => {
      for (const [key, def] of Object.entries(section.fields ?? {})) leaves.push([key, def])
      for (const child of Object.values(section.sections ?? {})) walk(child)
    }
    for (const section of Object.values(conversation.sections)) walk(section)
    for (const [key, def] of leaves) {
      if (def.type === 'string' || def.type === 'text') expect([key, def.translatable]).toEqual([key, false])
    }
    expect(leaves.filter(([, def]) => def.type === 'json').map(([key]) => key).sort()).toEqual(['input', 'input_schema'])
  })

  it('types each part by its kind: the value a kind needs is required on its parts, and a call is made and answered once', () => {
    expect(parts.constraints).toEqual(expect.arrayContaining([
      { kind: 'required_when', field: 'image', when: { field: 'kind', equals: 'image' } },
      { kind: 'required_when', field: 'signature', when: { field: 'kind', equals: 'thinking' } },
      { kind: 'required_when', field: 'tool_use_id', when: { field: 'kind', equals: 'tool_use' } },
      { kind: 'required_when', field: 'input', when: { field: 'kind', equals: 'tool_use' } },
      { kind: 'required_when', field: 'tool_use_id', when: { field: 'kind', equals: 'tool_result' } },
      { kind: 'unique_field', field: 'tool_use_id', when: { field: 'kind', equals: 'tool_use' } },
      { kind: 'unique_field', field: 'tool_use_id', when: { field: 'kind', equals: 'tool_result' } },
    ]))
    // A text is kept as it was sent, so an empty one is never refused.
    expect(parts.constraints.filter((rule) => rule.field === 'text')).toEqual([])
  })

  it('takes a conversation that made a site, read a page and answered, and a text part kept empty', () => {
    expect(validateBound(conversation, held)).toEqual([])
    expect(validateBound(conversation, withMessages({ index: 0, role: 'assistant', at, parts: [{ index: 0, kind: 'text', text: '' }] }))).toEqual([])
  })

  it('refuses a role, a kind or a time written another way, and a message with no place, role or time', () => {
    const one = (message) => validateBound(conversation, withMessages(message))
    expect(one({ index: 0, role: 'tool', at, parts: [] })).toEqual([expect.objectContaining({ rule: 'enum' })])
    expect(one({ index: 0, role: 'user', at, parts: [{ index: 0, kind: 'audio' }] })).toEqual([expect.objectContaining({ rule: 'enum' })])
    expect(one({ index: 0, role: 'user', at: 'yesterday', parts: [] })).toEqual([expect.objectContaining({ field: expect.stringContaining('at') })])
    expect(one({ role: 'user', at, parts: [] })).toEqual([expect.objectContaining({ rule: 'required' })])
    expect(one({ index: 0, at, parts: [] })).toEqual([expect.objectContaining({ rule: 'required' })])
    expect(one({ index: 0, role: 'user', parts: [] })).toEqual([expect.objectContaining({ rule: 'required' })])
  })

  it('refuses a PDF as an image and a picture as a document', () => {
    const pdf = { url: 'https://files.example.com/menu.pdf', mime: 'application/pdf', size: 90210 }
    const png = { url: 'https://files.example.com/logo.png', mime: 'image/png', size: 1204 }
    const one = (part) => validateBound(conversation, withMessages({ index: 0, role: 'user', at, parts: [part] }))
    expect(one({ index: 0, kind: 'image', image: pdf })).toEqual([expect.objectContaining({ rule: 'mime_types' })])
    expect(one({ index: 0, kind: 'document', document: png })).toEqual([expect.objectContaining({ rule: 'mime_types' })])
    expect(one({ index: 0, kind: 'document', document: pdf })).toEqual([])
  })
})
