// server/agents/EtherGuard.js
// 🛡️ Gardien de Sécurité Avancé - RBAC, JWT, Rate-Limit Glissant, Anti-Cheat
// Version 3.0 Optimisée
import crypto from "node:crypto";

export class EtherGuard {
  constructor(config = {}) {
    this.name = "EtherGuard";
    this.version = "3.0.0";

    // Configuration flexible
    this.config = {
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET || "troxt-secret-change-me",
      rateLimitWindow: config.rateLimitWindow || 60 * 1000, // 1 minute
      rateLimitMax: config.rateLimitMax || 100,             // 100 req/min
      banDuration: config.banDuration || 24 * 60 * 60 * 1000, // 24h par défaut
      enableMetrics: config.enableMetrics !== false,
      logLevel: config.logLevel || 'warn',
      strictMode: config.strictMode || false, // Bloque au moindre doute
      ...config
    };

    // Stockage optimisé
    this.blacklist = new Map();   // playerId -> { reason, bannedAt, expiresAt }
    this.whitelist = new Set();   // IPs ou IDs de confiance absolue
    
    // Rate Limiting Glissant (Sliding Window)
    this.rateLimits = new Map();  // key(ip/user) -> [timestamps]
    
    // Sessions actives (pour invalidation rapide)
    this.activeSessions = new Map(); // tokenId -> payload
    
    // RBAC (Role-Based Access Control)
    this.roles = new Map();       // roleName -> permissions[]
    this.userRoles = new Map();   // userId -> roleName

    // Métriques
    this.metrics = {
      requestsChecked: 0,
      blocked: 0,
      banned: 0,
      tokensGenerated: 0,
      errors: 0
    };

    this._log('info', `[${this.name}] Initialisé v${this.version} | Mode: ${this.config.strictMode ? 'STRICT' : 'NORMAL'}`);
  }

  async process(packet) {
    const startTime = Date.now();
    try {
      const result = await this.validate(packet);
      return {
        agent: this.name,
        version: this.version,
        mission: packet?.mission,
        success: result.allowed,
        confidence: result.score,
        processingTime: Date.now() - startTime,
        risks: result.risks,
        data: result
      };
    } catch (error) {
      this._incrementMetric('errors');
      return {
        agent: this.name,
        success: false,
        error: error.message,
        confidence: 0
      };
    }
  }

