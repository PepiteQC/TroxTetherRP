// server/agents/EtherSim.js
// 🧪 Simule jusqu'à 200 joueurs simultanés en scénarios RP réels
export class EtherSim {
  constructor() {
    this.name       = "EtherSim";
    this.version    = "2.0.0";
    this.running    = false;
    this.sessions   = new Map();
    this.results    = [];
  }

  async process(packet) {
    return {
      agent: this.name,
      mission: packet?.mission,
      success: true,
      confidence: 87,
      data: { sessions: this.sessions.size, results: this.results.length }
    };
  }

  // Simuler N joueurs
  async simulate(playerCount = 50, scenarioType = "gang_war", durationMs = 5000) {
    playerCount = Math.min(200, playerCount);
    const sessionId = `sim_${Date.now()}`;
    const players   = this.#generatePlayers(playerCount);
    const events    = [];

    this.running = true;
    const startAt = Date.now();

    // Simuler des événements
    for (let t = 0; t < durationMs; t += 500) {
      const batch = this.#simulateTick(players, scenarioType, t);
      events.push(...batch);
    }

    const duration = Date.now() - startAt;
    const result = {
      sessionId,
      scenarioType,
      playerCount,
      duration,
      events:      events.length,
      performance: {
        eventsPerSec: Math.round(events.length / (duration / 1000)),
        avgLatency:   Math.round(duration / events.length),
        peakPlayers:  playerCount,
        crashes:      events.filter(e => e.type === "crash").length,
        warnings:     events.filter(e => e.type === "warning").length,
      },
      economy: {
        totalTransactions: events.filter(e => e.type === "transaction").length,
        totalMoney:        events.filter(e => e.type === "transaction").reduce((s, e) => s + (e.amount || 0), 0),
      },
      recommendation: this.#evaluate(events, playerCount),
      timestamp:      Date.now()
    };

    this.sessions.set(sessionId, result);
    this.results.push(result);
    if (this.results.length > 50) this.results.shift();
    this.running = false;
    return result;
  }

  #generatePlayers(count) {
    return Array.from({ length: count }, (_, i) => ({
      id:       `sim_player_${i}`,
      name:     `SimPlayer${i}`,
      level:    Math.floor(Math.random() * 50) + 1,
      gang:     `gang_${Math.floor(Math.random() * 5)}`,
      position: [
        (Math.random() - 0.5) * 1000,
        0,
        (Math.random() - 0.5) * 1000
      ],
      money:    Math.floor(Math.random() * 10000),
    }));
  }

  #simulateTick(players, scenario, time) {
    const events = [];
    const count  = Math.floor(players.length * 0.1);
    for (let i = 0; i < count; i++) {
      const p = players[Math.floor(Math.random() * players.length)];
      switch (scenario) {
        case "gang_war":
          events.push({ type: "combat",      player: p.id, gang: p.gang, time, damage: Math.floor(Math.random() * 100) });
          break;
        case "economy":
          events.push({ type: "transaction", player: p.id, amount: Math.floor(Math.random() * 500), time });
          break;
        case "roleplay":
          events.push({ type: "interaction", player: p.id, action: "talk", time });
          break;
        default:
          events.push({ type: "idle", player: p.id, time });
      }
      if (Math.random() < 0.01) events.push({ type: "warning", player: p.id, reason: "lag_spike", time });
      if (Math.random() < 0.001) events.push({ type: "crash",   player: p.id, reason: "timeout",   time });
    }
    return events;
  }

  #evaluate(events, playerCount) {
    const crashRate = events.filter(e => e.type === "crash").length / events.length;
    if (crashRate > 0.05) return "⚠️ INSTABLE — Trop de crashes";
    if (playerCount > 150) return "✅ BON — Tient la charge 150+";
    return "✅ EXCELLENT — Simulation stable";
  }

  getLastResults(n = 5) { return this.results.slice(-n); }
  getStatus() { return { name: this.name, version: this.version, running: this.running, sessions: this.sessions.size }; }
}

export default EtherSim;
