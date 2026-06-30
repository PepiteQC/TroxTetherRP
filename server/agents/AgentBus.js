// server/agents/AgentBus.js
// 🚌 Bus de communication inter-agents - Version 4.0.0 Ultra
import crypto from "node:crypto";
import { EventEmitter } from "node:events";

// ============================================================
// CONSTANTES
// ============================================================
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const DEFAULT_CONFIG = {
  maxQueueSize: 1000,
  maxHistorySize: 500,
  enableMetrics: true,
  logLevel: "warn",
  timeout: 5000,
  retryAttempts: 3,
  retryDelay: 500,
  retryBackoff: true,
  parallelExecution: true,
  circuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTime: 30_000,
  circuitBreakerHalfOpenMax: 2,
  maxEventListeners: 50,
  enableAuditLog: true,
  maxAuditEntries: 2000,
  enableDeduplication: true,
  deduplicationWindow: 2000,
  enablePriorityQueue: true,
  enableHealthCheck: true,
  healthCheckInterval: 60_000,
  maxPayloadSize: 1_048_576, // 1MB
  enableRateLimit: true,
  rateLimitWindow: 10_000,
  rateLimitMax: 500,
  enablePlugin: true,
};

// ============================================================
// ERREURS TYPÉES
// ============================================================
class BusError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "BusError";
    this.code = code;
    this.details = details;
    this.ts = Date.now();
  }
}

const ERR = {
  INVALID_NAME: (n) => new BusError(`Nom invalide: ${n}`, "INVALID_AGENT_NAME"),
  NO_PROCESS: (n) => new BusError(`process() manquant: ${n}`, "NO_PROCESS_METHOD"),
  NOT_FOUND: (n) => new BusError(`Agent introuvable: ${n}`, "AGENT_NOT_FOUND"),
  QUEUE_FULL: (s) => new BusError(`Queue pleine (${s})`, "QUEUE_FULL"),
  TIMEOUT: (t) => new BusError(`Timeout après ${t}ms`, "TIMEOUT"),
  CIRCUIT_OPEN: (n, ttl) => new BusError(
    `Circuit ouvert: ${n} (retry dans ${ttl}ms)`, "CIRCUIT_OPEN", { retryAfter: ttl }),
  RATE_LIMITED: (ttl) => new BusError(`Rate limité (retry: ${ttl}ms)`, "RATE_LIMITED"),
  PAYLOAD_TOO_LARGE: (s) => new BusError(`Payload trop grand: ${s}b`, "PAYLOAD_TOO_LARGE"),
  DUPLICATE: (id) => new BusError(`Paquet dupliqué: ${id}`, "DUPLICATE_PACKET"),
  ALREADY_REG: (n) => new BusError(`Déjà enregistré: ${n}`, "ALREADY_REGISTERED"),
};

// ============================================================
// PRIORITY QUEUE
// ============================================================
class PriorityQueue {
  #items = [];

