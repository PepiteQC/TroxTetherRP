// server/agents/AuditTrail.js
// 📝 Historique SHA-256 immuable - Version 4.0.0 Ultra
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";

// ============================================================
// CONSTANTES
// ============================================================
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const SEVERITY_RANK = {
  DEBUG: 0, INFO: 1, NOTICE: 2,
  WARN: 3, WARNING: 3,
  HIGH: 4, ERROR: 4,
  CRITICAL: 5, FATAL: 5,
};

const DEFAULT_CONFIG = {
  maxEntries: 100_000,
  persistence: false,
  storagePath: "./data/audit",
  batchSize: 100,
  flushInterval: 30_000,
  enableMetrics: true,
  logLevel: "warn",
  severityFilter: null,
  retentionDays: 90,
  enableCompression: false,
  enableEncryption: false,
  enableIntegrityCache: true,
  integrityCacheTTL: 300_000,   // 5 min
  maxPayloadSize: 2048,      // chars
  enableEventEmit: true,
  enableAnomalyDetect: true,
  anomalyWindow: 60_000,    // 1 min
  anomalyThreshold: 100,       // events/min
  maxActorIndexSize: 10_000,
  rotateSize: 50_000,    // Rotation fichier à 50k entrées
  enableTagging: true,
  enableSignature: true,
  snapshotInterval: 0,         // 0 = désactivé
  exportFormats: ["json", "csv", "ndjson", "html"],
};

// ============================================================
// ERREURS TYPÉES
// ============================================================
class AuditError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "AuditError";
    this.code = code;
    this.details = details;
    this.ts = Date.now();
  }
}

const ERR = {
  INVALID_ACTION: (a) => new AuditError(`Action invalide: ${a}`, "INVALID_ACTION"),
  INVALID_ACTOR: (a) => new AuditError(`Actor invalide: ${a}`, "INVALID_ACTOR"),
  INVALID_FORMAT: (f) => new AuditError(`Format inconnu: ${f}`, "INVALID_FORMAT"),
  CHAIN_BROKEN: (i) => new AuditError(`Chaîne brisée à ${i}`, "CHAIN_BROKEN", { index: i }),
  PAYLOAD_LARGE: (s) => new AuditError(`Payload trop grand: ${s}`, "PAYLOAD_TOO_LARGE"),
  IMPORT_INVALID: () => new AuditError("Format import invalide", "INVALID_IMPORT"),
  TAMPERED: (i) => new AuditError(`Entrée falsifiée: ${i}`, "TAMPERED_ENTRY", { index: i }),
};

// ============================================================
// BLOOM FILTER (faux-positifs, 0 faux-négatifs — ultra-rapide)
// ============================================================
class BloomFilter {
  #bits;
  #size;
  #hashCount;

  constructor(size = 10_000, hashCount = 3) {
    this.#size = size;
    this.#hashCount = hashCount;
    this.#bits = new Uint8Array(Math.ceil(size / 8));
  }