  // 🛡️ Validation Complète (Pipeline de sécurité)
  async validate(packet) {
    this._incrementMetric('requestsChecked');
    const risks = [];
    let score = 100;
    const now = Date.now();

    if (!packet) {
      return { allowed: false, score: 0, risks: [{ type: "EMPTY_PACKET", severity: "CRITICAL" }] };
    }

    const ip = packet.ip || 'unknown';
    const userId = packet.playerId || packet.userId;
    const action = packet.action;

    // 1. Whitelist Check (Bypass rapide)
    if (this.whitelist.has(ip) || (userId && this.whitelist.has(userId))) {
      return { allowed: true, score: 100, risks: [], whitelisted: true };
    }

    // 2. Blacklist Check (Bloquant immédiat)
    if (userId && this.blacklist.has(userId)) {
      const banInfo = this.blacklist.get(userId);
      if (now < banInfo.expiresAt) {
        return { 
          allowed: false, 
          score: 0, 
          risks: [{ type: "BLACKLISTED", severity: "CRITICAL", reason: banInfo.reason }] 
        };
      } else {
        // Ban expiré, nettoyage
        this.blacklist.delete(userId);
      }
    }

    // 3. Rate Limiting (Sliding Window)
    const rlCheck = this.#checkSlidingRateLimit(ip);
    if (!rlCheck.allowed) {
      risks.push({ type: "RATE_LIMIT_EXCEEDED", severity: "HIGH", current: rlCheck.count, max: rlCheck.max });
      score -= 50;
    }

    // 4. Anti-Cheat & Heuristique
    if (action) {
      // Téléportation suspecte
      if (action === "teleport" && packet.distance > 500) {
        risks.push({ type: "SUSPICIOUS_TELEPORT", severity: "MEDIUM", distance: packet.distance });
        score -= 30;
      }
      
      // Action trop rapide (Speedhack potentiel)
      if (packet.lastActionTimestamp && (now - packet.lastActionTimestamp < 50)) {
         risks.push({ type: "SPEEDHACK_SUSPECT", severity: "HIGH", delta: now - packet.lastActionTimestamp });
         score -= 40;
      }

      // Payload trop volumineux (DoS potentiel)
      if (packet.data && JSON.stringify(packet.data).length > 10000) {
        risks.push({ type: "PAYLOAD_TOO_LARGE", severity: "LOW" });
        score -= 10;
      }
    }

    // 5. Vérification Token (si présent)
    if (packet.token) {
      const tokenCheck = this.verifyToken(packet.token);
      if (!tokenCheck.valid) {
        risks.push({ type: "INVALID_TOKEN", severity: "HIGH", reason: tokenCheck.reason });
        score -= 60;
      } else {
        // Vérifier si le token a été révoqué
        if (!this.activeSessions.has(packet.token)) {
           // Optionnel: traiter comme invalide si on utilise la liste blanche de sessions
           // risks.push({ type: "REVOKED_SESSION", severity: "HIGH" });
           // score -= 100;
        }
      }
    }

    const allowed = this.config.strictMode ? (risks.length === 0) : (score > 40);
    
    if (!allowed) {
      this._incrementMetric('blocked');
      this._log('warn', `🚫 Bloqué: ${userId || ip} | Score: ${score} | Risques: ${risks.map(r=>r.type).join(', ')}`);
    }

    return {
      allowed,
      score: Math.max(0, score),
      risks,
      timestamp: now,
      userId,
      ip
    };
  }

  // 🔑 Génération JWT Sécurisée
  generateToken(payload, options = {}) {
    try {
      const header = { alg: "HS256", typ: "JWT" };
      const now = Math.floor(Date.now() / 1000);
      const exp = now + (options.expiresIn || 3600); // 1h par défaut
      
      const body = { 
        ...payload, 
        iat: now, 
        exp: exp,
        jti: crypto.randomUUID() // Unique ID pour révocation
      };

      const headerStr = Buffer.from(JSON.stringify(header)).toString("base64url");
      const bodyStr = Buffer.from(JSON.stringify(body)).toString("base64url");
      const sig = crypto.createHmac("sha256", this.config.jwtSecret)
                          .update(`${headerStr}.${bodyStr}`)
                          .digest("base64url");

      const token = `${headerStr}.${bodyStr}.${sig}`;
      
      // Enregistrer la session active pour révocation possible
      this.activeSessions.set(token, {
        userId: payload.sub || payload.id,
        issuedAt: now,
        expiresAt: exp
      });

      this._incrementMetric('tokensGenerated');
      return token;
    } catch (error) {
      this._incrementMetric('errors');
      throw error;
    }
  }

  // ✅ Vérification JWT
  verifyToken(token) {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return { valid: false, reason: "Malformed token" };

      const [headerStr, bodyStr, sig] = parts;
      
      // Vérification Signature
      const expectedSig = crypto.createHmac("sha256", this.config.jwtSecret)
                                .update(`${headerStr}.${bodyStr}`)
                                .digest("base64url");
      
      // Timing-safe comparison
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
        return { valid: false, reason: "Invalid signature" };
      }

      // Décodage Payload
      const payload = JSON.parse(Buffer.from(bodyStr, "base64url").toString());
      
