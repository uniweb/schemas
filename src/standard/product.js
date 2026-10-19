/**
 * Product schema - something a business sells
 *
 * Two sections, like `@std/article`. The `brief` is the card: its name, a line about it,
 * its price, a picture, whether it is available, and where to buy it — a link to the shop
 * that sells it, since a site is not a checkout. `body` holds what only the product's own
 * page needs.
 *
 * The price is a number, so a list can sort by it and a component can format it in the
 * site's currency — a choice of the component, one for the whole site — and `unit` says
 * what the price buys ("per loaf", "set of 4").
 *
 * How a site groups its products is where it places them, a folder branch a query selects
 * with `scope:`, not a field of the product. `tags` are what is true of the product itself
 * ("vegan", "gluten-free").
 */
export default {
  name: 'product',
  version: '1.0.0',
  plural: 'Products',
  icon: 'lu-shopping-bag',
  description: 'Something a business sells',
  sections: {
    // The card — what a list and a reference carry.
    brief: {
      brief: true,
      fields: {
        name: {
          type: 'string',
          required: true,
          description: 'Product name',
        },
        summary: {
          type: 'string',
          description: 'One or two lines about it, for a list or a card',
        },
        price: {
          type: 'number',
          min: 0,
          description: 'Price, as a number',
        },
        unit: {
          type: 'string',
          description: 'What the price buys, e.g. "per loaf" or "set of 4"',
        },
        image: {
          type: 'image',
          description: 'Main picture',
        },
        available: {
          type: 'boolean',
          description: 'Uncheck when it is sold out or out of season',
        },
        url: {
          type: 'url',
          description: 'Where to buy it — its page in your online shop',
        },
        tags: {
          type: 'string',
          many: true,
          description: 'What is true of it, e.g. "vegan" or "gluten-free"',
        },
      },
    },
    // What only the product's own page needs.
    body: {
      fields: {
        description: {
          type: 'richtext',
          description: 'The full description, for the product page',
        },
        gallery: {
          type: 'image',
          many: true,
          description: 'More pictures',
        },
      },
    },
  },
}
