// schemas/scene.schema.js
export const SceneSchema = {
  id: 'string',
  name: 'string',
  mood: 'string',
  biome: 'string',
  props: 'array',
  npcs: 'array',
  lighting: 'object',
  metadata: 'object'
};
