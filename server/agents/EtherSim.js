// server/agents/EtherSim.js
// 🧪 Simulateur de Charge Avancé & Analyse de Performance - Version 3.0
import crypto from "node:crypto";

export class EtherSim {
  constructor(config = {}) {
    this.name = "EtherSim";
    this.version = "3.0.0";
    
    this.config = {
      maxPlayers: config.maxPlayers || 200,
      tickRate: config.tickRate || 500, // ms
      enableMetrics: config.enableMetrics !== false,
      logLevel: config.logLevel || 'info',
      ...config
    };

    this.running = false;
    this.sessions = new Map();
    this.results = [];
    
    this.metrics = {
      simulationsRun: 0,
      totalEventsGenerated: 0,
      errors: 0
    };
  }

  async process(packet) {
    return {
      agent: this.name,
      version: this.version,
      mission: packet?.mission,
      success: true,
      confidence: 92,
      data: { sessions: this.sessions.size, results: this.results.length }
    };
  }

  // 🚀 Lancer une simulation complète
  async simulate(playerCount = 50, scenarioType = "gang_war", durationMs = 5000) {
    if (this.running) throw new Error("Simulation déjà en cours");
    
    playerCount = Math.min(this.config.maxPlayers, playerCount);
    const sessionId = crypto.randomUUID();
    
    this.running = true;
    const startTime = Date.now();
    
    // 1. Génération des joueurs (Pool statique pour performance)
    const players = this.#generatePlayerPool(playerCount);
    
    // 2. Boucle de simulation
    const events = [];
    const ticks = Math.floor(durationMs / this.config.tickRate);
    
    for (let i = 0; i < ticks; i++) {
      const tickEvents = this.#simulateTick(players, scenarioType, i * this.config.tickRate);
      events.push(...tickEvents);
      
      // Pause légère pour ne pas bloquer le thread principal si durée longue
      if (i % 10 === 0) await new Promise(r => setTimeout(r, 0));
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 3. Analyse Statistique des Résultats
    const analysis = this.#analyzeResults(events, playerCount, duration);
    
    const result = {
      sessionId,
      scenarioType,
      playerCount,
      durationReal: duration,
      durationSimulated: durationMs,
      summary: analysis,
      timestamp: Date.now()
    };

    this.sessions.set(sessionId, result);
    this.results.push(result);
    if (this.results.length > 50) this.results.shift();
    
    this.running = false;
    this._incrementMetric('simulationsRun');
    this._incrementMetric('totalEventsGenerated', events.length);
    
    this._log('info', `Simulation terminée: ${playerCount} joueurs, ${events.length} événements en ${duration}ms`);
    
    return result;
  }

  // --- Moteur de Simulation ---

  #generatePlayerPool(count) {
    const gangs = ["Bloods", "Crips", "Mafia", "Yakuza", "Cartel"];
    return Array.from({ length: count }, (_, i) => ({
      id: `sim_p_${i}`,
      level: Math.floor(Math.random() * 50) + 1,
      gang: gangs[Math.floor(Math.random() * gangs.length)],
      money: Math.floor(Math.random() * 10000),
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 2000,
      state: 'idle' // idle, combat, trading
    }));
  }

  #simulateTick(players, scenario, time) {
    const events = [];
    // Chaque tick, ~10% des joueurs agissent
    const activeCount = Math.floor(players.length * 0.1);
    
    for (let i = 0; i < activeCount; i++) {
      const p = players[Math.floor(Math.random() * players.length)];
      const roll = Math.random();
      
      if (scenario === "gang_war") {
        if (roll < 0.7) {
          events.push({ type: "combat", actor: p.id, gang: p.gang, damage: Math.floor(Math.random() * 50), time });
        } else {
          events.push({ type: "movement", actor: p.id, x: p.x + (Math.random()-0.5)*10, y: p.y + (Math.random()-0.5)*10, time });
        }
      } else if (scenario === "economy") {
        if (roll < 0.8) {
          events.push({ type: "transaction", actor: p.id, amount: Math.floor(Math.random() * 200), time });
        }
      } else {
        events.push({ type: "interaction", actor: p.id, action: "talk", time });
      }

      // Injection d'erreurs aléatoires pour tester la résilience
      if (Math.random() < 0.005) events.push({ type: "error", actor: p.id, reason: "timeout", time });
    }
    
    return events;
  }

  // --- Analyse Statistique ---

  #analyzeResults(events, playerCount, duration) {
    const totalEvents = events.length;
    const eps = totalEvents / (duration / 1000); // Events per second
    
    // Comptages par type
    const counts = events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {});

    // Calcul économique total
    const totalMoneyMoved = events
      .filter(e => e.type === "transaction")
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Score de stabilité
    const errorRate = (counts['error'] || 0) / totalEvents;
    let stabilityScore = 100 - (errorRate * 1000); // Pénalité lourde pour les erreurs
    if (eps < 100) stabilityScore -= 20; // Performance faible

    return {
      performance: {
        eventsPerSecond: Math.round(eps),
        totalEvents,
        durationMs: duration,
        stabilityScore: Math.max(0, Math.round(stabilityScore))
      },
      distribution: counts,
      economy: {
        totalTransactions: counts['transaction'] || 0,
        totalVolume: totalMoneyMoved,
        avgTransaction: totalMoneyMoved / Math.max(1, counts['transaction'] || 1)
      },
      recommendation: this.#getRecommendation(stabilityScore, playerCount, eps)
    };
  }

  #getRecommendation(score, players, eps) {
    if (score < 50) return "❌ CRITIQUE: Instabilité majeure détectée.";
    if (eps < 50 && players > 100) return "⚠️ ATTENTION: Goulot d'étranglement CPU probable.";
    if (players >= 150 && score > 80) return "✅ EXCELLENT: Prêt pour la production haute charge.";
    return "✅ BON: Simulation stable.";
  }

  getLastResults(n = 5) { return this.results.slice(-n); }

  _incrementMetric(metric, amount = 1) {
    if (this.config.enableMetrics && this.metrics[metric] !== undefined) {
      this.metrics[metric] += amount;
    }
  }

  _log(level, message) {
    if (this.config.logLevel === 'info' || level === 'error') {
      console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] [${this.name}] ${message}`);
    }
  }

  getMetrics() { return { ...this.metrics, timestamp: Date.now() }; }

  getStatus() { 
    return { 
      name: this.name, 
      version: this.version, 
      running: this.running, 
      sessions: this.sessions.size,
      metrics: this.getMetrics()
    }; 
  }
}

export default EtherSim;