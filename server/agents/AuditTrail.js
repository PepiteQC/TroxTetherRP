// server/agents/AuditTrail.js
// 📝 Historique SHA-256 de chaque décision — Immuable
import crypto from "node:crypto";

export class AuditTrail {
  constructor() {
    this.name   = "AuditTrail";
    this.version = "2.0.0";
    this.chain  = [];   // Blockchain simplifiée
    this.index  = new Map();
  }

  async process(packet) {
    return {
      agent: this.name,
      mission: packet?.mission,
      success: true,
      confidence: 99,
      data: { entries: this.chain.length }
    };
  }

  // Enregistrer une entrée immuable
  record(action, actor, data = {}, severity = "INFO") {
    const prev     = this.chain[this.chain.length - 1];
    const prevHash = prev?.hash || "0".repeat(64);
    const timestamp = Date.now();

    const entry = {
      index:     this.chain.length,
      action,
      actor,
      severity,
      data:      JSON.stringify(data).slice(0, 500),
      timestamp,
      prevHash,
      hash:      ""
    };

    // Hash SHA-256 de l'entrée + hash précédent
    const content = `${entry.index}:${action}:${actor}:${timestamp}:${prevHash}:${entry.data}`;
    entry.hash    = crypto.createHash("sha256").update(content).digest("hex");

    this.chain.push(entry);
    this.index.set(entry.hash, entry);

    if (severity === "CRITICAL" || severity === "HIGH") {
      console.warn(`[AuditTrail] 📝 ${severity} — ${action} by ${actor}`);
    }

    return { entryIndex: entry.index, hash: entry.hash };
  }

  // Vérifier l'intégrité de la chaîne
  verify() {
    for (let i = 1; i < this.chain.length; i++) {
      const curr = this.chain[i];
      const prev = this.chain[i - 1];
      if (curr.prevHash !== prev.hash) {
        return { valid: false, brokenAt: i, expected: prev.hash, got: curr.prevHash };
      }
      // Re-calculer le hash
      const content  = `${curr.index}:${curr.action}:${curr.actor}:${curr.timestamp}:${curr.prevHash}:${curr.data}`;
      const expected = crypto.createHash("sha256").update(content).digest("hex");
      if (curr.hash !== expected) {
        return { valid: false, tamperedAt: i, entry: curr.action };
      }
    }
    return { valid: true, entries: this.chain.length };
  }

  // Rechercher dans l'audit
  search(query = {}) {
    return this.chain.filter(e => {
      if (query.actor    && e.actor   !== query.actor)    return false;
      if (query.action   && !e.action.includes(query.action)) return false;
      if (query.severity && e.severity !== query.severity) return false;
      if (query.from     && e.timestamp < query.from)     return false;
      if (query.to       && e.timestamp > query.to)       return false;
      return true;
    });
  }

  getEntry(hash)      { return this.index.get(hash); }
  getLast(n = 20)     { return this.chain.slice(-n); }
  getByActor(actor)   { return this.chain.filter(e => e.actor === actor); }
  getBySeverity(sev)  { return this.chain.filter(e => e.severity === sev); }
  getStatus()         { return { name: this.name, version: this.version, entries: this.chain.length, valid: this.chain.length < 2 || this.verify().valid }; }
}

export default AuditTrail;
