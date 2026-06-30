// server/agents/EvolutionEngine.js
// 🧬 Moteur d'Évolution Génétique & Système Immunitaire Adaptatif - Version 3.0
import crypto from "node:crypto";

export class EvolutionEngine {
  constructor(config = {}) {
    this.name = "EvolutionEngine";
    this.version = "3.0.0";

    this.config = {
      populationSize: config.populationSize || 100,
      mutationRate: config.mutationRate || 0.15,
      crossoverRate: config.crossoverRate || 0.6, // Probabilité de mélange deux règles
      elitismCount: config.elitismCount || 5,     // Nombre de meilleurs conservés intacts
      maxGenerations: config.maxGenerations || 1000,
      enableMetrics: config.enableMetrics !== false,
      logLevel: config.logLevel || 'info',
      ...config
    };

    this.generation = 0;
    this.population = [];       // Règles actives
    this.bestRules = [];        // Top N règles historiques
    this.history = [];          // Historique des menaces rencontrées
    
    this.metrics = {
      evolutions: 0,
      threatsNeutralized: 0,
      mutationsApplied: 0,
      crossoversApplied: 0,
      errors: 0
    };

    this.#seedInitialPopulation();
    this._log('info', `[${this.name}] Initialisé v${this.version} | Pop: ${this.config.populationSize}`);
  }

  async process(packet) {
    return {
      agent: this.name,
      version: this.version,
      mission: packet?.mission,
      success: true,
      confidence: 96,
      data: { 
        generation: this.generation, 
        activeRules: this.population.length,
        metrics: this.config.enableMetrics ? this.getMetrics() : undefined
      }
    };
  }

  // 🧬 Évoluer face à une nouvelle menace (Cycle complet GA)
  async evolve(threatData) {
    try {
      this.generation++;
      this.history.push({ threat: threatData, gen: this.generation, timestamp: Date.now() });
      
      // 1. Évaluation de la fitness actuelle face à la menace
      const evaluatedPop = this.population.map(rule => ({
        ...rule,
        fitness: this.#calculateFitness(rule, threatData)
      }));

      // Tri par fitness décroissante
      evaluatedPop.sort((a, b) => b.fitness - a.fitness);

      // 2. Sélection : Élitisme (garder les meilleurs intacts)
      const survivors = evaluatedPop.slice(0, this.config.elitismCount);
      
      // 3. Reproduction : Crossover & Mutation pour remplir la population
      const newGeneration = [...survivors];
      
      while (newGeneration.length < this.config.populationSize) {
        // Sélection parentale (Tournoi simple)
        const parentA = this.#tournamentSelect(evaluatedPop);
        const parentB = this.#tournamentSelect(evaluatedPop);

        let child;
        if (Math.random() < this.config.crossoverRate) {
          child = this.#crossover(parentA, parentB);
          this._incrementMetric('crossoversApplied');
        } else {
          child = { ...parentA }; // Copie directe si pas de crossover
        }

        // Mutation
        if (Math.random() < this.config.mutationRate) {
          child = this.#mutate(child);
          this._incrementMetric('mutationsApplied');
        }

        // Assigner nouvel ID et génération
        child.id = crypto.randomUUID();
        child.generation = this.generation;
        child.createdAt = Date.now();
        child.fitness = 0; // Sera évalué au prochain cycle

        newGeneration.push(child);
      }

      // Mise à jour de la population
      this.population = newGeneration;
      
      // Mise à jour des meilleures règles globales (Hall of Fame)
      this.#updateBestRules(evaluatedPop);

      this._incrementMetric('evolutions');
      this._log('info', `Gen ${this.generation} : Évolution terminée. Meilleure fitness: ${this.bestRules[0]?.fitness.toFixed(2)}`);

      return {
        generation: this.generation,
        populationSize: this.population.length,
        bestFitness: this.bestRules[0]?.fitness || 0,
        topRule: this.bestRules[0],
        timestamp: Date.now()
      };
    } catch (error) {
      this._incrementMetric('errors');
      this._log('error', `Erreur évolution: ${error.message}`);
      throw error;
    }
  }

  // 🛡️ Adapter rapidement (Réponse immédiate sans attendre le cycle complet)
  async adapt(attackPattern) {
    const responseStrategy = this.#determineResponse(attackPattern);
    
    const newRule = {
      id: crypto.randomUUID(),
      pattern: attackPattern,
      response: responseStrategy,
      fitness: 0.8, // Fitness initiale haute car spécifique à la menace
      generation: this.generation,
      createdAt: Date.now(),
      isAdaptive: true // Marqueur pour distinguer les règles apprises
    };

    // Insertion immédiate dans la population (remplace le pire si plein)
    if (this.population.length >= this.config.populationSize) {
      this.population.pop(); // Retire le dernier (supposé moins bon si trié précédemment)
    }
    this.population.unshift(newRule); // Ajoute en tête
    
    this._log('warn', `⚡ Adaptation rapide: Nouvelle règle créée pour ${attackPattern.type}`);
    return newRule;
  }

  // 🔍 Vérifier si une règle existe pour une menace
  checkThreat(threatData) {
    // Recherche la règle la plus pertinente dans la population actuelle
    const bestMatch = this.population.reduce((best, current) => {
      const fit = this.#calculateFitness(current, threatData);
      return fit > best.fitness ? { rule: current, fitness: fit } : best;
    }, { rule: null, fitness: 0 });

    return {
      detected: bestMatch.fitness > 0.5,
      confidence: bestMatch.fitness,
      recommendedAction: bestMatch.rule?.response || "monitor",
      ruleId: bestMatch.rule?.id
    };
  }

