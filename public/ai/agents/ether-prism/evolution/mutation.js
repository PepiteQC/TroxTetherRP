export const applyEvolutionStep = async (entity, worldContext = {}) => {
    return {
        ...entity,
        evolved: true,
        evolutionTimestamp: Date.now()
    };
};
