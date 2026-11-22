/**
 * `@std/overlay`: the words drawn over a picture. A small closed vocabulary for what each label is
 * (`role`) and the side it keeps (`align`), so an editor offers a choice and `uniweb validate` names
 * a word it doesn't know, rather than a look the component doesn't have quietly falling back.
 *
 * The overlay below is uniweb.io's architecture picture, as its labeller placed it.
 */
import { describe, it, expect } from 'vitest'
import { validate, overlay, schemas, getSchemaNames } from '../src/index.js'
import { OVERLAY_ROLES, OVERLAY_ALIGNS } from '../src/standard/overlay.js'

const paths = (result) => result.errors.map((e) => `${e.path}:${e.rule}`)

const stack = {
  baked: ['en'],
  sizes: { title: 4.3, label: 1, text: 1.05 },
  labels: [
    { text: 'YOU', x: 20.9, y: 14.65, w: 8.8, h: 7.3, role: 'title' },
    { text: 'NAT Gateway', x: 87.5, y: 24.5, w: 8.6, h: 5 },
    { text: 'Entity models\nand their records', x: 40.2, y: 61.1, w: 12.4, h: 6.2, role: 'text' },
    { text: 'HTTPS', x: 55, y: 30, role: 'note', align: 'left', size: 0.8 },
  ],
}

describe('@std/overlay', () => {
  it('is a standard schema, registered with the others', () => {
    expect(getSchemaNames()).toContain('overlay')
    expect(schemas.overlay).toBe(overlay)
    expect(overlay.linkable).toBe(false)
  })

  it('accepts the architecture picture as placed', () => {
    expect(validate(stack, 'overlay')).toEqual({ valid: true, errors: [] })
  })

  it('takes a picture with no words of its own: no baked, no sizes', () => {
    expect(validate({ labels: [{ text: 'Engine', x: 50, y: 50 }] }, 'overlay').valid).toBe(true)
  })

  it('names a role or a side it does not know', () => {
    const odd = { labels: [{ text: 'YOU', x: 20, y: 14, role: 'heading', align: 'start' }] }
    expect(paths(validate(odd, 'overlay'))).toEqual(['labels[0].role:enum', 'labels[0].align:enum'])
  })

  it('wants the words and the point they sit at', () => {
    expect(paths(validate({ labels: [{ x: 20 }] }, 'overlay'))).toEqual(['labels[0].text:required', 'labels[0].y:required'])
  })

  it('keeps a place on the picture', () => {
    expect(paths(validate({ labels: [{ text: 'A', x: 120, y: -1 }] }, 'overlay'))).toEqual(['labels[0].x:max', 'labels[0].y:min'])
  })

  it('takes the picture’s colors, for every label and for one, and for its dark version', () => {
    const colored = {
      ...stack,
      color: '#232d42',
      dark: { color: '#d6d9de', ground: '#0a1123' },
      labels: [
        { text: 'YOU', x: 20.9, y: 14.65, role: 'title', ground: '#fbfcff' },
        { text: 'NEW', x: 50, y: 50, color: '#fff', ground: '#2f6bff80', dark: { ground: '#1d3f99' } },
      ],
    }
    expect(validate(colored, 'overlay')).toEqual({ valid: true, errors: [] })
  })

  it('names a color that is not a hex value', () => {
    const odd = { color: 'navy', dark: { ground: '#12345' }, labels: [{ text: 'A', x: 1, y: 1, ground: 'rgb(0,0,0)' }] }
    expect(paths(validate(odd, 'overlay'))).toEqual(['color:pattern', 'dark.ground:pattern', 'labels[0].ground:pattern'])
  })

  it('offers only the words for translation', () => {
    const { fields } = overlay
    expect(fields.baked.translatable).toBe(false)
    expect(fields.labels.fields.role.enum).toEqual(OVERLAY_ROLES)
    expect(fields.labels.fields.align.enum).toEqual(OVERLAY_ALIGNS)
    expect(fields.sizes.fields).toHaveProperty('title')
    expect(Object.keys(fields.sizes.fields)).toEqual(OVERLAY_ROLES)
    for (const scope of [fields, fields.dark.fields, fields.labels.fields, fields.labels.fields.dark.fields]) {
      expect([scope.color.translatable, scope.ground.translatable]).toEqual([false, false])
    }
  })
})
