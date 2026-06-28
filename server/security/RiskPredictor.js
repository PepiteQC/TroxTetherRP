'use strict';

/**
 * RiskPredictor
 * ------------------------------------------------------------
 * Prédit le niveau de risque d'une action/intention avant exécution.
 *
 * Objectif :
 * - éviter les actions dangereuses non vérifiées
 * - donner un score clair 0-100
 * - expliquer les facteurs de risque
 * - proposer des garde-fous
 * - rester compatible Node/CommonJS
 */

const RISK_LEVEL = Object.freeze({
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  ORANGE: 'ORANGE',
  RED: 'RED',
  BLACK: 'BLACK',
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
  generate: 15,
  write: 28,
  edit: 35,
  refactor: 45,
  install: 55,
  delete: 75,
  migrate: 78,
  deploy: 82,
  execute: 85,
  security: 88,
  unknown: 35,
});

const SENSITIVE_KEYWORDS = Object.freeze([
  'delete',
  'remove',
  'drop',
  'truncate',
  'overwrite',
  'reset',
  'rm -rf',
  'format',
  'deploy',
  'production',
  'migration',
  'database',
  'token',
  'secret',
  'api_key',
  'password',
  '.env',
  'admin',
  'permission',
  'auth',
  'payment',
  'billing',
  'firewall',
  'security',
]);

const SAFE_MODES = Object.freeze({
  DRY_RUN: 'dry_run',
  REVIEW_REQUIRED: 'review_required',
  BACKUP_REQUIRED: 'backup_required',
  HUMAN_CONFIRMATION: 'human_confirmation',
  BLOCKED: 'blocked',
});

