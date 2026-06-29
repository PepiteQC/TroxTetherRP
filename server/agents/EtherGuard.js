// server/agents/EtherGuard.js
// 🛡 Sécurise les transactions — RBAC · JWT · Rate-limit · Anti-cheat
import crypto from "node:crypto";

export class EtherGuard {
  constructor() {
    this.name = "EtherGuard";
    this.version = "2.0.0";
    this.rateLimits = new Map();   // ip → { count, resetAt }
    this.blacklist  = new Set();
    this.sessions   = new Map();
  }

  async process(packet) {
    const check = await this.validate(packet);
    return {
      agent: this.name,
      mission: packet?.mission,
      success: check.allowed,
      confidence: check.score,
      risks: check.risks,
      data: check
    };
  }

  async validate(packet) {
    const risks = [];
    let score = 100;

    // Rate limit
    if (packet?.ip) {
      const rl = this.#checkRateLimit(packet.ip);
      if (!rl.allowed) {
        risks.push({ type: "RATE_LIMIT", severity: "HIGH", ip: packet.ip });
        score -= 40;
      }
    }

    // Blacklist
    if (packet?.playerId && this.blacklist.has(packet.playerId)) {
      risks.push({ type: "BLACKLISTED", severity: "CRITICAL", id: packet.playerId });
      score -= 100;
    }

    // Anti-cheat basique
    if (packet?.action === "teleport" && packet?.distance > 1000) {
      risks.push({ type: "SUSPICIOUS_TELEPORT", severity: "MEDIUM" });
      score -= 20;
    }

    return {
      allowed: score > 40,
      score: Math.max(0, score),
      risks,
      timestamp: Date.now()
    };
  }

  // JWT simple
  generateToken(payload, secret = process.env.JWT_SECRET || "troxt-secret") {
    const header  = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body    = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString("base64url");
    const sig     = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${sig}`;
  }

  verifyToken(token, secret = process.env.JWT_SECRET || "troxt-secret") {
    try {
      const [header, body, sig] = token.split(".");
      const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
      if (sig !== expected) return { valid: false, reason: "Invalid signature" };
      const payload = JSON.parse(Buffer.from(body, "base64url").toString());
      return { valid: true, payload };
    } catch { return { valid: false, reason: "Malformed token" }; }
  }

  #checkRateLimit(ip, max = 100, windowMs = 60000) {
    const now = Date.now();
    const rl  = this.rateLimits.get(ip) || { count: 0, resetAt: now + windowMs };
    if (now > rl.resetAt) { rl.count = 0; rl.resetAt = now + windowMs; }
    rl.count++;
    this.rateLimits.set(ip, rl);
    return { allowed: rl.count <= max, count: rl.count, max };
  }

  ban(playerId)   { this.blacklist.add(playerId); }
  unban(playerId) { this.blacklist.delete(playerId); }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      blacklisted: this.blacklist.size,
      rateLimitedIPs: this.rateLimits.size
    };
  }
}

export default EtherGuard;
