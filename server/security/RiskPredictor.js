''use strict';

/**
 * RiskPredictor v2.0.0
 * ─────────────────────────────────────────────────────────────────────────────
 * Prédit le niveau de risque d'une action/intention avant exécution.
 *
 * Améliorations v2 :
 * - Système de règles extensible (addRule / removeRule)
 * - Historique des prédictions avec statistiques
 * - Machine Learning local (ajustement des poids par feedback)
 * - Cache de prédictions (dedup rapide)
 * - Hooks pre/post predict
 * - Audit log intégré
 * - Multi-scoring (patterns regex enrichis)
 * - Détection behavioral (séquences suspectes)
 * - Export/Import du modèle
 * - Métriques de performance
 * - Compatible Node.js CommonJS & ESM
 */

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════

const VERSION = '2.0.0';

const RISK_LEVEL = Object.freeze({
  GREEN: 'GREEN',   // 0–19   : Sûr
  YELLOW: 'YELLOW',  // 20–39  : Modéré
  ORANGE: 'ORANGE',  // 40–69  : Élevé
  RED: 'RED',     // 70–89  : Très élevé
  BLACK: 'BLACK',   // 90–100 : Critique
});

const RISK_THRESHOLDS = Object.freeze({
  GREEN_MAX: 19,
  YELLOW_MAX: 39,
  ORANGE_MAX: 69,
  RED_MAX: 89,
});

const COMPLEXITY_SCORE = Object.freeze({
  trivial: 5,
  simple: 10,
  medium: 30,
  complex: 60,
  critical: 85,
});

const INTENT_RISK_SCORE = Object.freeze({
  read: 5,
  inspect: 8,
  analyze: 10,
  view: 6,
  list: 5,
  generate: 15,
  create: 20,
  write: 28,
  update: 30,
  edit: 35,
  refactor: 45,
  install: 55,
  configure: 50,
  delete: 75,
  remove: 72,
  destroy: 80,
  migrate: 78,
  deploy: 82,
  execute: 85,
  run: 80,
  security: 88,
  override: 83,
  unknown: 35,
});

const SAFE_MODES = Object.freeze({
  DRY_RUN: 'dry_run',
  REVIEW_REQUIRED: 'review_required',
  BACKUP_REQUIRED: 'backup_required',
  HUMAN_CONFIRMATION: 'human_confirmation',
  BLOCKED: 'blocked',
});

// ── Mots-clés sensibles (enrichis) ──────────────────────────────────────────
const SENSITIVE_KEYWORDS = Object.freeze([
  // Destructif
  'delete', 'remove', 'drop', 'truncate', 'overwrite', 'reset',
  'rm -rf', 'format', 'purge', 'wipe', 'erase', 'destroy',
  // Infrastructure
  'deploy', 'production', 'prod', 'migration', 'database', 'db',
  'rollback', 'rollout', 'kubernetes', 'docker', 'ci/cd',
  // Secrets
  'token', 'secret', 'api_key', 'password', 'passwd', 'credential',
  '.env', 'private_key', 'ssh', 'cert', 'certificate',
  // Accès
  'admin', 'permission', 'auth', 'authorization', 'authentication',
  'sudo', 'root', 'superuser', 'privilege',
  // Finance
  'payment', 'billing', 'bank', 'stripe', 'paypal', 'credit',
  // Sécurité
  'firewall', 'security', 'exploit', 'vulnerability', 'injection',
  'xss', 'sql', 'csrf', 'bypass',
]);

