// transformers/scene.transformer.js
import { prismConfig } from '../lib/config.js';

export const transformScene = async (scene, options = {}) => {
  // Exemple : clamp complexité, appliquer style, etc.
  const transformed = {
    ...scene,
    style: options.style || prismConfig.defaultStyle
  };

  return transformed;
};
