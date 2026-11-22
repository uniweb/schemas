/**
 * Overlay schema — the words drawn over a picture, so it reads in the page's language.
 *
 * A diagram, a screenshot or a map often holds words. Drawn over it as text instead, they are
 * translated with the page, and a site in five languages needs one picture, not five. A section
 * gives them in a tagged data block, and its type declares the key as one record, since a block holds
 * one overlay: `data: { overlay: { schema: '@std/overlay', single: true } }`.
 *
 * ```yaml:overlay
 * baked: [en]
 * sizes: { title: 4.3, label: 1, text: 1.05 }
 * labels:
 *   - { text: "YOU", x: 20.9, y: 14.65, w: 8.8, h: 7.3, role: title }
 *   - { text: "NAT Gateway", x: 87.5, y: 24.5, w: 8.6, h: 5 }
 *   - { text: "Your data\nand files", x: 40, y: 60, w: 12, h: 6, role: text }
 * ```
 *
 * Only a label's `text` is words; the rest is where it sits on the picture, in percent of its
 * width (`x`, `w`) and height (`y`, `h`), so a label keeps its place at any size. `x` and `y` are
 * the center of the label's box.
 *
 * ⭐ A SMALL CLOSED VOCABULARY, NOT OPEN VALUES [Diego, 2026-11-22: "we don't need to go all the
 * way to open ended. sometimes covering what most need is better"]. A label's look is the
 * foundation's, so a foundation styles each `role`; the four cover the words most pictures hold:
 *
 *   title   a heading in the picture: of the picture, or of a region. One line.
 *   label   the name of a thing: a node, a part, a place, a button. One line. The default.
 *   text    words in a frame: a card's description, a callout's explanation. They wrap within
 *           `w`, and the frame keeps its top, so a longer translation grows downward.
 *   note    small print: a word on an arrow, a unit, a legend's entry. One line.
 *
 * A one-line label grows its box when a translation is longer. `align` names the side it keeps
 * while it grows, and its lines align to that side too. It is a side of the picture, not of the
 * language, since a picture doesn't mirror in a language written right to left.
 *
 * ⭐ The picture's scale is the picture's, not the foundation's: a full-page screenshot's words are
 * a smaller share of its width than a cropped one's. So the overlay gives each role's size, and a
 * label may give its own, in percent of the picture's width. With neither, the foundation's style
 * gives the size.
 *
 * ⭐ `baked` lists the languages whose picture shows its words itself: the source's, and each
 * language a translation gives a picture of its own. A page in one of them shows the picture as
 * drawn; a page in any other covers the picture's words with the labels. A picture made without
 * words has no `baked`, and shows its labels in every language.
 *
 * Kept out on purpose, each addable later as an optional field without breaking what is stored:
 * a color for one label (words of one role in several colors), rotation (a chart's vertical axis
 * title), a link on a label.
 */

/** What the words of a label are, in the picture. */
export const OVERLAY_ROLES = ['title', 'label', 'text', 'note']

/** The side of its box a label keeps, and its lines align to. */
export const OVERLAY_ALIGNS = ['left', 'center', 'right']

/** A share of the picture, in percent. */
const percent = (description, extra = {}) => ({ type: 'number', min: 0, max: 100, description, ...extra })

/** A size, in percent of the picture's width. */
const size = (description) => ({ type: 'number', min: 0, description })

export default {
  name: 'overlay',
  version: '1.0.0',
  plural: 'Overlays',
  icon: 'lu-captions',
  description: "Words drawn over a picture, in the page's language: what each says, and where it sits",
  // Its entries are not referenced and not placed in a site's folder, as `@std/nav`'s and `@std/form`'s.
  linkable: false,

  fields: {
    baked: {
      type: 'string',
      many: true,
      translatable: false, // language codes
      description: 'The languages whose picture shows its words itself',
    },
    sizes: {
      type: 'object',
      description: "Each role's size, in percent of the picture's width",
      fields: {
        title: size('The size of a title'),
        label: size('The size of a label'),
        text: size('The size of words in a frame'),
        note: size('The size of small print'),
      },
    },
    labels: {
      type: 'object',
      many: true,
      description: 'The words over the picture, each where it sits',
      fields: {
        text: {
          type: 'string',
          required: true,
          description: 'The words, with a line break where one is wanted',
        },
        x: percent("The center of its box, in percent of the picture's width", { required: true }),
        y: percent("The center of its box, in percent of the picture's height", { required: true }),
        w: percent("Its box's width, in percent of the picture's width"),
        h: percent("Its box's height, in percent of the picture's height"),
        role: {
          type: 'string',
          enum: OVERLAY_ROLES,
          description: 'What the words are in the picture: title, label (the default), text in a frame, or note',
        },
        align: {
          type: 'string',
          enum: OVERLAY_ALIGNS,
          description: 'The side of its box it keeps: center, or left for text in a frame, unless given',
        },
        size: size("Its own size, in percent of the picture's width, over its role's"),
      },
    },
  },
}
