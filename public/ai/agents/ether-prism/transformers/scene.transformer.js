import { prismConfig } from '../lib/config.js';

export const transformScene = async (scene, options = {}) => {
    return {
        ...scene,
        style: options.style || prismConfig.defaultStyle,
        transformedAt: Date.now()
    };
};
