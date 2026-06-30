// server/agents/RiskPredictor.js
// 📊 Prédicteur de Risque & Détection d'Anomalies - Version 5.0.0 Ultra
import crypto from "node:crypto";
import { EventEmitter } from "node:events";

// ============================================================
// CONSTANTES
// ============================================================
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const RISK_LEVELS = {
  NONE:     { min: 0,  max: 10,  label: "NONE",     color: "🟢" },
  LOW:      { min: 10, max: 30,  label: "LOW",      color: "🟡" },
  MEDIUM:   { min: 30, max: 55,  label: "MEDIUM",   color: "🟠" },
  HIGH:     { min: 55, max: 80,  label: "HIGH",     color: "🔴" },
  CRITICAL: { min: 80, max: 101, label: "CRITICAL", color: "💀" },
};

const DEFAULT_CONFIG = {
  learningRate:           0.08,
  decayRate:              0.02,
  thresholdMedium:        30,
  thresholdHigh:          55,
  thresholdCritical:      80,
  enableMetrics:          true,
  logLevel:               "warn",
  enableOnlineLearning:   true,
  enableAnomalyDetect:    true,
  enableTrendAnalysis:    true,
  enableEnsemble:         true,
  enableFeatureImportance:true,
  enableExplainability:   true,
  enableAutoPattern:      true,
  enableReputation:       true,   // ✅ NOUVEAU
  enableGeoRisk:          true,   // ✅ NOUVEAU
  enableMLScoring:        true,   // ✅ NOUVEAU
  enableAlertThrottle:    true,   // ✅ NOUVEAU
  historySize:            1000,
  baselineWindowSize:     200,
  anomalyZThreshold:      2.5,
  patternMaxWeight:       10.0,
  patternMinWeight:       0.1,
  maxPatterns:            500,
  patternTTL:             7 * 24 * 60 * 60_000,
  feedbackMemory:         100,
  enableCalibration:      true,
  calibrationInterval:    50,
  enableContextualScore:  true,
  enableTemporalFeatures: true,
  enableSequenceDetect:   true,
  sequenceWindowMs:       30_000,
  maxSequenceLength:      20,
  alertThrottleMs:        60_000,  // ✅ NOUVEAU
  reputationDecay:        0.95,    // ✅ NOUVEAU
  exportFormat:           "json",
};

// ============================================================
// ERREURS TYPÉES
// ============================================================
class RiskError extends Error {
  constructor(msg, code, details = {}) {
    super(msg);
    this.name    = "RiskError";
    this.code    = code;
    this.details = details;
    this.ts      = Date.now();
  }
}

