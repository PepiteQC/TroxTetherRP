// server/agents/EtherWeave.js
// 🔗 Connecte gang ↔ économie ↔ territoire
export class EtherWeave {
  constructor() {
    this.name    = "EtherWeave";
    this.version = "2.0.0";
    this.threads = new Map();   // id → connexion active
    this.graph   = new Map();   // node → [edges]
  }

  async process(packet) {
    return {
      agent: this.name,
      mission: packet?.mission,
      success: true,
      confidence: 88,
      data: { threads: this.threads.size, nodes: this.graph.size }
    };
  }

  // Connecter deux systèmes
  async connect(sourceId, targetId, type = "link", strength = 1.0) {
    const threadId = `thread_${sourceId}_${targetId}_${Date.now()}`;
    const thread = {
      id:       threadId,
      source:   sourceId,
      target:   targetId,
      type,
      strength,
      active:   true,
      events:   [],
      createdAt: Date.now()
    };
    this.threads.set(threadId, thread);

    // Mise à jour du graphe
    if (!this.graph.has(sourceId)) this.graph.set(sourceId, []);
    if (!this.graph.has(targetId)) this.graph.set(targetId, []);
    this.graph.get(sourceId).push({ to: targetId, threadId, strength });
    this.graph.get(targetId).push({ to: sourceId, threadId, strength });

    return { ok: true, threadId, connection: `${sourceId} ↔ ${targetId}` };
  }

  // Tisser gang ↔ économie ↔ territoire
  async weaveGangEcoTerritory(gangId, econId, territoryId) {
    const [t1, t2, t3] = await Promise.all([
      this.connect(gangId,      econId,      "gang_economy",    0.8),
      this.connect(econId,      territoryId, "economy_territory", 0.7),
      this.connect(gangId,      territoryId, "gang_territory",  0.9),
    ]);

    return {
      ok:          true,
      gang:        gangId,
      economy:     econId,
      territory:   territoryId,
      connections: [t1, t2, t3],
      woven:       true,
      timestamp:   Date.now()
    };
  }

  // Propager un événement
  async propagate(sourceId, event) {
    const edges   = this.graph.get(sourceId) || [];
    const reached = [];
    for (const edge of edges) {
      const thread = this.threads.get(edge.threadId);
      if (thread?.active) {
        thread.events.push({ event, at: Date.now() });
        reached.push({ target: edge.to, strength: edge.strength });
      }
    }
    return { propagated: reached.length, targets: reached };
  }

  getThread(id)    { return this.threads.get(id); }
  getGraph()       { return Object.fromEntries(this.graph); }
  getStatus()      { return { name: this.name, version: this.version, threads: this.threads.size, nodes: this.graph.size }; }
}

export default EtherWeave;
