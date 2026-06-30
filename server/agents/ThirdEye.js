// server/agents/ThirdEye.js
// 👁 Surveille TOUT — GREEN → YELLOW → ORANGE → RED
import { EventEmitter } from 'node:events';

const VERSION = '2.0.0';

const ALERT_COLORS = {
  GREEN: '#22c55e', BLUE: '#60a5fa', YELLOW: '#fbbf24',
  ORANGE: '#f97316', RED: '#ef4444', BLACK: '#18181b',
};

const ALERT_PRIORITY = { BLACK: 5, RED: 4, ORANGE: 3, YELLOW: 2, BLUE: 1, GREEN: 0 };

export class ThirdEye extends EventEmitter {

  #alerts = [];
  #incidents = [];
  #hooks = new Map();
  #startedAt = Date.now();

  // ✅ backward compat
  name = "ThirdEye";
  version = VERSION;
  level = "GREEN";
  score = 100;
  watching = true;
  blocked = new Set();
  alerts = [];
  thresholds = { GREEN: 80, YELLOW: 60, ORANGE: 40, RED: 0 };

  constructor(scoreHistory, config = {}) {
    super();
    this.scoreHistory = scoreHistory;
    this.config = config;
  }

  // ── process (AgentBus compat) ──────────────────────────────
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

  // ── assess ─────────────────────────────────────────────────
  async assess(action) {
    let score = 100;
    const threats = [];

    if (action?.type && this.blocked.has(action.type)) {
      return {
        score: 0, level: "RED", blocked: true,
        threats: [{ type: "BLOCKED_ACTION", severity: "CRITICAL" }]
      };
    }

    if (action?.code) {
      if (action.code.includes("eval(")) { threats.push({ type: "CODE_EVAL", severity: "CRITICAL" }); score -= 50; }
      if (action.code.includes("DROP TABLE")) { threats.push({ type: "SQL_INJECTION", severity: "CRITICAL" }); score -= 50; }
      if (action.code.includes("process.exit")) { threats.push({ type: "PROCESS_EXIT", severity: "HIGH" }); score -= 30; }
    }

    if (action?.requestsPerMin > 1000) { threats.push({ type: "HIGH_FREQUENCY", severity: "MEDIUM", rpm: action.requestsPerMin }); score -= 20; }
    if (action?.amount > 1_000_000) { threats.push({ type: "SUSPICIOUS_AMOUNT", severity: "HIGH", amount: action.amount }); score -= 25; }

    score = Math.max(0, score);
    const level = score >= 80 ? "GREEN" : score >= 60 ? "YELLOW" : score >= 40 ? "ORANGE" : "RED";

    if (level === "RED" || level === "ORANGE") {
      this._alert(level, threats, action);
      this.level = level;
      this.score = score;
    }

    return { score, level, blocked: level === "RED", threats, timestamp: Date.now() };
  }

  // ── watch ──────────────────────────────────────────────────
  watch(data) {
    if (!this.watching) return;
    const suspicious = [];
    if (data?.failedLogins > 5) suspicious.push("BRUTE_FORCE");
    if (data?.nullBytes) suspicious.push("NULL_BYTE_INJECTION");
    if (data?.largePayload > 10 * 1024 * 1024) suspicious.push("LARGE_PAYLOAD");
    if (suspicious.length > 0) {
      this._alert("ORANGE", suspicious.map(t => ({ type: t, severity: "HIGH" })), data);
    }
    return suspicious;
  }

  // ── serializeData ──────────────────────────────────────────
  serializeData(data) {
    try {
      let str = JSON.stringify(data ?? {});
      if (str.length > 2048) str = str.slice(0, 2048) + "…[truncated]";
      return str;
    } catch {
      return '{"error":"Serialization failed"}';
    }
  }

  // ── alert interne ──────────────────────────────────────────
  _alert(level, threats, context) {
    const alert = {
      id: `alert_${Date.now()}`,
      level,
      color: ALERT_COLORS[level] || '#fff',
      threats,
      context: JSON.stringify(context)?.slice(0, 200),
      resolved: false,
      at: Date.now()
    };
    this.alerts.unshift(alert);
    this.#alerts.unshift(alert);
    if (this.alerts.length > 200) this.alerts.pop();
    if (this.#alerts.length > 500) this.#alerts.pop();
    this.emit('thirdEye:alert', alert);
    console.warn(`[ThirdEye] 👁 ${level} — ${threats.map(t => t.type).join(", ")}`);
  }

  // ── helpers publics ────────────────────────────────────────
  blockAction(actionType) { this.blocked.add(actionType); }
  unblockAction(actionType) { this.blocked.delete(actionType); }
  setLevel(level) { this.level = level; }
  getAlerts(n = 20) { return this.alerts.slice(0, n); }

  resolveAlert(id, resolvedBy = 'system') {
    const a = this.#alerts.find(a => a.id === id);
    if (!a) return { ok: false };
    a.resolved = true;
    a.resolvedAt = Date.now();
    a.resolvedBy = resolvedBy;
    return { ok: true };
  }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      level: this.level,
      score: this.score,
      alerts: this.alerts.length,
      blocked: this.blocked.size,
      healthy: this.level !== 'RED',
      uptime: Date.now() - this.#startedAt,
    };
  }

  destroy() {
    this.#alerts.length = 0;
    this.#incidents.length = 0;
    this.#hooks.clear();
    this.removeAllListeners();
  }
}

export default ThirdEye;