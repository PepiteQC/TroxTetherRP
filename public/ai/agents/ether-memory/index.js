// C:\troxtetherworld\public\ai\agents\ether-memory\index.js
// Agent: ether-memory — Mémorise décisions, patterns et historique

export class EtherMemory {
  constructor(brain) {
    this.brain = brain;
    this.shortTerm = new Map();     // LRU cache
    this.longTerm = new Map();      // Persistant
    this.patterns = new Map();      // Patterns récurrents
    this.associations = new Map();  // Liens entre concepts
    this.maxShortTerm = 1000;
    this.maxPatterns = 500;
  }

  async handle(task) {
    const start = Date.now();
    const { request, planId } = task.payload;

    // Analyser ce qui doit être mémorisé
    const memoryType = this._detectMemoryType(request);
    
    // Sauvegarder dans la mémoire court-terme
    const shortTermId = this._storeShortTerm(request, task.agentId);

    // Extraire les patterns
    const patterns = this._extractPatterns(request);

    // Créer des associations
    const associations = this._createAssociations(request, patterns);

    // Si important, passer en long-terme
    if (patterns.length > 0 || task.priority > 5) {
      await this._storeLongTerm(shortTermId, request, patterns, associations);
    }

    const result = {
      success: true,
      output: {
        memoryId: shortTermId,
        memoryType,
        patternsFound: patterns.length,
        associationsCreated: associations.length,
        shortTermSize: this.shortTerm.size,
        longTermSize: this.longTerm.size,
        recentMemories: this._getRecent(5)
      },
      files: ['memory/short-term.json', 'memory/long-term.json', 'memory/patterns.json'],
      connections: ['ether-core', 'ether-weave'],
      risks: [],
      confidence: 95,
      needsBrainValidation: false,
      needsThirdEyeValidation: false,
      executionMs: Date.now() - start
    };

    return result;
  }

  _detectMemoryType(request) {
    const r = request.toLowerCase();
    if (r.includes('crée') || r.includes('génère') || r.includes('new')) return 'creation';
    if (r.includes('modifie') || r.includes('change') || r.includes('update')) return 'modification';
    if (r.includes('supprime') || r.includes('efface') || r.includes('delete')) return 'deletion';
    if (r.includes('connect') || r.includes('lie') || r.includes('link')) return 'connection';
    if (r.includes('sauve') || r.includes('save') || r.includes('garde')) return 'save';
    return 'observation';
  }

  _storeShortTerm(request, agentId) {
    const id = `mem_st_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    this.shortTerm.set(id, {
      id,
      request,
      agentId,
      timestamp: Date.now(),
      accessCount: 0,
      ttl: 3600000 // 1 heure
    });

    // LRU: supprimer les plus vieux si limite atteinte
    if (this.shortTerm.size > this.maxShortTerm) {
      const oldest = [...this.shortTerm.entries()]
        .sort(([, a], [, b]) => a.accessCount - b.accessCount)[0];
      this.shortTerm.delete(oldest[0]);
    }

    return id;
  }

  _extractPatterns(request) {
    const patterns = [];
    const words = request.toLowerCase().split(/\s+/);

    // Patterns de mots-clés récurrents
    const keywords = ['gang', 'faction', 'argent', 'maison', 'véhicule', 'arme', 'job', 'métier', 'economie', 'territoire'];
    
    for (const keyword of keywords) {
      if (words.includes(keyword)) {
        const existing = this.patterns.get(keyword) || { count: 0, lastSeen: 0, contexts: [] };
        existing.count++;
        existing.lastSeen = Date.now();
        existing.contexts.push(request.slice(0, 100));
        this.patterns.set(keyword, existing);
        patterns.push({ keyword, count: existing.count });
      }
    }

    // Limiter le nombre de patterns
    if (this.patterns.size > this.maxPatterns) {
      const leastUsed = [...this.patterns.entries()]
        .sort(([, a], [, b]) => a.count - b.count)[0];
      this.patterns.delete(leastUsed[0]);
    }

    return patterns;
  }

  _createAssociations(request, patterns) {
    const associations = [];

    for (const pattern of patterns) {
      // Lier les patterns entre eux
      for (const other of patterns) {
        if (pattern.keyword !== other.keyword) {
          const key = `${pattern.keyword}↔${other.keyword}`;
          const existing = this.associations.get(key) || { strength: 0, occurrences: [] };
          existing.strength++;
          existing.occurrences.push(Date.now());
          this.associations.set(key, existing);
          associations.push(key);
        }
      }
    }

    return associations;
  }

  async _storeLongTerm(id, request, patterns, associations) {
    const entry = {
      id,
      request,
      patterns,
      associations,
      timestamp: Date.now(),
      importance: patterns.length + associations.length
    };

    this.longTerm.set(id, entry);
  }

  recall(query, limit = 10) {
    const results = [];
    const queryLower = query.toLowerCase();

    // Chercher dans la mémoire court-terme
    for (const [id, mem] of this.shortTerm) {
      if (mem.request.toLowerCase().includes(queryLower)) {
        mem.accessCount++;
        results.push({ ...mem, source: 'short-term' });
      }
    }

    // Chercher dans la mémoire long-terme
    for (const [id, mem] of this.longTerm) {
      if (mem.request.toLowerCase().includes(queryLower)) {
        results.push({ ...mem, source: 'long-term' });
      }
    }

    // Chercher dans les patterns
    for (const [keyword, pattern] of this.patterns) {
      if (keyword.includes(queryLower)) {
        results.push({ keyword, ...pattern, source: 'patterns' });
      }
    }

    return results.slice(0, limit);
  }

  forget(pattern) {
    // Oublier un pattern spécifique
    this.patterns.delete(pattern);
    
    // Nettoyer les associations liées
    for (const [key, assoc] of this.associations) {
      if (key.includes(pattern)) {
        this.associations.delete(key);
      }
    }
  }

  _getRecent(limit) {
    return [...this.shortTerm.values()]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(m => ({ id: m.id, request: m.request.slice(0, 50), timestamp: m.timestamp }));
  }

  getStats() {
    return {
      shortTerm: this.shortTerm.size,
      longTerm: this.longTerm.size,
      patterns: this.patterns.size,
      associations: this.associations.size
    };
  }
}