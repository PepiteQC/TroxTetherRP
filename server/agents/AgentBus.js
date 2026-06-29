// server/agents/AgentBus.js
// Bus de communication entre les 16 agents
export class AgentBus {
  constructor() {
    this.agents   = new Map();
    this.queue    = [];
    this.history  = [];
  }

  register(name, agent) {
    this.agents.set(name, agent);
    console.log(`[AgentBus] ✅ Agent enregistré: ${name} v${agent.version || "?"}`);
  }

  async broadcast(packet) {
    const results = [];
    for (const [name, agent] of this.agents) {
      try {
        if (typeof agent.process === "function") {
          const result = await agent.process(packet);
          results.push({ agent: name, result });
        }
      } catch (err) {
        console.error(`[AgentBus] ❌ Erreur agent ${name}:`, err.message);
        results.push({ agent: name, error: err.message });
      }
    }
    this.history.push({ packet, results, at: Date.now() });
    if (this.history.length > 100) this.history.shift();
    return results;
  }

  async send(agentName, packet) {
    const agent = this.agents.get(agentName);
    if (!agent) throw new Error(`Agent "${agentName}" non trouvé`);
    return await agent.process(packet);
  }

  getAgent(name)  { return this.agents.get(name); }
  getAgents()     { return Array.from(this.agents.keys()); }
  getStatus()     { return { registered: this.agents.size, agents: this.getAgents() }; }
}

export const agentBus = new AgentBus();
export default AgentBus;
