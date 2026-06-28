export const runReasoningCycle = async (input, context = {}) => {
    return {
        input,
        context,
        decision: 'noop',
        thoughts: ['Reasoning cycle placeholder']
    };
};
