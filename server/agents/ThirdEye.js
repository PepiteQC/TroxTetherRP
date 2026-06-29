// server/agents/ThirdEye.js
// 👁 Surveille TOUT — GREEN → YELLOW → ORANGE → RED — Bloque si danger
export class ThirdEye {
  constructor() {
    this.name        = "ThirdEye";
    this.version     = "2.0.0";
    this.level       = "GREEN";   // GREEN | YELLOW | ORANGE | RED
    this.score       = 100;       // Score de confiance 0-100
    this.alerts      = [];
    this.watching    = true;
    this.thresholds  = { GREEN: 80, YELLOW: 60, ORANGE: 40, RED: 0 };
    this.blocked     = new Set();
  }

  async process(packet) {
    const risk = await this.assess(packet);
    return {
      agent: this.name,
      mission: packet?.mission,
      success: !risk.blocked,
      confidence: risk.score,
      risks: risk.threats,
      data: risk
    };
  }

  // Évaluer le risque avant exécution
  async assess(action) {
    let score    = 100;
    const threats = [];

    // Vérifier action bloquée
    if (action?.type && this.blocked.has(action.type)) {
      return { score: 0, level: "RED", blocked: true, threats: [{ type: "BLOCKED_ACTION", severity: "CRITICAL" }] };
    }

    // Patterns dangereux
    if (action?.code) {
      if (action.code.includes("eval("))        { threats.push({ type: "CODE_EVAL",      severity: "CRITICAL" }); score -= 50; }
      if (action.code.includes("DROP TABLE"))   { threats.push({ type: "SQL_INJECTION",  severity: "CRITICAL" }); score -= 50; }
      if (action.code.includes("process.exit")) { threats.push({ type: "PROCESS_EXIT",   severity: "HIGH"     }); score -= 30; }
    }

    // Fréquence anormale
    if (action?.requestsPerMin > 1000) {
      threats.push({ type: "HIGH_FREQUENCY", severity: "MEDIUM", rpm: action.requestsPerMin });
      score -= 20;
    }

    // Montant anormal
    if (action?.amount > 1000000) {
      threats.push({ type: "SUSPICIOUS_AMOUNT", severity: "HIGH", amount: action.amount });
      score -= 25;
    }

    score = Math.max(0, score);
    const level = score >= 80 ? "GREEN" : score >= 60 ? "YELLOW" : score >= 40 ? "ORANGE" : "RED";

    // Alerter si niveau élevé
    if (level === "RED" || level === "ORANGE") {
      this.#alert(level, threats, action);
      this.level = level;
      this.score = score;
    }

    return {
      score,
      level,
      blocked:  level === "RED",
      threats,
      timestamp: Date.now()
    };
  }

  // Surveiller en continu (appelé par le Brain)
  watch(data) {
    if (!this.watching) return;
    const suspicious = [];
    if (data?.failedLogins > 5)   suspicious.push("BRUTE_FORCE");
    if (data?.nullBytes)          suspicious.push("NULL_BYTE_INJECTION");
    if (data?.largePayload > 10 * 1024 * 1024) suspicious.push("LARGE_PAYLOAD");
    if (suspicious.length > 0) this.#alert("ORANGE", suspicious.map(t => ({ type: t, severity: "HIGH" })), data);
    return suspicious;
  }

  #alert(level, threats, context) {
    const alert = {
      id:        `alert_${Date.now()}`,
      level,
      threats,
      context:   JSON.stringify(context)?.slice(0, 200),
      at:        Date.now()
    };
    this.alerts.unshift(alert);
    if (this.alerts.length > 200) this.alerts.pop();
    console.warn(`[ThirdEye] 👁 ${level} — ${threats.map(t => t.type).join(", ")}`);
  }

  blockAction(actionType) { this.blocked.add(actionType); }
  unblockAction(actionType) { this.blocked.delete(actionType); }
  setLevel(level) { this.level = level; }
  getAlerts(n = 20) { return this.alerts.slice(0, n); }
  getStatus() { return { name: this.name, version: this.version, level: this.level, score: this.score, alerts: this.alerts.length, blocked: this.blocked.size }; }
}

export default ThirdEye;
