// server/agents/RiskPredictor.js
// 📊 ML patterns de menace en temps réel
export class RiskPredictor {
  constructor() {
    this.name     = "RiskPredictor";
    this.version  = "2.0.0";
    this.patterns = new Map();
    this.history  = [];
    this.model    = this.#initModel();
  }

  async process(packet) {
    const prediction = await this.predict(packet);
    return {
      agent: this.name,
      mission: packet?.mission,
      success: true,
      confidence: prediction.confidence,
      risks: prediction.threats,
      data: prediction
    };
  }

  async predict(event) {
    // Features extraction
    const features = this.#extract(event);
    // Score basé sur les patterns connus
    let riskScore = 0;
    const threats = [];

    for (const [patternId, pattern] of this.patterns) {
      const match = this.#matchPattern(features, pattern);
      if (match > 0.7) {
        riskScore += pattern.weight * match;
        threats.push({ patternId, type: pattern.type, match: Math.round(match * 100), weight: pattern.weight });
      }
    }

    // Normaliser
    riskScore = Math.min(100, riskScore);
    const confidence = Math.max(0, 100 - riskScore);
    const level      = riskScore < 20 ? "LOW" : riskScore < 50 ? "MEDIUM" : riskScore < 80 ? "HIGH" : "CRITICAL";

    // Enregistrer dans l'historique
    this.history.push({ event, riskScore, level, at: Date.now() });
    if (this.history.length > 1000) this.history.shift();

    // Apprendre de cet événement
    this.#learn(features, riskScore);

    return { riskScore, confidence, level, threats, timestamp: Date.now() };
  }

  // Apprendre un nouveau pattern
  addPattern(type, conditions, weight = 1.0) {
    const patternId = `pattern_${type}_${Date.now()}`;
    this.patterns.set(patternId, { type, conditions, weight, hits: 0 });
    return patternId;
  }

  #extract(event) {
    return {
      hasCode:    !!event?.code,
      hasAmount:  !!event?.amount,
      isHighFreq: (event?.requestsPerMin || 0) > 500,
      isLargePayload: (event?.size || 0) > 1024 * 1024,
      isSuspiciousIp: false,
      hasSpecialChars: /[<>'"`;]/.test(JSON.stringify(event) || ""),
    };
  }

  #matchPattern(features, pattern) {
    let matches = 0;
    let total   = 0;
    for (const [key, expected] of Object.entries(pattern.conditions || {})) {
      total++;
      if (features[key] === expected) matches++;
    }
    return total > 0 ? matches / total : 0;
  }

  #learn(features, riskScore) {
    if (riskScore > 70) {
      const key = JSON.stringify(features);
      const existing = this.model.highRiskFeatures.get(key) || 0;
      this.model.highRiskFeatures.set(key, existing + 1);
    }
  }

  #initModel() {
    // Pré-charger quelques patterns connus
    setTimeout(() => {
      this.addPattern("SQL_INJECTION",   { hasCode: true, hasSpecialChars: true }, 2.0);
      this.addPattern("DOS_ATTACK",      { isHighFreq: true                     }, 1.5);
      this.addPattern("LARGE_PAYLOAD",   { isLargePayload: true                 }, 1.0);
    }, 100);
    return { highRiskFeatures: new Map(), version: "1.0.0" };
  }

  getStats() {
    const recent = this.history.slice(-100);
    return {
      totalPredictions: this.history.length,
      avgRisk: recent.length > 0 ? Math.round(recent.reduce((s, h) => s + h.riskScore, 0) / recent.length) : 0,
      patterns: this.patterns.size,
      criticalEvents: recent.filter(h => h.level === "CRITICAL").length,
    };
  }

  getStatus() { return { name: this.name, version: this.version, ...this.getStats() }; }
}

export default RiskPredictor;