  #hash(str, seed) {
    let h = seed ^ 0xdeadbeef;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 0x9e3779b9);
      h ^= h >>> 16;
    }
    return Math.abs(h) % this.#size;
  }

  add(str) {
    for (let i = 0; i < this.#hashCount; i++) {
      const pos = this.#hash(str, i * 0x5bd1e995);
      this.#bits[pos >> 3] |= 1 << (pos & 7);
    }
  }

  mightContain(str) {
    for (let i = 0; i < this.#hashCount; i++) {
      const pos = this.#hash(str, i * 0x5bd1e995);
      if ((this.#bits[pos >> 3] & (1 << (pos & 7))) === 0) return false;
    }
    return true;
  }

  reset() { this.#bits.fill(0); }
}

// ============================================================
// TRIE (recherche préfixe ultra-rapide)
// ============================================================
class TrieIndex {
  #root = {};

  insert(word, idx) {
    let node = this.#root;
    for (const char of word.toLowerCase()) {
      if (!node[char]) node[char] = { _indices: [] };
      node = node[char];
      node._indices.push(idx);
    }
  }

  search(prefix) {
    let node = this.#root;
    for (const char of prefix.toLowerCase()) {
      if (!node[char]) return [];
      node = node[char];
    }
    return node._indices || [];
  }

  clear() { this.#root = {}; }
}

// ============================================================
// AUDIT TRAIL v4.0.0
// ============================================================
export class AuditTrail extends EventEmitter {
  // Champs privés
  #chain;
  #index;
  #actorIndex;
  #actionIndex;
  #severityIndex;
  #tagIndex;
  #actorTrie;
  #actionTrie;
  #bloom;
  #pendingWrites;
  #flushTimer;
  #snapshotTimer;
  #anomalyTracker;
  #integrityCache;
  #signingKey;
  #encryptionKey;
  #startTime;
  #isVerifying;
  #rotationCount;
  #hooks;

  constructor(config = {}) {
    super();
    this.name = "AuditTrail";
    this.version = "4.0.0";
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Stockages
    this.#chain = [];
    this.#index = new Map();
    this.#actorIndex = new Map();
    this.#actionIndex = new Map();
    this.#severityIndex = new Map();
    this.#tagIndex = new Map();
    this.#actorTrie = new TrieIndex();
    this.#actionTrie = new TrieIndex();
    this.#bloom = new BloomFilter(50_000, 4);
    this.#pendingWrites = [];
    this.#anomalyTracker = new Map();
    this.#integrityCache = null;
    this.#hooks = new Map();
    this.#isVerifying = false;
    this.#rotationCount = 0;
    this.#startTime = Date.now();

    // Clés cryptographiques
    this.#signingKey = crypto.randomBytes(32);
    this.#encryptionKey = crypto.randomBytes(32);

    // Métriques enrichies
    this.metrics = {
      recorded: 0,
      verified: 0,
      searched: 0,
      errors: 0,
      persisted: 0,
      pruned: 0,
      anomalies: 0,
      rotations: 0,
      snapshots: 0,
      bloomHits: 0,
      trieSearches: 0,
      hookCalls: 0,
      exportCount: 0,
      importCount: 0,
      totalChainBytes: 0,
    };

    this._startTimers();
    if (this.config.persistence) this._initPersistence();

    this._log("info", `✅ AuditTrail v${this.version} | Max:${this.config.maxEntries} Persist:${this.config.persistence}`);
  }

  // ============================================================
  // TIMERS
  // ============================================================
  _startTimers() {
    if (this.config.persistence && this.config.flushInterval > 0) {
      this.#flushTimer = setInterval(() => {
        if (this.#pendingWrites.length > 0) {
          this._flushToDisk().catch(e => this._log("error", `Auto-flush: ${e.message}`));
        }
      }, this.config.flushInterval);
      if (this.#flushTimer.unref) this.#flushTimer.unref();
    }

    if (this.config.snapshotInterval > 0) {
      this.#snapshotTimer = setInterval(() => {
        this._createSnapshot().catch(e => this._log("error", `Snapshot: ${e.message}`));
      }, this.config.snapshotInterval);
      if (this.#snapshotTimer.unref) this.#snapshotTimer.unref();
    }
  }

  // ============================================================
  // HOOKS (middleware)
  // ============================================================
  addHook(event, fn) {
    if (!this.#hooks.has(event)) this.#hooks.set(event, []);
    this.#hooks.get(event).push(fn);
    return this;
  }

  removeHook(event, fn) {
    const hooks = this.#hooks.get(event) || [];
    this.#hooks.set(event, hooks.filter(h => h !== fn));
    return this;
  }

  async _runHooks(event, data) {
    const hooks = this.#hooks.get(event) || [];
    let result = data;
    for (const fn of hooks) {
      try {
        result = (await fn(result, event)) ?? result;
        this.metrics.hookCalls++;
      } catch (e) {
        this._log("warn", `Hook ${event} erreur: ${e.message}`);
      }
    }
    return result;
  }

  // ============================================================
  // ENREGISTREMENT IMMUABLE
  // ============================================================
  async record(action, actor, data = {}, severity = "INFO", options = {}) {
    try {
      // Validation stricte
      if (!action || typeof action !== "string" || action.trim().length < 1) throw ERR.INVALID_ACTION(action);
      if (!actor || typeof actor !== "string" || actor.trim().length < 1) throw ERR.INVALID_ACTOR(actor);

      // Filtrage sévérité
      if (this.config.severityFilter) {
        const curr = SEVERITY_RANK[severity] ?? 1;
        const filter = SEVERITY_RANK[this.config.severityFilter] ?? 1;
        if (curr < filter) return { skipped: true, reason: "Sévérité filtrée" };
      }

      // Bloom filter — déduplication rapide
      const bloomKey = `${action}:${actor}:${JSON.stringify(data)}`;
      if (options.deduplicate && this.#bloom.mightContain(bloomKey)) {
        this.metrics.bloomHits++;
        return { skipped: true, reason: "Doublon probable (bloom)" };
      }

      // Limite mémoire
      if (this.#chain.length >= this.config.maxEntries) {
        await this._pruneOldEntries();
      }

      // Rotation fichier
      if (this.config.persistence && this.#chain.length > 0 && this.#chain.length % this.config.rotateSize === 0) {
        await this._rotateFile();
      }

      // Sérialisation sécurisée des données
      let dataStr = (() => { try { let s = JSON.stringify(data); if (s.length > this.config.maxPayloadSize) s = s.slice(0, this.config.maxPayloadSize) + "[truncated]"; return s; } catch { return "{}" } })();

      // Hook pre-record
      let entryDraft = { action, actor, severity, data: dataStr, options };
      entryDraft = await this._runHooks("pre:record", entryDraft);
      action = entryDraft.action;
      actor = entryDraft.actor;
      severity = entryDraft.severity;
      dataStr = entryDraft.data;

      const prev = this.#chain[this.#chain.length - 1];
      const prevHash = prev?.hash || "0".repeat(64);
      const timestamp = Date.now();
      const entryIndex = this.#chain.length;
      const nonce = crypto.randomBytes(8).toString("hex");
      const tags = options.tags || [];
      const sessionId = options.sessionId || null;
      const correlId = options.correlationId || null;

      // Calcul hash SHA-256 avec nonce (résistance timing attacks)
      const content = `${entryIndex}:${action}:${actor}:${severity}:${timestamp}:${prevHash}:${dataStr}:${nonce}`;
      const hash = crypto.createHash("sha256").update(content).digest("hex");

      // Signature HMAC (intégrité + authenticité)
      const signature = this.config.enableSignature
        ? crypto.createHmac("sha256", this.#signingKey).update(hash).digest("hex")
        : null;

      const entry = Object.freeze({
        index: entryIndex,
        action,
        actor,
        severity,
        data: dataStr,
        timestamp,
        iso: new Date(timestamp).toISOString(),
        prevHash,
        hash,
        nonce,
        signature,
        tags,
        sessionId,
        correlationId: correlId,
        metadata: options.metadata || {},
        ip: options.ip ? crypto.createHash("sha256").update(options.ip).digest("hex") : null,
        version: this.version,
      });

      // Ajout chaîne
      this.#chain.push(entry);
      this.metrics.totalChainBytes += content.length;

      // Indexation multi-dimensionnelle
      this._indexEntry(entry, entryIndex);

      // Bloom filter update
      this.#bloom.add(bloomKey);

      // Détection d'anomalie
      if (this.config.enableAnomalyDetect) {
        this._detectAnomaly(actor, timestamp);
      }

      // Invalidation cache intégrité
      this.#integrityCache = null;

      // Logging conditionnel
      if (SEVERITY_RANK[severity] >= SEVERITY_RANK["HIGH"]) {
        this._log("warn", `🚨 ${severity} — ${action} by ${actor}`);
        this.emit("audit:high", { entry });
      }

      // Persistance asynchrone
      if (this.config.persistence) {
        this.#pendingWrites.push(entry);
        if (this.#pendingWrites.length >= this.config.batchSize) {
          this._flushToDisk().catch(e => this._log("error", `Flush: ${e.message}`));
        }
      }

      // Hook post-record
      await this._runHooks("post:record", entry);

      this._incMetric("recorded");
      if (this.config.enableEventEmit) {
        this.emit("audit:recorded", { index: entryIndex, action, actor, severity, hash });
      }

      return {
        entryIndex,
        hash,
        timestamp,
        severity,
        signature: signature?.slice(0, 16) + "…",
        nonce,
      };
    } catch (err) {
      this._incMetric("errors");
      this._log("error", `record(): ${err.message}`);
      this.emit("audit:error", { error: err.message, code: err.code });
      throw err;
    }
  }

  // Raccourcis sévérité
  info(action, actor, data, opts) { return this.record(action, actor, data, "INFO", opts); }
  warn(action, actor, data, opts) { return this.record(action, actor, data, "WARN", opts); }
  error(action, actor, data, opts) { return this.record(action, actor, data, "ERROR", opts); }
  critical(action, actor, data, opts) { return this.record(action, actor, data, "CRITICAL", opts); }
  debug(action, actor, data, opts) { return this.record(action, actor, data, "DEBUG", opts); }

  // ============================================================
  // VÉRIFICATION INTÉGRITÉ
  // ============================================================
  verify(options = {}) {
    try {
      // Cache intégrité
      if (
        !options.force &&
        this.config.enableIntegrityCache &&
        this.#integrityCache &&
        Date.now() - this.#integrityCache.timestamp < this.config.integrityCacheTTL
      ) {
        return { ...this.#integrityCache.result, cached: true };
      }

      if (this.#isVerifying && !options.force) {
        return { valid: this.#integrityCache?.result?.valid ?? false, verifying: true };
      }

      this.#isVerifying = true;
      const startTime = Date.now();

      if (this.#chain.length === 0) {
        const result = { valid: true, entries: 0, duration: 0 };
        this._cacheIntegrity(result);
        this.#isVerifying = false;
        return result;
      }

      const startIdx = options.fromIndex || 1;
      const endIdx = Math.min(options.toIndex || this.#chain.length, this.#chain.length);

      for (let i = startIdx; i < endIdx; i++) {
        const curr = this.#chain[i];
        const prev = this.#chain[i - 1];

        // Vérification chaînage
        if (curr.prevHash !== prev.hash) {
          const result = {
            valid: false, reason: "CHAIN_BROKEN",
            brokenAt: i, expected: prev.hash, got: curr.prevHash,
            duration: Date.now() - startTime,
          };
          this._cacheIntegrity(result);
          this.#isVerifying = false;
          this.emit("audit:integrity-fail", result);
          throw ERR.CHAIN_BROKEN(i);
        }

        // Re-calcul hash (optionnel, coûteux)
        if (options.recalculateHash !== false) {
          const expected = crypto
            .createHash("sha256")
            .update(`${curr.index}:${curr.action}:${curr.actor}:${curr.severity}:${curr.timestamp}:${curr.prevHash}:${curr.data}:${curr.nonce}`)
            .digest("hex");

          if (curr.hash !== expected) {
            const result = {
              valid: false, reason: "TAMPERED",
              tamperedAt: i, action: curr.action,
              duration: Date.now() - startTime,
            };
            this._cacheIntegrity(result);
            this.#isVerifying = false;
            this.emit("audit:tampered", { index: i, entry: curr });
            throw ERR.TAMPERED(i);
          }
        }

        // Vérification signature HMAC
        if (options.verifySignatures && curr.signature) {
          const expectedSig = crypto
            .createHmac("sha256", this.#signingKey)
            .update(curr.hash)
            .digest("hex");

          if (curr.signature !== expectedSig) {
            const result = {
              valid: false, reason: "INVALID_SIGNATURE",
              at: i, duration: Date.now() - startTime,
            };
            this._cacheIntegrity(result);
            this.#isVerifying = false;
            return result;
          }
        }
      }

      const duration = Date.now() - startTime;
      const result = {
        valid: true, entries: this.#chain.length, duration,
        checkedFrom: startIdx, checkedTo: endIdx,
        throughput: Math.round(((endIdx - startIdx) / duration) * 1000),
      };

      this._cacheIntegrity(result);
      this.#isVerifying = false;
      this._incMetric("verified");
      this.emit("audit:verified", result);

      return result;
    } catch (err) {
      this.#isVerifying = false;
      if (err instanceof AuditError) return { valid: false, reason: err.code, details: err.details };
      this._incMetric("errors");
      return { valid: false, error: err.message };
    }
  }

  _cacheIntegrity(result) {
    this.#integrityCache = { result, timestamp: Date.now() };
  }

  // ============================================================
  // RECHERCHE MULTI-INDEX
  // ============================================================
  search(query = {}) {
    try {
      this._incMetric("searched");

      let candidateIndexes = null;

      // Recherche Bloom Filter (pré-filtre ultra-rapide)
      if (query.bloomCheck && query.action && query.actor) {
        const key = `${query.action}:${query.actor}`;
        if (!this.#bloom.mightContain(key)) return [];
      }

      // Trie prefix search
      if (query.actorPrefix) {
        this._incMetric("trieSearches");
        const trieResults = this.#actorTrie.search(query.actorPrefix);
        candidateIndexes = candidateIndexes
          ? this._intersect(candidateIndexes, trieResults)
          : trieResults;
      }

      if (query.actionPrefix) {
        this._incMetric("trieSearches");
        const trieResults = this.#actionTrie.search(query.actionPrefix);
        candidateIndexes = candidateIndexes
          ? this._intersect(candidateIndexes, trieResults)
          : trieResults;
      }

      // Index exact
      if (query.actor) {
        const idx = this.#actorIndex.get(query.actor) || [];
        candidateIndexes = candidateIndexes ? this._intersect(candidateIndexes, idx) : idx;
        if (candidateIndexes.length === 0) return [];
      }

      if (query.action) {
        const idx = this.#actionIndex.get(query.action) || [];
        candidateIndexes = candidateIndexes ? this._intersect(candidateIndexes, idx) : idx;
        if (candidateIndexes.length === 0) return [];
      }

      if (query.severity) {
        const severities = Array.isArray(query.severity) ? query.severity : [query.severity];
        let sevIdx = [];
        for (const s of severities) {
          sevIdx = [...sevIdx, ...(this.#severityIndex.get(s) || [])];
        }
        candidateIndexes = candidateIndexes ? this._intersect(candidateIndexes, sevIdx) : sevIdx;
      }

      // Tags
      if (query.tag) {
        const tagIdx = this.#tagIndex.get(query.tag) || [];
        candidateIndexes = candidateIndexes ? this._intersect(candidateIndexes, tagIdx) : tagIdx;
      }

      // Scan complet si aucun index
      if (!candidateIndexes) {
        candidateIndexes = Array.from({ length: this.#chain.length }, (_, i) => i);
      }

      // Filtres secondaires
      const results = [];
      const limit = query.limit || 100;
      const seen = new Set();

      for (const idx of candidateIndexes) {
        if (seen.has(idx)) continue;
        seen.add(idx);

        const entry = this.#chain[idx];
        if (!entry) continue;

        if (query.from && entry.timestamp < query.from) continue;
        if (query.to && entry.timestamp > query.to) continue;
        if (query.minSeverity && SEVERITY_RANK[entry.severity] < SEVERITY_RANK[query.minSeverity]) continue;
        if (query.actionContains && !entry.action.includes(query.actionContains)) continue;
        if (query.dataContains && !entry.data.includes(query.dataContains)) continue;
        if (query.sessionId && entry.sessionId !== query.sessionId) continue;
        if (query.correlationId && entry.correlationId !== query.correlationId) continue;
        if (query.hash && entry.hash !== query.hash) continue;

        results.push(this._formatEntry(entry, query.format));

        if (results.length >= limit * 2) break; // Early exit avec marge pour tri
      }

      // Tri
      const sortBy = query.sortBy || "timestamp";
      const sortDir = query.sortDir === "asc" ? 1 : -1;
      results.sort((a, b) => sortDir * ((a[sortBy] || 0) - (b[sortBy] || 0)));

      return results.slice(0, limit);
    } catch (err) {
      this._incMetric("errors");
      this._log("error", `search(): ${err.message}`);
      return [];
    }
  }

  // ============================================================
  // ACCESSEURS SPÉCIALISÉS
  // ============================================================
  getEntry(hash) { const idx = this.#index.get(hash); return idx !== undefined ? this.#chain[idx] : null; }
  getByIndex(i) { return this.#chain[i] || null; }
  getLast(n = 20) { return this.#chain.slice(-Math.min(n, this.#chain.length)); }
  getFirst(n = 20) { return this.#chain.slice(0, Math.min(n, this.#chain.length)); }
  getByActor(actor) { return (this.#actorIndex.get(actor) || []).map(i => this.#chain[i]); }
  getByAction(action) { return (this.#actionIndex.get(action) || []).map(i => this.#chain[i]); }
  getBySeverity(sev) { return (this.#severityIndex.get(sev) || []).map(i => this.#chain[i]); }
  getByTag(tag) { return (this.#tagIndex.get(tag) || []).map(i => this.#chain[i]); }
  getChainLength() { return this.#chain.length; }

  // Recherche par corrélation (traçage de flux)
  getCorrelatedEvents(correlationId) {
    return this.#chain.filter(e => e.correlationId === correlationId);
  }

  // Timeline d'un acteur
  getActorTimeline(actor, limit = 50) {
    const entries = this.getByActor(actor);
    return entries
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limit)
      .map(e => ({
        at: e.iso,
        action: e.action,
        severity: e.severity,
        hash: e.hash.slice(0, 8) + "…",
      }));
  }

  // ============================================================
  // STATISTIQUES AVANCÉES
  // ============================================================
  getStats() {
    const now = Date.now();
    const len = this.#chain.length;

    const severities = {};
    const actors = {};
    const actions = {};
    const byHour = new Array(24).fill(0);

    for (const e of this.#chain) {
      severities[e.severity] = (severities[e.severity] || 0) + 1;
      actors[e.actor] = (actors[e.actor] || 0) + 1;
      actions[e.action] = (actions[e.action] || 0) + 1;
      byHour[new Date(e.timestamp).getHours()]++;
    }

    // Top acteurs / actions
    const topActors = Object.entries(actors)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([actor, count]) => ({ actor, count }));

    const topActions = Object.entries(actions)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    const timeRange = len > 0 ? {
      first: this.#chain[0].timestamp,
      last: this.#chain[len - 1].timestamp,
      span: now - this.#chain[0].timestamp,
    } : null;

    return {
      totalEntries: len,
      uniqueActors: this.#actorIndex.size,
      uniqueActions: this.#actionIndex.size,
      severityDistribution: severities,
      topActors,
      topActions,
      byHour,
      timeRange,
      avgEntriesPerHour: timeRange
        ? Math.round((len / timeRange.span) * 3_600_000)
        : 0,
      totalChainBytes: this.metrics.totalChainBytes,
      rotationCount: this.#rotationCount,
      integrityStatus: this.#integrityCache?.result?.valid ?? null,
      lastVerified: this.#integrityCache?.timestamp ?? null,
      anomalies: this.metrics.anomalies,
      bloomSize: 50_000,
      uptime: Date.now() - this.#startTime,
    };
  }

  // ============================================================
  // ANOMALIE DETECTION
  // ============================================================
  _detectAnomaly(actor, timestamp) {
    const window = this.config.anomalyWindow;
    const max = this.config.anomalyThreshold;

    const tracker = this.#anomalyTracker.get(actor) || { count: 0, windowStart: timestamp };

    if (timestamp - tracker.windowStart > window) {
      tracker.count = 1;
      tracker.windowStart = timestamp;
    } else {
      tracker.count++;
    }

    this.#anomalyTracker.set(actor, tracker);

    if (tracker.count > max) {
      this._incMetric("anomalies");
      this._log("warn", `⚠️ Anomalie: ${actor} — ${tracker.count} events/${window}ms`);
      this.emit("audit:anomaly", {
        actor,
        count: tracker.count,
        window,
        timestamp,
      });
    }
  }

  // ============================================================
  // EXPORT MULTI-FORMAT
  // ============================================================
  async export(format = "json", options = {}) {
    try {
      this._incMetric("exportCount");
      const data = options.query ? this.search(options.query) : this.#chain;

      let result;
      switch (format.toLowerCase()) {
        case "json":
          result = JSON.stringify(data, null, options.pretty ? 2 : 0);
          break;

        case "ndjson":
          result = data.map(e => JSON.stringify(e)).join("\n");
          break;

        case "csv":
          result = this._toCSV(data);
          break;

        case "html":
          result = this._toHTML(data);
          break;

        case "summary":
          result = JSON.stringify(this.getStats(), null, 2);
          break;

        default:
          throw ERR.INVALID_FORMAT(format);
      }

      // Écriture fichier si demandé
      if (options.outputPath) {
        await fs.writeFile(options.outputPath, result, "utf-8");
        this._log("info", `Export ${format} → ${options.outputPath}`);
      }

      return result;
    } catch (err) {
      this._incMetric("errors");
      throw err;
    }
  }

  // ============================================================
  // IMPORT
  // ============================================================
  async importFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      let entries;

      try {
        entries = JSON.parse(content);
      } catch {
        // Tenter NDJSON
        entries = content.split("\n").filter(Boolean).map(l => JSON.parse(l));
      }

      if (!Array.isArray(entries)) throw ERR.IMPORT_INVALID();

      let imported = 0;
      for (const entry of entries) {
        if (!entry.hash || !entry.action || !entry.actor) continue;
        this.#chain.push(entry);
        this._indexEntry(entry, this.#chain.length - 1);
        imported++;
      }

      this._incMetric("importCount");
      this._log("info", `Import: ${imported} entrées depuis ${filePath}`);
      this.emit("audit:imported", { file: filePath, count: imported });

      return { success: true, imported };
    } catch (err) {
      this._incMetric("errors");
      throw err;
    }
  }

  // ============================================================
  // PERSISTANCE
  // ============================================================
  async _initPersistence() {
    try {
      await fs.mkdir(this.config.storagePath, { recursive: true });
      const filePath = path.join(this.config.storagePath, "audit.json");

      try {
        await this.importFromFile(filePath);
      } catch { /* Fichier inexistant = OK */ }

      this._log("info", `Persistance: ${this.config.storagePath}`);
    } catch (err) {
      this._log("error", `initPersistence: ${err.message}`);
    }
  }

  async #flushToDisk() {
    if (this.#pendingWrites.length === 0) return;

    const toWrite = [...this.#pendingWrites];
    this.#pendingWrites = [];

    try {
      const filePath = path.join(this.config.storagePath, "audit.json");
      let existing = [];

      try {
        const content = await fs.readFile(filePath, "utf-8");
        existing = JSON.parse(content);
        if (!Array.isArray(existing)) existing = [];
      } catch { /* OK */ }

      existing.push(...toWrite);
      await fs.writeFile(filePath, JSON.stringify(existing), "utf-8");

      this._incMetric("persisted");
      this._log("debug", `Flush: ${toWrite.length} entrées`);
      this.emit("audit:flushed", { count: toWrite.length });
    } catch (err) {
      // Remettre dans la queue en cas d'erreur
      this.#pendingWrites.unshift(...toWrite);
      throw err;
    }
  }

  async #rotateFile() {
    try {
      this.#rotationCount++;
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const srcPath = path.join(this.config.storagePath, "audit.json");
      const destPath = path.join(this.config.storagePath, `audit_${ts}_rot${this.#rotationCount}.json`);

      try {
        await fs.rename(srcPath, destPath);
        this._log("info", `Rotation → ${path.basename(destPath)}`);
      } catch { /* Fichier n'existe pas = OK */ }

      this._incMetric("rotations");
      this.emit("audit:rotated", { file: destPath, count: this.#rotationCount });
    } catch (err) {
      this._log("error", `rotateFile: ${err.message}`);
    }
  }

  async #createSnapshot() {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const snapPath = path.join(this.config.storagePath, `snapshot_${ts}.json`);
      await fs.writeFile(snapPath, JSON.stringify(this.#chain), "utf-8");
      this._incMetric("snapshots");
      this._log("info", `Snapshot créé: ${path.basename(snapPath)}`);
      this.emit("audit:snapshot", { file: snapPath, entries: this.#chain.length });
    } catch (err) {
      this._log("error", `snapshot: ${err.message}`);
    }
  }

  // ============================================================
  // PRUNING
  // ============================================================
  async #pruneOldEntries() {
    if (this.config.retentionDays <= 0) return 0;

    const cutoff = Date.now() - this.config.retentionDays * 86_400_000;
    let cutIndex = 0;

    for (let i = 0; i < this.#chain.length; i++) {
      if (this.#chain[i].timestamp >= cutoff) { cutIndex = i; break; }
    }

    if (cutIndex === 0 && this.#chain.length >= this.config.maxEntries) {
      cutIndex = Math.floor(this.config.maxEntries * 0.1);
    }

    if (cutIndex > 0) {
      this.#chain.splice(0, cutIndex);
      this._rebuildIndexes();
      this.metrics.pruned += cutIndex;
      this._log("info", `Pruned: ${cutIndex} entrées`);
      this.emit("audit:pruned", { count: cutIndex });
      return cutIndex;
    }

    return 0;
  }

  // ============================================================
  // INDEXATION
  // ============================================================
  _indexEntry(entry, idx) {
    // Hash index
    this.#index.set(entry.hash, idx);

    // Actor index
    if (!this.#actorIndex.has(entry.actor)) this.#actorIndex.set(entry.actor, []);
    this.#actorIndex.get(entry.actor).push(idx);

    // Action index
    if (!this.#actionIndex.has(entry.action)) this.#actionIndex.set(entry.action, []);
    this.#actionIndex.get(entry.action).push(idx);

    // Severity index
    if (!this.#severityIndex.has(entry.severity)) this.#severityIndex.set(entry.severity, []);
    this.#severityIndex.get(entry.severity).push(idx);

    // Tag index
    for (const tag of (entry.tags || [])) {
      if (!this.#tagIndex.has(tag)) this.#tagIndex.set(tag, []);
      this.#tagIndex.get(tag).push(idx);
    }

    // Trie
    this.#actorTrie.insert(entry.actor, idx);
    this.#actionTrie.insert(entry.action, idx);
  }

  _rebuildIndexes() {
    this.#index.clear();
    this.#actorIndex.clear();
    this.#actionIndex.clear();
    this.#severityIndex.clear();
    this.#tagIndex.clear();
    this.#actorTrie.clear();
    this.#actionTrie.clear();
    this.#bloom.reset();

    this.#chain.forEach((entry, idx) => {
      this._indexEntry(entry, idx);
      const key = `${entry.action}:${entry.actor}`;
      this.#bloom.add(key);
    });

    this._log("debug", `Index reconstruit: ${this.#chain.length} entrées`);
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
        case "record":
          result = await this.record(
            packet.auditAction, packet.actor,
            packet.data, packet.severity, packet.options
          );
          break;
        case "verify": result = this.verify(packet.options); break;
        case "search": result = this.search(packet.query); break;
        case "stats": result = this.getStats(); break;
        case "export": result = await this.export(packet.format, packet.options); break;
        case "import": result = await this.importFromFile(packet.filePath); break;
        case "getLast": result = this.getLast(packet.n); break;
        case "getByActor": result = this.getByActor(packet.actor); break;
        case "timeline": result = this.getActorTimeline(packet.actor, packet.limit); break;
        case "status": result = this.getStatus(); break;
        case "metrics": result = this.getMetrics(); break;
        case "flush":
          await this._flushToDisk();
          result = { flushed: true };
          break;
        default:
          result = { entries: this.#chain.length, metrics: this.getMetrics() };
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
      this._incMetric("errors");
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
  // MÉTRIQUES & STATUS
  // ============================================================
  getMetrics() {
    return {
      ...this.metrics,
      chainLength: this.#chain.length,
      indexSizes: {
        actor: this.#actorIndex.size,
        action: this.#actionIndex.size,
        severity: this.#severityIndex.size,
        hash: this.#index.size,
        tag: this.#tagIndex.size,
      },
      pendingWrites: this.#pendingWrites.length,
      integrityValid: this.#integrityCache?.result?.valid ?? null,
      uptime: Date.now() - this.#startTime,
      timestamp: Date.now(),
    };
  }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      healthy: true,
      entries: this.#chain.length,
      valid: (this.#chain.length < 2 || (this.#integrityCache?.result?.valid ?? null)),
      metrics: this.config.enableMetrics ? this.getMetrics() : undefined,
    };
  }

  // ============================================================
  // DESTROY
  // ============================================================
  async destroy() {
    if (this.#flushTimer) clearInterval(this.#flushTimer);
    if (this.#snapshotTimer) clearInterval(this.#snapshotTimer);

    if (this.#pendingWrites.length > 0 && this.config.persistence) {
      await this._flushToDisk().catch(e => this._log("error", `Final flush: ${e.message}`));
    }

    this.#chain = [];
    this.#index.clear();
    this.#actorIndex.clear();
    this.#actionIndex.clear();
    this.#severityIndex.clear();
    this.#tagIndex.clear();
    this.#actorTrie.clear();
    this.#actionTrie.clear();
    this.#bloom.reset();
    this.#anomalyTracker.clear();
    this.#hooks.clear();
    this.removeAllListeners();

    this._log("info", "AuditTrail v4 détruit proprement");
  }

  // ============================================================
  // HELPERS PRIVÉS
  // ============================================================
  #serializeData(data) {
    try {
      let str = JSON.stringify(data);
      if (str.length > this.config.maxPayloadSize) {
        str = str.slice(0, this.config.maxPayloadSize) + "…[truncated]";
      }
      return str;
    } catch {
      return '{"error":"Serialization failed"}';
    }
  }

  _formatEntry(entry, format) {
    if (format === "compact") {
      return {
        i: entry.index,
        a: entry.action,
        by: entry.actor,
        sev: entry.severity,
        ts: entry.timestamp,
        h: entry.hash.slice(0, 8) + "…",
      };
    }
    return entry;
  }

  _intersect(arr1, arr2) {
    const set = new Set(arr2);
    return arr1.filter(i => set.has(i));
  }

  #sha256(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  _toCSV(entries) {
    if (entries.length === 0) return "";
    const headers = ["index", "timestamp", "iso", "action", "actor", "severity", "hash", "tags"];
    const escape = (v) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = entries.map(e =>
      headers.map(h => escape(h === "tags" ? (e.tags || []).join("|") : e[h])).join(",")
    );
    return [headers.join(","), ...rows].join("\n");
  }

  _toHTML(entries) {
    const rows = entries.map(e => `
      <tr class="sev-${(e.severity || "INFO").toLowerCase()}">
        <td>${e.index}</td>
        <td>${e.iso || ""}</td>
        <td><strong>${e.action}</strong></td>
        <td>${e.actor}</td>
        <td><span class="badge">${e.severity}</span></td>
        <td><code>${e.hash?.slice(0, 12)}…</code></td>
      </tr>`).join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>AuditTrail Export</title>
<style>
  body { font-family: monospace; background: #0a0a0a; color: #e0e0e0; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1a1a2e; color: #00d4ff; padding: 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #222; }
  .sev-critical td { color: #ff4466; }
  .sev-error td { color: #ff8800; }
  .sev-warn td, .sev-warning td { color: #ffd700; }
  .sev-info td { color: #e0e0e0; }
  .sev-debug td { color: #666; }
  .badge { padding: 2px 6px; border-radius: 3px; font-size: 11px; background: #1a2a4a; }
  code { color: #00ff88; }
</style></head><body>
<h2>🔒 AuditTrail — ${entries.length} entrées</h2>
<table><thead><tr>
  <th>#</th><th>Timestamp</th><th>Action</th><th>Actor</th><th>Severity</th><th>Hash</th>
</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
  }

  _incMetric(key) {
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

// ============================================================
// SINGLETON + EXPORT
// ============================================================
export const auditTrail = new AuditTrail();
export default AuditTrail;





