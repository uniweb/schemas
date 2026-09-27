/**
 * A grid layout — the value of a section's reserved `grid:` key, and each choice a
 * component's `children.grid` offers.
 *
 * ## ⭐ ONE VALUE, IN ONE OF TWO FORMS
 *
 *     grid: 3          three equal columns
 *     grid: '40/60'    relative widths — the part count is the column count
 *
 * A count and a ratio are not two settings that can disagree: `'40/60'` already says
 * two columns, so a "ratio that does not match the count" cannot be written.
 *
 * ## ⭐ ONE HOME FOR THE RULE
 *
 * Kit lays a section's children out with it, an editor draws with it, and the build
 * checks an author's choice with it — so what an editor draws is what kit renders.
 * ⛔ Do not re-derive a template from the value anywhere else.
 *
 * Dependency-free on purpose: kit imports this module into every foundation that lays
 * out a grid.
 */

/**
 * Read a grid layout.
 *
 * @param {number|string} value - `3`, `'3'`, `'40/60'`, `'25/50/25'`
 * @returns {{ value: number|string, columns: number, widths: number[] } | null}
 *   `widths` are relative parts, one per column (`[1, 1, 1]` for equal columns).
 *   `null` for anything that is not a layout.
 */
export function parseGrid(value) {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 1) return null
    return { value, columns: value, widths: new Array(value).fill(1) }
  }
  if (typeof value !== 'string') return null

  const text = value.trim()
  if (!text.includes('/')) {
    // A count written as a string — YAML quotes it, an editor's text field sends it.
    if (!/^\d+$/.test(text)) return null
    const count = Number(text)
    if (count < 1) return null
    return { value, columns: count, widths: new Array(count).fill(1) }
  }

  const parts = text.split('/').map((part) => part.trim())
  if (parts.some((part) => !/^\d+(\.\d+)?$/.test(part))) return null
  const widths = parts.map(Number)
  if (widths.some((width) => width <= 0)) return null
  return { value, columns: widths.length, widths }
}

/**
 * The CSS `grid-template-columns` for a layout — what kit renders, so an editor that
 * draws with it draws the same columns.
 *
 * Equal widths come out as `repeat(n, minmax(0, 1fr))`, so `'50/50'` and `2` render
 * alike. `minmax(0, …)` keeps a wide child from stretching its column.
 *
 * @param {number|string} value
 * @returns {string|null} `null` when the value is not a layout
 */
export function gridTemplate(value) {
  const layout = parseGrid(value)
  if (!layout) return null
  const { columns, widths } = layout
  if (widths.every((width) => width === widths[0])) return `repeat(${columns}, minmax(0, 1fr))`
  return widths.map((width) => `minmax(0, ${width}fr)`).join(' ')
}