  enqueue(item) {
    this.#items.push(item);
    this.#items.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  dequeue() { return this.#items.shift(); }
  peek() { return this.#items[0]; }
  get size() { return this.#items.length; }
  isEmpty() { return this.#items.length === 0; }
  clear() { this.#items = []; }
  toArray() { return [...this.#items]; }

  remove(id) {
    const idx = this.#items.findIndex(i => i.id === id);
    if (idx !== -1) { this.#items.splice(idx, 1); return true; }
    return false;
  }
}

// ============================================================
// AGENT BUS v4.0.0
// ============================================================
export class AgentBus extends EventEmitter {
  // Champs privés
  #agents;
  #agentMeta;
  #circuitBreakers;
  #rateLimiter;
  #dedupeCache;
  #auditLog;
  #plugins;
  #history;
  #historyIndex;
  #queue;
  #startTime;
  #isProcessing;
  #processInterval;
  #healthInterval;
  #cleanupInterval;

  constructor(config = {}) {
    super();
    this.setMaxListeners(config.maxEventListeners || DEFAULT_CONFIG.maxEventListeners);

    this.name = "AgentBus";
    this.version = "4.0.0";
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Core
    this.#agents = new Map();
    this.#agentMeta = new Map();
    this.#circuitBreakers = new Map();
    this.#rateLimiter = new Map();
    this.#dedupeCache = new Map();
    this.#auditLog = [];
    this.#plugins = new Map();
    this.#history = [];
    this.#historyIndex = new Map();
    this.#queue = new PriorityQueue();
    this.#isProcessing = false;
    this.#startTime = Date.now();

    // Métriques enrichies
    this.metrics = {
      broadcasts: 0, sends: 0, errors: 0,
      timeouts: 0, retries: 0, queueProcessed: 0,
      totalProcessingTime: 0, activeAgents: 0,
      rateLimited: 0, circuitTripped: 0,
      deduped: 0, pluginCalls: 0,
      successRate: 100, p50: 0, p95: 0, p99: 0,
    };

    // Histogram pour percentiles
    this.#latencies = [];

    this.#startTimers();
    this._log("info", `✅ AgentBus v${this.version} démarré | Parallel:${this.config.parallelExecution} CB:${this.config.circuitBreaker}`);
  }

  // Latences (percentiles)
  #latencies = [];

  // ============================================================
  // TIMERS
  // ============================================================
  #startTimers() {
    // Processeur de queue
    this.#processInterval = setInterval(() => this.#processQueue(), 100);
    if (this.#processInterval.unref) this.#processInterval.unref();

    // Health checks
    if (this.config.enableHealthCheck) {
      this.#healthInterval = setInterval(() => this.#runHealthChecks(), this.config.healthCheckInterval);
      if (this.#healthInterval.unref) this.#healthInterval.unref();
    }

    // Cleanup périodique
    this.#cleanupInterval = setInterval(() => this.cleanup(), 5 * 60_000);
    if (this.#cleanupInterval.unref) this.#cleanupInterval.unref();
  }

  // ============================================================
  // ENREGISTREMENT D'AGENT
  // ============================================================
  register(name, agent, metadata = {}) {
    try {
      if (!name || typeof name !== "string" || name.trim().length < 1) throw ERR.INVALID_NAME(name);
      if (!agent || typeof agent.process !== "function") throw ERR.NO_PROCESS(name);
      if (this.#agents.has(name) && !metadata.override) throw ERR.ALREADY_REG(name);

      // Appliquer plugins pre-register
      agent = this.#applyPlugins("pre:register", agent, { name }) || agent;

      this.#agents.set(name, agent);

      this.#agentMeta.set(name, {
        name,
        version: agent.version || "unknown",
        registeredAt: Date.now(),
        callCount: 0,
        errorCount: 0,
        successCount: 0,
        avgResponseTime: 0,
        totalResponseTime: 0,
        lastCalled: null,
        lastError: null,
        lastErrorMsg: null,
        status: "active",
        tags: metadata.tags || [],
        priority: metadata.priority || 0,
        capabilities: agent.capabilities || [],
        healthStatus: "unknown",
        lastHealthCheck: null,
        latencies: [],
        ...metadata,
      });

      if (this.config.circuitBreaker) {
        this.#circuitBreakers.set(name, {
          failures: 0,
          state: "closed",
          lastFailure: null,
          nextAttempt: null,
          halfOpenCount: 0,
          totalTripped: 0,
        });
      }

      this.metrics.activeAgents = this.#agents.size;
      this.#audit("REGISTER", name, { version: agent.version });
      this.emit("agent:registered", { name, version: agent.version, metadata });
      this._log("info", `✅ Registré: ${name} v${agent.version || "?"}`);

      return { success: true, name, version: agent.version };
    } catch (err) {
      this.#incMetric("errors");
      this._log("error", `register(${name}): ${err.message}`);
      throw err;
    }
  }

  // Désenregistrer
  unregister(name) {
    if (!this.#agents.has(name)) return { ok: false, reason: "Agent non trouvé" };
    this.#agents.delete(name);
    this.#agentMeta.delete(name);
    this.#circuitBreakers.delete(name);
    this.metrics.activeAgents = this.#agents.size;
    this.emit("agent:unregistered", { name });
    this._log("info", `Agent désenregistré: ${name}`);
    return { ok: true, name };
  }

  // ============================================================
  // BROADCAST
  // ============================================================
  async broadcast(packet, options = {}) {
    const startTime = Date.now();
    const packetId = options.packetId || crypto.randomUUID();
    const timeout = options.timeout || this.config.timeout;
    const tags = options.tags || null;

    try {
      this.#validatePayload(packet);
      if (this.config.enableDeduplication) {
        this.#checkDedupe(packetId, packet);
      }
      this.#checkRateLimit("broadcast");
      this.#incMetric("broadcasts");

      // Sélection des agents cibles
      let targets = options.targets
        ? options.targets.filter(n => this.#agents.has(n))
        : Array.from(this.#agents.keys());

      // Filtrer par tags
      if (tags && Array.isArray(tags)) {
        targets = targets.filter(n => {
          const meta = this.#agentMeta.get(n);
          return meta?.tags?.some(t => tags.includes(t));
        });
      }

      if (targets.length === 0) {
        return { packetId, results: [], duration: 0, warning: "Aucun agent cible" };
      }

      // Appliquer plugins
      packet = this.#applyPlugins("pre:broadcast", packet, { packetId }) || packet;

      let results;

      if (this.config.parallelExecution) {
        const settled = await Promise.allSettled(
          targets.map(async (name) => {
            try {
              const result = await this.#executeWithRetry(name, packet, timeout, options);
              return { agent: name, result, success: true };
            } catch (e) {
              return { agent: name, error: e.message, code: e.code, success: false };
            }
          })
        );

        results = settled.map((s, i) =>
          s.status === "fulfilled"
            ? s.value
            : { agent: targets[i], error: s.reason?.message, success: false }
        );
      } else {
        results = [];
        for (const name of targets) {
          try {
            const result = await this.#executeWithRetry(name, packet, timeout, options);
            results.push({ agent: name, result, success: true });
          } catch (e) {
            results.push({ agent: name, error: e.message, code: e.code, success: false });
          }
        }
      }

      const duration = Date.now() - startTime;
      this.metrics.totalProcessingTime += duration;
      this.#recordLatency(duration);

      const summary = {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      };

      const entry = {
        id: packetId,
        type: "broadcast",
        packet: this.#compact(packet),
        targetCount: targets.length,
        successCount: summary.success,
        errorCount: summary.failed,
        duration,
        timestamp: Date.now(),
      };

      this.#addHistory(entry);
      this.#historyIndex.set(packetId, entry);
      this.#audit("BROADCAST", "ALL", { packetId, summary });

      results = this.#applyPlugins("post:broadcast", results, { packetId }) || results;

      this.emit("broadcast:completed", { packetId, results, duration, summary });

      this.#updateSuccessRate(summary.success, summary.total);

      return { packetId, results, duration, summary };
    } catch (err) {
      this.#incMetric("errors");
      this._log("error", `broadcast: ${err.message}`);
      this.emit("broadcast:error", { packetId, error: err.message });
      throw err;
    }
  }

  // ============================================================
  // SEND
  // ============================================================
  async send(agentName, packet, options = {}) {
    const startTime = Date.now();
    const timeout = options.timeout || this.config.timeout;

    try {
      if (!this.#agents.has(agentName)) throw ERR.NOT_FOUND(agentName);
      this.#validatePayload(packet);
      this.#checkRateLimit(`send:${agentName}`);
      this.#incMetric("sends");

      packet = this.#applyPlugins("pre:send", packet, { agentName }) || packet;

      const result = await this.#executeWithRetry(agentName, packet, timeout, options);
      const duration = Date.now() - startTime;

      const meta = this.#agentMeta.get(agentName);
      if (meta) {
        meta.callCount++;
        meta.successCount++;
        meta.lastCalled = Date.now();
        meta.totalResponseTime += duration;
        meta.avgResponseTime = Math.round(meta.totalResponseTime / meta.callCount);
        meta.latencies.push(duration);
        if (meta.latencies.length > 100) meta.latencies.shift();
      }

      const entry = {
        id: crypto.randomUUID(),
        type: "send",
        target: agentName,
        packet: this.#compact(packet),
        success: true,
        duration,
        timestamp: Date.now(),
      };
      this.#addHistory(entry);
      this.#audit("SEND", agentName, { duration });
      this.#recordLatency(duration);

      this.emit("send:completed", { agentName, duration, result });

      return { agent: agentName, result, duration, success: true };
    } catch (err) {
      const meta = this.#agentMeta.get(agentName);
      if (meta) {
        meta.errorCount++;
        meta.lastError = Date.now();
        meta.lastErrorMsg = err.message;
      }
      this.#incMetric("errors");
      this.emit("send:error", { agentName, error: err.message });
      this._log("error", `send(${agentName}): ${err.message}`);
      throw err;
    }
  }

  // ============================================================
  // SEND MULTI (plusieurs agents nommés)
  // ============================================================
  async sendMulti(targets, packet, options = {}) {
    const results = {};
    const promises = targets.map(async (name) => {
      try {
        results[name] = await this.send(name, packet, options);
      } catch (e) {
        results[name] = { agent: name, success: false, error: e.message };
      }
    });
    await Promise.allSettled(promises);
    return results;
  }

  // ============================================================
  // REQUEST/REPLY (pattern demande-réponse)
  // ============================================================
  async request(agentName, packet, timeout = null) {
    const replyId = crypto.randomUUID();
    const t = timeout || this.config.timeout;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeAllListeners(`reply:${replyId}`);
        reject(ERR.TIMEOUT(t));
      }, t);

      this.once(`reply:${replyId}`, (data) => {
        clearTimeout(timer);
        resolve(data);
      });

      this.send(agentName, { ...packet, _replyId: replyId }).catch(reject);
    });
  }

  reply(replyId, data) {
    this.emit(`reply:${replyId}`, data);
  }

  // ============================================================
  // ENQUEUE (PRIORITY QUEUE)
  // ============================================================
  enqueue(packet, options = {}) {
    if (this.#queue.size >= this.config.maxQueueSize) {
      this._log("warn", `Queue pleine (${this.config.maxQueueSize})`);
      throw ERR.QUEUE_FULL(this.config.maxQueueSize);
    }

    const item = {
      packet,
      options,
      addedAt: Date.now(),
      priority: options.priority || 0,
      id: crypto.randomUUID(),
    };

    this.#queue.enqueue(item);
    this.emit("queue:enqueued", { id: item.id, size: this.#queue.size });
    this._log("debug", `Enqueued (size: ${this.#queue.size})`);

    return { queued: true, id: item.id, position: this.#queue.size };
  }

  cancelQueued(id) {
    const removed = this.#queue.remove(id);
    if (removed) this.emit("queue:cancelled", { id });
    return { cancelled: removed, id };
  }

  // ============================================================
  // EXÉCUTION AVEC RETRY
  // ============================================================
  async #executeWithRetry(agentName, packet, timeout, options = {}) {
    const maxAttempts = (options.retryAttempts ?? this.config.retryAttempts) + 1;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.#executeWithCircuitBreaker(agentName, packet, timeout);
      } catch (err) {
        lastError = err;

        // Ne pas retry sur certaines erreurs
        if (
          err.code === "CIRCUIT_OPEN" ||
          err.code === "RATE_LIMITED" ||
          err.code === "AGENT_NOT_FOUND"
        ) {
          throw err;
        }

        if (attempt < maxAttempts) {
          this.#incMetric("retries");
          const delay = this.config.retryBackoff
            ? this.config.retryDelay * Math.pow(2, attempt - 1)
            : this.config.retryDelay;

          this._log("warn", `Retry ${attempt}/${maxAttempts - 1} pour ${agentName} dans ${delay}ms`);
          this.emit("agent:retry", { agentName, attempt, delay, error: err.message });

          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    throw lastError;
  }

  // ============================================================
  // EXÉCUTION AVEC CIRCUIT BREAKER
  // ============================================================
  async #executeWithCircuitBreaker(agentName, packet, timeout) {
    if (this.config.circuitBreaker) {
      const cb = this.#circuitBreakers.get(agentName);
      if (cb) {
        if (cb.state === "open") {
          const ttl = cb.nextAttempt - Date.now();
          if (ttl > 0) {
            this.#incMetric("circuitTripped");
            throw ERR.CIRCUIT_OPEN(agentName, ttl);
          }
          cb.state = "half-open";
          cb.halfOpenCount = 0;
          this._log("warn", `CB half-open: ${agentName}`);
          this.emit("circuit:halfOpen", { agentName });
        }

        if (cb.state === "half-open") {
          cb.halfOpenCount++;
          if (cb.halfOpenCount > this.config.circuitBreakerHalfOpenMax) {
            throw ERR.CIRCUIT_OPEN(agentName, cb.nextAttempt - Date.now());
          }
        }
      }
    }

    // Timeout race
    const agent = this.#agents.get(agentName);
    if (!agent) throw ERR.NOT_FOUND(agentName);

    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeout);

    try {
      const result = await Promise.race([
        agent.process(packet),
        new Promise((_, reject) =>
          controller.signal.addEventListener("abort", () => reject(ERR.TIMEOUT(timeout)))
        ),
      ]);

      clearTimeout(timerId);

      // Succès → reset CB
      if (this.config.circuitBreaker) {
        const cb = this.#circuitBreakers.get(agentName);
        if (cb && cb.failures > 0) {
          cb.failures = 0;
          cb.state = "closed";
          cb.halfOpenCount = 0;
          this.emit("circuit:closed", { agentName });
          this._log("info", `CB fermé: ${agentName}`);
        }
      }

      return result;
    } catch (err) {
      clearTimeout(timerId);

      if (err.code === "TIMEOUT") this.#incMetric("timeouts");

      if (this.config.circuitBreaker) {
        const cb = this.#circuitBreakers.get(agentName);
        if (cb) {
          cb.failures++;
          cb.lastFailure = Date.now();

          if (cb.failures >= this.config.circuitBreakerThreshold) {
            cb.state = "open";
            cb.nextAttempt = Date.now() + this.config.circuitBreakerResetTime;
            cb.totalTripped++;
            this._log("error", `⚡ CB OUVERT: ${agentName} (${cb.failures} échecs)`);
            this.emit("circuit:open", { agentName, failures: cb.failures });
          }
        }
      }

      throw err;
    }
  }

  // ============================================================
  // PROCESSEUR DE QUEUE
  // ============================================================
  async #processQueue() {
    if (this.#isProcessing || this.#queue.isEmpty()) return;
    this.#isProcessing = true;

    try {
      while (!this.#queue.isEmpty()) {
        const item = this.#queue.dequeue();
        this.#incMetric("queueProcessed");
        this.emit("queue:processing", { id: item.id });

        try {
          await this.broadcast(item.packet, item.options);
        } catch (err) {
          this._log("error", `Queue item ${item.id}: ${err.message}`);
          this.emit("queue:error", { id: item.id, error: err.message });
        }
      }
    } finally {
      this.#isProcessing = false;
    }
  }

  // ============================================================
  // HEALTH CHECKS
  // ============================================================
  async #runHealthChecks() {
    this._log("debug", "Health checks démarrés");
    const results = {};

    for (const [name, agent] of this.#agents) {
      const meta = this.#agentMeta.get(name);
      try {
        if (typeof agent.getStatus === "function") {
          const status = agent.getStatus();
          const healthy = status?.healthy !== false;
          if (meta) {
            meta.healthStatus = healthy ? "healthy" : "degraded";
            meta.lastHealthCheck = Date.now();
          }
          results[name] = { healthy, status };
        } else {
          // Ping léger
          await this.send(name, { _healthCheck: true }, { retryAttempts: 0, timeout: 1000 });
          if (meta) {
            meta.healthStatus = "healthy";
            meta.lastHealthCheck = Date.now();
          }
          results[name] = { healthy: true };
        }
      } catch {
        if (meta) {
          meta.healthStatus = "unhealthy";
          meta.lastHealthCheck = Date.now();
        }
        results[name] = { healthy: false };
        this.emit("agent:unhealthy", { name });
        this._log("warn", `⚠️ Agent unhealthy: ${name}`);
      }
    }

    this.emit("health:checked", results);
    return results;
  }

  // ============================================================
  // PLUGINS
  // ============================================================
  use(name, plugin) {
    if (typeof plugin !== "function") {
      throw new BusError("Plugin doit être une fonction", "INVALID_PLUGIN");
    }
    this.#plugins.set(name, plugin);
    this.#incMetric("pluginCalls");
    this._log("info", `Plugin enregistré: ${name}`);
    return this;
  }

  removePlugin(name) {
    this.#plugins.delete(name);
    return this;
  }

  #applyPlugins(hook, data, context = {}) {
    if (!this.config.enablePlugin || this.#plugins.size === 0) return data;
    let result = data;
    for (const [name, plugin] of this.#plugins) {
      try {
        result = plugin(hook, result, context) ?? result;
      } catch (e) {
        this._log("warn", `Plugin ${name} erreur sur ${hook}: ${e.message}`);
      }
    }
    return result;
  }

  // ============================================================
  // DÉDUPLICATION
  // ============================================================
  #checkDedupe(packetId, packet) {
    const key = packetId || this.#hashPacket(packet);
    if (this.#dedupeCache.has(key)) {
      const age = Date.now() - this.#dedupeCache.get(key);
      if (age < this.config.deduplicationWindow) {
        this.#incMetric("deduped");
        throw ERR.DUPLICATE(key);
      }
    }
    this.#dedupeCache.set(key, Date.now());
    // Auto-nettoyage
    setTimeout(() => this.#dedupeCache.delete(key), this.config.deduplicationWindow * 2);
  }

  #hashPacket(packet) {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(packet))
      .digest("hex")
      .slice(0, 16);
  }

  // ============================================================
  // RATE LIMITING
  // ============================================================
  #checkRateLimit(key) {
    if (!this.config.enableRateLimit) return;
    const now = Date.now();
    const window = this.config.rateLimitWindow;
    const max = this.config.rateLimitMax;

    const entry = this.#rateLimiter.get(key) || { count: 0, resetAt: now + window };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + window;
    }

    entry.count++;
    this.#rateLimiter.set(key, entry);

    if (entry.count > max) {
      this.#incMetric("rateLimited");
      this.emit("rateLimit:exceeded", { key });
      throw ERR.RATE_LIMITED(entry.resetAt - now);
    }
  }

  // ============================================================
  // VALIDATION PAYLOAD
  // ============================================================
  #validatePayload(packet) {
    if (!packet || typeof packet !== "object") return;
    const size = Buffer.byteLength(JSON.stringify(packet), "utf8");
    if (size > this.config.maxPayloadSize) {
      throw ERR.PAYLOAD_TOO_LARGE(size);
    }
  }

  // ============================================================
  // LATENCES & PERCENTILES
  // ============================================================
  #recordLatency(ms) {
    this.#latencies.push(ms);
    if (this.#latencies.length > 1000) this.#latencies.shift();
    this.#updatePercentiles();
  }

  #updatePercentiles() {
    if (this.#latencies.length === 0) return;
    const sorted = [...this.#latencies].sort((a, b) => a - b);
    const p = (pct) => sorted[Math.floor((pct / 100) * sorted.length)] || 0;
    this.metrics.p50 = p(50);
    this.metrics.p95 = p(95);
    this.metrics.p99 = p(99);
  }

  #updateSuccessRate(success, total) {
    if (total === 0) return;
    const rate = Math.round((success / total) * 100);
    this.metrics.successRate = rate;
  }

  // ============================================================
  // AUDIT
  // ============================================================
  #audit(action, target, extra = {}) {
    if (!this.config.enableAuditLog) return;

    if (this.#auditLog.length >= this.config.maxAuditEntries) {
      this.#auditLog.splice(0, Math.floor(this.config.maxAuditEntries * 0.1));
    }

    this.#auditLog.push({
      action,
      target,
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      ...extra,
    });
  }

