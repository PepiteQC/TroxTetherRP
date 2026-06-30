// server/agents/EtherLens.js
// 🔍 Audit Avancé : Équilibrage, Stats & Sécurité Code - Version 3.0
export class EtherLens {
  constructor(config = {}) {
    this.name = "EtherLens";
    this.version = "3.0.0";

    // Configuration des seuils
    this.config = {
      inflationThreshold: config.inflationThreshold || 10, // %
      moneySupplyCap: config.moneySupplyCap || 1000000,
      levelVarianceThreshold: config.levelVarianceThreshold || 20, // Écart-type max
      auditLogSize: config.auditLogSize || 200,
      enableMetrics: config.enableMetrics !== false,
      logLevel: config.logLevel || 'warn',
      ...config
    };

    this.auditLog = [];
    this.baselines = new Map(); // Stocke les moyennes historiques pour comparaison
    
    this.metrics = {
      auditsPerformed: 0,
      issuesFound: 0,
      criticalIssues: 0,
      codeScans: 0
    };
  }

  async process(packet) {
    const startTime = Date.now();
    try {
      const result = await this.analyze(packet);
      return {
        agent: this.name,
        version: this.version,
        mission: packet?.mission,
        success: true,
        confidence: result.score,
        processingTime: Date.now() - startTime,
        data: result
      };
    } catch (error) {
      return {
        agent: this.name,
        success: false,
        error: error.message,
        confidence: 0
      };
    }
  }

  // 📊 Analyse Complète (Économie + Gameplay + Stats)
  async analyze(data) {
    this._incrementMetric('auditsPerformed');
    const issues = [];
    const warnings = [];
    let score = 100;

    // 1. Audit Économique Avancé
    if (data?.economy) {
      const econAudit = this.#auditEconomy(data.economy);
      issues.push(...econAudit.issues);
      warnings.push(...econAudit.warnings);
      score -= econAudit.penalty;
    }

    // 2. Audit Gameplay & Distribution (Stats réelles)
    if (data?.players && Array.isArray(data.players)) {
      const gameAudit = this.#auditGameplay(data.players);
      issues.push(...gameAudit.issues);
      warnings.push(...gameAudit.warnings);
      score -= gameAudit.penalty;
    }

    // 3. Audit Système (Si dispo)
    if (data?.system) {
       const sysAudit = this.#auditSystem(data.system);
       issues.push(...sysAudit.issues);
       score -= sysAudit.penalty;
    }

    const finalScore = Math.max(0, Math.min(100, score));
    
    const audit = {
      id: crypto.randomUUID(),
      score: finalScore,
      status: finalScore > 85 ? "HEALTHY" : finalScore > 60 ? "WARNING" : "CRITICAL",
      issues,
      warnings,
      summary: {
        totalIssues: issues.length,
        criticalCount: issues.filter(i => i.severity === 'CRITICAL').length,
        warningCount: warnings.length
      },
      timestamp: Date.now()
    };

    this._addToLog(audit);
    
    // Mise à jour baseline pour détection de dérive (drift detection)
    if (finalScore > 80) {
      this._updateBaselines(data);
    }

    return audit;
  }

