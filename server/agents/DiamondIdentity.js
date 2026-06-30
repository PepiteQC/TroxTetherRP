// server/agents/DiamondIdentity.js
import crypto from "node:crypto";
import { EventEmitter } from "node:events";

// ============================================================
// CONSTANTES & CONFIGURATION
// ============================================================
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const DEFAULT_CONFIG = {
  maxSessions: 10000,
  sessionTTL: 24 * 60 * 60 * 1000,
  cleanupInterval: 5 * 60 * 1000,
  cacheSize: 1000,
  enableMetrics: true,
  logLevel: "warn",
  rateLimitWindow: 60_000,
  rateLimitMax: 200,
  maxSessionsPerPlayer: 5,
  tokenRotationInterval: 30 * 60 * 1000,
  enableAuditLog: true,
  maxAuditEntries: 5000,
  suspicionThreshold: 50,
  bruteForceWindow: 10_000,
  bruteForceMaxAttempts: 10,
  enableGeoBlock: false,
  blockedRegions: [],
  enableEncryption: true,
  encryptionAlgorithm: "aes-256-gcm",
};

// ============================================================
// ERREURS TYPÉES
// ============================================================
class DiamondError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "DiamondError";
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
  }
}

const ERR = {
  INVALID_PLAYER: (id) => new DiamondError(`playerId invalide: ${id}`, "INVALID_PLAYER_ID"),
  SESSION_LIMIT: (max) => new DiamondError(`Limite de sessions: ${max}`, "SESSION_LIMIT_REACHED"),
  SESSION_UNKNOWN: () => new DiamondError("Session inconnue", "SESSION_NOT_FOUND"),
  SESSION_REVOKED: () => new DiamondError("Session révoquée", "SESSION_REVOKED"),
  SESSION_EXPIRED: () => new DiamondError("Session expirée", "SESSION_EXPIRED"),
  PLAYER_MISMATCH: () => new DiamondError("PlayerId mismatch", "PLAYER_MISMATCH"),
  RATE_LIMITED: (ttl) => new DiamondError(`Rate limité. Retry dans ${ttl}ms`, "RATE_LIMITED", { retryAfter: ttl }),
  BRUTE_FORCE: () => new DiamondError("Brute-force détecté", "BRUTE_FORCE_DETECTED"),
  INVALID_MESSAGE: () => new DiamondError("Message invalide", "INVALID_MESSAGE"),
  INVALID_SIGNATURE: () => new DiamondError("Signature invalide", "INVALID_SIGNATURE"),
  NOT_ATTACHED: () => new DiamondError("WS non attaché", "WS_NOT_ATTACHED"),
  PLAYER_SESSION_LIMIT: (n) => new DiamondError(`Max ${n} sessions/joueur`, "PLAYER_SESSION_LIMIT"),
};

// ============================================================
// DIAMOND IDENTITY v5.0.0
// ============================================================
export class DiamondIdentity extends EventEmitter {
  #secret;
  #encryptionKey;
  #sessions;
  #accessCache;
  #rateLimiter;
  #bruteForce;
  #auditLog;
  #tokenRotations;
  #cleanupTimer;
  #rotationTimer;
  #startTime;
  #suspicionMap;

  constructor(config = {}) {
    super();
    this.name = "DiamondIdentity";
    this.version = "5.0.0";
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Clés secrètes internes
    this.#secret = crypto.randomBytes(64);
    this.#encryptionKey = crypto.randomBytes(32);

    // Stockages
    this.#sessions = new Map();
    this.#accessCache = new Map();
    this.#rateLimiter = new Map();
    this.#bruteForce = new Map();
    this.#auditLog = [];
    this.#tokenRotations = new Map();
    this.#suspicionMap = new Map();

    // Métriques
    this.metrics = {
      created: 0, verified: 0, revoked: 0, expired: 0,
      errors: 0, cacheHits: 0, cacheMisses: 0,
      rateLimited: 0, bruteForceBlocked: 0,
      rotations: 0, suspiciousActivity: 0,
      totalBytesEncrypted: 0,
    };

    this.#startTimers();
    this.#startTime = Date.now();
    this._log("info", `✅ DiamondIdentity v${this.version} initialisé`);
  }