  getBestRules(n = 5) { 
    return this.bestRules.slice(0, n); 
  }

  // --- Algorithmes Génétiques Privés ---

  #tournamentSelect(population, tournamentSize = 3) {
    let best = null;
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndiv = population[Math.floor(Math.random() * population.length)];
      if (!best || randomIndiv.fitness > best.fitness) {
        best = randomIndiv;
      }
    }
    return best;
  }

  #crossover(parentA, parentB) {
    // Crossover à un point pour les objets de pattern
    const childPattern = { ...parentA.pattern };
    const keys = Object.keys(parentB.pattern);
    
    // Mélange 50% des propriétés du parent B dans l'enfant
    keys.forEach(key => {
      if (Math.random() > 0.5 && parentB.pattern[key] !== undefined) {
        childPattern[key] = parentB.pattern[key];
      }
    });

    return {
      ...parentA,
      pattern: childPattern,
      response: Math.random() > 0.5 ? parentA.response : parentB.response
    };
  }

  #mutate(rule) {
    const mutatedPattern = { ...rule.pattern };
    const keys = Object.keys(mutatedPattern);
    
    if (keys.length === 0) return rule;

    const keyToMutate = keys[Math.floor(Math.random() * keys.length)];
    const value = mutatedPattern[keyToMutate];

    if (typeof value === 'number') {
      // Mutation gaussienne légère
      const change = (Math.random() - 0.5) * 0.2; // +/- 10%
      mutatedPattern[keyToMutate] = Math.max(0, value + change);
    } else if (typeof value === 'boolean') {
      mutatedPattern[keyToMutate] = !value;
    } else if (typeof value === 'string') {
      // Pour les strings, on peut changer légèrement la longueur ou le contenu si c'est un regex
      // Ici simplifié : on garde tel quel ou on ajoute un wildcard simulé
      if (Math.random() > 0.5) mutatedPattern[keyToMutate] = value + "*"; 
    }

    return {
      ...rule,
      pattern: mutatedPattern
    };
  }

  #calculateFitness(rule, threat) {
    if (!rule.pattern || !threat) return 0;

    let score = 0;
    const patternKeys = Object.keys(rule.pattern);
    const threatKeys = Object.keys(threat);

    // Correspondance exacte des types
    if (rule.pattern.type === threat.type) {
      score += 0.5;
    }

    // Correspondance des attributs (ex: severity, source)
    let matches = 0;
    patternKeys.forEach(key => {
      if (threat[key] !== undefined) {
        if (rule.pattern[key] === threat[key]) {
          matches++;
        } else if (typeof rule.pattern[key] === 'number' && typeof threat[key] === 'number') {
          // Proximité numérique
          const diff = Math.abs(rule.pattern[key] - threat[key]);
          if (diff < 0.1) matches += 0.5;
        }
      }
    });

    // Bonus de densité de match
    if (patternKeys.length > 0) {
      score += (matches / patternKeys.length) * 0.4;
    }

    // Pénalité d'ancienneté (les vieilles règles sont moins pertinentes si l'attaque change)
    // Sauf si elles ont une fitness historique élevée
    const ageFactor = Math.max(0.8, 1 - (this.generation - rule.generation) * 0.01);
    
    return Math.min(1.0, score * ageFactor + (rule.fitness || 0) * 0.1);
  }

  #determineResponse(attackPattern) {
    const strategies = {
      sql_injection: "sanitize_and_block",
      dos: "rate_limit_and_ban_ip",
      xss: "escape_output_and_log",
      bruteforce: "temporary_lockout",
      privilege_escalation: "session_revoke_and_alert",
      default: "enhanced_monitoring"
    };
    return strategies[attackPattern.type] || strategies.default;
  }

  #updateBestRules(currentGenEvaluated) {
    // Fusionner les meilleurs de cette génération avec le Hall of Fame
    const candidates = [...this.bestRules, ...currentGenEvaluated.slice(0, 10)];
    
    // Déduplication par ID et tri
    const unique = Array.from(new Map(candidates.map(item => [item.id, item])).values());
    unique.sort((a, b) => b.fitness - a.fitness);
    
    this.bestRules = unique.slice(0, 20); // Garder top 20 historiques
  }

  #seedInitialPopulation() {
    const seeds = [
      { type: "sql_injection", severity: 0.9 },
      { type: "dos", volume: 1000 },
      { type: "xss", payload_length: 500 },
      { type: "bruteforce", attempts: 10 },
      { type: "privilege_escalation", role_change: true }
    ];

    seeds.forEach((s, i) => {
      this.population.push({
        id: `seed_${i}`,
        pattern: s,
        response: this.#determineResponse(s),
        fitness: 0.9,
        generation: 0,
        createdAt: Date.now()
      });
    });
    
    this.bestRules = [...this.population];
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

  getStatus() { 
    return { 
      name: this.name, 
      version: this.version, 
      generation: this.generation, 
      rules: this.population.length, 
      bestFitness: this.bestRules[0]?.fitness || 0,
      metrics: this.config.enableMetrics ? this.getMetrics() : undefined
    }; 
  }
}

export default EvolutionEngine;
