/**
 * `@uniweb/file` — a stored file, as a record.
 *
 * A SYSTEM Model, like `@uniweb/link`: its name is reserved, and a backend that stores records keeps
 * its own definition of it — as a folder entry of kind `file`, holding its `file` value, never as an
 * entity. This copy is what a site with no backend builds, validates and renders a file record with,
 * and it must stay equal to the backend's.
 *
 * ⭐ THE FILE ITSELF IS THE RECORD: a `brochure.pdf` placed in `records/uniweb/file/` is a record
 * named `brochure`, of any file type. Its display text and tags are its FOLDER ENTRY's
 * (`records/folder.yml`), as for every record.
 *
 * ⭐ ITS VALUE IS AN ASSET — `{ url, name, mime, size, preview? }`, and, where the file was uploaded
 * to a host, the asset's identity beside the URL (`assetId`, `assetExt`, and the preview's). The
 * same object on every lane, so a component reads `file.url` wherever it renders.
 *
 * One section, the brief, named `brief` — the `fields:` form — and one field.
 */
export default {
  name: 'file',
  label: 'File',
  fields: {
    file: { type: 'file', required: true },
  },
}