  // ============================================================
  // TIMERS INTERNES
  // ============================================================
  #startTimers() {
    this.#cleanupTimer = setInterval(
      () => this.cleanup(),
      this.config.cleanupInterval
    );
    if (this.#cleanupTimer.unref) this.#cleanupTimer.unref();

    this.#rotationTimer = setInterval(
      () => this.#rotateExpiredTokens(),
      this.config.tokenRotationInterval
    );
    if (this.#rotationTimer.unref) this.#rotationTimer.unref();
  }

  // ============================================================
  // CRÉATION D'IDENTITÉ
  // ============================================================
  createIdentity(playerId, metadata = {}) {
    try {
      this.#validatePlayerId(playerId);
      this.#checkRateLimit(`create:${playerId}`);
      this.#checkPlayerSessionLimit(playerId);

      if (this.#sessions.size >= this.config.maxSessions) {
        this.cleanup();
        if (this.#sessions.size >= this.config.maxSessions) {
          throw ERR.SESSION_LIMIT(this.config.maxSessions);
        }
      }

      const now = Date.now();
      const sessionId = crypto.randomUUID();
      const secret = crypto.randomBytes(48).toString("hex");
      const nonce = crypto.randomBytes(16).toString("hex");

      const fingerprint = this.#hmac(`${playerId}:${sessionId}:${now}:${nonce}`);
      const hmacKey = this.#hmac(`${playerId}:${sessionId}`, secret);
      const tokenHash = this.#sha256(`${sessionId}:${secret}:${now}`);

      const identity = {
        sessionId,
        playerId,
        fingerprint,
        hmacKey,
        secret,
        tokenHash,
        nonce,
        metadata: this.#sanitizeMetadata(metadata),
        createdAt: now,
        expiresAt: now + this.config.sessionTTL,
        lastAccessed: now,
        lastRotated: now,
        revoked: false,
        revokedAt: null,
        revokedReason: null,
        accessCount: 0,
        failedCount: 0,
        ipHash: metadata.ip ? this.#sha256(metadata.ip) : null,
        uaHash: metadata.ua ? this.#sha256(metadata.ua) : null,
        deviceId: metadata.deviceId || null,
        suspicionScore: 0,
        permissions: metadata.permissions || ["read", "play"],
        role: metadata.role || "player",
        encryptedData: this.config.enableEncryption
          ? this.#encrypt(JSON.stringify({ playerId, sessionId, now }))
          : null,
      };

      this.#sessions.set(sessionId, identity);
      this.#metrics("created");
      this.#audit("CREATE", playerId, sessionId, { role: identity.role });
      this.emit("session:created", { sessionId, playerId, role: identity.role });
      this._log("debug", `Session créée: ${playerId} → ${sessionId.slice(0, 8)}...`);

      return {
        sessionId,
        fingerprint: fingerprint.slice(0, 32) + "…",
        tokenHash: tokenHash.slice(0, 16) + "…",
        expiresAt: identity.expiresAt,
        ttl: this.config.sessionTTL,
        role: identity.role,
        permissions: identity.permissions,
        nonce,
      };
    } catch (err) {
      this.#metrics("errors");
      this._log("error", `createIdentity: ${err.message}`);
      throw err;
    }
  }

  // ============================================================
  // VÉRIFICATION
  // ============================================================
  verify(sessionId, playerId, options = {}) {
    try {
      this.#checkBruteForce(playerId);
      this.#checkRateLimit(`verify:${playerId}`);

      const cacheKey = `${playerId}:${sessionId}`;
      const now = Date.now();

      // Cache hit
      if (!options.skipCache && this.#accessCache.has(cacheKey)) {
        const cached = this.#accessCache.get(cacheKey);
        if (cached.expiresAt > now) {
          this.#metrics("cacheHits");
          cached.lastAccessed = now;
          cached.accessCount++;
          return this.#verifySuccess(sessionId, playerId, cached, true);
        }
        this.#accessCache.delete(cacheKey);
      }

      this.#metrics("cacheMisses");

      const identity = this.#sessions.get(sessionId);
      if (!identity) return this.#verifyFail("Session inconnue", playerId);
      if (identity.revoked) return this.#verifyFail("Session révoquée", playerId);
      if (now > identity.expiresAt) {
        this.#sessions.delete(sessionId);
        this.#accessCache.delete(cacheKey);
        this.#metrics("expired");
        return this.#verifyFail("Session expirée", playerId);
      }
      if (identity.playerId !== playerId) {
        this.#recordBruteForce(playerId);
        return this.#verifyFail("PlayerId mismatch", playerId);
      }

      // Vérification IP optionnelle
      if (options.ip && identity.ipHash) {
        const reqIpHash = this.#sha256(options.ip);
        if (reqIpHash !== identity.ipHash) {
          this.#addSuspicion(identity, 20, "IP_CHANGE");
          if (!options.allowIpChange) {
            return this.#verifyFail("IP mismatch", playerId);
          }
        }
      }

      // Vérification permission optionnelle
      if (options.requirePermission) {
        if (!identity.permissions.includes(options.requirePermission)) {
          return this.#verifyFail(`Permission manquante: ${options.requirePermission}`, playerId);
        }
      }

      // Détection d'activité suspecte
      const timeSinceLast = now - identity.lastAccessed;
      if (timeSinceLast < 50 && identity.accessCount > 200) {
        this.#addSuspicion(identity, 15, "HIGH_FREQUENCY");
        this.#metrics("suspiciousActivity");
        this.emit("security:suspicious", { playerId, sessionId, reason: "HIGH_FREQUENCY" });
      }

      identity.accessCount++;
      identity.lastAccessed = now;

      // Rotation automatique de token si nécessaire
      if (now - identity.lastRotated > this.config.tokenRotationInterval) {
        this.#rotateToken(identity);
      }

      this.#updateCache(cacheKey, identity, now);
      this.#metrics("verified");
      this.#audit("VERIFY", playerId, sessionId);

      return this.#verifySuccess(sessionId, playerId, identity, false);
    } catch (err) {
      this.#metrics("errors");
      return { valid: false, reason: err.message, code: err.code || "VERIFY_ERROR" };
    }
  }

  // ============================================================
  // REFRESH DE SESSION
  // ============================================================
  refreshSession(sessionId, playerId, extendTTL = null) {
    try {
      const result = this.verify(sessionId, playerId, { skipCache: true });
      if (!result.valid) return { success: false, reason: result.reason };

      const identity = this.#sessions.get(sessionId);
      const extension = extendTTL || this.config.sessionTTL;
      identity.expiresAt = Date.now() + extension;
      identity.lastRotated = Date.now();

      this.#accessCache.delete(`${playerId}:${sessionId}`);
      this.#audit("REFRESH", playerId, sessionId, { extension });
      this.emit("session:refreshed", { sessionId, playerId });
      this._log("debug", `Refresh: ${sessionId.slice(0, 8)}...`);

      return {
        success: true, sessionId,
        newExpiresAt: identity.expiresAt,
        extendedBy: extension,
      };
    } catch (err) {
      this.#metrics("errors");
      return { success: false, error: err.message };
    }
  }

  // ============================================================
  // RÉVOCATION
  // ============================================================
  revoke(sessionId, reason = "manual") {
    try {
      const identity = this.#sessions.get(sessionId);
      if (!identity) return { ok: false, error: "Session non trouvée" };

      identity.revoked = true;
      identity.revokedAt = Date.now();
      identity.revokedReason = reason;

      this.#accessCache.delete(`${identity.playerId}:${sessionId}`);
      this.#metrics("revoked");
      this.#audit("REVOKE", identity.playerId, sessionId, { reason });
      this.emit("session:revoked", { sessionId, playerId: identity.playerId, reason });
      this._log("info", `Révoqué [${reason}]: ${sessionId.slice(0, 8)}...`);

      return { ok: true, revoked: sessionId, reason };
    } catch (err) {
      this.#metrics("errors");
      return { ok: false, error: err.message };
    }
  }

  // Révoquer toutes les sessions d'un joueur
  revokeAllSessions(playerId, reason = "manual_all") {
    const revoked = [];
    for (const [id, session] of this.#sessions) {
      if (session.playerId === playerId && !session.revoked) {
        this.revoke(id, reason);
        revoked.push(id);
      }
    }
    this._log("info", `${revoked.length} sessions révoquées pour ${playerId}`);
    return { ok: true, count: revoked.length, sessionIds: revoked };
  }

  // ============================================================
  // SIGNATURES HMAC
  // ============================================================
  signMessage(message, sessionId) {
    try {
      if (!message || typeof message !== "string") throw ERR.INVALID_MESSAGE();
      const identity = this.#sessions.get(sessionId);
      if (!identity || identity.revoked) return null;
      return this.#hmac(message, identity.secret);
    } catch (err) {
      this.#metrics("errors");
      return null;
    }
  }

  verifySignature(message, signature, sessionId) {
    try {
      const expected = this.signMessage(message, sessionId);
      if (!expected) return { valid: false, reason: "Session invalide" };

      // Padding sécurisé si longueurs différentes
      const bufA = Buffer.from(signature.padEnd(64, "0"), "hex");
      const bufB = Buffer.from(expected.padEnd(64, "0"), "hex");

      if (bufA.length !== bufB.length) {
        return { valid: false, reason: "Longueur signature invalide" };
      }

      const isValid = crypto.timingSafeEqual(bufA, bufB);
      return {
        valid: isValid,
        reason: isValid ? "OK" : "Signature invalide",
      };
    } catch (err) {
      this.#metrics("errors");
      return { valid: false, reason: "Erreur vérification" };
    }
  }

  // ============================================================
  // CHIFFREMENT AES-256-GCM
  // ============================================================
  #encrypt(plaintext) {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(
        this.config.encryptionAlgorithm,
        this.#encryptionKey,
        iv
      );
      const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final()
      ]);
      const authTag = cipher.getAuthTag();
      const result = `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
      this.metrics.totalBytesEncrypted += encrypted.length;
      return result;
    } catch {
      return null;
    }
  }

  #decrypt(ciphertext) {
    try {
      const [ivHex, authTagHex, encHex] = ciphertext.split(":");
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const encrypted = Buffer.from(encHex, "hex");
      const decipher = crypto.createDecipheriv(
        this.config.encryptionAlgorithm,
        this.#encryptionKey,
        iv
      );
      decipher.setAuthTag(authTag);
      return decipher.update(encrypted) + decipher.final("utf8");
    } catch {
      return null;
    }
  }

  // ============================================================
  // RATE LIMITING
  // ============================================================
  #checkRateLimit(key) {
    const now = Date.now();
    const window = this.config.rateLimitWindow;
    const max = this.config.rateLimitMax;

    if (!this.#rateLimiter.has(key)) {
      this.#rateLimiter.set(key, { count: 1, resetAt: now + window });
      return;
    }

    const entry = this.#rateLimiter.get(key);
    if (now > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + window;
      return;
    }

    entry.count++;
    if (entry.count > max) {
      this.#metrics("rateLimited");
      this.emit("security:rateLimit", { key });
      throw ERR.RATE_LIMITED(entry.resetAt - now);
    }
  }

  // ============================================================
  // BRUTE FORCE PROTECTION
  // ============================================================
  #checkBruteForce(playerId) {
    const entry = this.#bruteForce.get(playerId);
    if (!entry) return;
    const now = Date.now();
    if (now > entry.resetAt) {
      this.#bruteForce.delete(playerId);
      return;
    }
    if (entry.attempts >= this.config.bruteForceMaxAttempts) {
      this.#metrics("bruteForceBlocked");
      this.emit("security:bruteForce", { playerId, attempts: entry.attempts });
      throw ERR.BRUTE_FORCE();
    }
  }

  #recordBruteForce(playerId) {
    const now = Date.now();
    const entry = this.#bruteForce.get(playerId) || {
      attempts: 0,
      resetAt: now + this.config.bruteForceWindow,
    };
    entry.attempts++;
    this.#bruteForce.set(playerId, entry);
  }

  // ============================================================
  // SUSPICION SCORE
  // ============================================================
  #addSuspicion(identity, points, reason) {
    identity.suspicionScore = (identity.suspicionScore || 0) + points;
    const key = identity.playerId;

    const current = this.#suspicionMap.get(key) || { score: 0, reasons: [] };
    current.score += points;
    current.reasons.push({ reason, at: Date.now() });
    this.#suspicionMap.set(key, current);

    if (current.score >= this.config.suspicionThreshold) {
      this.emit("security:highSuspicion", {
        playerId: identity.playerId,
        sessionId: identity.sessionId,
        score: current.score,
        reasons: current.reasons,
      });
      this._log("warn", `⚠️  Suspicion élevée: ${identity.playerId} (score: ${current.score})`);
    }
  }

  // ============================================================
  // ROTATION DE TOKEN
  // ============================================================
  #rotateToken(identity) {
    const oldToken = identity.tokenHash;
    identity.tokenHash = this.#sha256(`${identity.sessionId}:${Date.now()}:${crypto.randomBytes(8).toString("hex")}`);
    identity.nonce = crypto.randomBytes(16).toString("hex");
    identity.lastRotated = Date.now();

    this.#tokenRotations.set(identity.sessionId, {
      oldToken,
      newToken: identity.tokenHash,
      rotatedAt: Date.now(),
    });

    this.#metrics("rotations");
    this.emit("session:tokenRotated", {
      sessionId: identity.sessionId,
      playerId: identity.playerId,
    });
  }

  #rotateExpiredTokens() {
    const cutoff = Date.now() - this.config.tokenRotationInterval * 2;
    let cleaned = 0;
    for (const [id, rotation] of this.#tokenRotations) {
      if (rotation.rotatedAt < cutoff) {
        this.#tokenRotations.delete(id);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this._log("debug", `${cleaned} rotations expirées nettoyées`);
    }
  }

  // ============================================================
  // AUDIT LOG
  // ============================================================
  #audit(action, playerId, sessionId, extra = {}) {
    if (!this.config.enableAuditLog) return;

    if (this.#auditLog.length >= this.config.maxAuditEntries) {
      this.#auditLog.splice(0, Math.floor(this.config.maxAuditEntries * 0.1));
    }

    this.#auditLog.push({
      action,
      playerId,
      sessionId: sessionId ? sessionId.slice(0, 8) + "…" : null,
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      ...extra,
    });
  }

  getAuditLog(playerId = null, limit = 100) {
    const log = playerId
      ? this.#auditLog.filter(e => e.playerId === playerId)
      : this.#auditLog;
    return log.slice(-limit);
  }

  // ============================================================
  // WEBSOCKET HELPERS
  // ============================================================
  attachWebSocket(ws, playerId, metadata = {}) {
    const identity = this.createIdentity(playerId, metadata);

    ws._diamond = {
      playerId,
      sessionId: identity.sessionId,
      fingerprint: identity.fingerprint,
      expiresAt: identity.expiresAt,
      permissions: identity.permissions,
      role: identity.role,
    };

    try {
      ws.send(JSON.stringify({
        type: "IDENTITY_INIT",
        sessionId: identity.sessionId,
        fingerprint: identity.fingerprint,
        tokenHash: identity.tokenHash,
        expiresAt: identity.expiresAt,
        role: identity.role,
        permissions: identity.permissions,
        nonce: identity.nonce,
      }));
    } catch (e) {
      this._log("warn", `Impossible d'envoyer IDENTITY_INIT: ${e.message}`);
    }

    this._log("info", `WS attaché: ${playerId} → ${identity.sessionId.slice(0, 8)}…`);
    return ws._diamond;
  }

  detachWebSocket(ws, reason = "disconnect") {
    if (!ws._diamond) return;
    const { sessionId, playerId } = ws._diamond;
    this.revoke(sessionId, reason);
    ws._diamond = null;
    this._log("info", `WS détaché [${reason}]: ${playerId}`);
  }

  verifyWebSocketMessage(ws, rawMessage) {
    try {
      if (!ws._diamond) throw ERR.NOT_ATTACHED();

      const { playerId, sessionId } = ws._diamond;
      const payload = JSON.parse(rawMessage);
      const { signature, data, type, nonce } = payload;

      const sessionCheck = this.verify(sessionId, playerId);
      if (!sessionCheck.valid) {
        return { valid: false, reason: sessionCheck.reason };
      }

      // Anti-replay via nonce
      if (nonce && this.#isNonceReused(sessionId, nonce)) {
        return { valid: false, reason: "Nonce réutilisé (replay attack)" };
      }

      const messageString = JSON.stringify({ type, data, nonce });
      const sigCheck = this.verifySignature(messageString, signature, sessionId);

      if (!sigCheck.valid) {
        this.#addSuspicion(
          this.#sessions.get(sessionId),
          10,
          "INVALID_SIGNATURE"
        );
        return { valid: false, reason: sigCheck.reason };
      }

      if (nonce) this.#registerNonce(sessionId, nonce);

      return {
        valid: true,
        type,
        data,
        playerId,
        sessionId,
        role: ws._diamond.role,
        permissions: ws._diamond.permissions,
        remainingTTL: sessionCheck.remainingTTL,
      };
    } catch (err) {
      this.#metrics("errors");
      return { valid: false, reason: `Erreur: ${err.message}` };
    }
  }

  // ============================================================
  // ANTI-REPLAY (nonce registry)
  // ============================================================
  #nonceRegistry = new Map();

  #isNonceReused(sessionId, nonce) {
    const key = `${sessionId}:${nonce}`;
    const exists = this.#nonceRegistry.has(key);
    return exists;
  }

  #registerNonce(sessionId, nonce) {
    const key = `${sessionId}:${nonce}`;
    this.#nonceRegistry.set(key, Date.now());
    // Nettoyage auto après TTL
    setTimeout(() => this.#nonceRegistry.delete(key), this.config.sessionTTL);
  }

  // ============================================================
  // NETTOYAGE
  // ============================================================
  cleanup() {
    try {
      const now = Date.now();
      let cleaned = 0;
      let cCleaned = 0;

      for (const [id, session] of this.#sessions) {
        if (now > session.expiresAt || session.revoked) {
          this.#sessions.delete(id);
          this.#accessCache.delete(`${session.playerId}:${id}`);
          cleaned++;
        }
      }

      // Nettoyage cache expiré
      for (const [key, cached] of this.#accessCache) {
        if (cached.expiresAt < now) {
          this.#accessCache.delete(key);
          cCleaned++;
        }
      }

      // Nettoyage rate limiter
      for (const [key, entry] of this.#rateLimiter) {
        if (entry.resetAt < now) this.#rateLimiter.delete(key);
      }

      // Nettoyage brute force
      for (const [key, entry] of this.#bruteForce) {
        if (entry.resetAt < now) this.#bruteForce.delete(key);
      }

      if (cleaned > 0 || cCleaned > 0) {
        this._log("debug", `Cleanup: ${cleaned} sessions, ${cCleaned} cache`);
        this.emit("cleanup", { sessions: cleaned, cache: cCleaned });
      }

      return { sessions: cleaned, cache: cCleaned };
    } catch (err) {
      this.#metrics("errors");
      return { sessions: 0, cache: 0 };
    }
  }

  // ============================================================
  // MÉTRIQUES & STATUS
  // ============================================================
  getMetrics() {
    return {
      ...this.metrics,
      activeSessions: this.#sessions.size,
      cacheSize: this.#accessCache.size,
      rateLimiterSize: this.#rateLimiter.size,
      bruteForcTracked: this.#bruteForce.size,
      auditLogSize: this.#auditLog.length,
      tokenRotations: this.#tokenRotations.size,
      nonceRegistry: this.#nonceRegistry.size,
      uptime: Date.now() - this.#startTime,
      uptimeHuman: this.#formatUptime(Date.now() - this.#startTime),
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      healthy: true,
      sessions: this.#sessions.size,
      maxSessions: this.config.maxSessions,
      sessionUsagePct: Math.round((this.#sessions.size / this.config.maxSessions) * 100),
      cacheSize: this.#accessCache.size,
      metrics: this.config.enableMetrics ? this.getMetrics() : undefined,
    };
  }

  getSuspicionReport(playerId = null) {
    if (playerId) {
      return this.#suspicionMap.get(playerId) || { score: 0, reasons: [] };
    }
    const report = {};
    for (const [id, data] of this.#suspicionMap) {
      if (data.score >= this.config.suspicionThreshold / 2) {
        report[id] = data;
      }
    }
    return report;
  }

  findSessionsByPlayer(playerId) {
    const results = [];
    const now = Date.now();
    for (const [id, session] of this.#sessions) {
      if (session.playerId === playerId && !session.revoked && session.expiresAt > now) {
        results.push({
          sessionId: id,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          accessCount: session.accessCount,
          remainingTTL: session.expiresAt - now,
          role: session.role,
          permissions: session.permissions,
          suspicionScore: session.suspicionScore,
        });
      }
    }
    return results;
  }

  // ============================================================
  // PROCESS (compatibilité agent bus)
  // ============================================================
  async process(packet) {
    try {
      const startTime = Date.now();
      const action = packet?.action;
      let result = null;

      switch (action) {
        case "create":
          result = this.createIdentity(packet.playerId, packet.metadata);
          break;
        case "verify":
          result = this.verify(packet.sessionId, packet.playerId, packet.options);
          break;
        case "revoke":
          result = this.revoke(packet.sessionId, packet.reason);
          break;
        case "refresh":
          result = this.refreshSession(packet.sessionId, packet.playerId, packet.extendTTL);
          break;
        case "status":
          result = this.getStatus();
          break;
        case "metrics":
          result = this.getMetrics();
          break;
        case "audit":
          result = this.getAuditLog(packet.playerId, packet.limit);
          break;
        default:
          result = { sessions: this.#sessions.size, metrics: this.getMetrics() };
      }

      return {
        agent: this.name,
        version: this.version,
        mission: packet?.mission,
        action,
        success: true,
        confidence: 99,
        processingTime: Date.now() - startTime,
        data: result,
      };
    } catch (err) {
      this.#metrics("errors");
      return {
        agent: this.name,
        success: false,
        error: err.message,
        code: err.code,
        confidence: 0,
      };
    }
  }

  // ============================================================
  // DESTROY
  // ============================================================
  destroy() {
    clearInterval(this.#cleanupTimer);
    clearInterval(this.#rotationTimer);
    this.#sessions.clear();
    this.#accessCache.clear();
    this.#rateLimiter.clear();
    this.#bruteForce.clear();
    this.#tokenRotations.clear();
    this.#nonceRegistry.clear();
    this.#auditLog.length = 0;
    this.removeAllListeners();
    this._log("info", "DiamondIdentity v5 détruit proprement");
  }

  // ============================================================
  // HELPERS PRIVÉS
  // ============================================================
  #sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  #hmac(data, key = null) {
    const k = key ? Buffer.from(key) : this.#secret;
    return crypto.createHmac("sha256", k).update(data).digest("hex");
  }

  #validatePlayerId(id) {
    if (!id || typeof id !== "string" || id.trim().length < 2 || id.length > 64) {
      throw ERR.INVALID_PLAYER(id);
    }
  }

  #checkPlayerSessionLimit(playerId) {
    let count = 0;
    for (const s of this.#sessions.values()) {
      if (s.playerId === playerId && !s.revoked) count++;
    }
    if (count >= this.config.maxSessionsPerPlayer) {
      throw ERR.PLAYER_SESSION_LIMIT(this.config.maxSessionsPerPlayer);
    }
  }

  #sanitizeMetadata(meta) {
    const allowed = ["ip", "ua", "deviceId", "role", "permissions", "region", "platform"];
    const clean = {};
    for (const key of allowed) {
      if (meta[key] !== undefined) clean[key] = meta[key];
    }
    return clean;
  }

  #updateCache(cacheKey, identity, now) {
    if (this.#accessCache.size >= this.config.cacheSize) {
      const oldestKey = this.#accessCache.keys().next().value;
      this.#accessCache.delete(oldestKey);
    }
    this.#accessCache.set(cacheKey, {
      expiresAt: identity.expiresAt,
      accessCount: identity.accessCount,
      lastAccessed: now,
      role: identity.role,
      permissions: identity.permissions,
    });
  }

  #verifySuccess(sessionId, playerId, data, fromCache) {
    return {
      valid: true,
      sessionId,
      playerId,
      accessCount: data.accessCount,
      remainingTTL: data.expiresAt - Date.now(),
      role: data.role || "player",
      permissions: data.permissions || ["read", "play"],
      fromCache,
    };
  }

  #verifyFail(reason, playerId) {
    this.#recordBruteForce(playerId);
    this.emit("security:fail", { playerId, reason });
    return { valid: false, reason };
  }

  #formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    return `${d}j ${h % 24}h ${m % 60}m ${s % 60}s`;
  }

  #metrics(key) {
    if (this.config.enableMetrics && this.metrics[key] !== undefined) {
      this.metrics[key]++;
    }
  }

  _log(level, message) {
    const current = LEVELS[this.config.logLevel] ?? 1;
    const target = LEVELS[level] ?? 2;
    if (target <= current) {
      console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] [${this.name}] ${message}`);
    }
  }
}

export const diamondIdentity = new DiamondIdentity();
export default DiamondIdentity;