/**
 * Scene schema — a Scene Composition Format (SCF) document.
 *
 * A layered visual scene (subjects, texts, accents, shapes, sprays, svgs,
 * separators) composited through CSS blend modes in a shared z-index space.
 * Authored as a tagged data block (```json:scene) and bound by a component via
 * `data: { scene: '@std/scene' }`. The component renders `content.data.scene`
 * with a scene renderer — `@uniweb/scene`'s `<Scene>` or its own engine; the
 * foundation developer stays the broker.
 *
 * The grammar of the layer payload is owned by the SCF spec, NOT by this data
 * schema — it rides as an opaque `json` field carrying the `scene` format
 * marker, which tells the app to mount the Designer (visual canvas) for it.
 * Envelope metadata (name, description, tags) are modeled as ordinary fields so
 * the editor and tooling can surface them; a `.scene.json` export pastes in
 * directly (extra envelope keys like `$schema` are harmless — schemas are hints).
 *
 * Note: the payload field is named `composition` because that is the SCF
 * envelope's layer-container key — what the renderer reads (`data.composition`
 * or a bare composition). The schema/marker name is `scene`; the field name
 * tracks the spec's envelope shape.
 */
export default {
  name: 'scene',
  version: '1.0.0',
  description: 'A Scene Composition Format document — a layered visual scene composited via CSS blend modes',

  fields: {
    name: {
      type: 'string',
      description: 'Human-readable name for the scene',
    },
    description: {
      type: 'string',
      description: 'Brief description of the visual intent',
    },
    tags: {
      type: 'string',
      many: true,
      translatable: false,
      description: 'Freeform tags for categorization',
    },
    composition: {
      type: 'json',
      format: 'scene',
      required: true,
      description:
        'The layered payload (the SCF envelope `composition` object): ' +
        'subjects, texts, accents, shapes, sprays, svgs, and separators in a shared z-index space',
    },
  },
}
