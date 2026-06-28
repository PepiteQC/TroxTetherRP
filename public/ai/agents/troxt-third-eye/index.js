// C:\troxtetherworld\public\ai\agents\troxt-third-eye\index.js
// TROXT THIRD EYE v4.0.0 — Système de surveillance et prédiction de risque
// Le gardien qui protège l'intégrité du serveur EtherWorld
// Peut bloquer toute action si le risque est ORANGE ou RED

import crypto from 'crypto';
import { EventEmitter } from 'events';

export class TroxtThirdEye extends EventEmitter {
  constructor(brain) {
    super();
    this.brain = brain;
    
    // Niveaux de risque
    this.levels = {
      GREEN: { label: 'Sûr', color: '#00ff00', action: 'allow' },
      YELLOW: { label: 'Attention', color: '#ffff00', action: 'warn' },
      ORANGE: { label: 'Risqué', color: '#ff8800', action: 'flag' },
      RED: { label: 'Critique', color: '#ff0000', action: 'block' }
    };

    // Score de risque actuel
    this.currentRisk = {
      level: 'GREEN',
      score: 0,
      factors: [],
      timestamp: Date.now()
    };

    // Historique des décisions
    this.decisions = [];
    this.maxDecisions = 1000;

    // Règles de sécurité
    this.rules = new Map();
    this._loadDefaultRules();

    // Patterns de menace
    this.threatPatterns = new Map();
    this._loadThreatPatterns();

    // Machine learning simplifié
    this.ml = {
      model: null,
      features: [],
      predictions: []
    };

    // Circuit breakers
    this.circuitBreakers = new Map();
    this._initCircuitBreakers();

    // Audit SHA-256
    this.auditChain = [];
  }

  async initialize() {
    console.log('[👁 Third Eye] Initialisation du système de surveillance...');
    
    // Charger les patterns de menace
    await this._loadThreatDatabase();
    
    // Initialiser les métriques
    this.metrics = {
      actionsScanned: 0,
      actionsBlocked: 0,
      actionsAllowed: 0,
      falsePositives: 0,
      accuracy: 0.95,
      uptime: Date.now()
    };

    this.emit('ready', { level: 'GREEN', timestamp: Date.now() });
    console.log('[👁 Third Eye] Système prêt — Niveau: GREEN');
    
    return this;
  }

  /**
   * Évalue le risque d'une action — Méthode principale
   */
  assess(input, context = {}) {
    const start = Date.now();
    this.metrics.actionsScanned++;

    // Analyser sous tous les angles
    const analysis = {
      input: this._analyzeInput(input),
      behavior: this._analyzeBehavior(context),
      patterns: this._detectThreatPatterns(input),
      anomalies: this._detectAnomalies(input, context),
      history: this._checkHistory(input, context),
      context: this._analyzeContext(context)
    };

    // Calculer le score de risque
    const score = this._calculateRiskScore(analysis);
    
    // Déterminer le niveau
    const level = this._determineLevel(score);
    
    // Prédire l'évolution du risque
    const prediction = this._predictRisk(score, analysis);

    // Vérifier les circuit breakers
    const circuitStatus = this._checkCircuitBreakers(input, level);

    // Appliquer les règles
    const ruleResult = this._applyRules(input, level, context);

    // Décision finale
    const decision = this._makeDecision({
      level,
      score,
      analysis,
      prediction,
      circuitStatus,
      ruleResult,
      context
    });

    // Logger la décision
    const auditEntry = this._audit(decision, input, context);
    
    // Mettre à jour les métriques
    if (decision.action === 'block') this.metrics.actionsBlocked++;
    else this.metrics.actionsAllowed++;

    // Émettre alertes
    if (level === 'ORANGE' || level === 'RED') {
      this.emit('alert', {
        level,
        score,
        input: input.slice(0, 200),
        decision,
        timestamp: Date.now()
      });
    }

    // Broadcast si niveau élevé
    if (level === 'RED') {
      this.brain?.bus?.emit('third-eye:critical', {
        level: 'RED',
        reason: decision.reason,
        input: input.slice(0, 200),
        timestamp: Date.now()
      }, 'critical');
    }

    return {
      level,
      score,
      action: decision.action,
      reason: decision.reason,
      confidence: decision.confidence,
      factors: analysis,
      prediction,
      auditId: auditEntry.id,
      executionMs: Date.now() - start
    };
  }