  // 💻 Audit de Code Sécurisé (Pattern Matching Avancé)
  async auditCode(code) {
    this._incrementMetric('codeScans');
    if (!code || typeof code !== 'string') {
      return { safe: true, issues: [], score: 100 };
    }

    const issues = [];
    let penalty = 0;

    // Patterns de sécurité (Regex optimisés)
    const securityPatterns = [
      { regex: /\beval\s*\(/g, type: "DANGEROUS_EVAL", severity: "CRITICAL", penalty: 50 },
      { regex: /\bnew\s+Function\s*\(/g, type: "FUNCTION_CONSTRUCTOR", severity: "CRITICAL", penalty: 50 },
      { regex: /\bprocess\.exit\s*\(/g, type: "PROCESS_EXIT", severity: "HIGH", penalty: 30 },
      { regex: /\bchild_process\b/g, type: "CHILD_PROCESS_USAGE", severity: "HIGH", penalty: 30 },
      { regex: /\brm\s+-rf\b/g, type: "DESTRUCTIVE_COMMAND", severity: "CRITICAL", penalty: 50 },
      { regex: /\bDROP\s+TABLE\b/i, type: "SQL_DESTRUCTION", severity: "CRITICAL", penalty: 50 },
      { regex: /\brequire\s*\(\s*['"]fs['"]\s*\)/g, type: "FS_ACCESS", severity: "MEDIUM", penalty: 10 },
      { regex: /\b__proto__\b/g, type: "PROTOTYPE_POLLUTION", severity: "HIGH", penalty: 20 },
      { regex: /setTimeout\s*\(\s*[^,]+,\s*0\s*\)/g, type: "BLOCKING_LOOP_RISK", severity: "LOW", penalty: 5 }
    ];

    for (const pattern of securityPatterns) {
      if (pattern.regex.test(code)) {
        // Reset lastIndex pour regex global
        pattern.regex.lastIndex = 0; 
        issues.push({
          type: pattern.type,
          severity: pattern.severity,
          message: `Pattern dangereux détecté: ${pattern.type}`,
          recommendation: this.#getRecommendation(pattern.type)
        });
        penalty += pattern.penalty;
      }
    }

    // Complexité Cyclomatique Estimée (Simple count of decision points)
    const complexity = this.#estimateComplexity(code);
    if (complexity > 20) {
      issues.push({
        type: "HIGH_COMPLEXITY",
        severity: "LOW",
        value: complexity,
        message: "Code très complexe, difficile à maintenir/auditer"
      });
      penalty += 5;
    }

    const safe = issues.length === 0;
    const score = Math.max(0, 100 - penalty);

    return { 
      safe, 
      issues, 
      score,
      metrics: { complexity, length: code.length },
      scannedAt: Date.now() 
    };
  }

  // --- Méthodes Privées d'Analyse ---

  #auditEconomy(economy) {
    const issues = [];
    const warnings = [];
    let penalty = 0;

    // Inflation
    if (economy.inflation > this.config.inflationThreshold) {
      issues.push({
        type: "HIGH_INFLATION",
        severity: "HIGH",
        value: economy.inflation,
        threshold: this.config.inflationThreshold,
        recommendation: "Réduire les drops de monnaie ou augmenter les sinks (taxes, réparations)."
      });
      penalty += 15;
    }

    // Masse Monétaire
    if (economy.moneySupply > this.config.moneySupplyCap) {
      warnings.push({
        type: "MONEY_SUPPLY_BLOAT",
        severity: "MEDIUM",
        value: economy.moneySupply,
        recommendation: "Envisager un reset économique ou une taxation progressive."
      });
      penalty += 5;
    }

    // Ratio Achats/Ventes (si disponible)
    if (economy.buySellRatio && economy.buySellRatio > 5) {
      issues.push({
        type: "MARKET_IMBALANCE",
        severity: "MEDIUM",
        value: economy.buySellRatio,
        recommendation: "Trop d'achats par rapport aux ventes. Vérifier les prix NPC."
      });
      penalty += 10;
    }

    return { issues, warnings, penalty };
  }

  #auditGameplay(players) {
    const issues = [];
    const warnings = [];
    let penalty = 0;

    if (players.length === 0) return { issues, warnings, penalty };

    // Calculs Statistiques sur les Niveaux
    const levels = players.map(p => p.level || 1);
    const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
    
    // Écart-type (Standard Deviation) pour voir la dispersion
    const variance = levels.reduce((acc, val) => acc + Math.pow(val - avgLevel, 2), 0) / levels.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > this.config.levelVarianceThreshold) {
      warnings.push({
        type: "HIGH_LEVEL_DISPARITY",
        severity: "LOW",
        stdDev: stdDev.toFixed(2),
        message: "Fossé important entre joueurs débutants et experts."
      });
      penalty += 5;
    }

    // Détection de "Whales" ou Tricheurs (Outliers)
    const maxLevel = Math.max(...levels);
    if (maxLevel > avgLevel + (stdDev * 3)) {
      issues.push({
        type: "POTENTIAL_CHEATER_OUTLIER",
        severity: "MEDIUM",
        maxLevel,
        avgLevel: avgLevel.toFixed(1),
        recommendation: "Investiguer le joueur niveau max."
      });
      penalty += 10;
    }

    // Progression moyenne
    if (avgLevel > 50 && players.length > 100) {
       warnings.push({ type: "LATE_GAME_ECONOMY_RISK", avgLevel });
       penalty += 5;
    }

    return { issues, warnings, penalty };
  }

  #auditSystem(system) {
    const issues = [];
    let penalty = 0;

    if (system.memoryUsage > 85) {
      issues.push({ type: "HIGH_MEMORY_USAGE", severity: "HIGH", value: system.memoryUsage });
      penalty += 20;
    }
    if (system.cpuLoad > 90) {
      issues.push({ type: "CPU_THROTTLING_RISK", severity: "HIGH", value: system.cpuLoad });
      penalty += 20;
    }

    return { issues, warnings: [], penalty };
  }

  #estimateComplexity(code) {
    // Estimation simple basée sur les mots-clés de contrôle
    const keywords = ['if', 'else', 'for', 'while', 'case', 'catch', '&&', '||', '?'];
    let count = 1; // Base complexity
    const lines = code.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
      
      for (const kw of keywords) {
        // Regex simple pour éviter les faux positifs dans les strings (imparfait mais rapide)
        if (new RegExp(`\\b${kw}\\b`).test(trimmed)) {
          count++;
        }
      }
    }
    return count;
  }

