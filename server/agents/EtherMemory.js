// server/agents/EtherMemory.js
// 💾 Mémorise les patterns de gang — 3 types de mémoire neurale
export class EtherMemory {
  constructor() {
    this.name      = "EtherMemory";
    this.version   = "2.0.0";
    // Mémoire épisodique — événements datés
    this.episodic  = [];
    // Mémoire sémantique — faits permanents
    this.semantic  = new Map();
    // Mémoire procédurale — patterns d'actions
    this.procedural = new Map();
    this.maxEpisodic = 500;
  }

  async process(packet) {
    return {
      agent: this.name,
      mission: packet?.mission,
      success: true,
      confidence: 91,
      data: {
        episodic:   this.episodic.length,
        semantic:   this.semantic.size,
        procedural: this.procedural.size
      }
    };
  }

  // Enregistrer un épisode
  record(type, source, content, importance = 0.5) {
    const ep = {
      id:         `ep_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      type,
      source,
      content,
      importance,
      emotion:    this.#detectEmotion(content),
      at:         Date.now(),
      consolidated: false
    };
    this.episodic.unshift(ep);
    if (this.episodic.length > this.maxEpisodic) this.episodic.pop();

    // Auto-consolider si important
    if (importance >= 0.8) this.#consolidate(ep);
    return ep.id;
  }

  // Stocker un fait sémantique
  learn(key, value, confidence = 1.0) {
    this.semantic.set(key, { value, confidence, learnedAt: Date.now(), accessCount: 0 });
    return key;
  }

  // Récupérer un fait
  recall(key) {
    const fact = this.semantic.get(key);
    if (fact) { fact.accessCount++; return fact.value; }
    return null;
  }

  // Enregistrer un pattern procédural
  learnPattern(action, conditions, outcome, successRate = 1.0) {
    const patternId = `pattern_${action}_${Date.now()}`;
    this.procedural.set(patternId, {
      action, conditions, outcome,
      successRate, uses: 0, lastUsed: null
    });
    return patternId;
  }

  // Recherche dans la mémoire épisodique
  search(query, limit = 10) {
    const q = query.toLowerCase();
    return this.episodic
      .filter(e =>
        (typeof e.content === "string" && e.content.toLowerCase().includes(q)) ||
        e.type.includes(q) || e.source?.includes(q)
      )
      .slice(0, limit);
  }

  // Récents
  recent(limit = 20) { return this.episodic.slice(0, limit); }

  // Patterns similaires
  findPatterns(action, limit = 3) {
    return Array.from(this.procedural.values())
      .filter(p => p.action === action)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);
  }

  #detectEmotion(content) {
    const c = (typeof content === "string" ? content : JSON.stringify(content)).toLowerCase();
    if (c.includes("error") || c.includes("fail") || c.includes("crash")) return "negative";
    if (c.includes("success") || c.includes("ok") || c.includes("créé"))  return "positive";
    return "neutral";
  }

  #consolidate(episode) {
    const key = `consolidated_${episode.type}_${Date.now()}`;
    this.learn(key, episode.content, episode.importance);
    episode.consolidated = true;
  }

  getStats() {
    return {
      episodic:    { total: this.episodic.length, positive: this.episodic.filter(e => e.emotion === "positive").length, negative: this.episodic.filter(e => e.emotion === "negative").length },
      semantic:    { total: this.semantic.size },
      procedural:  { total: this.procedural.size }
    };
  }

  getStatus() { return { name: this.name, version: this.version, ...this.getStats() }; }
}

export default EtherMemory;
