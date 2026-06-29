// server/agents/DiamondIdentity.js
// 💎 Empreinte SHA-512 + HMAC par session
import crypto from "node:crypto";

export class DiamondIdentity {
  constructor() {
    this.name     = "DiamondIdentity";
    this.version  = "2.0.0";
    this.sessions = new Map();   // sessionId → identity
  }

  async process(packet) {
    return {
      agent: this.name,
      mission: packet?.mission,
      success: true,
      confidence: 98,
      data: { sessions: this.sessions.size }
    };
  }

  // Créer une identité de session
  createIdentity(playerId, metadata = {}) {
    const sessionId  = crypto.randomUUID();
    const secret     = crypto.randomBytes(32).toString("hex");
    const fingerprint = this.#sha512(`${playerId}:${sessionId}:${Date.now()}`);
    const hmacKey    = crypto.createHmac("sha256", secret)
                             .update(`${playerId}:${sessionId}`)
                             .digest("hex");

    const identity = {
      sessionId,
      playerId,
      fingerprint,
      hmacKey,
      secret,
      metadata,
      createdAt:  Date.now(),
      expiresAt:  Date.now() + 24 * 60 * 60 * 1000,  // 24h
      revoked:    false,
      accessCount: 0
    };

    this.sessions.set(sessionId, identity);
    console.log(`[DiamondIdentity] Session créée: ${playerId} → ${sessionId.slice(0, 8)}...`);
    return { sessionId, fingerprint: fingerprint.slice(0, 32) + "...", expiresAt: identity.expiresAt };
  }

  // Vérifier une identité
  verify(sessionId, playerId) {
    const identity = this.sessions.get(sessionId);
    if (!identity)              return { valid: false, reason: "Session inconnue" };
    if (identity.revoked)       return { valid: false, reason: "Session révoquée" };
    if (Date.now() > identity.expiresAt) {
      this.sessions.delete(sessionId);
      return { valid: false, reason: "Session expirée" };
    }
    if (identity.playerId !== playerId) return { valid: false, reason: "PlayerId mismatch" };
    identity.accessCount++;
    return { valid: true, sessionId, playerId, accessCount: identity.accessCount };
  }

  // Révoquer une session
  revoke(sessionId) {
    const id = this.sessions.get(sessionId);
    if (id) { id.revoked = true; return { ok: true, revoked: sessionId }; }
    return { ok: false, error: "Session non trouvée" };
  }

  // HMAC pour signature de message
  signMessage(message, sessionId) {
    const identity = this.sessions.get(sessionId);
    if (!identity) return null;
    return crypto.createHmac("sha256", identity.secret).update(message).digest("hex");
  }

  #sha512(data) {
    return crypto.createHash("sha512").update(data).digest("hex");
  }

  cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt || session.revoked) this.sessions.delete(id);
    }
  }

  getStatus() { return { name: this.name, version: this.version, sessions: this.sessions.size }; }
}

export default DiamondIdentity;
