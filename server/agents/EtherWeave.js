// server/agents/EtherWeave.js
// 🔗 Moteur de Graphe Dynamique & Propagation d'Événements - Version 3.0
import crypto from "node:crypto";

export class EtherWeave {
  constructor(config = {}) {
    this.name = "EtherWeave";
    this.version = "3.0.0";

    this.config = {
      maxConnectionsPerNode: config.maxConnectionsPerNode || 50, // Protection DOS
      enableMetrics: config.enableMetrics !== false,
      logLevel: config.logLevel || 'warn',
      propagationDepth: config.propagationDepth || 5, // Profondeur max cascade
      ...config
    };

    // Structures de données optimisées
    this.threads = new Map();   // threadId -> ThreadObject
    this.graph = new Map();     // nodeId -> Set<Edge> (Set pour unicité et vitesse)
    this.nodeMetadata = new Map(); // nodeId -> { type, data, createdAt }

    this.metrics = {
      connectionsCreated: 0,
      eventsPropagated: 0,
      cascadesTriggered: 0,
      errors: 0
    };

    this._log('info', `[${this.name}] Initialisé v${this.version}`);
  }

  async process(packet) {
    return {
      agent: this.name,
      version: this.version,
      mission: packet?.mission,
      success: true,
      confidence: 94,
      data: { 
        threads: this.threads.size, 
        nodes: this.graph.size,
        metrics: this.config.enableMetrics ? this.getMetrics() : undefined
      }
    };
  }

  // 🔗 Connecter deux systèmes (avec validation)
  async connect(sourceId, targetId, type = "link", strength = 1.0, metadata = {}) {
    try {
      if (sourceId === targetId) throw new Error("Auto-connexion interdite");
      
      // Vérification limite de connexions
      const sourceEdges = this.graph.get(sourceId);
      if (sourceEdges && sourceEdges.size >= this.config.maxConnectionsPerNode) {
        throw new Error(`Limite de connexions atteinte pour ${sourceId}`);
      }

      const threadId = crypto.randomUUID();
      const now = Date.now();

      const thread = {
        id: threadId,
        source: sourceId,
        target: targetId,
        type,
        strength: Math.min(1, Math.max(0, strength)), // Clamp 0-1
        active: true,
        metadata,
        eventCount: 0,
        createdAt: now,
        lastActivity: now
      };

      this.threads.set(threadId, thread);

      // Mise à jour du graphe (Bidirectionnel par défaut)
      this.#addEdge(sourceId, targetId, threadId, strength);
      this.#addEdge(targetId, sourceId, threadId, strength);

      // Enregistrement des métadonnées si nouveaux nœuds
      if (!this.nodeMetadata.has(sourceId)) {
        this.nodeMetadata.set(sourceId, { id: sourceId, type: 'unknown', createdAt: now });
      }
      if (!this.nodeMetadata.has(targetId)) {
        this.nodeMetadata.set(targetId, { id: targetId, type: 'unknown', createdAt: now });
      }

      this._incrementMetric('connectionsCreated');
      this._log('debug', `Connexion: ${sourceId} ↔ ${targetId} (${type})`);

      return { ok: true, threadId, connection: `${sourceId} ↔ ${targetId}` };
    } catch (error) {
      this._incrementMetric('errors');
      return { ok: false, error: error.message };
    }
  }

  // 🕸 Tisser un triangle Gang ↔ Économie ↔ Territoire (Atomique)
  async weaveGangEcoTerritory(gangId, econId, territoryId) {
    try {
      // Création parallèle des 3 liens
      const results = await Promise.all([
        this.connect(gangId, econId, "gang_economy", 0.8),
        this.connect(econId, territoryId, "economy_territory", 0.7),
        this.connect(gangId, territoryId, "gang_territory", 0.9)
      ]);

      // Vérification qu'aucun n'a échoué
      if (results.some(r => !r.ok)) {
        throw new Error("Échec partiel du tissage");
      }

      return {
        ok: true,
        gang: gangId,
        economy: econId,
        territory: territoryId,
        threads: results.map(r => r.threadId),
        timestamp: Date.now()
      };
    } catch (error) {
      this._incrementMetric('errors');
      return { ok: false, error: error.message };
    }
  }

