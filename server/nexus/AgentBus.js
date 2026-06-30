// ══════════════════════════════════════════════════════════════════════════════
// AgentBus v2.0.0 — Dispatcher Ultra de TROXT TASK PACKETS
// Routes les missions aux bons agents, agrège les résultats,
// circuit breaker, retry, priorité, audit, métriques avancées
// ══════════════════════════════════════════════════════════════════════════════
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

import { EtherForge } from './agents/EtherForge.js';
import { EtherGuard } from './agents/EtherGuard.js';
import { EtherLens } from './agents/EtherLens.js';
import { EtherPrism } from './agents/EtherPrism.js';
import { EtherSim } from './agents/EtherSim.js';
import { EtherUI } from './agents/EtherUI.js';
import { EtherWeave } from './agents/EtherWeave.js';
import { ForgeFactory } from './agents/ForgeFactory.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════
const DEFAULT_CONFIG = {
    timeout: 8_000,
    retryAttempts: 2,
    retryDelay: 400,
    retryBackoff: true,
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 30_000,
    maxQueueSize: 500,
    maxResultCache: 1_000,
    maxAuditEntries: 2_000,
    enableMetrics: true,
    enableAudit: true,
    enablePriorityQueue: true,
    enableHealthChecks: true,
    healthCheckIntervalMs: 60_000,
    parallelBatchSize: 0,       // 0 = illimité
    enableRateLimit: false,
    rateLimitWindow: 10_000,
    rateLimitMax: 200,
};

// ══════════════════════════════════════════════════════════════════════════════
// PRIORITY QUEUE
// ══════════════════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER PAR AGENT
// ══════════════════════════════════════════════════════════════════════════════
class CircuitBreaker {
    #state = 'closed'; // closed | open | half-open
    #failures = 0;
    #lastFailure = null;
    #nextAttempt = null;
    #totalTripped = 0;
    #threshold;
    #resetMs;

    constructor(threshold = 5, resetMs = 30_000) {
        this.#threshold = threshold;
        this.#resetMs = resetMs;
    }

