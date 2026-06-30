// server/agents/EtherMemory.js
// 💾 Mémoire Cognitive Hybride : Épisodique, Sémantique, Procédurale - Version 3.0
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export class EtherMemory {
  constructor(config = {}) {
    this.name = "EtherMemory";
    this.version = "3.0.0";

    // Configuration
    this.config = {
      maxEpisodic: config.maxEpisodic || 1000,
      persistence: config.persistence || false,
      storagePath: config.storagePath || './data/memory',
      decayRate: config.decayRate || 0.01, // Taux d'oubli par jour
      minImportanceToKeep: config.minImportanceToKeep || 0.1,
      enableMetrics: config.enableMetrics !== false,
      logLevel: config.logLevel || 'warn',
      ...config
    };

    // 1. Mémoire Épisodique (Événements chronologiques)
    this.episodic = []; 
    this.episodicIndex = new Map(); // id -> index dans le tableau (pour accès rapide)
    
    // 2. Mémoire Sémantique (Faits & Connaissances)
    this.semantic = new Map(); 
    
    // 3. Mémoire Procédurale (Patterns & Compétences)
    this.procedural = new Map();
    this.proceduralIndex = new Map(); // action -> [patternIds]

    // Index Inversé pour Recherche Rapide (Mots-clés -> IDs épisodiques)
    this.invertedIndex = new Map(); 

    this.metrics = {
      recorded: 0,
      recalled: 0,
      forgotten: 0,
      consolidated: 0,
      errors: 0
    };

    // Initialisation Persistance
    if (this.config.persistence) {
      this._initPersistence();
    }

    this._log('info', `[${this.name}] Initialisé v${this.version}`);
  }

  async process(packet) {
    return {
      agent: this.name,
      version: this.version,
      mission: packet?.mission,
      success: true,
      confidence: 95,
      data: {
        episodic: this.episodic.length,
        semantic: this.semantic.size,
        procedural: this.procedural.size,
        metrics: this.config.enableMetrics ? this.getMetrics() : undefined
      }
    };
  }

  // 🧠 Enregistrer un épisode (avec indexation)
  record(type, source, content, importance = 0.5, metadata = {}) {
    try {
      const id = crypto.randomUUID();
      const now = Date.now();
      
      const ep = {
        id,
        type,
        source,
        content,
        importance,
        emotion: this.#detectEmotion(content),
        timestamp: now,
        consolidated: false,
        metadata
      };

      // Ajout en tête (plus récent)
      this.episodic.unshift(ep);
      
      // Mise à jour Index Inversé pour recherche rapide
      this.#updateInvertedIndex(id, content, type, source);

      // Gestion Limite & Oubli (Decay)
      if (this.episodic.length > this.config.maxEpisodic) {
        this.#pruneOldMemories();
      }

      // Consolidation Automatique si important
      if (importance >= 0.8) {
        this.consolidate(id);
      }

      this._incrementMetric('recorded');
      return id;
    } catch (error) {
      this._incrementMetric('errors');
      this._log('error', `Erreur enregistrement: ${error.message}`);
      return null;
    }
  }

  // 📚 Stocker un fait sémantique (Apprentissage)
  learn(key, value, confidence = 1.0, category = "general") {
    const existing = this.semantic.get(key);
    const now = Date.now();
    
    // Si existe déjà, on moyenne la confiance ou on met à jour si nouvelle est meilleure
    if (existing) {
      existing.value = value;
      existing.confidence = Math.max(existing.confidence, confidence);
      existing.updatedAt = now;
      existing.accessCount++;
    } else {
      this.semantic.set(key, { 
        value, 
        confidence, 
        category,
        createdAt: now, 
        updatedAt: now,
        accessCount: 0 
      });
    }
    
    return key;
  }

  // 🔍 Récupérer un fait (avec tracking)
  recall(key) {
    const fact = this.semantic.get(key);
    if (fact) { 
      fact.accessCount++; 
      fact.lastAccessed = Date.now();
      this._incrementMetric('recalled');
      return { found: true, value: fact.value, confidence: fact.confidence }; 
    }
    return { found: false, value: null };
  }

  // 🔄 Consolider un épisode en fait sémantique
  consolidate(episodeId) {
    const episode = this.episodic.find(e => e.id === episodeId);
    if (!episode || episode.consolidated) return false;

    // Création d'une clé sémantique unique basée sur le type et le contenu
    const key = `semantic_${episode.type}_${crypto.createHash('md5').update(String(episode.content)).digest('hex').slice(0, 8)}`;
    
    this.learn(key, episode.content, episode.importance, episode.type);
    episode.consolidated = true;
    
    this._incrementMetric('consolidated');
    this._log('debug', `Consolidation: ${episodeId} -> ${key}`);
    return true;
  }

  // 🛠️ Enregistrer un pattern procédural (Compétence)
  learnPattern(action, conditions, outcome, successRate = 1.0) {
    const patternId = crypto.randomUUID();
    
    const pattern = {
      id: patternId,
      action, 
      conditions, 
      outcome,
      successRate, 
      uses: 0, 
      lastUsed: null,
      createdAt: Date.now()
    };

    this.procedural.set(patternId, pattern);

    // Indexation par action pour recherche rapide
    if (!this.proceduralIndex.has(action)) {
      this.proceduralIndex.set(action, []);
    }
    this.proceduralIndex.get(action).push(patternId);

    return patternId;
  }

  // 🎯 Utiliser un pattern (Renforcement)
  usePattern(patternId, success = true) {
    const pattern = this.procedural.get(patternId);
    if (!pattern) return null;

    pattern.uses++;
    pattern.lastUsed = Date.now();
    
    // Ajustement du taux de succès (Moving Average simple)
    const currentRate = pattern.successRate;
    const newSample = success ? 1 : 0;
    // Formule: Nouveau = Ancien * 0.9 + Sample * 0.1 (Lissage)
    pattern.successRate = (currentRate * 0.9) + (newSample * 0.1);

    return pattern.successRate;
  }

  // 🔎 Recherche Épisodique Ultra-Rapide (via Index Inversé)
  search(query, limit = 10, filters = {}) {
    const terms = query.toLowerCase().split(/\s+/);
    const candidateIds = new Set();

    // Intersection des sets de l'index inversé
    let firstTerm = true;
    for (const term of terms) {
      if (term.length < 2) continue; // Ignorer mots trop courts
      
      const idsForTerm = this.invertedIndex.get(term) || new Set();
      
      if (firstTerm) {
        idsForTerm.forEach(id => candidateIds.add(id));
        firstTerm = false;
      } else {
        // Garder seulement les IDs présents dans les deux sets
        for (const id of candidateIds) {
          if (!idsForTerm.has(id)) candidateIds.delete(id);
        }
      }
    }

    // Conversion en tableau et filtrage supplémentaire
    let results = Array.from(candidateIds)
      .map(id => this.episodic.find(e => e.id === id))
      .filter(e => e !== undefined);

    // Filtres additionnels (date, type, etc.)
    if (filters.type) {
      results = results.filter(e => e.type === filters.type);
    }
    if (filters.from) {
      results = results.filter(e => e.timestamp >= filters.from);
    }
    if (filters.minImportance) {
      results = results.filter(e => e.importance >= filters.minImportance);
    }

    // Tri par pertinence (ici on garde l'ordre chronologique inverse par défaut)
    return results.slice(0, limit);
  }

  // 📅 Récents
  recent(limit = 20) { 
    return this.episodic.slice(0, limit); 
  }

  // 🧩 Patterns similaires (Recherche optimisée par index)
  findPatterns(action, limit = 3) {
    const ids = this.proceduralIndex.get(action) || [];
    const patterns = ids
      .map(id => this.procedural.get(id))
      .filter(p => p !== undefined)
      .sort((a, b) => b.successRate - a.successRate);
    
    return patterns.slice(0, limit);
  }

  // 🧹 Nettoyage & Oubli (Decay)
  #pruneOldMemories() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Supprimer les épisodes anciens et peu importants
    let removedCount = 0;
    this.episodic = this.episodic.filter(ep => {
      const ageDays = (now - ep.timestamp) / oneDay;
      // Seuil dynamique: plus c'est vieux, plus l'importance doit être haute pour rester
      const threshold = this.config.minImportanceToKeep + (ageDays * this.config.decayRate);
      
      if (ep.importance < threshold && !ep.consolidated) {
        // Nettoyer index inversé
        this.#removeFromInvertedIndex(ep.id);
        removedCount++;
        return false;
      }
      return true;
    });

    // Hard limit si toujours trop plein
    if (this.episodic.length > this.config.maxEpisodic) {
      const toRemove = this.episodic.splice(this.config.maxEpisodic);
      toRemove.forEach(ep => this.#removeFromInvertedIndex(ep.id));
      removedCount += toRemove.length;
    }

    if (removedCount > 0) {
      this._incrementMetric('forgotten');
      this._log('debug', `Oubli: ${removedCount} souvenirs supprimés`);
    }
  }

  // --- Indexation Inversée Privée ---

  #updateInvertedIndex(id, content, type, source) {
    const tokens = new Set();
    
    // Tokenizer simple
    const extractTokens = (text) => {
      if (typeof text !== 'string') return [];
      return text.toLowerCase().match(/\b[a-z0-9]{2,}\b/g) || [];
    };

    extractTokens(String(content)).forEach(t => tokens.add(t));
    extractTokens(String(type)).forEach(t => tokens.add(t));
    extractTokens(String(source)).forEach(t => tokens.add(t));

    for (const token of tokens) {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token).add(id);
    }
  }

  #removeFromInvertedIndex(id) {
    for (const [token, ids] of this.invertedIndex) {
      ids.delete(id);
      if (ids.size === 0) {
        this.invertedIndex.delete(token);
      }
    }
  }

  // --- Utilitaires ---

  #detectEmotion(content) {
    const c = (typeof content === "string" ? content : JSON.stringify(content)).toLowerCase();
    if (c.includes("error") || c.includes("fail") || c.includes("crash") || c.includes("mort")) return "negative";
    if (c.includes("success") || c.includes("ok") || c.includes("créé") || c.includes("gagné"))  return "positive";
    return "neutral";
  }

  _incrementMetric(metric) {
    if (this.config.enableMetrics && this.metrics[metric] !== undefined) {
      this.metrics[metric]++;
    }
  }

  _log(level, message) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = levels[this.config.logLevel] ?? 1;
    const messageLevel = levels[level] ?? 2;
    
    if (messageLevel <= currentLevel) {
      console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] [${this.name}] ${message}`);
    }
  }

  // --- Persistance ---

  async _initPersistence() {
    try {
      await fs.mkdir(this.config.storagePath, { recursive: true });
      await this.load();
    } catch (e) {
      this._log('error', `Erreur init persistance: ${e.message}`);
    }
  }

  async save() {
    if (!this.config.persistence) return;
    try {
      const data = {
        episodic: this.episodic,
        semantic: Array.from(this.semantic.entries()),
        procedural: Array.from(this.procedural.entries()),
        savedAt: Date.now()
      };
      await fs.writeFile(
        path.join(this.config.storagePath, 'memory.json'), 
        JSON.stringify(data), 
        'utf8'
      );
    } catch (e) {
      this._log('error', `Erreur sauvegarde: ${e.message}`);
    }
  }

  async load() {
    try {
      const filePath = path.join(this.config.storagePath, 'memory.json');
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);

      this.episodic = data.episodic || [];
      this.semantic = new Map(data.semantic || []);
      this.procedural = new Map(data.procedural || []);
      
      // Reconstruire les indexes
      this.invertedIndex.clear();
      this.proceduralIndex.clear();
      
      this.episodic.forEach(ep => this.#updateInvertedIndex(ep.id, ep.content, ep.type, ep.source));
      
      for (const [id, pattern] of this.procedural) {
        if (!this.proceduralIndex.has(pattern.action)) {
          this.proceduralIndex.set(pattern.action, []);
        }
        this.proceduralIndex.get(pattern.action).push(id);
      }

      this._log('info', `Mémoire chargée: ${this.episodic.length} épisodes, ${this.semantic.size} faits`);
    } catch (e) {
      // Fichier n'existe pas ou corrompu, on commence à zéro
    }
  }

  getStats() {
    return {
      episodic:    { total: this.episodic.length, positive: this.episodic.filter(e => e.emotion === "positive").length, negative: this.episodic.filter(e => e.emotion === "negative").length },
      semantic:    { total: this.semantic.size },
      procedural:  { total: this.procedural.size },
      indexSize:   this.invertedIndex.size
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now(),
      timestamp: Date.now()
    };
  }

  getStatus() { 
    return { 
      name: this.name, 
      version: this.version, 
      ...this.getStats(),
      metrics: this.config.enableMetrics ? this.getMetrics() : undefined
    }; 
  }
}

export default EtherMemory;