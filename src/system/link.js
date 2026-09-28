/**
 * `@uniweb/link` — a link to a URL, as a record.
 *
 * A SYSTEM Model: its name is reserved, no foundation or site defines one of that name, and a
 * backend that stores records keeps its own definition of it — as a folder entry of kind `link`,
 * holding its `url`, never as an entity of its own. This copy is what a site with no backend
 * builds, validates and renders a link record with, and it must stay equal to the backend's.
 *
 * ⭐ A link's display text and tags are its FOLDER ENTRY's, not fields of the Model:
 * `records/folder.yml` gives them (`label:`, `tags:`), as it does for every record, and a
 * component receives them as `$label` and `$tags`.
 *
 * One section, the brief, named `brief` — the `fields:` form — and one field.
 */
export default {
  name: 'link',
  label: 'Link',
  fields: {
    // An absolute URL — `format: url`, as the backend declares it (2026-09-28 [Diego]). Never translated.
    url: { type: 'url', required: true },
  },
}