    canCall() {
        if (this.#state === 'closed') return true;
        if (this.#state === 'half-open') return true;
        if (this.#state === 'open') {
            if (Date.now() >= this.#nextAttempt) {
                this.#state = 'half-open';
                return true;
            }
            return false;
        }
        return true;
    }

    onSuccess() {
        this.#failures = 0;
        this.#state = 'closed';
    }

    onFailure() {
        this.#failures++;
        this.#lastFailure = Date.now();
        if (this.#failures >= this.#threshold) {
            this.#state = 'open';
            this.#nextAttempt = Date.now() + this.#resetMs;
            this.#totalTripped++;
            return true; // tripped
        }
        return false;
    }

    get state() { return this.#state; }
    get failures() { return this.#failures; }
    get totalTripped() { return this.#totalTripped; }
    get retryAfter() {
        return this.#state === 'open'
            ? Math.max(0, this.#nextAttempt - Date.now())
            : 0;
    }

    reset() {
        this.#state = 'closed';
        this.#failures = 0;
    }

    toJSON() {
        return {
            state: this.#state,
            failures: this.#failures,
            totalTripped: this.#totalTripped,
            retryAfter: this.retryAfter,
            lastFailure: this.#lastFailure,
        };
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// LATENCE TRACKER
// ══════════════════════════════════════════════════════════════════════════════
class LatencyTracker {
    #samples = [];
    #max = 200;

    record(ms) {
        this.#samples.push(ms);
        if (this.#samples.length > this.#max) this.#samples.shift();
    }

    get avg() {
        return this.#samples.length
            ? Math.round(this.#samples.reduce((a, b) => a + b, 0) / this.#samples.length)
            : 0;
    }
    get p50() { return this.#percentile(50); }
    get p95() { return this.#percentile(95); }
    get p99() { return this.#percentile(99); }
    get min() { return this.#samples.length ? Math.min(...this.#samples) : 0; }
    get max() { return this.#samples.length ? Math.max(...this.#samples) : 0; }
    get count() { return this.#samples.length; }

    #percentile(p) {
        if (!this.#samples.length) return 0;
        const sorted = [...this.#samples].sort((a, b) => a - b);
        return sorted[Math.floor((p / 100) * sorted.length)] || 0;
    }

    toJSON() {
        return { avg: this.avg, p50: this.p50, p95: this.p95, p99: this.p99, min: this.min, max: this.max };
    }

    reset() { this.#samples = []; }
}

// ══════════════════════════════════════════════════════════════════════════════
// AGENT BUS v2.0.0
// ══════════════════════════════════════════════════════════════════════════════
export class AgentBus extends EventEmitter {

    // ── Instances publiques (backward compat) ─────────────────────────────────
    forge; lens; prism; weave;
    factory; guard; ui; sim;

    // ── Privés ────────────────────────────────────────────────────────────────
    #agents = new Map();  // name → agent instance
    #agentMeta = new Map();  // name → { callCount, errorCount, avgMs, ... }
    #circuitBreakers = new Map();  // name → CircuitBreaker
    #latencyTrackers = new Map();  // name → LatencyTracker
    #results = new Map();  // taskId → result
    #queue = new PriorityQueue();
    #auditLog = [];
    #rateLimiters = new Map();
    #hooks = new Map();
    #config;
    #processing = false;
    #startTime = Date.now();
    #healthTimer = null;
    #queueTimer = null;

    metrics = {
        dispatched: 0,
        succeeded: 0,
        failed: 0,
        retried: 0,
        timedOut: 0,
        circuitTripped: 0,
        queued: 0,
        dequeued: 0,
        totalMs: 0,
        batchRuns: 0,
    };

    // ══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTEUR
    // ══════════════════════════════════════════════════════════════════════════
    constructor(config = {}) {
        super();
        this.setMaxListeners(50);
        this.#config = { ...DEFAULT_CONFIG, ...config };

        // Instanciation des 8 agents TroxT
        this.forge = new EtherForge();
        this.lens = new EtherLens();
        this.prism = new EtherPrism();
        this.weave = new EtherWeave();
        this.factory = new ForgeFactory();
        this.guard = new EtherGuard();
        this.ui = new EtherUI();
        this.sim = new EtherSim();

        // Enregistrement centralisé
        const agentList = [
            ['EtherForge', this.forge],
            ['EtherLens', this.lens],
            ['EtherPrism', this.prism],
            ['EtherWeave', this.weave],
            ['ForgeFactory', this.factory],
            ['EtherGuard', this.guard],
            ['EtherUI', this.ui],
            ['EtherSim', this.sim],
        ];

        for (const [name, agent] of agentList) {
            this.#registerInternal(name, agent);
        }

        this.#startTimers();
        this.#log('info', `✅ AgentBus v2.0.0 — ${this.#agents.size} agents enregistrés`);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TIMERS
    // ══════════════════════════════════════════════════════════════════════════
    #startTimers() {
        // Processeur de queue
        this.#queueTimer = setInterval(() => this.#processQueue(), 100);
        if (this.#queueTimer.unref) this.#queueTimer.unref();

        // Health checks
        if (this.#config.enableHealthChecks) {
            this.#healthTimer = setInterval(
                () => this.#runHealthChecks(),
                this.#config.healthCheckIntervalMs
            );
            if (this.#healthTimer.unref) this.#healthTimer.unref();
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ENREGISTREMENT INTERNE
    // ══════════════════════════════════════════════════════════════════════════
    #registerInternal(name, agent) {
        this.#agents.set(name, agent);
        this.#agentMeta.set(name, {
            name,
            version: agent.version || 'unknown',
            callCount: 0,
            successCount: 0,
            errorCount: 0,
            totalMs: 0,
            avgMs: 0,
            lastCalled: null,
            lastError: null,
            lastErrorMsg: null,
            healthStatus: 'unknown',
            lastHealthCheck: null,
            capabilities: agent.capabilities || [],
        });
        this.#circuitBreakers.set(name, new CircuitBreaker(
            this.#config.circuitBreakerThreshold,
            this.#config.circuitBreakerResetMs
        ));
        this.#latencyTrackers.set(name, new LatencyTracker());
    }

    // Enregistrement dynamique (agent externe)
    register(name, agent, meta = {}) {
        if (!name || typeof agent?.process !== 'function') {
            throw new Error(`Agent invalide: ${name}`);
        }
        this.#registerInternal(name, agent);
        const m = this.#agentMeta.get(name);
        Object.assign(m, meta);
        this.emit('agent:registered', { name, version: agent.version });
        this.#log('info', `Agent dynamique enregistré: ${name}`);
        return this;
    }

    unregister(name) {
        const existed = this.#agents.delete(name);
        this.#agentMeta.delete(name);
        this.#circuitBreakers.delete(name);
        this.#latencyTrackers.delete(name);
        if (existed) this.emit('agent:unregistered', { name });
        return { ok: existed, name };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HOOKS
    // ══════════════════════════════════════════════════════════════════════════
    addHook(event, fn) {
        if (!this.#hooks.has(event)) this.#hooks.set(event, []);
        this.#hooks.get(event).push(fn);
        return this;
    }

    async #runHooks(event, data) {
        const hooks = this.#hooks.get(event) || [];
        let result = data;
        for (const fn of hooks) {
            try { result = (await fn(result, event)) ?? result; }
            catch (e) { this.#log('warn', `Hook ${event}: ${e.message}`); }
        }
        return result;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DISPATCH PRINCIPAL
    // ══════════════════════════════════════════════════════════════════════════
    async dispatch(packet, options = {}) {
        const startTime = Date.now();
        const taskId = packet.id || randomUUID();
        packet = { ...packet, id: taskId };

        this.metrics.dispatched++;
        this.#audit('DISPATCH', packet.targetAgent, taskId);

        // Hook pre-dispatch
        packet = await this.#runHooks('pre:dispatch', packet) || packet;

        // Vérification agent
        const agent = this.#agents.get(packet.targetAgent);
        if (!agent) {
            const result = this.#makeFailResult(taskId, packet.targetAgent, `Agent "${packet.targetAgent}" non trouvé`, 0);
            this.metrics.failed++;
            this.emit('dispatch:notFound', { taskId, agent: packet.targetAgent });
            return result;
        }

        // Circuit breaker
        const cb = this.#circuitBreakers.get(packet.targetAgent);
        if (cb && !cb.canCall()) {
            const result = this.#makeFailResult(
                taskId, packet.targetAgent,
                `Circuit breaker OUVERT (retry dans ${Math.ceil(cb.retryAfter / 1000)}s)`,
                0
            );
            result.circuitOpen = true;
            result.retryAfterMs = cb.retryAfter;
            this.metrics.circuitTripped++;
            this.emit('circuit:blocked', { agent: packet.targetAgent, retryAfter: cb.retryAfter });
            return result;
        }

        // Exécution avec retry
        let result = null;
        let lastError = null;
        const maxTries = (options.retryAttempts ?? this.#config.retryAttempts) + 1;

        for (let attempt = 1; attempt <= maxTries; attempt++) {
            try {
                result = await this.#executeWithTimeout(agent, packet, options.timeout ?? this.#config.timeout);

                // Succès
                cb?.onSuccess();
                const ms = Date.now() - startTime;
                this.#updateMeta(packet.targetAgent, true, ms);
                this.#latencyTrackers.get(packet.targetAgent)?.record(ms);
                this.metrics.succeeded++;
                this.metrics.totalMs += ms;

                result = {
                    ...result,
                    taskId,
                    durationMs: ms,
                    attempt,
                    completedAt: Date.now(),
                };

                this.#cacheResult(taskId, result);
                this.#audit('SUCCESS', packet.targetAgent, taskId, { ms, attempt });
                this.emit('dispatch:success', { taskId, agent: packet.targetAgent, ms, attempt });

                // Hook post-dispatch
                result = await this.#runHooks('post:dispatch', result) || result;
                return result;

            } catch (err) {
                lastError = err;
                const tripped = cb?.onFailure();
                this.#updateMeta(packet.targetAgent, false, Date.now() - startTime, err.message);

                if (err.code === 'TIMEOUT') this.metrics.timedOut++;

                if (tripped) {
                    this.metrics.circuitTripped++;
                    this.#log('error', `⚡ Circuit OUVERT: ${packet.targetAgent}`);
                    this.emit('circuit:open', { agent: packet.targetAgent });
                }

                if (attempt < maxTries) {
                    this.metrics.retried++;
                    const delay = this.#config.retryBackoff
                        ? this.#config.retryDelay * Math.pow(2, attempt - 1)
                        : this.#config.retryDelay;
                    this.#log('warn', `Retry ${attempt}/${maxTries - 1} — ${packet.targetAgent} dans ${delay}ms`);
                    this.emit('dispatch:retry', { taskId, agent: packet.targetAgent, attempt, delay });
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }

        // Échec définitif
        this.metrics.failed++;
        const result_fail = this.#makeFailResult(
            taskId, packet.targetAgent,
            lastError?.message || 'Erreur inconnue',
            Date.now() - startTime,
            lastError?.code
        );
        this.#cacheResult(taskId, result_fail);
        this.#audit('FAILURE', packet.targetAgent, taskId, { error: lastError?.message });
        this.emit('dispatch:failure', { taskId, agent: packet.targetAgent, error: lastError?.message });

        return result_fail;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // EXÉCUTION AVEC TIMEOUT
    // ══════════════════════════════════════════════════════════════════════════
    async #executeWithTimeout(agent, packet, timeoutMs) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);

        try {
            const result = await Promise.race([
                agent.process(packet),
                new Promise((_, reject) =>
                    ctrl.signal.addEventListener('abort', () => {
                        const e = new Error(`Timeout après ${timeoutMs}ms`);
                        e.code = 'TIMEOUT';
                        reject(e);
                    })
                ),
            ]);
            clearTimeout(timer);
            return result;
        } catch (err) {
            clearTimeout(timer);
            throw err;
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DISPATCH ALL (parallèle)
    // ══════════════════════════════════════════════════════════════════════════
    async dispatchAll(packets, options = {}) {
        this.metrics.batchRuns++;
        const batchId = randomUUID();
        const start = Date.now();

        this.emit('batch:start', { batchId, count: packets.length });

        let results;
        const batchSize = options.batchSize || this.#config.parallelBatchSize;

        if (batchSize > 0) {
            results = [];
            for (let i = 0; i < packets.length; i += batchSize) {
                const chunk = packets.slice(i, i + batchSize);
                const settled = await Promise.allSettled(chunk.map(p => this.dispatch(p, options)));
                results.push(...settled.map(s =>
                    s.status === 'fulfilled' ? s.value : this.#makeFailResult('?', '?', s.reason?.message, 0)
                ));
            }
        } else {
            const settled = await Promise.allSettled(packets.map(p => this.dispatch(p, options)));
            results = settled.map((s, i) =>
                s.status === 'fulfilled'
                    ? s.value
                    : this.#makeFailResult(packets[i].id, packets[i].targetAgent, s.reason?.message, 0)
            );
        }

        const summary = {
            batchId,
            total: results.length,
            success: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'failure').length,
            durationMs: Date.now() - start,
        };

        this.emit('batch:complete', summary);
        return { results, summary };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DISPATCH SÉQUENTIEL (stop-on-failure)
    // ══════════════════════════════════════════════════════════════════════════
    async dispatchSequential(packets, options = {}) {
        const results = [];
        for (const packet of packets) {
            const result = await this.dispatch(packet, options);
            results.push(result);
            if (result.status === 'failure' && options.stopOnFailure !== false) break;
        }
        return results;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DISPATCH PIPELINE (sortie → entrée suivant)
    // ══════════════════════════════════════════════════════════════════════════
    async dispatchPipeline(packets, options = {}) {
        let context = options.initialContext || {};
        const results = [];

        for (const packet of packets) {
            const enriched = { ...packet, context: { ...context, ...(packet.context || {}) } };
            const result = await this.dispatch(enriched, options);
            results.push(result);
            if (result.status === 'failure') break;
            // Propager la sortie comme contexte du suivant
            context = { ...context, ...(result.output || {}), _prev: result };
        }

        return results;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REQUEST / REPLY
    // ══════════════════════════════════════════════════════════════════════════
    async request(targetAgent, payload, timeout = null) {
        const packet = {
            id: randomUUID(),
            targetAgent,
            ...payload,
        };
        return this.dispatch(packet, { timeout: timeout || this.#config.timeout, retryAttempts: 0 });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // QUEUE
    // ══════════════════════════════════════════════════════════════════════════
    enqueue(packet, priority = 0) {
        if (this.#queue.size >= this.#config.maxQueueSize) {
            throw new Error(`Queue pleine (${this.#config.maxQueueSize})`);
        }
        const item = { ...packet, id: packet.id || randomUUID(), priority, enqueuedAt: Date.now() };
        this.#queue.enqueue(item);
        this.metrics.queued++;
        this.emit('queue:enqueued', { id: item.id, size: this.#queue.size });
        return { queued: true, id: item.id, position: this.#queue.size };
    }

    cancelQueued(id) {
        const removed = this.#queue.remove(id);
        if (removed) this.emit('queue:cancelled', { id });
        return { cancelled: removed, id };
    }

    async #processQueue() {
        if (this.#processing || this.#queue.isEmpty()) return;
        this.#processing = true;
        try {
            while (!this.#queue.isEmpty()) {
                const item = this.#queue.dequeue();
                this.metrics.dequeued++;
                this.emit('queue:processing', { id: item.id });
                try {
                    await this.dispatch(item);
                } catch (e) {
                    this.#log('error', `Queue item ${item.id}: ${e.message}`);
                }
            }
        } finally {
            this.#processing = false;
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HEALTH CHECKS
    // ══════════════════════════════════════════════════════════════════════════
    async #runHealthChecks() {
        for (const [name, agent] of this.#agents) {
            const meta = this.#agentMeta.get(name);
            try {
                let healthy = true;
                if (typeof agent.getStatus === 'function') {
                    const status = agent.getStatus();
                    healthy = status?.healthy !== false;
                } else if (typeof agent.process === 'function') {
                    await this.#executeWithTimeout(agent, { _healthCheck: true }, 1000);
                }
                if (meta) {
                    meta.healthStatus = healthy ? 'healthy' : 'degraded';
                    meta.lastHealthCheck = Date.now();
                }
                this.emit('health:checked', { name, healthy });
            } catch {
                if (meta) { meta.healthStatus = 'unhealthy'; meta.lastHealthCheck = Date.now(); }
                this.emit('agent:unhealthy', { name });
                this.#log('warn', `⚠️ Agent unhealthy: ${name}`);
            }
        }
    }

    async healthCheck() {
        const report = {};
        for (const [name, agent] of this.#agents) {
            const cb = this.#circuitBreakers.get(name);
            const lat = this.#latencyTrackers.get(name);
            const meta = this.#agentMeta.get(name);
            report[name] = {
                status: meta?.healthStatus || 'unknown',
                circuit: cb?.toJSON() || null,
                latency: lat?.toJSON() || null,
                calls: meta?.callCount || 0,
                errors: meta?.errorCount || 0,
            };
        }
        return report;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // AUDIT
    // ══════════════════════════════════════════════════════════════════════════
    #audit(action, agent, taskId, extra = {}) {
        if (!this.#config.enableAudit) return;
        if (this.#auditLog.length >= this.#config.maxAuditEntries) {
            this.#auditLog.splice(0, Math.floor(this.#config.maxAuditEntries * 0.1));
        }
        this.#auditLog.push({
            action, agent, taskId: taskId?.slice(0, 8) + '…',
            timestamp: Date.now(),
            iso: new Date().toISOString(),
            ...extra,
        });
    }

    getAuditLog(limit = 100, agentName = null) {
        let log = this.#auditLog;
        if (agentName) log = log.filter(e => e.agent === agentName);
        return log.slice(-limit);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // RÉSULTATS & CACHE
    // ══════════════════════════════════════════════════════════════════════════
    #cacheResult(taskId, result) {
        this.#results.set(taskId, result);
        if (this.#results.size > this.#config.maxResultCache) {
            const oldest = this.#results.keys().next().value;
            this.#results.delete(oldest);
        }
    }

    getResult(taskId) { return this.#results.get(taskId) || null; }
    getAllResults() { return [...this.#results.values()]; }
    clearResults() { this.#results.clear(); return this; }

    // ══════════════════════════════════════════════════════════════════════════
    // MÉTADONNÉES AGENTS
    // ══════════════════════════════════════════════════════════════════════════
    #updateMeta(name, success, ms, errorMsg = null) {
        const meta = this.#agentMeta.get(name);
        if (!meta) return;
        meta.callCount++;
        meta.lastCalled = Date.now();
        meta.totalMs += ms;
        meta.avgMs = Math.round(meta.totalMs / meta.callCount);
        if (success) {
            meta.successCount++;
        } else {
            meta.errorCount++;
            meta.lastError = Date.now();
            meta.lastErrorMsg = errorMsg;
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STATISTIQUES & TELEMETRIE
    // ══════════════════════════════════════════════════════════════════════════
    getAllTelemetry() {
        const telem = {};
        for (const [name, agent] of this.#agents) {
            try { telem[name] = agent.getTelemetry?.() || null; } catch { telem[name] = null; }
        }
        return telem;
    }

    getAllStats() {
        const stats = {};
        for (const [name, agent] of this.#agents) {
            try { stats[name] = agent.getStats?.() || null; } catch { stats[name] = null; }
        }
        return stats;
    }

    getAgentStats(name) {
        const meta = this.#agentMeta.get(name);
        const cb = this.#circuitBreakers.get(name);
        const lat = this.#latencyTrackers.get(name);
        if (!meta) return null;

        return {
            ...meta,
            errorRate: meta.callCount > 0
                ? Math.round((meta.errorCount / meta.callCount) * 100)
                : 0,
            circuitBreaker: cb?.toJSON() || null,
            latency: lat?.toJSON() || null,
        };
    }

    getAllAgentStats() {
        const stats = {};
        for (const [name] of this.#agentMeta) {
            stats[name] = this.getAgentStats(name);
        }
        return stats;
    }

    getMetrics() {
        const successRate = this.metrics.dispatched > 0
            ? Math.round((this.metrics.succeeded / this.metrics.dispatched) * 100)
            : 100;

        return {
            ...this.metrics,
            successRate,
            avgDispatchMs: this.metrics.succeeded > 0
                ? Math.round(this.metrics.totalMs / this.metrics.succeeded)
                : 0,
            queueSize: this.#queue.size,
            agentCount: this.#agents.size,
            resultCache: this.#results.size,
            auditLogSize: this.#auditLog.length,
            circuitBreakers: Object.fromEntries(
                [...this.#circuitBreakers.entries()]
                    .map(([k, v]) => [k, v.toJSON()])
            ),
            uptime: Date.now() - this.#startTime,
            timestamp: Date.now(),
        };
    }

    getStatus() {
        return {
            name: 'AgentBus',
            version: '2.0.0',
            healthy: true,
            agents: this.getAgentNames(),
            agentCount: this.#agents.size,
            queueSize: this.#queue.size,
            processing: this.#processing,
            metrics: this.getMetrics(),
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ACCESSEURS
    // ══════════════════════════════════════════════════════════════════════════
    getAgent(name) { return this.#agents.get(name) || null; }
    hasAgent(name) { return this.#agents.has(name); }
    getAgentNames() { return [...this.#agents.keys()]; }
    getQueueInfo() { return { size: this.#queue.size, items: this.#queue.toArray().map(i => i.id) }; }
    resetCircuitBreaker(name) { this.#circuitBreakers.get(name)?.reset(); return this; }

    // ══════════════════════════════════════════════════════════════════════════
    // NAMING VALIDATION (backward compat)
    // ══════════════════════════════════════════════════════════════════════════
    activateNamingValidation(validatedBy) {
        if (typeof this.factory?.validateNamingRules === 'function') {
            this.factory.validateNamingRules(validatedBy);
        }
        return this;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DESTROY
    // ══════════════════════════════════════════════════════════════════════════
    destroy() {
        if (this.#queueTimer) clearInterval(this.#queueTimer);
        if (this.#healthTimer) clearInterval(this.#healthTimer);
        this.#agents.clear();
        this.#agentMeta.clear();
        this.#circuitBreakers.clear();
        this.#latencyTrackers.clear();
        this.#results.clear();
        this.#queue.clear();
        this.#auditLog.length = 0;
        this.#hooks.clear();
        this.removeAllListeners();
        this.#log('info', 'AgentBus v2 détruit proprement');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS PRIVÉS
    // ══════════════════════════════════════════════════════════════════════════
    #makeFailResult(taskId, agent, message, durationMs, code = 'DISPATCH_ERROR') {
        return {
            taskId,
            agent,
            status: 'failure',
            output: { error: message, code },
            confidence: 0,
            warnings: [message],
            completedAt: Date.now(),
            durationMs,
            attempt: 1,
        };
    }

    #log(level, message) {
        const prefix = '[AgentBus v2]';
        switch (level) {
            case 'error': console.error(`${prefix} ❌ ${message}`); break;
            case 'warn': console.warn(`${prefix} ⚠️ ${message}`); break;
            default: console.log(`${prefix} ℹ️ ${message}`); break;
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON + EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export const agentBus = new AgentBus();
export default AgentBus;