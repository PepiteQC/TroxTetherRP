export const buildContext = (scene, agent) => {
    return {
        scene,
        agent,
        timestamp: Date.now()
    };
};
