import { uid } from '../lib/utils.js';

export const createAgentGenesis = async (profile, worldContext = {}) => {
    return {
        id: uid('agent'),
        name: profile.name || 'Unnamed Agent',
        role: profile.role || 'generic',
        traits: profile.traits || [],
        memory: [],
        worldContext
    };
};
