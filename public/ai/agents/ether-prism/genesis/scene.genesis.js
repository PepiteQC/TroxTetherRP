import { uid } from '../lib/utils.js';

export const createSceneGenesis = async (prompt, options = {}) => {
    return {
        id: uid('scene'),
        name: options.name || 'Untitled Scene',
        biome: options.biome || 'default',
        mood: options.mood || 'neutral',
        props: [],
        npcs: [],
        metadata: { prompt }
    };
};