      // Vérification Expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && now > payload.exp) {
        // Nettoyage session expirée
        this.activeSessions.delete(token);
        return { valid: false, reason: "Token expired" };
      }

      return { valid: true, payload };
    } catch (e) {
      return { valid: false, reason: "Verification error" };
    }
  }

  // 🔄 Révoquer un token (Logout)
  revokeToken(token) {
    this.activeSessions.delete(token);
    return { ok: true };
  }

  // 📉 Rate Limiting Glissant (Plus précis que Fixed Window)
  #checkSlidingRateLimit(key, max = this.config.rateLimitMax, windowMs = this.config.rateLimitWindow) {
    const now = Date.now();
    let timestamps = this.rateLimits.get(key);

    if (!timestamps) {
      timestamps = [];
      this.rateLimits.set(key, timestamps);
    }

    // Supprimer les timestamps anciens (hors fenêtre)
    while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
      timestamps.shift();
    }

    // Ajouter le nouveau
    timestamps.push(now);

    // Vérifier limite
    const count = timestamps.length;
    const allowed = count <= max;

    // Nettoyage mémoire si vide (rare mais possible)
    if (count === 0) this.rateLimits.delete(key);

    return { allowed, count, max, remaining: Math.max(0, max - count) };
  }

  // 👮 Gestion Blacklist (avec expiration)
  ban(playerId, reason = "Violation rules", durationMs = null) {
    const expiresAt = Date.now() + (durationMs || this.config.banDuration);
    this.blacklist.set(playerId, {
      reason,
      bannedAt: Date.now(),
      expiresAt
    });
    this._incrementMetric('banned');
    this._log('warn', `🔨 Banni: ${playerId} pour "${reason}" jusqu'à ${new Date(expiresAt).toISOString()}`);
    return { ok: true, expiresAt };
  }

  unban(playerId) {
    const removed = this.blacklist.delete(playerId);
    return { ok: removed };
  }

  isBanned(playerId) {
    if (!this.blacklist.has(playerId)) return false;
    const banInfo = this.blacklist.get(playerId);
    if (Date.now() > banInfo.expiresAt) {
      this.blacklist.delete(playerId);
      return false;
    }
    return true;
  }

  // 👤 RBAC (Role-Based Access Control)
  defineRole(roleName, permissions) {
    this.roles.set(roleName, new Set(permissions));
  }

  assignRole(userId, roleName) {
    if (!this.roles.has(roleName)) throw new Error(`Rôle inconnu: ${roleName}`);
    this.userRoles.set(userId, roleName);
  }

  hasPermission(userId, permission) {
    const role = this.userRoles.get(userId);
    if (!role) return false;
    const perms = this.roles.get(role);
    return perms ? perms.has(permission) : false;
  }

  // 🧹 Nettoyage périodique (à appeler via setInterval externe ou interne)
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Nettoyer bans expirés
    for (const [id, info] of this.blacklist) {
      if (now > info.expiresAt) {
        this.blacklist.delete(id);
        cleaned++;
      }
    }

    // Nettoyer sessions expirées
    for (const [token, session] of this.activeSessions) {
      if (now > session.expiresAt * 1000) { // convert sec to ms
        this.activeSessions.delete(token);
        cleaned++;
      }
    }

    // Nettoyer rate limits inactifs (simple heuristic: si dernier timestamp > 2x window)
    // Note: Le sliding window se nettoie déjà à chaque appel, mais on peut forcer un GC des keys mortes
    for (const [key, timestamps] of this.rateLimits) {
      if (timestamps.length === 0 || (now - timestamps[timestamps.length-1] > this.config.rateLimitWindow * 2)) {
        this.rateLimits.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) this._log('debug', `Cleanup: ${cleaned} entrées supprimées`);
    return cleaned;
  }

  // Utilitaires
  _incrementMetric(metric) {
    if (this.config.enableMetrics && this.metrics[metric] !== undefined) {
      this.metrics[metric]++;
    }
  }

  _log(level, message) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = levels[this.config.logLevel] ?? 1;
    const messageLevel = levels[level] ?? 2;
    
    if (messageLevel <= currentLevel) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${message}`);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeSessions: this.activeSessions.size,
      blacklistedUsers: this.blacklist.size,
      rateLimitKeys: this.rateLimits.size,
      rolesDefined: this.roles.size,
      timestamp: Date.now()
    };
  }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      securityLevel: this.config.strictMode ? 'STRICT' : 'NORMAL',
      metrics: this.config.enableMetrics ? this.getMetrics() : undefined
    };
  }
}

export default EtherGuard;