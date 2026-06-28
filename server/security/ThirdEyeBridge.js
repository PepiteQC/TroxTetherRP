// C:\TroxTServerRP\server\core\brain\bridge\ThirdEyeBridge.js

'use strict';

const crypto       = require('crypto');
const EventEmitter = require('events');

// ═══════════════════════════════════════════════════════════════════════════════
//  👁 Third Eye Bridge — Conscience & Introspection du Cerveau
//  Patterns : Proxy · Circuit Breaker · Observer · Null Object
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @enum {string} THIRD_EYE_ACTION
 */
const THIRD_EYE_ACTION = Object.freeze({
  ALLOW:         'ALLOW',
  MONITOR:       'MONITOR',
  RESTRICT:      'RESTRICT',
  DELAY:         'DELAY',
  BLOCK:         'BLOCK',
  EMERGENCY:     'EMERGENCY',
});

const RISK_SEVERITY = Object.freeze({
  GREEN:  0, BLUE: 1, YELLOW: 2, ORANGE: 3, RED: 4, BLACK: 5,
});

class ThirdEyeBridge extends EventEmitter {
  /**
   * @param {Object} brain
   * @param {Object} [opts={}]
   * @param {number} [opts.timeoutMs=5000]
   * @param {boolean}[opts.strictMode=false]
   */
  constructor(brain, opts = {}) {
    super();
    this.brain   = brain;
    this.version = '4.0.0';

    this._opts = Object.freeze({
      timeoutMs:  opts.timeoutMs  ?? 5_000,
      strictMode: opts.strictMode ?? false,
    });

    this._connected      = false;
    this._assessmentLog  = [];
    this._blockedCount   = 0;
    this._allowedCount   = 0;

    // Circuit Breaker pour les appels Third Eye
    this._failures       = 0;
    this._failureLimit   = 5;
    this._circuitOpen    = false;
    this._lastFailureAt  = null;

    Object.seal(this);
  }

  async connect() {
    this._connected = true;
    this.emit('thirdeye:connected', { version: this.version });
    return this;
  }

  /**
   * Évalue une demande — décide si elle peut passer
   * @param {Object} data  { request, understanding, intents, context, riskPrediction }
   * @returns {Promise<Object>}
   */
  async assess(data) {
    const t0 = Date.now();

    // Circuit Breaker — si trop de failures, bypass avec ALLOW
    if (this._circuitOpen) {
      if (Date.now() - this._lastFailureAt > 30_000) {
        this._circuitOpen = false; // Demi-ouverture
        this._failures    = 0;
      } else {
        return this._buildAssessment(THIRD_EYE_ACTION.ALLOW, 'GREEN', 0, 'Circuit ouvert — bypass', t0);
      }
    }

    try {
      return await Promise.race([
        this._performAssessment(data, t0),
        this._timeout(t0),
      ]);
    } catch (err) {
      this._failures++;
      this._lastFailureAt = Date.now();
      if (this._failures >= this._failureLimit) {
        this._circuitOpen = true;
        this.emit('thirdeye:circuit:open');
      }

      // Fallback sécurisé
      return this._buildAssessment(
        THIRD_EYE_ACTION.MONITOR,
        'YELLOW',
        0.3,
        `Erreur Third Eye — mode dégradé: ${err.message}`,
        t0
      );
    }
  }

  /**
   * @private
   */
  async _performAssessment(data, t0) {
    const risk       = data.riskPrediction ?? {};
    const riskLevel  = risk.level ?? 'GREEN';
    const riskScore  = risk.score ?? 0;
    const severity   = RISK_SEVERITY[riskLevel] ?? 0;

    // Règles de décision par niveau de risque
    let action;
    let reason;

    if (severity >= RISK_SEVERITY.BLACK) {
      action = THIRD_EYE_ACTION.EMERGENCY;
      reason = '☠️ Niveau BLACK — Urgence absolue';
    } else if (severity >= RISK_SEVERITY.RED) {
      action = THIRD_EYE_ACTION.BLOCK;
      reason = '🔴 Niveau RED — Risque critique';
    } else if (severity >= RISK_SEVERITY.ORANGE) {
      action = this._opts.strictMode
        ? THIRD_EYE_ACTION.BLOCK
        : THIRD_EYE_ACTION.RESTRICT;
      reason = '🔶 Niveau ORANGE — Restrictions actives';
    } else if (severity >= RISK_SEVERITY.YELLOW) {
      action = THIRD_EYE_ACTION.MONITOR;
      reason = '⚠️ Niveau YELLOW — Surveillance renforcée';
    } else if (severity >= RISK_SEVERITY.BLUE) {
      action = THIRD_EYE_ACTION.MONITOR;
      reason = 'ℹ️ Niveau BLUE — Monitoring standard';
    } else {
      action = THIRD_EYE_ACTION.ALLOW;
      reason = '✅ Niveau GREEN — Accès autorisé';
    }

    // Vérifications supplémentaires sur les facteurs de risque
    const criticalFactors = (risk.factors ?? []).filter(f => f.severity === 'critical');
    if (criticalFactors.length > 0 && action === THIRD_EYE_ACTION.ALLOW) {
      action = THIRD_EYE_ACTION.MONITOR;
      reason = `⚠️ ${criticalFactors.length} facteur(s) critique(s) détecté(s)`;
    }

    const assessment = this._buildAssessment(action, riskLevel, riskScore, reason, t0);
    assessment.factors = risk.factors ?? [];

    // Log & Compteurs
    this._assessmentLog.push({
      action, riskLevel, riskScore, timestamp: Date.now(),
    });
    if (this._assessmentLog.length > 200) this._assessmentLog.shift();

    if (action === THIRD_EYE_ACTION.BLOCK || action === THIRD_EYE_ACTION.EMERGENCY) {
      this._blockedCount++;
      this.emit('thirdeye:blocked', { action, reason, riskLevel });
    } else {
      this._allowedCount++;
    }

    this.emit('thirdeye:assessed', { action, riskLevel, latencyMs: Date.now() - t0 });
    return assessment;
  }

  /** @private */
  _buildAssessment(action, riskLevel, riskScore, reason, t0) {
    return {
      action,
      riskLevel,
      riskScore: Math.round(riskScore * 10000) / 10000,
      reason,
      factors:     [],
      assessedAt:  Date.now(),
      latencyMs:   Date.now() - t0,
      assessmentId: crypto.randomUUID(),
    };
  }

  /** @private */
  _timeout(t0) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Third Eye timeout')), this._opts.timeoutMs)
    );
  }

  getStats() {
    return Object.freeze({
      connected:     this._connected,
      blockedCount:  this._blockedCount,
      allowedCount:  this._allowedCount,
      circuitOpen:   this._circuitOpen,
      failures:      this._failures,
      recentLog:     this._assessmentLog.slice(-10),
    });
  }
}

module.exports = ThirdEyeBridge;
module.exports.THIRD_EYE_ACTION = THIRD_EYE_ACTION;
module.exports = ThirdEyeBridge;
module.exports.THIRD_EYE_ACTION = THIRD_EYE_ACTION;