// ── Patterns regex critiques ─────────────────────────────────────────────────
const CRITICAL_PATTERNS = Object.freeze([
  { pattern: /rm\s+-rf/i, score: 95, label: 'RM_RF' },
  { pattern: /drop\s+table/i, score: 90, label: 'DROP_TABLE' },
  { pattern: /delete\s+from/i, score: 85, label: 'DELETE_FROM' },
  { pattern: /truncate\s+table/i, score: 88, label: 'TRUNCATE_TABLE' },
  { pattern: /format\s+[a-z]:/i, score: 95, label: 'FORMAT_DISK' },
  { pattern: /production|prod\b/i, score: 40, label: 'PRODUCTION_ENV' },
  { pattern: /api[-_]?key|secret[-_]?key/i, score: 35, label: 'SECRET_KEY' },
  { pattern: /chmod\s+777/i, score: 70, label: 'CHMOD_777' },
  { pattern: /sudo\s+su/i, score: 80, label: 'SUDO_SU' },
  { pattern: /eval\s*\(/i, score: 75, label: 'EVAL' },
  { pattern: /exec\s*\(/i, score: 70, label: 'EXEC' },
  { pattern: /shell_exec/i, score: 75, label: 'SHELL_EXEC' },
  { pattern: /process\.exit/i, score: 45, label: 'PROCESS_EXIT' },
  { pattern: /--no-dry-run/i, score: 55, label: 'NO_DRY_RUN' },
  { pattern: /force\s+push/i, score: 65, label: 'FORCE_PUSH' },
]);

// ── Scores de contexte ───────────────────────────────────────────────────────
const CONTEXT_RULES = Object.freeze([
  { key: 'environment', match: /^production$|^prod$/i, score: 35, label: 'PROD_ENV' },
  { key: 'environment', match: /^staging$/i, score: 18, label: 'STAGING_ENV' },
  { key: 'environment', match: /^test$/i, score: 5, label: 'TEST_ENV' },
  { key: 'hasDatabase', match: true, score: 25, label: 'DATABASE' },
  { key: 'database', match: true, score: 25, label: 'DATABASE' },
  { key: 'hasAuth', match: true, score: 20, label: 'AUTH' },
  { key: 'auth', match: true, score: 20, label: 'AUTH' },
  { key: 'hasPayments', match: true, score: 25, label: 'PAYMENTS' },
  { key: 'payments', match: true, score: 25, label: 'PAYMENTS' },
  { key: 'hasSecrets', match: true, score: 30, label: 'SECRETS' },
  { key: 'secrets', match: true, score: 30, label: 'SECRETS' },
  { key: 'writesFiles', match: true, score: 15, label: 'FILE_WRITE' },
  { key: 'fileWrite', match: true, score: 15, label: 'FILE_WRITE' },
  { key: 'executesCode', match: true, score: 25, label: 'CODE_EXEC' },
  { key: 'execute', match: true, score: 25, label: 'CODE_EXEC' },
  { key: 'networkAccess', match: true, score: 12, label: 'NETWORK' },
  { key: 'userFacing', match: true, score: 10, label: 'USER_FACING' },
  { key: 'bulkOperation', match: true, score: 20, label: 'BULK_OP' },
  { key: 'irreversible', match: true, score: 30, label: 'IRREVERSIBLE' },
  { key: 'multiTenant', match: true, score: 25, label: 'MULTI_TENANT' },
]);

const PATH_RULES = Object.freeze([
  { pattern: /\.env/i, score: 30, label: 'ENV_FILE' },
  { pattern: /package\.json/i, score: 12, label: 'PACKAGE_JSON' },
  { pattern: /\/server/i, score: 10, label: 'SERVER_PATH' },
  { pattern: /\/auth/i, score: 18, label: 'AUTH_PATH' },
  { pattern: /\/(database|db)\//i, score: 20, label: 'DB_PATH' },
  { pattern: /\/config/i, score: 15, label: 'CONFIG_PATH' },
  { pattern: /\/secret/i, score: 28, label: 'SECRET_PATH' },
  { pattern: /\/migration/i, score: 22, label: 'MIGRATION_PATH' },
  { pattern: /\/production/i, score: 32, label: 'PROD_PATH' },
  { pattern: /\/backup/i, score: 8, label: 'BACKUP_PATH' },
]);

// ══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════════

function clamp(value, min = 0, max = 100) {
  const n = Number(value);
  return !Number.isFinite(n) ? min : Math.max(min, Math.min(max, n));
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeString(value, fallback = '') {
  return typeof value !== 'string' ? fallback : value.trim();
}

function normalizeConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return n > 1 ? clamp(n, 0, 100) / 100 : clamp(n, 0, 1);
}

function roundScore(value) {
  return Math.round(clamp(value, 0, 100));
}

function getLevelFromScore(score) {
  if (score <= RISK_THRESHOLDS.GREEN_MAX) return RISK_LEVEL.GREEN;
  if (score <= RISK_THRESHOLDS.YELLOW_MAX) return RISK_LEVEL.YELLOW;
  if (score <= RISK_THRESHOLDS.ORANGE_MAX) return RISK_LEVEL.ORANGE;
  if (score <= RISK_THRESHOLDS.RED_MAX) return RISK_LEVEL.RED;
  return RISK_LEVEL.BLACK;
}

function hasKeyword(text, keywords) {
  const lower = String(text || '').toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

function extractIntentNames(intents) {
  return toArray(intents)
    .map(i => {
      if (typeof i === 'string') return i;
      return i?.name || i?.type || i?.intent || i?.action || 'unknown';
    })
    .map(name => normalizeString(name, 'unknown').toLowerCase());
}

function hashPredict(understanding, intents, context) {
  try {
    return JSON.stringify({ understanding, intents, context });
  } catch {
    return String(Date.now());
  }
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return `${Math.floor(h / 24)}j ${h % 24}h ${m % 60}m ${s % 60}s`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCORING FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function scoreIntentRisk(intentNames) {
  if (!intentNames.length) return INTENT_RISK_SCORE.unknown;
  return intentNames.reduce((max, name) => {
    return Math.max(max, INTENT_RISK_SCORE[name] ?? INTENT_RISK_SCORE.unknown);
  }, 0);
}

function detectSensitiveText(understanding, intents, context) {
  const parts = [
    understanding?.summary,
    understanding?.raw,
    understanding?.request,
    understanding?.goal,
    understanding?.command,
    context?.command,
    context?.path,
    context?.target,
    context?.environment,
    ...extractIntentNames(intents),
  ];
  return hasKeyword(parts.filter(Boolean).join(' '), SENSITIVE_KEYWORDS);
}

function detectCriticalPatterns(understanding, context) {
  const text = [
    understanding?.summary,
    understanding?.raw,
    understanding?.command,
    understanding?.request,
    context?.command,
    context?.path,
    context?.query,
  ].filter(Boolean).join(' ');

  const matched = [];
  let maxScore = 0;

  for (const rule of CRITICAL_PATTERNS) {
    if (rule.pattern.test(text)) {
      matched.push({ label: rule.label, score: rule.score });
      if (rule.score > maxScore) maxScore = rule.score;
    }
  }

  return { matched, maxScore };
}

function scoreContextRisk(context = {}) {
  let score = 0;
  const flags = [];
  const path = normalizeString(context.path || context.filePath || '').toLowerCase();

  // Context rules
  for (const rule of CONTEXT_RULES) {
    const val = context[rule.key];
    if (val === undefined || val === null) continue;

    if (rule.match instanceof RegExp) {
      if (rule.match.test(String(val))) {
        score += rule.score;
        flags.push(rule.label);
      }
    } else if (typeof rule.match === 'boolean') {
      if (Boolean(val) === rule.match) {
        score += rule.score;
        flags.push(rule.label);
      }
    }
  }

  // Path rules
  for (const rule of PATH_RULES) {
    if (rule.pattern.test(path)) {
      score += rule.score;
      flags.push(rule.label);
    }
  }

  return { score: clamp(score, 0, 100), flags: [...new Set(flags)] };
}

function scoreConfidencePenalty(confidence) {
  if (confidence >= 0.90) return 0;
  if (confidence >= 0.75) return 5;
  if (confidence >= 0.60) return 12;
  if (confidence >= 0.40) return 22;
  return 35;
}

// ══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION & GUARDS
// ══════════════════════════════════════════════════════════════════════════════

function buildRecommendation(level, score, context = {}) {
  const base = {
    [RISK_LEVEL.GREEN]: { mode: SAFE_MODES.DRY_RUN, message: 'Risque faible. Action possible avec vérification normale.' },
    [RISK_LEVEL.YELLOW]: { mode: SAFE_MODES.REVIEW_REQUIRED, message: 'Risque modéré. Relire les changements avant exécution.' },
    [RISK_LEVEL.ORANGE]: { mode: SAFE_MODES.BACKUP_REQUIRED, message: 'Risque élevé. Faire une sauvegarde ou un diff avant modification.' },
    [RISK_LEVEL.RED]: { mode: SAFE_MODES.HUMAN_CONFIRMATION, message: 'Risque très élevé. Confirmation explicite requise avant exécution.' },
    [RISK_LEVEL.BLACK]: { mode: SAFE_MODES.BLOCKED, message: `Risque critique (${score}/100). Bloquer sauf validation admin claire.` },
  };

  const rec = { ...base[level] };

  // Enrichissements contextuels
  if (context.hasDatabase || context.database) {
    rec.message += ' Transaction DB recommandée.';
  }
  if (context.irreversible) {
    rec.message += ' ⚠️ Action IRRÉVERSIBLE.';
  }

  return Object.freeze(rec);
}

function buildGuards(level, context = {}, criticalPatterns = []) {
  const guards = new Set();

  if (level !== RISK_LEVEL.GREEN) guards.add('review_diff');

  if ([RISK_LEVEL.ORANGE, RISK_LEVEL.RED, RISK_LEVEL.BLACK].includes(level)) {
    guards.add('create_backup');
    guards.add('require_explicit_confirmation');
  }

  if (context.hasDatabase || context.database) {
    guards.add('database_backup');
    guards.add('transaction_required');
  }

  if (context.hasSecrets || context.secrets) {
    guards.add('redact_secrets');
  }

  if (context.executesCode || context.execute) {
    guards.add('sandbox_execution');
  }

  if (context.networkAccess) {
    guards.add('rate_limit_check');
    guards.add('network_policy_check');
  }

  if (context.userFacing) {
    guards.add('ui_validation_required');
  }

  if (context.bulkOperation) {
    guards.add('batch_limit_check');
    guards.add('progress_monitoring');
  }

  if (context.irreversible) {
    guards.add('irreversible_warning');
    guards.add('double_confirmation');
  }

  if (context.multiTenant) {
    guards.add('tenant_isolation_check');
  }

  if (criticalPatterns.some(p => p.label === 'RM_RF' || p.label === 'FORMAT_DISK')) {
    guards.add('filesystem_snapshot');
  }

  if (level === RISK_LEVEL.BLACK) {
    guards.add('block_by_default');
    guards.add('alert_security_team');
    guards.add('log_incident');
  }

  return Object.freeze([...guards]);
}

// ══════════════════════════════════════════════════════════════════════════════
// ONLINE STATS (Welford algorithm)
// ══════════════════════════════════════════════════════════════════════════════

class OnlineStats {
  constructor() {
    this._n = 0;
    this._mean = 0;
    this._M2 = 0;
  }

  update(x) {
    this._n++;
    const delta = x - this._mean;
    this._mean += delta / this._n;
    this._M2 += delta * (x - this._mean);
  }

  get mean() { return this._mean; }
  get variance() { return this._n > 1 ? this._M2 / (this._n - 1) : 0; }
  get std() { return Math.sqrt(this.variance); }
  get count() { return this._n; }

  zScore(x) {
    return this.std > 0 ? Math.abs((x - this._mean) / this.std) : 0;
  }

  toJSON() {
    return { mean: Math.round(this._mean), std: Math.round(this.std), count: this._n };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RISK PREDICTOR v2.0.0
// ══════════════════════════════════════════════════════════════════════════════

class RiskPredictor {
  constructor(brain = null, options = {}) {
    this.brain = brain;
    this.version = VERSION;

    this.options = Object.freeze({
      strictMode: options.strictMode ?? true,
      maxAllowedRisk: options.maxAllowedRisk ?? 89,
      confidenceBoost: options.confidenceBoost ?? 0.12,
      cacheSize: options.cacheSize ?? 500,
      cacheTTL: options.cacheTTL ?? 60_000,    // 1 min
      enableAudit: options.enableAudit ?? true,
      enableLearning: options.enableLearning ?? true,
      auditMaxEntries: options.auditMaxEntries ?? 2_000,
      historyMaxSize: options.historyMaxSize ?? 1_000,
      anomalyZScore: options.anomalyZScore ?? 2.5,
      weights: Object.freeze({
        complexity: options.weights?.complexity ?? 0.28,
        intent: options.weights?.intent ?? 0.28,
        context: options.weights?.context ?? 0.24,
        confidence: options.weights?.confidence ?? 0.14,
        sensitivity: options.weights?.sensitivity ?? 0.06,
        ...(options.weights || {}),
      }),
    });

    // Stockages
    this._cache = new Map();         // hash → { result, ts }
    this._history = [];
    this._auditLog = [];
    this._rules = new Map();         // id → { fn, weight, label }
    this._hooks = { pre: [], post: [] };
    this._feedbacks = [];
    this._scoreStats = new OnlineStats();
    this._startTime = Date.now();

    // Métriques
    this.metrics = {
      totalPredictions: 0,
      cacheHits: 0,
      blockedPredictions: 0,
      feedbackReceived: 0,
      rulesApplied: 0,
      anomaliesDetected: 0,
      avgScore: 0,
      totalDurationMs: 0,
    };

    // Poids appris (ML local)
    this._learnedWeights = { ...this.options.weights };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HOOKS
  // ══════════════════════════════════════════════════════════════════════════

  /** Ajouter un hook pre ou post predict */
  addHook(phase, fn) {
    if (!['pre', 'post'].includes(phase)) throw new Error(`Phase invalide: ${phase}`);
    if (typeof fn !== 'function') throw new Error('Hook doit être une fonction');
    this._hooks[phase].push(fn);
    return this;
  }

  async _runHooks(phase, data) {
    let result = data;
    for (const fn of this._hooks[phase]) {
      try { result = (await fn(result, phase)) ?? result; }
      catch (e) { /* hooks non bloquants */ }
    }
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RÈGLES PERSONNALISÉES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Ajouter une règle de scoring personnalisée
   * @param {string} id - Identifiant unique
   * @param {Function} fn - (understanding, intents, context) => { score, label }
   * @param {number} weight - Poids dans le score final (0–1)
   */
  addRule(id, fn, weight = 0.1, label = id) {
    if (typeof id !== 'string') throw new Error('ID doit être une string');
    if (typeof fn !== 'function') throw new Error('Rule doit être une fonction');
    this._rules.set(id, { fn, weight, label });
    return this;
  }

  removeRule(id) {
    this._rules.delete(id);
    return this;
  }

  getRules() {
    return [...this._rules.entries()].map(([id, r]) => ({ id, label: r.label, weight: r.weight }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRÉDICTION PRINCIPALE
  // ══════════════════════════════════════════════════════════════════════════

  async predict(understanding = {}, intents = [], context = {}) {
    const startTime = Date.now();
    this.metrics.totalPredictions++;

    // ── Cache ──────────────────────────────────────────────────────────────
    const cacheKey = hashPredict(understanding, intents, context);
    const cached = this._cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.options.cacheTTL) {
      this.metrics.cacheHits++;
      return cached.result;
    }

    // ── Hook pre-predict ───────────────────────────────────────────────────
    const preInput = await this._runHooks('pre', { understanding, intents, context });
    const u = preInput.understanding || understanding;
    const i = preInput.intents || intents;
    const c = preInput.context || context;

    // ── Scoring de base ────────────────────────────────────────────────────
    const complexity = normalizeString(u?.complexity || c?.complexity, 'simple').toLowerCase();
    const confidence = normalizeConfidence(u?.confidence ?? c?.confidence ?? 0.5);
    const intentNames = extractIntentNames(i);

    const complexityScore = COMPLEXITY_SCORE[complexity] ?? COMPLEXITY_SCORE.medium;
    const intentScore = scoreIntentRisk(intentNames);
    const contextResult = scoreContextRisk(c);
    const contextScore = contextResult.score;
    const contextFlags = contextResult.flags;
    const confidencePenalty = scoreConfidencePenalty(confidence);
    const sensitiveDetected = detectSensitiveText(u, i, c);
    const sensitivityScore = sensitiveDetected ? 18 : 0;
    const criticalResult = detectCriticalPatterns(u, c);
    const criticalBoost = criticalResult.maxScore > 0
      ? Math.min(criticalResult.maxScore, 40)
      : 0;

    // ── Règles personnalisées ─────────────────────────────────────────────
    let rulesScore = 0;
    const ruleFactors = [];
    for (const [id, rule] of this._rules) {
      try {
        const res = await rule.fn(u, i, c);
        const s = clamp(res?.score ?? 0, 0, 100);
        rulesScore += s * rule.weight;
        ruleFactors.push({ name: id, label: rule.label, score: s, weight: rule.weight });
        this.metrics.rulesApplied++;
      } catch { /* règle non bloquante */ }
    }

    // ── Poids appris (ML) ─────────────────────────────────────────────────
    const w = this._learnedWeights;

    const weightedScore =
      complexityScore * w.complexity +
      intentScore * w.intent +
      contextScore * w.context +
      confidencePenalty * w.confidence +
      sensitivityScore * w.sensitivity +
      rulesScore;

    let score = roundScore(weightedScore);

    // ── Boost patterns critiques ──────────────────────────────────────────
    if (criticalBoost > 0) {
      score = Math.max(score, criticalBoost);
    }

    // ── Strict mode ────────────────────────────────────────────────────────
    if (this.options.strictMode && sensitiveDetected) {
      score = Math.max(score, 45);
    }

    // ── Détection anomalie (Z-score vs historique) ────────────────────────
    let isAnomaly = false;
    if (this._scoreStats.count > 10) {
      const z = this._scoreStats.zScore(score);
      if (z > this.options.anomalyZScore) {
        isAnomaly = true;
        this.metrics.anomaliesDetected++;
        score = Math.min(100, score + 5); // Pénalité anomalie
      }
    }
    this._scoreStats.update(score);

    // ── Force risk level override ─────────────────────────────────────────
    if (c.forceRiskLevel && RISK_LEVEL[c.forceRiskLevel]) {
      const forcedLevel = RISK_LEVEL[c.forceRiskLevel];
      const result = this._buildResult({
        score, level: forcedLevel, confidence, intentNames, complexity,
        complexityScore, intentScore, contextScore, contextFlags,
        confidencePenalty, sensitiveDetected, sensitivityScore,
        criticalPatterns: criticalResult.matched, ruleFactors,
        isAnomaly, forced: true, context: c,
      });

      this._finalize(cacheKey, result, startTime, u, i, c, score);
      return result;
    }

    // ── Scoring final ─────────────────────────────────────────────────────
    const level = getLevelFromScore(score);
    if (level === RISK_LEVEL.BLACK || score > this.options.maxAllowedRisk) {
      this.metrics.blockedPredictions++;
    }

    const result = this._buildResult({
      score, level, confidence, intentNames, complexity,
      complexityScore, intentScore, contextScore, contextFlags,
      confidencePenalty, sensitiveDetected, sensitivityScore,
      criticalPatterns: criticalResult.matched, ruleFactors,
      isAnomaly, forced: false, context: c,
    });

    this._finalize(cacheKey, result, startTime, u, i, c, score);

    // ── Hook post-predict ─────────────────────────────────────────────────
    return this._runHooks('post', result);
  }

  _buildResult({
    score, level, confidence, intentNames, complexity,
    complexityScore, intentScore, contextScore, contextFlags,
    confidencePenalty, sensitiveDetected, sensitivityScore,
    criticalPatterns, ruleFactors, isAnomaly, forced, context,
  }) {
    const ok = score <= this.options.maxAllowedRisk && level !== RISK_LEVEL.BLACK;

    const factors = Object.freeze([
      {
        name: 'complexity', value: complexity,
        score: complexityScore, weight: this._learnedWeights.complexity,
      },
      {
        name: 'intent',
        value: intentNames.length ? intentNames : ['unknown'],
        score: intentScore, weight: this._learnedWeights.intent,
      },
      {
        name: 'context',
        value: { flags: contextFlags, ...this._contextSummary(context) },
        score: contextScore, weight: this._learnedWeights.context,
      },
      {
        name: 'confidence_penalty',
        value: normalizeConfidence(confidence),
        score: confidencePenalty, weight: this._learnedWeights.confidence,
      },
      {
        name: 'sensitive_keywords',
        value: sensitiveDetected,
        score: sensitivityScore, weight: this._learnedWeights.sensitivity,
      },
      ...ruleFactors.map(r => ({ name: r.name, value: r.label, score: r.score, weight: r.weight })),
      ...(criticalPatterns.length > 0 ? [{
        name: 'critical_patterns',
        value: criticalPatterns.map(p => p.label),
        score: Math.max(...criticalPatterns.map(p => p.score)),
        weight: 0,
      }] : []),
    ]);

    return Object.freeze({
      ok,
      level,
      score,
      confidence: normalizeConfidence(confidence + this.options.confidenceBoost),
      factors,
      guards: buildGuards(level, context, criticalPatterns),
      recommendation: buildRecommendation(level, score, context),
      criticalPatterns,
      isAnomaly,
      meta: Object.freeze({
        version: VERSION,
        source: 'RiskPredictor',
        strictMode: this.options.strictMode,
        maxAllowedRisk: this.options.maxAllowedRisk,
        forced: forced,
        learnedWeights: { ...this._learnedWeights },
      }),
    });
  }

  _contextSummary(context) {
    return {
      environment: context.environment || context.env || 'unknown',
      hasDatabase: Boolean(context.hasDatabase || context.database),
      hasAuth: Boolean(context.hasAuth || context.auth),
      hasSecrets: Boolean(context.hasSecrets || context.secrets),
      executesCode: Boolean(context.executesCode || context.execute),
      writesFiles: Boolean(context.writesFiles || context.fileWrite),
      networkAccess: Boolean(context.networkAccess),
      bulkOperation: Boolean(context.bulkOperation),
      irreversible: Boolean(context.irreversible),
    };
  }

  _finalize(cacheKey, result, startTime, u, i, c, score) {
    const durationMs = Date.now() - startTime;
    this.metrics.totalDurationMs += durationMs;
    this.metrics.avgScore = Math.round(
      (this.metrics.avgScore * (this.metrics.totalPredictions - 1) + score) /
      this.metrics.totalPredictions
    );

    // Cache
    if (this._cache.size >= this.options.cacheSize) {
      const oldest = this._cache.keys().next().value;
      this._cache.delete(oldest);
    }
    this._cache.set(cacheKey, { result, ts: Date.now() });

    // Historique
    const histEntry = {
      id: `pred_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      score: result.score,
      level: result.level,
      ok: result.ok,
      durationMs,
      timestamp: Date.now(),
    };
    this._history.unshift(histEntry);
    if (this._history.length > this.options.historyMaxSize) this._history.length = this.options.historyMaxSize;

    // Audit
    if (this.options.enableAudit) {
      this._addAudit('PREDICT', { id: histEntry.id, score: result.score, level: result.level, ok: result.ok, durationMs });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FEEDBACK & APPRENTISSAGE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Rétroaction sur une prédiction pour ajuster les poids
   * @param {number} predictedScore - Score prédit
   * @param {number} actualScore    - Score réel observé (0–100)
   * @param {string} label          - 'false_positive' | 'false_negative' | 'correct'
   */
  feedback(predictedScore, actualScore, label = 'correct') {
    this.metrics.feedbackReceived++;

    const fb = {
      predictedScore,
      actualScore,
      error: actualScore - predictedScore,
      label,
      ts: Date.now(),
    };

    this._feedbacks.push(fb);
    if (this._feedbacks.length > 200) this._feedbacks.shift();

    if (!this.options.enableLearning) return;

    // Ajustement simple des poids (gradient descent basique)
    const error = fb.error;
    const lr = 0.005; // Learning rate

    const w = this._learnedWeights;
    w.complexity = clamp(w.complexity + lr * error * 0.1, 0.05, 0.6);
    w.intent = clamp(w.intent + lr * error * 0.1, 0.05, 0.6);
    w.context = clamp(w.context + lr * error * 0.1, 0.05, 0.5);
    w.confidence = clamp(w.confidence + lr * error * 0.05, 0.02, 0.4);
    w.sensitivity = clamp(w.sensitivity + lr * error * 0.02, 0.01, 0.3);

    // Normaliser les poids (somme = 1)
    const sum = w.complexity + w.intent + w.context + w.confidence + w.sensitivity;
    if (sum > 0) {
      w.complexity = Math.round((w.complexity / sum) * 1000) / 1000;
      w.intent = Math.round((w.intent / sum) * 1000) / 1000;
      w.context = Math.round((w.context / sum) * 1000) / 1000;
      w.confidence = Math.round((w.confidence / sum) * 1000) / 1000;
      w.sensitivity = Math.round((w.sensitivity / sum) * 1000) / 1000;
    }

    if (this.options.enableAudit) {
      this._addAudit('FEEDBACK', { label, error: fb.error, weights: { ...w } });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BATCH PREDICT
  // ══════════════════════════════════════════════════════════════════════════

  async predictBatch(items = [], options = {}) {
    const concurrency = options.concurrency || 5;
    const results = [];

    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency);
      const settled = await Promise.allSettled(
        chunk.map(item => this.predict(item.understanding, item.intents, item.context))
      );
      for (const s of settled) {
        results.push(s.status === 'fulfilled' ? s.value : { ok: false, error: s.reason?.message, score: 100, level: RISK_LEVEL.BLACK });
      }
    }

    const summary = {
      total: results.length,
      ok: results.filter(r => r.ok).length,
      blocked: results.filter(r => !r.ok).length,
      avgScore: Math.round(results.reduce((s, r) => s + (r.score || 0), 0) / Math.max(1, results.length)),
      levels: results.reduce((acc, r) => { acc[r.level] = (acc[r.level] || 0) + 1; return acc; }, {}),
    };

    return { results, summary };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXPLAIN
  // ══════════════════════════════════════════════════════════════════════════

  /** Explication humaine d'une prédiction */
  explain(predictionResult) {
    const { score, level, factors, guards, recommendation, criticalPatterns, isAnomaly } = predictionResult;

    const lines = [
      `🎯 Score de risque: ${score}/100 — Niveau ${level}`,
      `📋 Recommandation: ${recommendation.message}`,
      `🛡️  Mode: ${recommendation.mode}`,
      '',
      '📊 Facteurs de risque:',
    ];

    for (const f of factors) {
      const weight = f.weight ? `(×${(f.weight * 100).toFixed(0)}%)` : '';
      lines.push(`  • ${f.name}: score=${f.score} ${weight}`);
    }

    if (criticalPatterns?.length > 0) {
      lines.push('', '🚨 Patterns critiques détectés:');
      for (const p of criticalPatterns) lines.push(`  • ${p.label} (score ${p.score})`);
    }

    if (guards?.length > 0) {
      lines.push('', '🔒 Garde-fous activés:');
      for (const g of guards) lines.push(`  • ${g}`);
    }

    if (isAnomaly) {
      lines.push('', '⚠️  Score statistiquement anormal (anomalie détectée)');
    }

    return lines.join('\n');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT / IMPORT MODÈLE
  // ══════════════════════════════════════════════════════════════════════════

  exportModel() {
    return {
      version: VERSION,
      exportedAt: new Date().toISOString(),
      learnedWeights: { ...this._learnedWeights },
      scoreStats: this._scoreStats.toJSON(),
      rules: this.getRules(),
      metrics: { ...this.metrics },
      feedbackCount: this._feedbacks.length,
    };
  }

  importModel(model) {
    if (!model || typeof model !== 'object') throw new Error('Modèle invalide');
    if (model.learnedWeights) Object.assign(this._learnedWeights, model.learnedWeights);
    return { ok: true, version: model.version };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUDIT
  // ══════════════════════════════════════════════════════════════════════════

  _addAudit(action, data) {
    if (this._auditLog.length >= this.options.auditMaxEntries) {
      this._auditLog.splice(0, Math.floor(this.options.auditMaxEntries * 0.1));
    }
    this._auditLog.push({ action, data, ts: Date.now(), iso: new Date().toISOString() });
  }

  getAuditLog(limit = 100) {
    return this._auditLog.slice(-limit);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HISTORIQUE & STATS
  // ══════════════════════════════════════════════════════════════════════════

  getHistory(limit = 50) {
    return this._history.slice(0, limit);
  }

  getStats() {
    const hist = this._history;
    const byLevel = {};
    for (const h of hist) byLevel[h.level] = (byLevel[h.level] || 0) + 1;

    const recentErrors = this._feedbacks.slice(-20);
    const avgError = recentErrors.length > 0
      ? recentErrors.reduce((s, f) => s + Math.abs(f.error), 0) / recentErrors.length
      : 0;

    return {
      version: VERSION,
      ...this.metrics,
      avgPredictionMs: this.metrics.totalPredictions > 0
        ? Math.round(this.metrics.totalDurationMs / this.metrics.totalPredictions)
        : 0,
      cacheSize: this._cache.size,
      historySize: hist.length,
      auditLogSize: this._auditLog.length,
      byLevel,
      scoreStats: this._scoreStats.toJSON(),
      learnedWeights: { ...this._learnedWeights },
      feedbackCount: this._feedbacks.length,
      avgFeedbackError: Math.round(avgError * 100) / 100,
      rulesCount: this._rules.size,
      uptime: Date.now() - this._startTime,
      uptimeHuman: formatUptime(Date.now() - this._startTime),
    };
  }

  clearCache() {
    this._cache.clear();
    return this;
  }

  clearHistory() {
    this._history.length = 0;
    return this;
  }

  resetWeights() {
    this._learnedWeights = { ...this.options.weights };
    return this;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

module.exports = RiskPredictor;
module.exports.RiskPredictor = RiskPredictor;
module.exports.RISK_LEVEL = RISK_LEVEL;
module.exports.RISK_THRESHOLDS = RISK_THRESHOLDS;
module.exports.SAFE_MODES = SAFE_MODES;
module.exports.SENSITIVE_KEYWORDS = SENSITIVE_KEYWORDS;
module.exports.CRITICAL_PATTERNS = CRITICAL_PATTERNS;
module.exports.VERSION = VERSION;

// ESM compat
if (typeof module !== 'undefined') module.exports.default = RiskPredictor;