  /**
   * Analyse approfondie du texte d'entrée
   */
  _analyzeInput(input) {
    const text = String(input || '').toLowerCase();
    const analysis = {
      length: text.length,
      wordCount: text.split(/\s+/).length,
      hasCode: /[{}().;=<>]/.test(text),
      hasSQL: /\b(select|drop|insert|delete|update|alter|create|truncate)\b/i.test(text),
      hasShell: /\b(exec|eval|spawn|system|shell|bash|cmd|powershell)\b/i.test(text),
      hasPathTraversal: /\.\.\//.test(text) || /\.\.\\/.test(text),
      hasIPAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text),
      hasEmail: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text),
      hasURL: /https?:\/\/[^\s]+/.test(text),
      sentiment: this._analyzeSentiment(text),
      commands: this._extractCommands(text),
      numbers: text.match(/\d+/g)?.map(Number) || [],
      keywords: this._extractKeywords(text)
    };

    // Score de dangerosité
    analysis.dangerScore = 0;
    if (analysis.hasSQL) analysis.dangerScore += 30;
    if (analysis.hasShell) analysis.dangerScore += 40;
    if (analysis.hasPathTraversal) analysis.dangerScore += 25;
    if (analysis.hasCode) analysis.dangerScore += 10;

    return analysis;
  }

  /**
   * Analyse comportementale du contexte
   */
  _analyzeBehavior(context) {
    const { userId, ip, userAgent, role, recentActions } = context;

    return {
      trustScore: this._calculateTrustScore(context),
      isNewUser: !this._userExists(userId),
      isAdmin: role === 'admin',
      isBanned: this._isBanned(userId),
      rateLimit: this._checkRateLimit(ip),
      unusualActivity: this._detectUnusualActivity(userId),
      timeSinceLastAction: this._timeSinceLastAction(userId),
      concurrentSessions: this._getConcurrentSessions(userId),
      geolocationRisk: this._checkGeolocation(ip)
    };
  }

  /**
   * Détection de patterns de menace avancés
   */
  _detectThreatPatterns(input) {
    const threats = [];
    const text = String(input || '');

    // Patterns connus d'attaques
    for (const [name, pattern] of this.threatPatterns) {
      if (pattern.test(text)) {
        threats.push({
          name,
          severity: this._getPatternSeverity(name),
          match: text.match(pattern)?.[0]?.slice(0, 50)
        });
      }
    }

    // Patterns d'injection
    const injectionPatterns = [
      { name: 'SQL Injection', pattern: /'.*OR.*'.*'.*=/i, severity: 'critical' },
      { name: 'NoSQL Injection', pattern: /\$gt|\$ne|\$where|\$regex/i, severity: 'critical' },
      { name: 'Command Injection', pattern: /[;&|`]\s*(?:sh|bash|cmd|powershell|python|node)/i, severity: 'critical' },
      { name: 'XSS', pattern: /<script|javascript:|onerror=|onclick=/i, severity: 'high' },
      { name: 'Path Traversal', pattern: /\.\.(?:\\|\/).*\.(?:json|js|env|config)/i, severity: 'high' },
      { name: 'Prototype Pollution', pattern: /__proto__|prototype\s*\[/i, severity: 'critical' },
      { name: 'Mass Assignment', pattern: /admin|role|permissions?\s*:/i, severity: 'medium' }
    ];

    for (const { name, pattern, severity } of injectionPatterns) {
      if (pattern.test(text)) {
        threats.push({ name, severity, match: text.match(pattern)?.[0]?.slice(0, 50) });
      }
    }

    return threats;
  }

  /**
   * Détection d'anomalies
   */
  _detectAnomalies(input, context) {
    const anomalies = [];
    const text = String(input || '');

    // Anomalies de volume
    if (text.length > 5000) {
      anomalies.push({ type: 'volume', severity: 'medium', detail: 'Entrée très longue' });
    }

    // Anomalies de répétition
    const words = text.split(/\s+/);
    const unique = new Set(words);
    if (words.length > 50 && unique.size < words.length * 0.3) {
      anomalies.push({ type: 'repetition', severity: 'medium', detail: 'Taux de répétition élevé' });
    }

    // Anomalies de timing
    if (context.timestamp) {
      const timeSinceLast = Date.now() - context.timestamp;
      if (timeSinceLast < 100) {
        anomalies.push({ type: 'timing', severity: 'high', detail: 'Action trop rapide' });
      }
    }

    // Anomalies de contexte
    if (context.userId && !context.role) {
      anomalies.push({ type: 'authentication', severity: 'high', detail: 'Action non authentifiée' });
    }

    return anomalies;
  }

  /**
   * Vérification de l'historique
   */
  _checkHistory(input, context) {
    const userId = context.userId;
    if (!userId) return { known: false, incidents: 0 };

    const userDecisions = this.decisions.filter(d => d.userId === userId);
    const recentIncidents = userDecisions.filter(d => 
      d.level === 'RED' && Date.now() - d.timestamp < 3600000
    );

    return {
      known: userDecisions.length > 0,
      totalActions: userDecisions.length,
      recentIncidents: recentIncidents.length,
      lastDecision: userDecisions[userDecisions.length - 1] || null,
      flagRate: userDecisions.length > 0 
        ? userDecisions.filter(d => d.level !== 'GREEN').length / userDecisions.length 
        : 0
    };
  }

  /**
   * Analyse du contexte complet
   */
  _analyzeContext(context) {
    return {
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isWeekend: [0, 6].includes(new Date().getDay()),
      isNightTime: new Date().getHours() < 6 || new Date().getHours() > 22,
      systemLoad: process.cpuUsage().user,
      memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal
    };
  }

  /**
   * Calcul du score de risque composite
   */
  _calculateRiskScore(analysis) {
    let score = 0;

    // Facteurs d'entrée
    if (analysis.input.hasSQL) score += 30;
    if (analysis.input.hasShell) score += 40;
    if (analysis.input.hasPathTraversal) score += 25;
    if (analysis.input.hasCode) score += 10;
    if (analysis.input.length > 5000) score += 5;

    // Patterns de menace
    for (const threat of analysis.patterns) {
      switch (threat.severity) {
        case 'critical': score += 50; break;
        case 'high': score += 30; break;
        case 'medium': score += 15; break;
        case 'low': score += 5; break;
      }
    }

    // Anomalies
    for (const anomaly of analysis.anomalies) {
      switch (anomaly.severity) {
        case 'critical': score += 40; break;
        case 'high': score += 20; break;
        case 'medium': score += 10; break;
      }
    }

    // Comportement
    if (analysis.behavior) {
      if (analysis.behavior.trustScore < 0.3) score += 20;
      if (analysis.behavior.isBanned) score += 50;
      if (analysis.behavior.rateLimit?.exceeded) score += 30;
      if (analysis.behavior.unusualActivity) score += 15;
    }

    // Historique
    if (analysis.history) {
      if (analysis.history.recentIncidents > 3) score += 25;
      if (analysis.history.flagRate > 0.5) score += 15;
    }

    // Normaliser (0-100)
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Détermine le niveau de risque basé sur le score
   */
  _determineLevel(score) {
    if (score >= 70) return 'RED';
    if (score >= 40) return 'ORANGE';
    if (score >= 15) return 'YELLOW';
    return 'GREEN';
  }

  /**
   * Prédiction de l'évolution du risque (ML simplifié)
   */
  _predictRisk(score, analysis) {
    const prediction = {
      trend: 'stable',
      nextLevel: null,
      timeToEscape: null,
      factors: []
    };

    // Tendance basée sur l'historique récent
    const recentDecisions = this.decisions.slice(-10);
    const recentScores = recentDecisions.map(d => d.score);
    
    if (recentScores.length > 2) {
      const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      if (score > avgRecent * 1.2) prediction.trend = 'increasing';
      else if (score < avgRecent * 0.8) prediction.trend = 'decreasing';
    }

    // Prédiction du prochain niveau
    if (score > 50) prediction.nextLevel = 'RED';
    else if (score > 25) prediction.nextLevel = 'ORANGE';
    else prediction.nextLevel = 'YELLOW';

    // Temps estimé pour revenir à GREEN
    if (score > 50) prediction.timeToEscape = '30 min+';
    else if (score > 20) prediction.timeToEscape = '15 min';
    else prediction.timeToEscape = '5 min';

    return prediction;
  }

  /**
   * Vérification des circuit breakers
   */
  _checkCircuitBreakers(input, level) {
    const breakers = [];
    
    for (const [name, breaker] of this.circuitBreakers) {
      const status = breaker.check(input, level);
      breakers.push({
        name,
        tripped: status.tripped,
        reason: status.reason,
        cooldown: status.cooldown
      });
    }

    const criticalTripped = breakers.filter(b => b.tripped);
    return {
      breakers,
      criticalTripped: criticalTripped.length,
      allOk: criticalTripped.length === 0
    };
  }

  /**
   * Application des règles de sécurité
   */
  _applyRules(input, level, context) {
    const triggered = [];

    for (const [name, rule] of this.rules) {
      if (rule.condition(input, level, context)) {
        triggered.push({
          name: rule.name,
          severity: rule.severity,
          action: rule.action
        });
      }
    }

    return {
      triggered,
      blockedBy: triggered.filter(r => r.action === 'block'),
      warnings: triggered.filter(r => r.action === 'warn')
    };
  }

  /**
   * Décision finale
   */
  _makeDecision(data) {
    const { level, score, circuitStatus, ruleResult } = data;
    
    let action = 'allow';
    let reason = 'Aucun risque détecté';
    let confidence = 0.95;

    // Circuit breaker critique → block
    if (!circuitStatus.allOk) {
      action = 'block';
      reason = `Circuit breaker déclenché: ${circuitStatus.criticalTripped} critique(s)`;
      confidence = 0.99;
    }

    // Règle bloquante
    if (ruleResult.blockedBy.length > 0) {
      action = 'block';
      reason = `Règle bloquée: ${ruleResult.blockedBy.map(r => r.name).join(', ')}`;
      confidence = 0.98;
    }

    // Niveau de risque
    if (level === 'RED') {
      action = 'block';
      reason = `Risque critique (score: ${score}/100)`;
      confidence = 0.95;
    } else if (level === 'ORANGE') {
      action = 'flag';
      reason = `Risque élevé (score: ${score}/100) — nécessite validation`;
      confidence = 0.85;
    } else if (level === 'YELLOW') {
      action = 'warn';
      reason = `Risque modéré (score: ${score}/100)`;
      confidence = 0.75;
    }

    // Si admin et risque < RED, on laisse passer avec avertissement
    if (data.context?.role === 'admin' && level !== 'RED') {
      action = 'warn';
      reason += ' — Admin, action autorisée mais surveillée';
    }

    return {
      action,
      level,
      score,
      reason,
      confidence,
      timestamp: Date.now()
    };
  }

  /**
   * Audit avec chaîne SHA-256
   */
  _audit(decision, input, context) {
    const entry = {
      id: `eye_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      decision,
      input: input?.slice(0, 500),
      context: {
        userId: context?.userId,
        ip: context?.ip,
        role: context?.role
      },
      previousHash: this.auditChain[this.auditChain.length - 1]?.hash || null
    };

    // Chaîne SHA-256
    entry.hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(entry) + (entry.previousHash || ''))
      .digest('hex');

    this.auditChain.push(entry);
    
    // Limiter la taille de la chaîne
    if (this.auditChain.length > 10000) {
      this.auditChain = this.auditChain.slice(-5000);
    }

    this.decisions.push({
      ...decision,
      userId: context?.userId,
      auditId: entry.id,
      timestamp: Date.now()
    });

    if (this.decisions.length > this.maxDecisions) {
      this.decisions = this.decisions.slice(-this.maxDecisions);
    }

    return entry;
  }

  // ─── RÈGLES DE SÉCURITÉ ─────────────────────────────────────────────────────

  _loadDefaultRules() {
    const rules = [
      {
        name: 'mass_delete_protection',
        severity: 'critical',
        condition: (input, level) => 
          /delete|supprime|efface/i.test(input) && /all|tous|every|mass/i.test(input),
        action: 'block'
      },
      {
        name: 'admin_escalation_detection',
        severity: 'critical',
        condition: (input, level, ctx) =>
          /admin|sudo|root/i.test(input) && ctx?.role !== 'admin',
        action: 'block'
      },
      {
        name: 'rate_limit_overflow',
        severity: 'high',
        condition: (input, level, ctx) =>
          ctx?.rateLimit?.exceeded === true,
        action: 'block'
      },
      {
        name: 'economy_manipulation',
        severity: 'high',
        condition: (input) =>
          /argent|money|gold|million|billion|riche/i.test(input) && /\d{7,}/.test(input),
        action: 'flag'
      },
      {
        name: 'server_command_detection',
        severity: 'critical',
        condition: (input) =>
          /restart|shutdown|stop|kill|exit|process/i.test(input),
        action: 'block'
      }
    ];

    for (const rule of rules) {
      this.rules.set(rule.name, rule);
    }
  }

  _loadThreatPatterns() {
    const patterns = {
      'SQL Injection': /'.*OR.*'.*'.*=/i,
      'NoSQL Injection': /\$gt|\$ne|\$where|\$regex/i,
      'XSS Attack': /<script|javascript:|onerror=|onclick=|onload=/i,
      'Path Traversal': /\.\.(?:\\|\/)/,
      'Command Injection': /[;&|`]\s*(?:sh|bash|cmd|powershell|python|node|php)/i,
      'Mass Assignment': /admin[\s:=]+true|role[\s:=]+['"]?admin/i,
      'Prototype Pollution': /__proto__|constructor\.prototype/i,
      'SSRF Attempt': /localhost|127\.0\.0\.1|0\.0\.0\.0|169\.254/i,
      'Auth Bypass': /bypass|authenticate[\s:=]+false/i,
      'File Inclusion': /include|require.*\.\.\//i,
      'Buffer Overflow': /[A-Za-z]{200,}/,
      'Race Condition': /async|await|promise.*(?:delete|update|insert)/i,
    };

    for (const [name, pattern] of Object.entries(patterns)) {
      this.threatPatterns.set(name, pattern);
    }
  }

  _initCircuitBreakers() {
    const breakers = [
      {
        name: 'high_frequency',
        threshold: 50,
        window: 1000,
        cooldown: 30000,
        calls: [],
        check(input, level) {
          this.calls.push(Date.now());
          this.calls = this.calls.filter(t => Date.now() - t < this.window);
          
          return {
            tripped: this.calls.length > this.threshold,
            reason: this.calls.length > this.threshold ? 'Fréquence trop élevée' : null,
            cooldown: this.cooldown
          };
        }
      },
      {
        name: 'error_spike',
        threshold: 10,
        window: 60000,
        errors: [],
        check(input, level) {
          if (level === 'RED') {
            this.errors.push(Date.now());
            this.errors = this.errors.filter(t => Date.now() - t < this.window);
          }
          
          return {
            tripped: this.errors.length > this.threshold,
            reason: this.errors.length > this.threshold ? 'Trop d\'erreurs récentes' : null,
            cooldown: 60000
          };
        }
      },
      {
        name: 'resource_exhaustion',
        threshold: 0.9,
        check(input, level) {
          const usage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
          return {
            tripped: usage > this.threshold,
            reason: usage > this.threshold ? `Mémoire à ${(usage * 100).toFixed(1)}%` : null,
            cooldown: 120000
          };
        }
      }
    ];

    for (const breaker of breakers) {
      this.circuitBreakers.set(breaker.name, breaker);
    }
  }

  // ─── FONCTIONS UTILITAIRES ─────────────────────────────────────────────────

  _analyzeSentiment(text) {
    const positive = ['bon', 'bien', 'excellent', 'parfait', 'super', 'génial', 'merci', 'svp', 's\'il vous plaît'];
    const negative = ['mauvais', 'bug', 'casse', 'marche pas', 'erreur', 'supprime', 'efface', 'détruit'];
    
    const words = text.toLowerCase().split(/\s+/);
    const posCount = words.filter(w => positive.includes(w)).length;
    const negCount = words.filter(w => negative.includes(w)).length;

    return { positive: posCount, negative: negCount, score: posCount - negCount };
  }

  _extractCommands(text) {
    const commands = [];
    const patterns = [
      /\b(create|update|delete|insert|select|drop|alter|truncate)\b/gi,
      /\b(give|set|add|remove|spawn|teleport|kick|ban|warn)\b/gi,
      /\b(exec|eval|spawn|run|system|shell)\b/gi
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) commands.push(...matches.map(m => m.toLowerCase()));
    }

    return [...new Set(commands)];
  }

  _extractKeywords(text) {
    const keywords = [];
    const important = ['admin', 'delete', 'money', 'ban', 'kick', 'spawn', 'give', 'reset', 'clear', 'all'];

    for (const word of important) {
      if (text.includes(word)) keywords.push(word);
    }

    return keywords;
  }

  _calculateTrustScore(context) {
    let score = 0.5;

    if (context.role === 'admin') score += 0.3;
    if (context.userId && this._userExists(context.userId)) score += 0.2;
    if (context.userAgent) score += 0.1;

    return Math.min(1, Math.max(0, score));
  }

  _userExists(userId) {
    return this.decisions.some(d => d.userId === userId);
  }

  _isBanned(userId) {
    return this.decisions.some(d => 
      d.userId === userId && 
      d.action === 'block' && 
      d.level === 'RED'
    );
  }

  _checkRateLimit(ip) {
    if (!ip) return { exceeded: false, remaining: 100 };
    
    const now = Date.now();
    const window = 60000; // 1 minute
    const maxRequests = 100;

    const userRequests = this.decisions.filter(d => 
      d.ip === ip && now - d.timestamp < window
    );

    return {
      exceeded: userRequests.length >= maxRequests,
      count: userRequests.length,
      remaining: Math.max(0, maxRequests - userRequests.length),
      resetIn: window - (now - (userRequests[0]?.timestamp || now))
    };
  }

  _detectUnusualActivity(userId) {
    if (!userId) return false;

    const userDecisions = this.decisions.filter(d => d.userId === userId);
    if (userDecisions.length < 5) return false;

    // Si le comportement change soudainement
    const recent = userDecisions.slice(-5);
    const old = userDecisions.slice(0, 5);
    
    const recentScore = recent.reduce((s, d) => s + (d.score || 0), 0) / recent.length;
    const oldScore = old.reduce((s, d) => s + (d.score || 0), 0) / old.length;

    return recentScore > oldScore * 2;
  }

  _timeSinceLastAction(userId) {
    if (!userId) return Infinity;
    const last = this.decisions.filter(d => d.userId === userId).pop();
    return last ? Date.now() - last.timestamp : Infinity;
  }

  _getConcurrentSessions(userId) {
    if (!userId) return 0;
    const now = Date.now();
    const timeout = 300000; // 5 minutes
    return this.decisions.filter(d => 
      d.userId === userId && now - d.timestamp < timeout
    ).length;
  }

  _checkGeolocation(ip) {
    // Placeholder — à connecter à un service de géolocalisation
    return { risk: 'low', country: null };
  }

  _getPatternSeverity(name) {
    const severities = {
      'SQL Injection': 'critical',
      'NoSQL Injection': 'critical',
      'XSS Attack': 'critical',
      'Command Injection': 'critical',
      'SSRF Attempt': 'critical',
      'Prototype Pollution': 'critical',
      'Path Traversal': 'high',
      'Mass Assignment': 'high',
      'Auth Bypass': 'high',
      'File Inclusion': 'high',
      'Buffer Overflow': 'medium',
      'Race Condition': 'medium'
    };

    return severities[name] || 'low';
  }

  async _loadThreatDatabase() {
    // Charger la base de données des menaces
    // À implémenter avec des fichiers JSON externes
  }

  // ─── API PUBLIQUE ──────────────────────────────────────────────────────────

  getStatus() {
    return {
      level: this.currentRisk.level,
      score: this.currentRisk.score,
      metrics: this.metrics,
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, breaker]) => ({
        name,
        status: breaker.calls?.length < breaker.threshold ? 'closed' : 'open'
      })),
      decisions24h: this.decisions.filter(d => Date.now() - d.timestamp < 86400000).length,
      auditChainLength: this.auditChain.length
    };
  }

  getDecisionHistory(limit = 50) {
    return this.decisions.slice(-limit);
  }

  verifyAuditChain() {
    let valid = true;
    for (let i = 1; i < this.auditChain.length; i++) {
      const expectedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(this.auditChain[i]) + (this.auditChain[i - 1]?.hash || ''))
        .digest('hex');
      
      if (this.auditChain[i].hash !== expectedHash) {
        valid = false;
        break;
      }
    }
    return { valid, length: this.auditChain.length, firstEntry: this.auditChain[0]?.timestamp };
  }

  addCustomRule(name, condition, action = 'block', severity = 'medium') {
    this.rules.set(name, {
      name,
      severity,
      condition,
      action
    });
  }

  addThreatPattern(name, pattern, severity = 'medium') {
    this.threatPatterns.set(name, pattern);
  }
}

export default TroxtThirdEye;