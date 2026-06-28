export const EvolutionHistory = [];

export const storeEvolution = (entity) => {
    EvolutionHistory.push({
        entity,
        timestamp: Date.now()
    });
};