  getAuditLog(limit = 100) {
    return this.#auditLog.slice(-limit);
  }

  // ============================================================
  // HISTORIQUE
  // ============================================================
  #addHistory(entry) {
    this.#history.push(entry);
    if (this.#history.length > this.config.maxHistorySize) {
      const removed = this.#history.shift();
      if (removed?.id) this.#historyIndex.delete(removed.id);
    }
  }

  searchHistory(query = {}) {
    let results = [...this.#history];

    if (query.type) results = results.filter(h => h.type === query.type);
    if (query.target) results = results.filter(h =>
      h.target === query.target ||
      (h.results && h.results.some(r => r.agent === query.target))
    );
    if (query.from) results = results.filter(h => h.timestamp >= query.from);
    if (query.to) results = results.filter(h => h.timestamp <= query.to);
    if (query.success !== undefined) {
      results = results.filter(h =>
        h.type === "send"
          ? h.success === query.success
          : query.success ? h.errorCount === 0 : h.errorCount > 0
      );
    }

    results.sort((a, b) => b.timestamp - a.timestamp);
    return results.slice(0, query.limit || 50);
  }

  getHistoryEntry(id) { return this.#historyIndex.get(id) || null; }

  clearHistory() {
    this.#history = [];
    this.#historyIndex = new Map();
    return { cleared: true };
  }

  // ============================================================
  // STATISTIQUES AGENTS
  // ============================================================
  getAgentStats(name) {
    const meta = this.#agentMeta.get(name);
    if (!meta) return null;
    const cb = this.#circuitBreakers.get(name);
    const lat = meta.latencies;
    const sorted = [...lat].sort((a, b) => a - b);
    const p = (pct) => sorted[Math.floor((pct / 100) * sorted.length)] || 0;

    return {
      ...meta,
      errorRate: meta.callCount > 0
        ? Math.round((meta.errorCount / meta.callCount) * 100)
        : 0,
      p50: p(50), p95: p(95), p99: p(99),
      circuitBreaker: cb || null,
    };
  }

  getAllAgentStats() {
    const stats = {};
    for (const [name] of this.#agentMeta) {
      stats[name] = this.getAgentStats(name);
    }
    return stats;
  }

  // ============================================================
  // NETTOYAGE
  // ============================================================
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;

    // Historique
    const before = this.#history.length;
    this.#history = this.#history.filter(h => now - h.timestamp < maxAge);
    for (const [id, entry] of this.#historyIndex) {
      if (now - entry.timestamp >= maxAge) this.#historyIndex.delete(id);
    }

    // Rate limiter
    for (const [key, entry] of this.#rateLimiter) {
      if (entry.resetAt < now) this.#rateLimiter.delete(key);
    }

    // Dedupe cache
    for (const [key, ts] of this.#dedupeCache) {
      if (now - ts > this.config.deduplicationWindow * 2) this.#dedupeCache.delete(key);
    }

    // Circuit breaker reset stale
    for (const [name, cb] of this.#circuitBreakers) {
      if (
        cb.state === "open" &&
        cb.nextAttempt &&
        now > cb.nextAttempt + this.config.circuitBreakerResetTime
      ) {
        cb.state = "closed";
        cb.failures = 0;
        this._log("debug", `CB reset (stale): ${name}`);
      }
    }

    const cleaned = before - this.#history.length;
    if (cleaned > 0) {
      this._log("debug", `Cleanup: ${cleaned} entrées historique supprimées`);
    }

    this.emit("cleanup:done", { cleaned, historySize: this.#history.length });
    return { cleaned };
  }

  // ============================================================
  // MÉTRIQUES & STATUS
  // ============================================================
  getMetrics() {
    const uptime = Date.now() - this.#startTime;
    return {
      ...this.metrics,
      avgProcessingTime: this.metrics.broadcasts > 0
        ? Math.round(this.metrics.totalProcessingTime / this.metrics.broadcasts)
        : 0,
      queueSize: this.#queue.size,
      historySize: this.#history.length,
      circuitBreakersOpen: [...this.#circuitBreakers.values()]
        .filter(cb => cb.state === "open").length,
      rateLimiterSize: this.#rateLimiter.size,
      pluginsCount: this.#plugins.size,
      auditLogSize: this.#auditLog.length,
      dedupeSize: this.#dedupeCache.size,
      uptime,
      uptimeHuman: this.#formatUptime(uptime),
      memoryUsage: process.memoryUsage().heapUsed,
      timestamp: Date.now(),
    };
  }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      healthy: true,
      registered: this.#agents.size,
      agents: this.getAgents(),
      agentDetails: this.getAllAgentStats(),
      queueSize: this.#queue.size,
      isProcessing: this.#isProcessing,
      circuitBreakers: Object.fromEntries(this.#circuitBreakers),
      metrics: this.config.enableMetrics ? this.getMetrics() : undefined,
    };
  }

  // ============================================================
  // PROCESS (compatibilité AgentBus)
  // ============================================================
  async process(packet) {
    const startTime = Date.now();
    try {
      const action = packet?.action;
      let result = null;

      switch (action) {
        case "broadcast": result = await this.broadcast(packet.data, packet.options); break;
        case "send": result = await this.send(packet.target, packet.data, packet.options); break;
        case "sendMulti": result = await this.sendMulti(packet.targets, packet.data, packet.options); break;
        case "status": result = this.getStatus(); break;
        case "metrics": result = this.getMetrics(); break;
        case "health": result = await this.#runHealthChecks(); break;
        case "stats": result = this.getAllAgentStats(); break;
        case "history": result = this.searchHistory(packet.query); break;
        case "audit": result = this.getAuditLog(packet.limit); break;
        case "cleanup": result = this.cleanup(); break;
        default:
          result = this.getStatus();
      }

      return {
        agent: this.name,
        version: this.version,
        action,
        success: true,
        confidence: 99,
        processingTime: Date.now() - startTime,
        data: result,
      };
    } catch (err) {
      this.#incMetric("errors");
      return {
        agent: this.name,
        version: this.version,
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
    clearInterval(this.#processInterval);
    if (this.#healthInterval) clearInterval(this.#healthInterval);
    if (this.#cleanupInterval) clearInterval(this.#cleanupInterval);

    this.#agents.clear();
    this.#agentMeta.clear();
    this.#circuitBreakers.clear();
    this.#rateLimiter.clear();
    this.#dedupeCache.clear();
    this.#plugins.clear();
    this.#historyIndex.clear();
    this.#history = [];
    this.#auditLog.length = 0;
    this.#queue.clear();
    this.removeAllListeners();

    this._log("info", "AgentBus v4 détruit proprement");
  }

  // ============================================================
  // HELPERS PUBLICS
  // ============================================================
  getAgent(name) { return this.#agents.get(name); }
  getAgents() { return Array.from(this.#agents.keys()); }
  hasAgent(name) { return this.#agents.has(name); }
  getQueueInfo() { return { size: this.#queue.size, items: this.#queue.toArray().map(i => i.id) }; }

  // ============================================================
  // HELPERS PRIVÉS
  // ============================================================
  #compact(packet) {
    if (!packet || typeof packet !== "object") return packet;
    const c = { ...packet };
    if (c.data && JSON.stringify(c.data).length > 200) c.data = "[truncated]";
    return c;
  }

  #incMetric(key) {
    if (this.config.enableMetrics && this.metrics[key] !== undefined) {
      this.metrics[key]++;
    }
  }

  #formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    return `${d}j ${h % 24}h ${m % 60}m ${s % 60}s`;
  }

  _log(level, message) {
    const current = LEVELS[this.config.logLevel] ?? 1;
    const target = LEVELS[level] ?? 2;
    if (target <= current) {
      console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] [${this.name}] ${message}`);
    }
  }
}

// ============================================================
// SINGLETON + EXPORT
// ============================================================
export const agentBus = new AgentBus();
export default AgentBus;