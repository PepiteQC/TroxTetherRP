export const adapt = (entity, environment) => {
    return {
        ...entity,
        adaptedTo: environment
    };
};
