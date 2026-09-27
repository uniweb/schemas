import { describe, test, expect } from 'vitest'
import { parseGrid, gridTemplate } from '../src/grid.js'

describe('parseGrid', () => {
  test('a count is that many equal columns', () => {
    expect(parseGrid(3)).toEqual({ value: 3, columns: 3, widths: [1, 1, 1] })
    expect(parseGrid(1)).toEqual({ value: 1, columns: 1, widths: [1] })
  })

  test('a count written as a string reads the same, and keeps the value as written', () => {
    expect(parseGrid('3')).toEqual({ value: '3', columns: 3, widths: [1, 1, 1] })
    expect(parseGrid(' 2 ')).toEqual({ value: ' 2 ', columns: 2, widths: [1, 1] })
  })

  test('a ratio is relative widths, and its part count is the column count', () => {
    expect(parseGrid('40/60')).toEqual({ value: '40/60', columns: 2, widths: [40, 60] })
    expect(parseGrid('25/50/25')).toEqual({ value: '25/50/25', columns: 3, widths: [25, 50, 25] })
    expect(parseGrid('33.3 / 66.7')).toEqual({ value: '33.3 / 66.7', columns: 2, widths: [33.3, 66.7] })
  })

  test('anything else is not a layout', () => {
    for (const value of [0, -2, 2.5, NaN, '', '0', 'abc', '40/', '/60', '40//60', '40/0', '40/-60', '40/6o',
      null, undefined, true, [2], { columns: 2 }]) {
      expect(parseGrid(value), JSON.stringify(value)).toBeNull()
    }
  })
})

describe('gridTemplate', () => {
  test('equal widths repeat one track, so 2 and 50/50 render alike', () => {
    expect(gridTemplate(3)).toBe('repeat(3, minmax(0, 1fr))')
    expect(gridTemplate('50/50')).toBe(gridTemplate(2))
  })

  test('a ratio becomes one fr track per part', () => {
    expect(gridTemplate('40/60')).toBe('minmax(0, 40fr) minmax(0, 60fr)')
  })

  test('not a layout, no template', () => {
    expect(gridTemplate('40/')).toBeNull()
  })
})
