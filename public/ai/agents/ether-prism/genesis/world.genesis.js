import { uid } from '../lib/utils.js';

export const createWorldGenesis = async (name = 'New World') => {
    return {
        id: uid('world'),
        name,
        createdAt: Date.now(),
        scenes: [],
        agents: []
    };
};