// ============================================================
// FEATURE EXTRACTOR v2
// ============================================================
class FeatureExtractor {
  static extract(event, config = {}) {
    const now  = Date.now();
    const hour = new Date().getHours();
    const day  = new Date().getDay();
    const raw  = JSON.stringify(event || "");

    const hasCode          = !!event?.code;
    const hasAmount        = !!event?.amount;
    const hasSQL           = /(\bDROP\b|\bDELETE\b|\bSELECT\b|\bUNION\b|\bINSERT\b|\bUPDATE\b)/i.test(raw);
    const hasXSS           = /<script|javascript:|on\w+\s*=/i.test(raw);
    const hasPathTraversal = /\.\.[\/\\]|%2e%2e/i.test(raw);
    const hasCommandInj    = /[;&|`$].*\b(bash|sh|cmd|python|ruby|perl|nc|wget|curl)\b/i.test(raw);
    const hasNullByte      = /\x00|%00|\\x00/.test(raw);
    const hasSpecialChars  = /[<>'"`;{}()\[\]]/.test(raw);
    const hasHighEntropy   = FeatureExtractor.entropy(raw) > 5.2;
    const isHighFreq       = (event?.requestsPerMin || 0) > 500;
    const isVeryHighFreq   = (event?.requestsPerMin || 0) > 2000;
    const isLargePayload   = (event?.size || 0) > 1024 * 1024;
    const isGiantPayload   = (event?.size || 0) > 10 * 1024 * 1024;
    const isNightTime      = hour < 6 || hour > 22;
    const isWeekend        = day === 0 || day === 6;
    const isNewActor       = !!event?.isNewActor;
    const hasMultipleIPs   = Array.isArray(event?.ips) && event.ips.length > 3;
    const hasSuspiciousUA  = /bot|crawler|scanner|nikto|sqlmap|nmap/i.test(event?.userAgent || "");
    const hasFailedAuths   = (event?.failedLogins || 0) > 5;
    const isTorExit        = !!event?.isTorExit;
    const hasBase64Blob    = /[A-Za-z0-9+/]{100,}={0,2}/.test(raw);
    const hasIPv6          = /::ffff:|::1|2001:|fe80:/i.test(raw);
    const amountHigh       = (event?.amount || 0) > 100_000;
    const amountCritical   = (event?.amount || 0) > 1_000_000;
    const codeLength       = event?.code ? event.code.length : 0;
    const hasEval          = /\beval\s*\(/.test(raw);
    const hasProcessExit   = /process\.(exit|env|binding)|require.*child_process/.test(raw);
    const hasProtoPoison   = /__proto__|constructor\s*\[|prototype\s*\[/.test(raw);
    const hasSSRF          = /localhost|127\.0\.0|169\.254|10\.|192\.168\.|::1/i.test(raw);
    const hasOpenRedirect  = /url=http|redirect=http|next=http|return=http/i.test(raw);
    const depthJSON        = FeatureExtractor.jsonDepth(event);
    const fieldCount       = event ? Object.keys(event).length : 0;

    // ✅ NOUVEAU — Features avancées
    const hasJWTManip      = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(raw) && hasSpecialChars;
    const hasXMLBomb       = /<!ENTITY|<!DOCTYPE.*\[/.test(raw);
    const hasSQLTimeBased  = /SLEEP\s*\(|WAITFOR\s+DELAY|BENCHMARK\s*\(/i.test(raw);
    const hasLDAPInjection = /[()&|!*\\].*(?:cn|ou|dc|uid|mail)=/i.test(raw);
    const hasTemplateInj   = /\{\{.*\}\}|\$\{.*\}|<%.*%>/.test(raw);
    const hasDeserialization = /rO0AB|ACED0005|aced00|java\.io/i.test(raw);
    const hasFileUpload    = !!event?.filename || /\.php|\.asp|\.jsp|\.exe|\.sh$/i.test(raw);
    const hasRepeatedFail  = (event?.failedLogins || 0) > 20;
    const isVPN            = !!event?.isVPN;
    const isDatacenter     = !!event?.isDatacenter;
    const rpmRatio         = event?.requestsPerMin
      ? event.requestsPerMin / (event?.avgRequestsPerMin || 100)
      : 1;
    const hasRapidRPMSpike = rpmRatio > 5;

    const rawRiskIndicators = [
      hasSQL, hasXSS, hasPathTraversal, hasCommandInj,
      hasEval, hasNullByte, hasProcessExit, hasProtoPoison,
      hasSuspiciousUA, isTorExit, isVeryHighFreq, isGiantPayload,
      hasSSRF, hasOpenRedirect, hasJWTManip, hasXMLBomb,
      hasSQLTimeBased, hasLDAPInjection, hasTemplateInj,
      hasDeserialization,
    ].filter(Boolean).length;

    return {
      hasCode, hasSQL, hasXSS, hasPathTraversal,
      hasCommandInj, hasNullByte, hasEval, hasProcessExit,
      hasProtoPoison, hasSSRF, hasOpenRedirect,
      hasSpecialChars, hasHighEntropy, hasBase64Blob,
      isHighFreq, isVeryHighFreq,
      isLargePayload, isGiantPayload,
      hasFailedAuths, hasRepeatedFail, hasAmount,
      amountHigh, amountCritical,
      isNewActor, hasMultipleIPs, hasSuspiciousUA, isTorExit,
      isNightTime, isWeekend,
      hasIPv6, hasMultipleIPs,
      codeLength, depthJSON, fieldCount,
      // ✅ NOUVEAU
      hasJWTManip, hasXMLBomb, hasSQLTimeBased,
      hasLDAPInjection, hasTemplateInj, hasDeserialization,
      hasFileUpload, isVPN, isDatacenter, hasRapidRPMSpike,
      rpmRatio,
      rawRiskIndicators,
      _vector: [
        hasCode ? 1 : 0, hasSQL ? 1 : 0, hasXSS ? 1 : 0,
        hasPathTraversal ? 1 : 0, hasCommandInj ? 1 : 0,
        isHighFreq ? 1 : 0, isLargePayload ? 1 : 0,
        hasFailedAuths ? 1 : 0, amountHigh ? 1 : 0,
        isNightTime ? 1 : 0, isWeekend ? 1 : 0,
        hasSuspiciousUA ? 1 : 0, isTorExit ? 1 : 0,
        hasHighEntropy ? 1 : 0, hasEval ? 1 : 0,
        hasProtoPoison ? 1 : 0, hasJWTManip ? 1 : 0,
        hasXMLBomb ? 1 : 0, hasTemplateInj ? 1 : 0,
        hasDeserialization ? 1 : 0,
      ],
    };
  }

  static entropy(str) {
    if (!str || str.length === 0) return 0;
    const freq = {};
    for (const c of str) freq[c] = (freq[c] || 0) + 1;
    const len = str.length;
    return -Object.values(freq).reduce((e, f) => {
      const p = f / len;
      return e + p * Math.log2(p);
    }, 0);
  }

  static jsonDepth(obj, d = 0) {
    if (typeof obj !== "object" || obj === null) return d;
    return Math.max(...Object.values(obj).map(v => FeatureExtractor.jsonDepth(v, d + 1)), d);
  }
}

// ============================================================
// STATISTIQUES EN LIGNE (Welford) — ✅ CORRIGÉ
// ============================================================
class OnlineStats {
  #n    = 0;
  #mean = 0;
  #M2   = 0;

  update(x) {
    this.#n++;
    const delta  = x - this.#mean;
    this.#mean  += delta / this.#n;
    const delta2 = x - this.#mean;
    this.#M2    += delta * delta2;
  }

  get mean()     { return this.#mean; }
  get variance() { return this.#n > 1 ? this.#M2 / (this.#n - 1) : 0; }
  get std()      { return Math.sqrt(this.variance); }
  get count()    { return this.#n; }

  // ✅ CORRIGÉ — utilise this.std (getter) et non this.#std (inexistant)
  zScore(x) {
    return this.std > 0 ? Math.abs((x - this.#mean) / this.std) : 0;
  }

  toJSON() {
    return { mean: Math.round(this.#mean), std: Math.round(this.std), count: this.#n };
  }
}

// ============================================================
// SÉQUENCE DETECTOR
// ============================================================
class SequenceDetector {
  #sequences = new Map();
  #windowMs;
  #maxLen;

  constructor(windowMs = 30_000, maxLen = 20) {
    this.#windowMs = windowMs;
    this.#maxLen   = maxLen;
  }

  push(actorId, action) {
    const now = Date.now();
    if (!this.#sequences.has(actorId)) this.#sequences.set(actorId, []);
    const seq = this.#sequences.get(actorId);
    seq.push({ action, ts: now });
    const cutoff  = now - this.#windowMs;
    const trimmed = seq.filter(e => e.ts >= cutoff).slice(-this.#maxLen);
    this.#sequences.set(actorId, trimmed);
    return trimmed;
  }

  getSequence(actorId)     { return this.#sequences.get(actorId) || []; }

  detectPattern(actorId, patternTypes) {
    const actions = this.getSequence(actorId).map(e => e.action);
    return patternTypes.some(p => actions.join(",").includes(p.join(",")));
  }

  isBurst(actorId, n = 10, windowMs = 5000) {
    const cutoff = Date.now() - windowMs;
    return this.getSequence(actorId).filter(e => e.ts >= cutoff).length >= n;
  }

  // ✅ NOUVEAU — Fréquence moyenne
  getFrequency(actorId, windowMs = 60_000) {
    const cutoff = Date.now() - windowMs;
    const count  = this.getSequence(actorId).filter(e => e.ts >= cutoff).length;
    return Math.round((count / windowMs) * 60_000);
  }

  clear(actorId) { this.#sequences.delete(actorId); }
  reset()        { this.#sequences.clear(); }
}

// ============================================================
// ✅ NOUVEAU — REPUTATION ENGINE
// ============================================================
class ReputationEngine {
  #scores = new Map(); // actorId → { score, events, lastSeen }
  #decay;

  constructor(decay = 0.95) {
    this.#decay = decay;
  }

  update(actorId, riskScore) {
    const existing = this.#scores.get(actorId) || { score: 50, events: 0, lastSeen: Date.now() };
    const decayed  = existing.score * this.#decay;
    const updated  = Math.max(0, Math.min(100, decayed * 0.7 + riskScore * 0.3));
    this.#scores.set(actorId, {
      score:    Math.round(updated),
      events:   existing.events + 1,
      lastSeen: Date.now(),
    });
    return updated;
  }

  get(actorId) {
    return this.#scores.get(actorId) || { score: 50, events: 0, lastSeen: null };
  }

  getMultiplier(actorId) {
    const rep = this.get(actorId);
    if (rep.score > 80) return 1.5;
    if (rep.score > 65) return 1.2;
    if (rep.score < 20) return 0.7;
    return 1.0;
  }

  getTopOffenders(n = 10) {
    return [...this.#scores.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, n)
      .map(([id, data]) => ({ actorId: id, ...data }));
  }

  reset(actorId) { this.#scores.delete(actorId); }
  clear()        { this.#scores.clear(); }
  size()         { return this.#scores.size; }
}

// ============================================================
// ✅ NOUVEAU — ALERT THROTTLE (évite spam alertes)
// ============================================================
class AlertThrottle {
  #lastAlerts = new Map(); // key → timestamp
  #throttleMs;

  constructor(throttleMs = 60_000) {
    this.#throttleMs = throttleMs;
  }

  shouldAlert(key) {
    const last = this.#lastAlerts.get(key) || 0;
    const now  = Date.now();
    if (now - last > this.#throttleMs) {
      this.#lastAlerts.set(key, now);
      return true;
    }
    return false;
  }

  clear() { this.#lastAlerts.clear(); }
}

// ============================================================
// RISK PREDICTOR v5.0.0
// ============================================================
export class RiskPredictor extends EventEmitter {
  #patterns;
  #history;
  #featureStats;
  #riskStats;
  #feedbacks;
  #sequenceDetector;
  #calibrationData;
  #hooks;
  #startTime;
  #predictionCache;
  #autoPatternCandidates;
  #reputationEngine;    // ✅ NOUVEAU
  #alertThrottle;       // ✅ NOUVEAU
  #mlWeights;           // ✅ NOUVEAU
  #riskTimeline;        // ✅ NOUVEAU

  constructor(config = {}) {
    super();
    this.name    = "RiskPredictor";
    this.version = "5.0.0";
    this.config  = { ...DEFAULT_CONFIG, ...config };

    this.#patterns              = new Map();
    this.#history               = [];
    this.#featureStats          = new Map();
    this.#riskStats             = new OnlineStats();
    this.#feedbacks             = [];
    this.#calibrationData       = { offset: 0, scale: 1.0, samples: 0 };
    this.#hooks                 = new Map();
    this.#startTime             = Date.now();
    this.#predictionCache       = new Map();
    this.#autoPatternCandidates = new Map();
    this.#reputationEngine      = new ReputationEngine(this.config.reputationDecay);
    this.#alertThrottle         = new AlertThrottle(this.config.alertThrottleMs);
    this.#riskTimeline          = [];

    // ✅ NOUVEAU — Poids ML initiaux (régression logistique simplifiée)
    this.#mlWeights = new Map([
      ["hasSQL",          4.0],
      ["hasXSS",          3.5],
      ["hasCommandInj",   4.5],
      ["hasEval",         4.0],
      ["hasProtoPoison",  4.5],
      ["hasSSRF",         4.0],
      ["hasTemplateInj",  3.5],
      ["hasDeserialization", 4.5],
      ["hasXMLBomb",      3.0],
      ["hasSQLTimeBased", 4.0],
      ["hasLDAPInjection",3.5],
      ["isVeryHighFreq",  3.0],
      ["hasFailedAuths",  2.5],
      ["isTorExit",       2.5],
      ["amountCritical",  3.0],
      ["hasSuspiciousUA", 2.0],
      ["isGiantPayload",  2.0],
      ["hasHighEntropy",  1.5],
      ["isNightTime",     0.5],
      ["isWeekend",       0.3],
    ]);

    this.metrics = {
      predictions:       0,
      threatsDetected:   0,
      patternsLearned:   0,
      falsePositives:    0,
      truePositives:     0,
      feedbackReceived:  0,
      cacheHits:         0,
      anomaliesDetected: 0,
      calibrations:      0,
      autoPatterns:      0,
      avgPredictionMs:   0,
      totalPredictionMs: 0,
      mlPredictions:     0,  // ✅ NOUVEAU
      reputationBlocks:  0,  // ✅ NOUVEAU
      alertsThrottled:   0,  // ✅ NOUVEAU
      errors:            0,
    };

    this.#initBasePatterns();
    this.#startMaintenanceTimer();
    this._log("info", `✅ RiskPredictor v${this.version} initialisé`);
  }

  // ============================================================
  // MAINTENANCE
  // ============================================================
  #startMaintenanceTimer() {
    this._maintenanceTimer = setInterval(() => {
      this.#decayPatterns();
      this.#prunePatterns();
      this.#pruneCache();
      this.#pruneTimeline();
    }, 5 * 60_000);
    if (this._maintenanceTimer.unref) this._maintenanceTimer.unref();
  }

  // ============================================================
  // HOOKS
  // ============================================================
  addHook(event, fn) {
    if (!this.#hooks.has(event)) this.#hooks.set(event, []);
    this.#hooks.get(event).push(fn);
    return this;
  }

  async #runHooks(event, data) {
    const hooks = this.#hooks.get(event) || [];
    let result = data;
    for (const fn of hooks) {
      try { result = (await fn(result, event)) ?? result; } catch { /* ignore */ }
    }
    return result;
  }

  // ============================================================
  // PRÉDICTION PRINCIPALE
  // ============================================================
  async predict(event, context = {}) {
    const startTime = Date.now();
    this.#incMetric("predictions");

    event = await this.#runHooks("pre:predict", event) || event;

    // Cache
    const cacheKey = this.#hashEvent(event);
    if (this.#predictionCache.has(cacheKey)) {
      this.#incMetric("cacheHits");
      return this.#predictionCache.get(cacheKey);
    }

    const features = FeatureExtractor.extract(event, this.config);
    const actorId  = context.actorId || event?.actorId || event?.ip || "unknown";

    this.#updateFeatureStats(features);

    // ── 1. PATTERNS ───────────────────────────────────────
    let patternScore = 0;
    const threats    = [];

    for (const [id, pattern] of this.#patterns) {
      const matchScore = this.#calculateMatch(features, pattern.weights);
      if (matchScore > 0.4) {
        const contribution = matchScore * pattern.weight;
        patternScore      += contribution;
        pattern.hits++;
        pattern.lastHit = Date.now();
        threats.push({
          patternId:    id,
          type:         pattern.type,
          category:     pattern.category || "UNKNOWN",
          confidence:   Math.round(matchScore * 100),
          contribution: Math.round(contribution * 100) / 100,
          severity:     pattern.severity || "MEDIUM",
        });
      }
    }

    // ── 2. ML SCORING ✅ NOUVEAU ──────────────────────────
    let mlScore = 0;
    if (this.config.enableMLScoring) {
      mlScore = this.#computeMLScore(features);
      this.#incMetric("mlPredictions");
      if (mlScore > 30) {
        threats.push({
          type:         "ML_SIGNAL",
          category:     "ML",
          confidence:   Math.round(Math.min(99, mlScore)),
          contribution: Math.round(mlScore * 0.3),
          severity:     mlScore > 60 ? "HIGH" : "MEDIUM",
        });
      }
    }

    // ── 3. ANOMALIE STATISTIQUE ───────────────────────────
    let anomalyScore = 0;
    if (this.config.enableAnomalyDetect) {
      const anomalyResult = this.#detectAnomalies(features);
      anomalyScore = anomalyResult.score;
      if (anomalyResult.detected) {
        this.#incMetric("anomaliesDetected");
        threats.push({
          type:         "STATISTICAL_ANOMALY",
          category:     "ANOMALY",
          confidence:   Math.round(anomalyResult.confidence),
          contribution: Math.round(anomalyScore * 100) / 100,
          severity:     anomalyScore > 30 ? "HIGH" : "MEDIUM",
          zScores:      anomalyResult.zScores,
        });
      }
    }

    // ── 4. SÉQUENCE TEMPORELLE ────────────────────────────
    let seqScore = 0;
    if (this.config.enableSequenceDetect) {
      const seqResult = this.#detectSequence(actorId, event, features);
      seqScore = seqResult.score;
      if (seqResult.detected) {
        threats.push({
          type:         "TEMPORAL_SEQUENCE",
          category:     "BEHAVIORAL",
          confidence:   seqResult.confidence,
          contribution: seqScore,
          severity:     "HIGH",
          pattern:      seqResult.patternName,
        });
      }
    }

    // ── 5. RÉPUTATION ✅ NOUVEAU ──────────────────────────
    let reputationMultiplier = 1.0;
    if (this.config.enableReputation) {
      reputationMultiplier = this.#reputationEngine.getMultiplier(actorId);
      const rep = this.#reputationEngine.get(actorId);
      if (rep.score > 70 && rep.events > 3) {
        threats.push({
          type:         "BAD_REPUTATION",
          category:     "REPUTATION",
          confidence:   rep.score,
          contribution: Math.round(rep.score * 0.2),
          severity:     rep.score > 85 ? "CRITICAL" : "HIGH",
        });
      }
    }

    // ── 6. ENSEMBLE SCORING ───────────────────────────────
    let riskScore;
    if (this.config.enableEnsemble) {
      riskScore = this.#ensembleScore(patternScore, anomalyScore, seqScore, mlScore, features);
    } else {
      riskScore = patternScore + anomalyScore + seqScore + mlScore * 0.3;
    }

    // Appliquer réputation
    riskScore *= reputationMultiplier;

    // ── 7. SCORING CONTEXTUEL ─────────────────────────────
    if (this.config.enableContextualScore) {
      riskScore = this.#applyContextualScore(riskScore, features, context);
    }

    // ── 8. CALIBRATION ────────────────────────────────────
    if (this.config.enableCalibration && this.#calibrationData.samples > 10) {
      riskScore = riskScore * this.#calibrationData.scale + this.#calibrationData.offset;
    }

    riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
    const level = this.#scoreToLevel(riskScore);

    // ── 9. EXPLAINABILITY ─────────────────────────────────
    const explanation = this.config.enableExplainability
      ? this.#explain(threats, features, riskScore) : null;

    // ── 10. FEATURE IMPORTANCE ────────────────────────────
    const featureImportance = this.config.enableFeatureImportance
      ? this.#computeFeatureImportance(features, threats) : null;

    // ── Mise à jour réputation ────────────────────────────
    if (this.config.enableReputation) {
      this.#reputationEngine.update(actorId, riskScore);
    }

    // ── Timeline ✅ NOUVEAU ───────────────────────────────
    this.#riskTimeline.push({ actorId, riskScore, level, ts: Date.now() });

    // ── Historique ────────────────────────────────────────
    const entry = {
      id:           crypto.randomUUID(),
      riskScore,
      level,
      threats:      threats.length,
      actorId,
      timestamp:    Date.now(),
      predictionMs: Date.now() - startTime,
      features:     features._vector,
    };

    this.#history.push(entry);
    if (this.#history.length > this.config.historySize) this.#history.shift();
    this.#riskStats.update(riskScore);

    // ── Apprentissage en ligne ────────────────────────────
    if (this.config.enableOnlineLearning && riskScore > this.config.thresholdHigh) {
      this.#incMetric("threatsDetected");
      this.#reinforcePatterns(threats);
      this.#learnAutoPattern(features, riskScore);
      this.#updateMLWeights(features, riskScore); // ✅ NOUVEAU
    }

    // ── Calibration périodique ────────────────────────────
    if (
      this.config.enableCalibration &&
      this.metrics.predictions % this.config.calibrationInterval === 0
    ) {
      this.#calibrate();
    }

    // ── Métriques perf ────────────────────────────────────
    const predMs = Date.now() - startTime;
    this.metrics.totalPredictionMs += predMs;
    this.metrics.avgPredictionMs    = Math.round(
      this.metrics.totalPredictionMs / this.metrics.predictions
    );

    const result = {
      id: entry.id,
      riskScore,
      level,
      threats,
      explanation,
      featureImportance,
      featuresSummary: features.rawRiskIndicators,
      actorId,
      reputation:   this.config.enableReputation
        ? this.#reputationEngine.get(actorId) : null,
      confidence:   this.#computeConfidence(threats, riskScore),
      predictionMs,
      timestamp:    Date.now(),
    };

    this.#predictionCache.set(cacheKey, result);
    await this.#runHooks("post:predict", result);

    // ── Alertes avec throttle ────────────────────────────
    if (riskScore >= this.config.thresholdCritical) {
      const throttleKey = `critical:${actorId}`;
      if (!this.config.enableAlertThrottle || this.#alertThrottle.shouldAlert(throttleKey)) {
        this.emit("risk:critical", { actorId, riskScore, threats });
        this._log("warn", `💀 CRITIQUE: score=${riskScore} actor=${actorId}`);
      } else {
        this.#incMetric("alertsThrottled");
      }
    } else if (riskScore >= this.config.thresholdHigh) {
      const throttleKey = `high:${actorId}`;
      if (!this.config.enableAlertThrottle || this.#alertThrottle.shouldAlert(throttleKey)) {
        this.emit("risk:high", { actorId, riskScore, threats });
      } else {
        this.#incMetric("alertsThrottled");
      }
    }

    return result;
  }

  // ============================================================
  // ✅ NOUVEAU — ML SCORING (régression logistique simplifiée)
  // ============================================================
  #computeMLScore(features) {
    let score = 0;
    for (const [feature, weight] of this.#mlWeights) {
      if (features[feature]) score += weight;
    }
    // Sigmoid normalisé 0-100
    const sigmoid = 1 / (1 + Math.exp(-0.3 * (score - 8)));
    return Math.round(sigmoid * 100);
  }

  // ✅ NOUVEAU — Mise à jour poids ML (gradient descent simplifié)
  #updateMLWeights(features, actualRisk) {
    const predicted = this.#computeMLScore(features);
    const error     = (actualRisk - predicted) / 100;

    for (const [feature, weight] of this.#mlWeights) {
      if (features[feature]) {
        const gradient   = error * (features[feature] ? 1 : 0);
        const newWeight  = weight + this.config.learningRate * gradient;
        this.#mlWeights.set(feature, Math.max(0.1, Math.min(8.0, newWeight)));
      }
    }
  }

  // ============================================================
  // ENSEMBLE SCORING enrichi
  // ============================================================
  #ensembleScore(patternScore, anomalyScore, seqScore, mlScore, features) {
    const patternWeight  = 0.45;
    const anomalyWeight  = 0.20;
    const seqWeight      = 0.15;
    const mlWeight       = 0.20;

    const agreementBonus = (patternScore > 20 && anomalyScore > 15) ? 10
      : (patternScore > 20 && mlScore > 40) ? 8 : 0;

    return (
      patternScore * patternWeight +
      anomalyScore * anomalyWeight +
      seqScore     * seqWeight +
      mlScore      * mlWeight +
      agreementBonus
    );
  }

  // ============================================================
  // CONTEXTUAL SCORING
  // ============================================================
  #applyContextualScore(score, features, context) {
    let adjusted = score;

    if (features.isNightTime)           adjusted *= 1.12;
    if (features.isWeekend)             adjusted *= 1.05;
    if (features.isVPN)                 adjusted *= 1.10;
    if (features.isDatacenter)          adjusted *= 1.08;
    if (context.actorRiskLevel === "HIGH")     adjusted *= 1.3;
    if (context.actorRiskLevel === "CRITICAL") adjusted *= 1.6;
    if (context.trusted)                adjusted *= 0.3;
    if (context.isHighRiskCountry)      adjusted *= 1.2;
    if (context.internal)               adjusted *= 0.7;

    return adjusted;
  }

  // ============================================================
  // DÉTECTION ANOMALIES STATISTIQUES
  // ============================================================
  #detectAnomalies(features) {
    const zScores    = {};
    let totalZ       = 0;
    let detected     = false;
    const threshold  = this.config.anomalyZThreshold;
    const numericKeys = ["codeLength", "fieldCount", "depthJSON", "rpmRatio"];
    const boolFlags   = [
      "isHighFreq", "isLargePayload", "hasSpecialChars",
      "hasHighEntropy", "hasFailedAuths", "hasSuspiciousUA",
      "hasRapidRPMSpike",
    ];

    for (const key of numericKeys) {
      const stats = this.#featureStats.get(key);
      if (stats && stats.count > 10) {
        const z    = stats.zScore(features[key] || 0);
        zScores[key] = Math.round(z * 100) / 100;
        if (z > threshold) { totalZ += z; detected = true; }
      }
    }

    const trueFlags = boolFlags.filter(k => features[k]).length;
    const flagScore = trueFlags >= 4 ? trueFlags * 15
      : trueFlags >= 3 ? trueFlags * 12
      : trueFlags >= 2 ? 20 : 0;

    const score      = Math.min(50, totalZ * 8 + flagScore);
    const confidence = Math.min(99, Math.round((score / 50) * 100));

    return { detected: score > 15, score, confidence, zScores };
  }

  // ============================================================
  // DÉTECTION SÉQUENCE
  // ============================================================
  #detectSequence(actorId, event, features) {
    const action = event?.type || event?.action || "UNKNOWN";
    const seq    = this.#sequenceDetector.push(actorId, action);

    if (this.#sequenceDetector.isBurst(actorId, 15, 10_000)) {
      return { detected: true, score: 35, confidence: 90, patternName: "REQUEST_BURST" };
    }

    const escalPattern = [["LOGIN_FAIL", "LOGIN_FAIL", "ADMIN_ACCESS"]];
    if (this.#sequenceDetector.detectPattern(actorId, escalPattern[0])) {
      return { detected: true, score: 40, confidence: 85, patternName: "PRIVILEGE_ESCALATION" };
    }

    // ✅ NOUVEAU — Pattern exfiltration (beaucoup de GETs sur données sensibles)
    const recentActions = seq.slice(-10).map(e => e.action);
    const sensitiveGets = recentActions.filter(a => /GET.*\/(user|admin|secret|token|key|password)/i.test(a)).length;
    if (sensitiveGets >= 5) {
      return { detected: true, score: 45, confidence: 80, patternName: "DATA_EXFILTRATION" };
    }

    const uniqueActions = new Set(recentActions).size;
    if (uniqueActions >= 8 && recentActions.length >= 8) {
      return { detected: true, score: 25, confidence: 70, patternName: "ENDPOINT_SCAN" };
    }

    // ✅ NOUVEAU — Fréquence élevée détectée
    const freq = this.#sequenceDetector.getFrequency(actorId, 60_000);
    if (freq > 300) {
      return { detected: true, score: 30, confidence: 75, patternName: "HIGH_FREQUENCY_ACTOR" };
    }

    return { detected: false, score: 0, confidence: 0, patternName: null };
  }

  // ============================================================
  // EXPLAINABILITY
  // ============================================================
  #explain(threats, features, riskScore) {
    const reasons = [];
    for (const threat of threats.slice(0, 5)) {
      reasons.push(
        `[${threat.severity}] ${threat.type} (conf: ${threat.confidence}%, contrib: +${threat.contribution})`
      );
    }

    const level    = this.#scoreToLevel(riskScore);
    const topFlags = Object.entries(features)
      .filter(([k, v]) => typeof v === "boolean" && v && !k.startsWith("_"))
      .map(([k]) => k)
      .slice(0, 8);

    // ✅ NOUVEAU — Recommandations
    const recommendations = [];
    if (features.hasSQL)         recommendations.push("Utiliser des requêtes préparées");
    if (features.hasXSS)         recommendations.push("Encoder les sorties HTML");
    if (features.hasEval)        recommendations.push("Interdire eval() côté serveur");
    if (features.hasFailedAuths) recommendations.push("Activer le rate-limiting sur login");
    if (features.isTorExit)      recommendations.push("Bloquer les IP Tor exit nodes");
    if (features.isHighFreq)     recommendations.push("Appliquer un rate-limiter global");

    return {
      summary:         `Score ${riskScore}/100 — Niveau ${level}`,
      reasons,
      topFlags,
      riskLevel:       level,
      threatCount:     threats.length,
      recommendations,
    };
  }

  // ============================================================
  // FEATURE IMPORTANCE
  // ============================================================
  #computeFeatureImportance(features, threats) {
    const importance = {};
    for (const threat of threats) {
      if (!threat.patternId) continue;
      const pattern = this.#patterns.get(threat.patternId);
      if (!pattern) continue;
      for (const [key, weight] of Object.entries(pattern.weights)) {
        if (features[key]) {
          importance[key] = (importance[key] || 0) + weight * (threat.confidence / 100);
        }
      }
    }

    // ✅ NOUVEAU — Ajouter l'importance ML
    for (const [feature, weight] of this.#mlWeights) {
      if (features[feature]) {
        importance[feature] = (importance[feature] || 0) + weight * 0.5;
      }
    }

    return Object.entries(importance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([feature, score]) => ({ feature, score: Math.round(score * 100) / 100 }));
  }

  // ============================================================
  // FEEDBACK & CALIBRATION
  // ============================================================
  feedback(predictionId, actual, label = null) {
    this.#incMetric("feedbackReceived");
    const entry = this.#history.find(h => h.id === predictionId);
    if (!entry) return { ok: false, reason: "Prédiction non trouvée" };

    const fb = {
      predictionId,
      predicted: entry.riskScore,
      actual,
      label,
      error:     actual - entry.riskScore,
      timestamp: Date.now(),
    };

    this.#feedbacks.push(fb);
    if (this.#feedbacks.length > this.config.feedbackMemory) this.#feedbacks.shift();

    if (label === "false_positive") this.#incMetric("falsePositives");
    else if (label === "true_positive") this.#incMetric("truePositives");

    this.emit("feedback:received", fb);
    if (this.#feedbacks.length >= 20) this.#calibrate();

    return { ok: true, error: fb.error };
  }

  #calibrate() {
    if (this.#feedbacks.length < 5) return;
    const errors = this.#feedbacks.map(f => f.error);
    const mean   = errors.reduce((a, b) => a + b, 0) / errors.length;
    this.#calibrationData.offset  = Math.max(-20, Math.min(20, -mean * 0.5));
    this.#calibrationData.scale   = Math.max(0.7, Math.min(1.3, 1.0 - mean * 0.005));
    this.#calibrationData.samples = this.#feedbacks.length;
    this.#incMetric("calibrations");
    this.emit("predictor:calibrated", { ...this.#calibrationData });
  }

  // ============================================================
  // PATTERNS
  // ============================================================
  addPattern(type, weights, options = {}) {
    if (this.#patterns.size >= this.config.maxPatterns) this.#prunePatterns(1);
    const id = options.id || crypto.randomUUID();
    this.#patterns.set(id, {
      id, type,
      category:      options.category || "CUSTOM",
      severity:      options.severity || "MEDIUM",
      weights,
      weight:        options.baseWeight || 1.0,
      hits:          0,
      lastHit:       null,
      createdAt:     Date.now(),
      updatedAt:     Date.now(),
      autoGenerated: options.auto || false,
      description:   options.description || "",
    });
    this.#incMetric("patternsLearned");
    this.emit("pattern:added", { id, type });
    return id;
  }

  removePattern(id)       { const e = this.#patterns.delete(id); if (e) this.emit("pattern:removed", { id }); return { ok: e, id }; }
  updatePattern(id, upd)  { const p = this.#patterns.get(id); if (!p) return { ok: false }; Object.assign(p, upd, { updatedAt: Date.now() }); return { ok: true }; }
  getPattern(id)          { return this.#patterns.get(id) || null; }
  getPatterns()           { return [...this.#patterns.values()]; }
  getPatternCount()       { return this.#patterns.size; }

  #initBasePatterns() {
    // Injection
    this.addPattern("SQL_INJECTION",   { hasSQL: 3.0, hasSpecialChars: 1.5, hasSQLTimeBased: 2.0 }, { category: "INJECTION", severity: "CRITICAL", baseWeight: 3.0, id: "base_sql" });
    this.addPattern("XSS_ATTACK",      { hasXSS: 3.0, hasSpecialChars: 1.0 }, { category: "INJECTION", severity: "HIGH", baseWeight: 2.5, id: "base_xss" });
    this.addPattern("CODE_INJECTION",  { hasEval: 3.0, hasProcessExit: 3.0 }, { category: "INJECTION", severity: "CRITICAL", baseWeight: 3.5, id: "base_code" });
    this.addPattern("PATH_TRAVERSAL",  { hasPathTraversal: 3.0 }, { category: "INJECTION", severity: "HIGH", baseWeight: 2.0, id: "base_path" });
    this.addPattern("COMMAND_INJECTION",{ hasCommandInj: 3.5 }, { category: "INJECTION", severity: "CRITICAL", baseWeight: 3.5, id: "base_cmd" });
    this.addPattern("PROTO_POLLUTION", { hasProtoPoison: 4.0 }, { category: "INJECTION", severity: "CRITICAL", baseWeight: 4.0, id: "base_proto" });
    this.addPattern("TEMPLATE_INJECTION",{ hasTemplateInj: 3.5 }, { category: "INJECTION", severity: "CRITICAL", baseWeight: 3.5, id: "base_tpl" });
    this.addPattern("DESERIALIZATION", { hasDeserialization: 4.5 }, { category: "INJECTION", severity: "CRITICAL", baseWeight: 4.5, id: "base_deser" });
    this.addPattern("XML_BOMB",        { hasXMLBomb: 3.0 }, { category: "INJECTION", severity: "HIGH", baseWeight: 3.0, id: "base_xml" });
    this.addPattern("LDAP_INJECTION",  { hasLDAPInjection: 3.5 }, { category: "INJECTION", severity: "HIGH", baseWeight: 3.0, id: "base_ldap" });
    this.addPattern("JWT_MANIPULATION",{ hasJWTManip: 3.0, hasSpecialChars: 1.0 }, { category: "AUTH", severity: "HIGH", baseWeight: 2.5, id: "base_jwt" });
    this.addPattern("FILE_UPLOAD_ATTACK",{ hasFileUpload: 3.0 }, { category: "INJECTION", severity: "HIGH", baseWeight: 2.5, id: "base_upload" });
    // Trafic
    this.addPattern("DOS_ATTACK",      { isHighFreq: 2.0, isVeryHighFreq: 2.0 }, { category: "TRAFFIC", severity: "HIGH", baseWeight: 2.0, id: "base_dos" });
    this.addPattern("DDOS_ATTACK",     { isVeryHighFreq: 4.0, hasMultipleIPs: 2.0 }, { category: "TRAFFIC", severity: "CRITICAL", baseWeight: 3.0, id: "base_ddos" });
    this.addPattern("PAYLOAD_OVERFLOW",{ isLargePayload: 2.5, isGiantPayload: 2.0 }, { category: "TRAFFIC", severity: "HIGH", baseWeight: 2.0, id: "base_payload" });
    this.addPattern("RAPID_RPM_SPIKE", { hasRapidRPMSpike: 3.0 }, { category: "TRAFFIC", severity: "MEDIUM", baseWeight: 2.0, id: "base_rpm" });
    // Auth
    this.addPattern("BRUTE_FORCE",     { hasFailedAuths: 3.0, isHighFreq: 1.5 }, { category: "AUTH", severity: "HIGH", baseWeight: 2.5, id: "base_brute" });
    this.addPattern("REPEATED_FAIL",   { hasRepeatedFail: 4.0 }, { category: "AUTH", severity: "CRITICAL", baseWeight: 3.0, id: "base_repeat" });
    this.addPattern("CREDENTIAL_STUFFING",{ hasFailedAuths: 2.0, hasMultipleIPs: 2.0, isNewActor: 1.5 }, { category: "AUTH", severity: "HIGH", baseWeight: 2.5, id: "base_cred" });
    // Network
    this.addPattern("TOR_EXIT",        { isTorExit: 4.0 }, { category: "NETWORK", severity: "HIGH", baseWeight: 2.0, id: "base_tor" });
    this.addPattern("SSRF_ATTEMPT",    { hasSSRF: 3.5 }, { category: "NETWORK", severity: "CRITICAL", baseWeight: 3.0, id: "base_ssrf" });
    this.addPattern("OPEN_REDIRECT",   { hasOpenRedirect: 2.5 }, { category: "NETWORK", severity: "MEDIUM", baseWeight: 1.5, id: "base_redirect" });
    this.addPattern("VPN_DATACENTER",  { isVPN: 2.0, isDatacenter: 2.0 }, { category: "NETWORK", severity: "LOW", baseWeight: 1.0, id: "base_vpn" });
    // Suspicious
    this.addPattern("SCANNER_BOT",     { hasSuspiciousUA: 3.0, isHighFreq: 1.0 }, { category: "RECON", severity: "MEDIUM", baseWeight: 2.0, id: "base_scanner" });
    this.addPattern("ECONOMIC_FRAUD",  { amountHigh: 2.0, amountCritical: 3.0, isNightTime: 1.0 }, { category: "FRAUD", severity: "HIGH", baseWeight: 2.5, id: "base_fraud" });
    this.addPattern("HIGH_ENTROPY",    { hasHighEntropy: 2.5, hasBase64Blob: 2.0 }, { category: "OBFUSCATION", severity: "MEDIUM", baseWeight: 1.5, id: "base_entropy" });
  }

  // ============================================================
  // REINFORCEMENT + AUTO-PATTERN
  // ============================================================
  #reinforcePatterns(activeThreats) {
    for (const t of activeThreats) {
      const pattern = this.#patterns.get(t.patternId);
      if (pattern) {
        pattern.weight  = Math.min(this.config.patternMaxWeight, pattern.weight * (1 + this.config.learningRate));
        pattern.updatedAt = Date.now();
      }
    }
  }

  #learnAutoPattern(features, riskScore) {
    if (!this.config.enableAutoPattern) return;
    const activeFeatures = Object.entries(features)
      .filter(([k, v]) => typeof v === "boolean" && v && !k.startsWith("_"))
      .reduce((acc, [k]) => { acc[k] = 1.5; return acc; }, {});
    if (Object.keys(activeFeatures).length < 3) return;
    const sigHash  = Object.keys(activeFeatures).sort().join("|");
    const candidate = this.#autoPatternCandidates.get(sigHash) || { count: 0, features: activeFeatures };
    candidate.count++;
    this.#autoPatternCandidates.set(sigHash, candidate);
    if (candidate.count === 5) {
      this.addPattern(`AUTO_${sigHash.slice(0, 8)}`, activeFeatures, {
        category: "AUTO", severity: riskScore > 80 ? "HIGH" : "MEDIUM",
        baseWeight: 1.0, auto: true,
        description: "Pattern auto-généré après 5 occurrences",
      });
      this.#incMetric("autoPatterns");
      this.emit("pattern:autoGenerated", { hash: sigHash });
    }
  }

  // ============================================================
  // DECAY & PRUNING
  // ============================================================
  #decayPatterns() {
    for (const [id, pattern] of this.#patterns) {
      if (pattern.autoGenerated) {
        pattern.weight = Math.max(this.config.patternMinWeight, pattern.weight * (1 - this.config.decayRate));
      }
    }
  }

  #prunePatterns(forceCount = 0) {
    const now = Date.now();
    let removed = 0;
    for (const [id, pattern] of this.#patterns) {
      const tooOld = pattern.lastHit && (now - pattern.lastHit > this.config.patternTTL);
      const tooWeak = pattern.weight < this.config.patternMinWeight;
      const isBase  = id.startsWith("base_");
      if (!isBase && (tooOld || tooWeak)) {
        this.#patterns.delete(id);
        removed++;
        if (forceCount > 0 && removed >= forceCount) break;
      }
    }
  }

  #pruneCache() {
    if (this.#predictionCache.size > 500) {
      const keys = this.#predictionCache.keys();
      for (let i = 0; i < 100; i++) {
        const k = keys.next().value;
        if (k) this.#predictionCache.delete(k);
      }
    }
  }

  #pruneTimeline() {
    const cutoff = Date.now() - 24 * 60 * 60_000;
    this.#riskTimeline = this.#riskTimeline.filter(e => e.ts > cutoff);
  }

  // ============================================================
  // STATISTIQUES & ANALYSE
  // ============================================================
  getStats() {
    const recent = this.#history.slice(-100);
    const avgRisk = recent.length > 0
      ? Math.round(recent.reduce((s, h) => s + h.riskScore, 0) / recent.length) : 0;

    const distribution = { NONE: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const h of recent) distribution[h.level] = (distribution[h.level] || 0) + 1;

    const topPatterns = [...this.#patterns.values()]
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 5)
      .map(p => ({ id: p.id, type: p.type, hits: p.hits, weight: Math.round(p.weight * 100) / 100 }));

    const precision = (this.metrics.truePositives + this.metrics.falsePositives) > 0
      ? Math.round((this.metrics.truePositives / (this.metrics.truePositives + this.metrics.falsePositives)) * 100)
      : null;

    return {
      totalPredictions: this.metrics.predictions,
      avgRiskScore:     avgRisk,
      riskMean:         Math.round(this.#riskStats.mean),
      riskStd:          Math.round(this.#riskStats.std),
      activePatterns:   this.#patterns.size,
      criticalEvents:   recent.filter(h => h.level === "CRITICAL").length,
      highEvents:       recent.filter(h => h.level === "HIGH").length,
      distribution,
      topPatterns,
      precision,
      avgPredictionMs:  this.metrics.avgPredictionMs,
      calibration:      this.#calibrationData,
      topOffenders:     this.#reputationEngine.getTopOffenders(5),  // ✅ NOUVEAU
      reputationSize:   this.#reputationEngine.size(),               // ✅ NOUVEAU
      mlWeights:        Object.fromEntries(this.#mlWeights),        // ✅ NOUVEAU
      uptime:           Date.now() - this.#startTime,
    };
  }

  getTrend(windowMs = 300_000) {
    const now    = Date.now();
    const window = this.#history.filter(h => now - h.timestamp < windowMs);
    if (window.length < 2) return { trend: "STABLE", data: null };
    const half1 = window.slice(0, Math.floor(window.length / 2));
    const half2 = window.slice(Math.floor(window.length / 2));
    const avg1  = half1.reduce((a, h) => a + h.riskScore, 0) / (half1.length || 1);
    const avg2  = half2.reduce((a, h) => a + h.riskScore, 0) / (half2.length || 1);
    const trend = avg2 > avg1 + 10 ? "INCREASING" : avg2 < avg1 - 10 ? "DECREASING" : "STABLE";
    return { trend, avg1: Math.round(avg1), avg2: Math.round(avg2), delta: Math.round(avg2 - avg1), windowSize: window.length };
  }

  // ✅ NOUVEAU — Timeline des risques par acteur
  getActorTimeline(actorId, limit = 50) {
    return this.#riskTimeline
      .filter(e => e.actorId === actorId)
      .slice(-limit);
  }

  // ✅ NOUVEAU — Acteurs les plus dangereux
  getTopThreats(n = 10) {
    return this.#reputationEngine.getTopOffenders(n);
  }

  exportModel() {
    return {
      version:      this.version,
      timestamp:    Date.now(),
      patterns:     [...this.#patterns.entries()].map(([id, p]) => ({
        id, type: p.type, weights: p.weights,
        weight: p.weight, hits: p.hits, category: p.category,
      })),
      calibration:  this.#calibrationData,
      metrics:      this.metrics,
      mlWeights:    Object.fromEntries(this.#mlWeights),
      featureStats: [...this.#featureStats.entries()].map(([k, s]) => ({ key: k, ...s.toJSON() })),
    };
  }

  importModel(data) {
    if (!data?.patterns) return { ok: false, reason: "Format invalide" };
    let imported = 0;
    for (const p of data.patterns) {
      if (!this.#patterns.has(p.id)) {
        this.#patterns.set(p.id, { ...p, lastHit: null, updatedAt: Date.now() });
        imported++;
      }
    }
    if (data.calibration) this.#calibrationData = data.calibration;
    if (data.mlWeights) {
      for (const [k, v] of Object.entries(data.mlWeights)) {
        this.#mlWeights.set(k, v);
      }
    }
    return { ok: true, imported };
  }

  // ============================================================
  // PROCESS (AgentBus)
  // ============================================================
  async process(packet) {
    const startTime = Date.now();
    try {
      const action = packet?.action;
      let result   = null;

      switch (action) {
        case "predict":       result = await this.predict(packet.event, packet.context); break;
        case "feedback":      result = this.feedback(packet.predictionId, packet.actual, packet.label); break;
        case "addPattern":    result = { id: this.addPattern(packet.type, packet.weights, packet.options) }; break;
        case "removePattern": result = this.removePattern(packet.patternId); break;
        case "stats":         result = this.getStats(); break;
        case "trend":         result = this.getTrend(packet.windowMs); break;
        case "topThreats":    result = this.getTopThreats(packet.n); break;
        case "actorTimeline": result = this.getActorTimeline(packet.actorId, packet.limit); break;
        case "export":        result = this.exportModel(); break;
        case "import":        result = this.importModel(packet.data); break;
        case "status":        result = this.getStatus(); break;
        case "metrics":       result = this.getMetrics(); break;
        case "patterns":      result = this.getPatterns(); break;
        default:              result = await this.predict(packet, {});
      }

      return {
        agent:          this.name,
        version:        this.version,
        action,
        success:        true,
        confidence:     Math.round(100 - (this.#riskStats.mean || 0)),
        processingTime: Date.now() - startTime,
        data:           result,
      };
    } catch (err) {
      this.#incMetric("errors");
      return {
        agent:   this.name,
        version: this.version,
        success: false,
        error:   err.message,
        code:    err.code,
        confidence: 0,
      };
    }
  }

  // ============================================================
  // MÉTRIQUES & STATUS
  // ============================================================
  getMetrics() {
    return {
      ...this.metrics,
      patterns:       this.#patterns.size,
      historySize:    this.#history.length,
      cacheSize:      this.#predictionCache.size,
      feedbacks:      this.#feedbacks.length,
      riskMean:       Math.round(this.#riskStats.mean),
      riskStd:        Math.round(this.#riskStats.std),
      calibration:    this.#calibrationData,
      reputationSize: this.#reputationEngine.size(),
      timelineSize:   this.#riskTimeline.length,
      uptime:         Date.now() - this.#startTime,
      timestamp:      Date.now(),
    };
  }

  getStatus() {
    return {
      name:    this.name,
      version: this.version,
      healthy: true,
      patterns: this.#patterns.size,
      ...this.getStats(),
      metrics: this.config.enableMetrics ? this.getMetrics() : undefined,
    };
  }

  // ============================================================
  // DESTROY
  // ============================================================
  destroy() {
    if (this._maintenanceTimer) clearInterval(this._maintenanceTimer);
    this.#patterns.clear();
    this.#history.length    = 0;
    this.#feedbacks.length  = 0;
    this.#predictionCache.clear();
    this.#featureStats.clear();
    this.#hooks.clear();
    this.#sequenceDetector.reset();
    this.#reputationEngine.clear();
    this.#alertThrottle.clear();
    this.#riskTimeline.length = 0;
    this.removeAllListeners();
    this._log("info", "RiskPredictor v5 détruit proprement");
  }

  // ============================================================
  // HELPERS PRIVÉS
  // ============================================================
  #calculateMatch(features, weights) {
    let total = 0, matched = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const absW = Math.abs(weight);
      total += absW;
      if (weight > 0 && features[key])  matched += absW;
      if (weight < 0 && !features[key]) matched += absW;
    }
    return total > 0 ? matched / total : 0;
  }

  #updateFeatureStats(features) {
    for (const [key, val] of Object.entries(features)) {
      if (typeof val === "number") {
        if (!this.#featureStats.has(key)) this.#featureStats.set(key, new OnlineStats());
        this.#featureStats.get(key).update(val);
      }
    }
  }

  #scoreToLevel(score) {
    for (const [name, def] of Object.entries(RISK_LEVELS)) {
      if (score >= def.min && score < def.max) return name;
    }
    return "CRITICAL";
  }

  #computeConfidence(threats, riskScore) {
    const patternConf = threats.length > 0
      ? threats.reduce((a, t) => a + t.confidence, 0) / threats.length : 50;
    const historyConf = this.#riskStats.count > 20 ? 85 : 60;
    return Math.round(patternConf * 0.6 + historyConf * 0.4);
  }

  #hashEvent(event) {
    try { return crypto.createHash("sha1").update(JSON.stringify(event)).digest("hex").slice(0, 16); }
    catch { return crypto.randomUUID().slice(0, 16); }
  }

  #incMetric(key, n = 1) {
    if (this.config.enableMetrics && this.metrics[key] !== undefined) this.metrics[key] += n;
  }

  _log(level, message) {
    const current = LEVELS[this.config.logLevel] ?? 1;
    const target  = LEVELS[level] ?? 2;
    if (target <= current) {
      console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] [${this.name}] ${message}`);
    }
  }
}

// ============================================================
// SINGLETON + EXPORT
// ============================================================
export const riskPredictor = new RiskPredictor();
export default RiskPredictor;