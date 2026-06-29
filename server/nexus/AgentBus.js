// ══════════════════════════════════════════════════════════════════════════════
// AgentBus — Dispatcher de TROXT TASK PACKETS
// Routes les missions aux bons agents, agrège les résultats
// ══════════════════════════════════════════════════════════════════════════════
import { EtherForge } from './agents/EtherForge.js';
import { EtherLens } from './agents/EtherLens.js';
import { EtherPrism } from './agents/EtherPrism.js';
import { EtherWeave } from './agents/EtherWeave.js';
import { ForgeFactory } from './agents/ForgeFactory.js';
import { EtherGuard } from './agents/EtherGuard.js';
import { EtherUI } from './agents/EtherUI.js';
import { EtherSim } from './agents/EtherSim.js';
export class AgentBus {
    agents = new Map();
    queue = [];
    results = new Map();
    processing = false;
    forge;
    lens;
    prism;
    weave;
    factory;
    guard;
    ui;
    sim;
    constructor() {
        this.forge = new EtherForge();
        this.lens = new EtherLens();
        this.prism = new EtherPrism();
        this.weave = new EtherWeave();
        this.factory = new ForgeFactory();
        this.guard = new EtherGuard();
        this.ui = new EtherUI();
        this.sim = new EtherSim();
        this.agents.set('EtherForge', this.forge);
        this.agents.set('EtherLens', this.lens);
        this.agents.set('EtherPrism', this.prism);
        this.agents.set('EtherWeave', this.weave);
        this.agents.set('ForgeFactory', this.factory);
        this.agents.set('EtherGuard', this.guard);
        this.agents.set('EtherUI', this.ui);
        this.agents.set('EtherSim', this.sim);
    }
    async dispatch(packet) {
        const agent = this.agents.get(packet.targetAgent);
        if (!agent) {
            return {
                taskId: packet.id,
                agent: packet.targetAgent,
                status: 'failure',
                output: { error: `Agent "${packet.targetAgent}" non trouvé dans le bus` },
                confidence: 0,
                warnings: [`Agent inconnu: ${packet.targetAgent}`],
                completedAt: Date.now(),
                durationMs: 0,
            };
        }
        const result = await agent.process(packet);
        this.results.set(packet.id, result);
        return result;
    }
    async dispatchAll(packets) {
        return Promise.all(packets.map(p => this.dispatch(p)));
    }
    async dispatchSequential(packets) {
        const results = [];
        for (const packet of packets) {
            const result = await this.dispatch(packet);
            results.push(result);
            if (result.status === 'failure')
                break;
        }
        return results;
    }
    getResult(taskId) {
        return this.results.get(taskId);
    }
    getAllTelemetry() {
        const telem = {};
        for (const [name, agent] of this.agents.entries()) {
            telem[name] = agent.getTelemetry();
        }
        return telem;
    }
    getAllStats() {
        const stats = {};
        for (const [name, agent] of this.agents.entries()) {
            stats[name] = agent.getStats();
        }
        return stats;
    }
    getAgentNames() {
        return [...this.agents.keys()];
    }
    activateNamingValidation(validatedBy) {
        this.factory.validateNamingRules(validatedBy);
    }
}
