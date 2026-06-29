// server/agents/EvolutionEngine.js
// 🧬 S'adapte aux nouvelles attaques — Évolution génétique continue
export class EvolutionEngine {
  constructor() {
    this.name        = "EvolutionEngine";
    this.version     = "2.0.0";
    this.generation  = 0;
    this.population  = [];
    this.bestRules   = [];
    this.mutationRate = 0.1;
    this.#seedInitialRules();
  }

  async process(packet) {
    return {
      agent: this.name,
      mission: packet?.mission,
      success: true,
      confidence: 90,
      data: { generation: this.generation, rules: this.population.length }
    };
  }

  // Évoluer face à une nouvelle menace
  async evolve(threatData) {
    this.generation++;
    const newRules = this.#generateMutations(threatData);
    const evaluated = newRules.map(rule => ({
      ...rule,
      fitness: this.#evaluate(rule, threatData)
    }));

    // Sélection des meilleurs
    evaluated.sort((a, b) => b.fitness - a.fitness);
    const survivors = evaluated.slice(0, Math.ceil(evaluated.length / 2));

    // Mettre à jour la population
    this.population = [...this.population, ...survivors].slice(-100);
    this.bestRules  = this.population.sort((a, b) => b.fitness - a.fitness).slice(0, 10);

    console.log(`[EvolutionEngine] Gen ${this.generation} — ${survivors.length} nouvelles règles`);
    return {
      generation: this.generation,
      evolved:    survivors.length,
      bestFitness: this.bestRules[0]?.fitness || 0,
      timestamp:  Date.now()
    };
  }

  // Adapter les règles de sécurité
  async adapt(attackPattern) {
    const newRule = {
      id:        `rule_gen${this.generation}_${Date.now()}`,
      pattern:   attackPattern,
      response:  this.#generateResponse(attackPattern),
      fitness:   0.5,
      generation: this.generation,
      createdAt: Date.now()
    };
    this.population.push(newRule);
    return newRule;
  }

  getBestRules(n = 5) { return this.bestRules.slice(0, n); }

  #generateMutations(threat) {
    return this.population.slice(0, 10).map(rule => ({
      ...rule,
      id:        `rule_mut_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
      pattern:   this.#mutate(rule.pattern),
      generation: this.generation
    }));
  }

  #mutate(pattern) {
    if (!pattern || typeof pattern !== "object") return pattern;
    const mutated = { ...pattern };
    const keys    = Object.keys(mutated);
    if (keys.length > 0 && Math.random() < this.mutationRate) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      if (typeof mutated[key] === "number") mutated[key] *= (0.8 + Math.random() * 0.4);
      if (typeof mutated[key] === "boolean") mutated[key] = !mutated[key];
    }
    return mutated;
  }

  #evaluate(rule, threat) {
    let score = 0.5;
    if (rule.pattern && threat?.type && rule.pattern.type === threat.type) score += 0.3;
    if (rule.fitness) score += rule.fitness * 0.2;
    return Math.min(1.0, score);
  }

  #generateResponse(pattern) {
    const responses = {
      sql_injection:  "sanitize_input",
      dos:            "rate_limit",
      xss:            "escape_output",
      bruteforce:     "lockout",
      default:        "log_and_monitor"
    };
    return responses[pattern?.type] || responses.default;
  }

  #seedInitialRules() {
    const initialRules = [
      { pattern: { type: "sql_injection"  }, response: "sanitize_input", fitness: 0.9 },
      { pattern: { type: "dos"            }, response: "rate_limit",      fitness: 0.85 },
      { pattern: { type: "xss"            }, response: "escape_output",   fitness: 0.88 },
      { pattern: { type: "bruteforce"     }, response: "lockout",         fitness: 0.92 },
    ];
    initialRules.forEach((r, i) => {
      this.population.push({ ...r, id: `rule_seed_${i}`, generation: 0, createdAt: Date.now() });
    });
    this.bestRules = [...this.population];
  }

  getStatus() { return { name: this.name, version: this.version, generation: this.generation, rules: this.population.length, bestFitness: this.bestRules[0]?.fitness || 0 }; }
}

export default EvolutionEngine;
