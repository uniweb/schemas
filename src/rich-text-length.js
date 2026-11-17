/**
 * How long a rich text is — what `max_length` on a rich-text field counts (2026-11-17).
 *
 * ⭐ **The characters a reader sees**, counted as a string's are: each character of the text, in code
 * points, spaces included; a line break counts one, and so does each new paragraph, heading, list item
 * or table cell after the first. Formatting counts nothing — `CO₂` with its `2` a subscript is three
 * characters — and neither does a picture, an inset, a formula, a data block or a divider. A translated
 * field is counted one language at a time.
 *
 * "Research on CO₂", then a paragraph "and m²", is 15 + 1 + 6 = 22.
 *
 * A registry storing a Model checks the rule on every write, by this definition
 * (`framework/_contracts/backend-vectors/rich-text-length.json`); `./conform.js`, an editor's counter
 * and a form check it before anything is sent. No dependencies, so any of them may import it.
 *
 * @module @uniweb/schemas/rich-text-length
 */

/** The nodes whose content is a line of text: each one after the first counts one, as a new line. */
const TEXTBLOCKS = new Set(['paragraph', 'heading', 'codeBlock'])

/** Whether a value is a stored rich text: a document, `{ type: 'doc', … }`. */
export function isRichTextDocument(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && value.type === 'doc'
}

/**
 * How many characters a rich text holds, as a reader sees them.
 *
 * @param {object} doc - a stored rich text (`{ type: 'doc', content }`)
 * @returns {number} 0 for anything that is not a document
 */
export function richTextLength(doc) {
  if (!isRichTextDocument(doc)) return 0
  let characters = 0
  let lines = 0
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'text') {
      characters += [...String(node.text ?? '')].length
      return
    }
    if (node.type === 'hardBreak') {
      characters += 1
      return
    }
    if (TEXTBLOCKS.has(node.type)) lines += 1
    if (Array.isArray(node.content)) node.content.forEach(walk)
  }
  walk(doc)
  return characters + Math.max(0, lines - 1)
}