function clamp(value, min = 0, max = 100) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.max(min, Math.min(max, number));
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeString(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

function normalizeConfidence(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0.5;
  }

  if (number > 1) {
    return clamp(number, 0, 100) / 100;
  }

  return clamp(number, 0, 1);
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
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function extractIntentNames(intents) {
  return toArray(intents)
    .map((intent) => {
      if (typeof intent === 'string') return intent;
      return intent?.name || intent?.type || intent?.intent || intent?.action || 'unknown';
    })
    .map((name) => normalizeString(name, 'unknown').toLowerCase());
}

function scoreIntentRisk(intentNames) {
  if (intentNames.length === 0) {
    return INTENT_RISK_SCORE.unknown;
  }

  return intentNames.reduce((highest, intentName) => {
    const score = INTENT_RISK_SCORE[intentName] ?? INTENT_RISK_SCORE.unknown;
    return Math.max(highest, score);
  }, 0);
}

function detectSensitiveText(understanding, intents, context) {
  const parts = [
    understanding?.summary,
    understanding?.raw,
    understanding?.request,
    understanding?.goal,
    context?.command,
    context?.path,
    context?.target,
    context?.environment,
    ...extractIntentNames(intents),
  ];

  const text = parts.filter(Boolean).join(' ');
  return hasKeyword(text, SENSITIVE_KEYWORDS);
}

function scoreContextRisk(context = {}) {
  let score = 0;

  const environment = normalizeString(context.environment || context.env).toLowerCase();
  const target = normalizeString(context.target).toLowerCase();
  const path = normalizeString(context.path || context.filePath).toLowerCase();

  if (environment === 'production' || target === 'production') score += 35;
  if (environment === 'staging') score += 18;
  if (context.hasDatabase === true || context.database === true) score += 25;
  if (context.hasAuth === true || context.auth === true) score += 20;
  if (context.hasPayments === true || context.payments === true) score += 25;
  if (context.hasSecrets === true || context.secrets === true) score += 30;
  if (context.writesFiles === true || context.fileWrite === true) score += 15;
  if (context.executesCode === true || context.execute === true) score += 25;
  if (context.networkAccess === true) score += 12;
  if (context.userFacing === true) score += 10;

  if (path.includes('.env')) score += 30;
  if (path.includes('package.json')) score += 12;
  if (path.includes('server')) score += 10;
  if (path.includes('auth')) score += 18;
  if (path.includes('database') || path.includes('db')) score += 20;

  return clamp(score, 0, 100);
}

function scoreConfidencePenalty(confidence) {
  if (confidence >= 0.9) return 0;
  if (confidence >= 0.75) return 5;
  if (confidence >= 0.6) return 12;
  if (confidence >= 0.4) return 22;
  return 35;
}

function buildRecommendation(level, score) {
  if (level === RISK_LEVEL.GREEN) {
    return {
      mode: SAFE_MODES.DRY_RUN,
      message: 'Risque faible. Action possible avec vérification normale.',
    };
  }

  if (level === RISK_LEVEL.YELLOW) {
    return {
      mode: SAFE_MODES.REVIEW_REQUIRED,
      message: 'Risque modéré. Relire les changements avant exécution.',
    };
  }

  if (level === RISK_LEVEL.ORANGE) {
    return {
      mode: SAFE_MODES.BACKUP_REQUIRED,
      message: 'Risque élevé. Faire une sauvegarde ou un diff avant modification.',
    };
  }

  if (level === RISK_LEVEL.RED) {
    return {
      mode: SAFE_MODES.HUMAN_CONFIRMATION,
      message: 'Risque très élevé. Confirmation explicite requise avant exécution.',
    };
  }

  return {
    mode: SAFE_MODES.BLOCKED,
    message: `Risque critique (${score}/100). Bloquer sauf validation admin claire.`,
  };
}

function buildGuards(level, context = {}) {
  const guards = [];

  if (level !== RISK_LEVEL.GREEN) {
    guards.push('review_diff');
  }

  if ([RISK_LEVEL.ORANGE, RISK_LEVEL.RED, RISK_LEVEL.BLACK].includes(level)) {
    guards.push('create_backup');
    guards.push('require_explicit_confirmation');
  }

  if (context.hasDatabase === true || context.database === true) {
    guards.push('database_backup');
    guards.push('transaction_required');
  }

  if (context.hasSecrets === true || context.secrets === true) {
    guards.push('redact_secrets');
  }

  if (context.executesCode === true || context.execute === true) {
    guards.push('sandbox_execution');
  }

  if (level === RISK_LEVEL.BLACK) {
    guards.push('block_by_default');
  }

  return Object.freeze([...new Set(guards)]);
}

class RiskPredictor {
  constructor(brain, options = {}) {
    this.brain = brain;

    this.options = Object.freeze({
      strictMode: options.strictMode ?? true,
      maxAllowedRisk: options.maxAllowedRisk ?? 89,
      confidenceBoost: options.confidenceBoost ?? 0.12,
    });
  }

  async predict(understanding = {}, intents = [], context = {}) {
    const complexity = normalizeString(
      understanding?.complexity || context?.complexity,
      'simple'
    ).toLowerCase();

    const confidence = normalizeConfidence(
      understanding?.confidence ?? context?.confidence ?? 0.5
    );

    const intentNames = extractIntentNames(intents);
    const complexityScore = COMPLEXITY_SCORE[complexity] ?? COMPLEXITY_SCORE.medium;
    const intentScore = scoreIntentRisk(intentNames);
    const contextScore = scoreContextRisk(context);
    const confidencePenalty = scoreConfidencePenalty(confidence);
    const sensitiveTextDetected = detectSensitiveText(understanding, intents, context);

    const sensitivityScore = sensitiveTextDetected ? 18 : 0;

    const weightedScore =
      complexityScore * 0.28 +
      intentScore * 0.28 +
      contextScore * 0.24 +
      confidencePenalty * 0.14 +
      sensitivityScore * 0.06;

    let score = roundScore(weightedScore);

    if (this.options.strictMode && sensitiveTextDetected) {
      score = Math.max(score, 45);
    }

    if (context.forceRiskLevel && RISK_LEVEL[context.forceRiskLevel]) {
      const forcedLevel = RISK_LEVEL[context.forceRiskLevel];

      return Object.freeze({
        ok: forcedLevel !== RISK_LEVEL.BLACK,
        level: forcedLevel,
        score,
        confidence: normalizeConfidence(confidence + this.options.confidenceBoost),
        factors: Object.freeze([
          { name: 'forced_level', value: forcedLevel, weight: 1 },
        ]),
        guards: buildGuards(forcedLevel, context),
        recommendation: buildRecommendation(forcedLevel, score),
        meta: Object.freeze({
          source: 'RiskPredictor',
          strictMode: this.options.strictMode,
          forced: true,
        }),
      });
    }

    const level = getLevelFromScore(score);
    const recommendation = buildRecommendation(level, score);
    const guards = buildGuards(level, context);

    const ok = score <= this.options.maxAllowedRisk && level !== RISK_LEVEL.BLACK;

    const factors = Object.freeze([
      {
        name: 'complexity',
        value: complexity,
        score: complexityScore,
        weight: 0.28,
      },
      {
        name: 'intent',
        value: intentNames.length ? intentNames : ['unknown'],
        score: intentScore,
        weight: 0.28,
      },
      {
        name: 'context',
        value: {
          environment: context.environment || context.env || 'unknown',
          hasDatabase: Boolean(context.hasDatabase || context.database),
          hasAuth: Boolean(context.hasAuth || context.auth),
          hasSecrets: Boolean(context.hasSecrets || context.secrets),
          executesCode: Boolean(context.executesCode || context.execute),
          writesFiles: Boolean(context.writesFiles || context.fileWrite),
        },
        score: contextScore,
        weight: 0.24,
      },
      {
        name: 'confidence_penalty',
        value: confidence,
        score: confidencePenalty,
        weight: 0.14,
      },
      {
        name: 'sensitive_keywords',
        value: sensitiveTextDetected,
        score: sensitivityScore,
        weight: 0.06,
      },
    ]);

    return Object.freeze({
      ok,
      level,
      score,
      confidence: normalizeConfidence(confidence + this.options.confidenceBoost),
      factors,
      guards,
      recommendation,
      meta: Object.freeze({
        source: 'RiskPredictor',
        strictMode: this.options.strictMode,
        maxAllowedRisk: this.options.maxAllowedRisk,
      }),
    });
  }
}

module.exports = RiskPredictor;
module.exports.RISK_LEVEL = RISK_LEVEL;
module.exports.RISK_THRESHOLDS = RISK_THRESHOLDS;
module.exports.SAFE_MODES = SAFE_MODES;