  // 🌊 Propager un événement (Cascade / Effet Domino)
  async propagate(sourceId, event, options = {}) {
    const startTime = Date.now();
    const visited = new Set();
    const queue = [{ nodeId: sourceId, depth: 0, strength: 1.0 }];
    const reached = [];
    const maxDepth = options.depth || this.config.propagationDepth;

    visited.add(sourceId);

    while (queue.length > 0) {
      const current = queue.shift();
      
      if (current.depth >= maxDepth) continue;

      const edges = this.graph.get(current.nodeId);
      if (!edges) continue;

      for (const edge of edges) {
        const thread = this.threads.get(edge.threadId);
        
        // Ignorer si inactif ou déjà visité
        if (!thread || !thread.active || visited.has(edge.to)) continue;

        // Calcul de l'affaiblissement du signal
        const newStrength = current.strength * edge.strength * thread.strength;
        
        // Seuil minimum pour arrêter la propagation (bruit de fond)
        if (newStrength < 0.1) continue;

        visited.add(edge.to);
        
        // Enregistrer l'événement sur le thread
        thread.eventCount++;
        thread.lastActivity = Date.now();
        // Optionnel: stocker l'historique si nécessaire, mais lourd en mémoire
        // thread.events.push({ event, at: Date.now() }); 

        reached.push({ 
          target: edge.to, 
          strength: newStrength, 
          depth: current.depth + 1,
          viaThread: thread.id
        });

        // Ajouter à la queue pour propagation suivante
        queue.push({ nodeId: edge.to, depth: current.depth + 1, strength: newStrength });
      }
    }

    this._incrementMetric('eventsPropagated');
    if (reached.length > 1) this._incrementMetric('cascadesTriggered');

    return { 
      source: sourceId, 
      propagatedCount: reached.length, 
      targets: reached,
      duration: Date.now() - startTime
    };
  }

  // ❌ Déconnecter proprement
  async disconnect(threadId) {
    const thread = this.threads.get(threadId);
    if (!thread) return { ok: false, error: "Thread introuvable" };

    thread.active = false;
    
    // Nettoyage du graphe (suppression des arêtes)
    this.#removeEdge(thread.source, thread.target, threadId);
    this.#removeEdge(thread.target, thread.source, threadId);

    // Suppression du thread après délai (ou immédiat)
    this.threads.delete(threadId);

    return { ok: true, disconnected: threadId };
  }

  // 📊 Analyse du Graphe (Centralité & Clusters)
  analyzeNode(nodeId) {
    const edges = this.graph.get(nodeId);
    if (!edges) return null;

    const connections = Array.from(edges);
    const degree = connections.length;
    
    // Calcul de la force moyenne des connexions
    const avgStrength = connections.reduce((sum, e) => sum + e.strength, 0) / degree;

    return {
      nodeId,
      degree, // Nombre de connexions
      avgStrength,
      isConnected: degree > 0,
      neighbors: connections.map(e => e.to)
    };
  }

  findCriticalNodes() {
    // Trouve les nœuds avec le plus de connexions (Hubs)
    const nodes = Array.from(this.graph.entries());
    return nodes
      .map(([id, edges]) => ({ id, connections: edges.size }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 10); // Top 10
  }

  // --- Méthodes Privées ---

  #addEdge(from, to, threadId, strength) {
    if (!this.graph.has(from)) {
      this.graph.set(from, new Set());
    }
    // On stocke l'objet edge dans le Set
    this.graph.get(from).add({ to, threadId, strength });
  }

  #removeEdge(from, to, threadId) {
    const edges = this.graph.get(from);
    if (edges) {
      // Conversion en array pour filtrer, puis recréation du Set (coût acceptable pour disconnect rare)
      const newEdges = new Set();
      for (const edge of edges) {
        if (edge.threadId !== threadId) {
          newEdges.add(edge);
        }
      }
      
      if (newEdges.size === 0) {
        this.graph.delete(from);
      } else {
        this.graph.set(from, newEdges);
      }
    }
  }

  _incrementMetric(metric, amount = 1) {
    if (this.config.enableMetrics && this.metrics[metric] !== undefined) {
      this.metrics[metric] += amount;
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

  getMetrics() {
    return { ...this.metrics, timestamp: Date.now() };
  }

  getThread(id) { return this.threads.get(id); }
  
  getGraphSummary() {
    // Retourne une version sérialisable du graphe (sans les Sets)
    const summary = {};
    for (const [node, edges] of this.graph) {
      summary[node] = {
        connections: edges.size,
        neighbors: Array.from(edges).map(e => e.to)
      };
    }
    return summary;
  }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      threads: this.threads.size,
      nodes: this.graph.size,
      metrics: this.config.enableMetrics ? this.getMetrics() : undefined
    };
  }
}

export default EtherWeave;