  #getRecommendation(type) {
    const recs = {
      "DANGEROUS_EVAL": "Utiliser JSON.parse ou une logique conditionnelle stricte.",
      "PROCESS_EXIT": "Gérer les erreurs avec try/catch et retourner un code d'erreur.",
      "FS_ACCESS": "Utiliser un service dédié pour les fichiers, pas d'accès direct.",
      "SQL_DESTRUCTION": "Utiliser des requêtes préparées et jamais de DROP en prod."
    };
    return recs[type] || "Revoir la logique de sécurité.";
  }

  // --- Gestion Log & Baselines ---

  _addToLog(audit) {
    this.auditLog.push(audit);
    if (this.auditLog.length > this.config.auditLogSize) {
      this.auditLog.shift(); // Remove oldest
    }
  }

  _updateBaselines(data) {
    // Simplifié: on pourrait stocker des moyennes glissantes ici
    if (data.economy) {
      this.baselines.set('inflation', data.economy.inflation);
    }
  }

  _incrementMetric(metric) {
    if (this.config.enableMetrics && this.metrics[metric] !== undefined) {
      this.metrics[metric]++;
    }
  }

  // --- Public Getters ---

  getLastAudits(n = 10) { 
    return this.auditLog.slice(-n).reverse(); // Plus récent en premier
  }

  getTrend() {
    if (this.auditLog.length < 5) return "INSUFFICIENT_DATA";
    const last5 = this.auditLog.slice(-5);
    const avgScore = last5.reduce((sum, a) => sum + a.score, 0) / 5;
    if (avgScore > 90) return "STABLE";
    if (avgScore < 70) return "DEGRADING";
    return "FLUCTUATING";
  }

  getMetrics() {
    return {
      ...this.metrics,
      logSize: this.auditLog.length,
      currentTrend: this.getTrend(),
      timestamp: Date.now()
    };
  }

  getStatus() { 
    return { 
      name: this.name, 
      version: this.version, 
      audits: this.auditLog.length,
      trend: this.getTrend(),
      metrics: this.config.enableMetrics ? this.getMetrics() : undefined
    }; 
  }
}

// Import manquant ajouté pour crypto.randomUUID
import crypto from "node:crypto";

export default EtherLens;