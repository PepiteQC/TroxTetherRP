// ══════════════════════════════════════════════════════════════════════════════
// TroxT Brain v4.0.0 — Chef d'orchestre ultra-enrichi
// 7 étapes : Comprendre → Sécuriser → Classifier → Planifier →
//            Distribuer → Scorer → Valider + Apprendre
// ══════════════════════════════════════════════════════════════════════════════
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

import { AgentBus } from './AgentBus.js';
import { ThirdEye } from './ThirdEye.js';
import { DecisionHistory } from './memory/DecisionHistory.js';
import { AgentScoreHistory } from './memory/AgentScoreHistory.js';
import { generateRequestId, generateTaskId } from './rules/NamingRules.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════
const VERSION = '4.0.0';

const BRAIN_STATES = {
    IDLE: 'idle',
    CLASSIFYING: 'classifying',
    PLANNING: 'planning',
    SECURING: 'securing',
    DISTRIBUTING: 'distributing',
    SCORING: 'scoring',
    VALIDATING: 'validating',
    LEARNING: 'learning',
    ERROR: 'error',
};

const DEFAULT_CONFIG = {
    maxConcurrentRequests: 10,
    requestTimeout: 30_000,
    enableLearning: true,
    enableCaching: true,
    cacheTTL: 60_000,
    enableAudit: true,
    maxAuditEntries: 2_000,
    enableHooks: true,
    enableMetrics: true,
    minConfidenceThreshold: 30,       // Score min pour valider
    autoRetryOnFail: true,
    maxHistorySize: 500,
    enablePredictiveRouting: true,     // Route selon historique
    enableContextEnrich: true,     // Enrichir contexte automatiquement
    logLevel: 'warn',
};

// ══════════════════════════════════════════════════════════════════════════════
// CATÉGORIES ENRICHIES + ROUTING
// ══════════════════════════════════════════════════════════════════════════════
const CATEGORY_MAP = [
    { cat: 'Immobilier', patterns: [/maison|propriété|immobil|property|house|appartement|loyer|rent/i], primary: 'EtherForge', secondary: ['EtherPrism', 'EtherGuard'] },
    { cat: 'Véhicules', patterns: [/véhicule|vehicle|voiture|car|moto|camion|truck|bateau/i], primary: 'EtherForge', secondary: ['EtherPrism'] },
    { cat: 'Entities', patterns: [/npc|entit|guard|marchand|boss|mob|creature|personnage/i], primary: 'EtherForge', secondary: ['EtherSim'] },
    { cat: 'Inventaire', patterns: [/inventaire|inventory|item|clé|key|arme|weapon|équipement/i], primary: 'EtherForge', secondary: ['EtherPrism'] },
    { cat: 'Sécurité', patterns: [/sécurité|guard|permission|abuse|ban|hack|exploit|vulnérab/i], primary: 'EtherGuard', secondary: ['EtherLens'] },
    { cat: '3D', patterns: [/3d|scene|mesh|render|shader|texture|matériau|geometry/i], primary: 'EtherForge', secondary: ['EtherLens'] },
    { cat: 'Interface', patterns: [/interface|ui|hud|panneau|wheel|roue|menu|bouton|button/i], primary: 'EtherUI', secondary: ['EtherLens'] },
    { cat: 'Database', patterns: [/database|db|schema|table|sql|query|migration|prisma/i], primary: 'EtherWeave', secondary: ['EtherLens'] },
    { cat: 'Déploiement', patterns: [/deploy|production|build|ci|cd|docker|kubernetes/i], primary: 'EtherForge', secondary: ['EtherGuard'] },
    { cat: 'Architecture', patterns: [/système|system|module|architecture|pattern|design|structure/i], primary: 'EtherForge', secondary: ['EtherWeave'] },
    { cat: 'Effets', patterns: [/effet|effect|particule|explosion|shader|vfx|animation/i], primary: 'EtherSim', secondary: ['EtherUI'] },
    { cat: 'Documentation', patterns: [/doc|documentation|readme|wiki|guide|tutoriel|manuel/i], primary: 'EtherLens', secondary: [] },
    { cat: 'Optimisation', patterns: [/optimis|performance|fps|lag|mémoire|memory|profil|benchmark/i], primary: 'EtherLens', secondary: ['EtherSim'] },
    { cat: 'Code', patterns: [/code|function|class|typescript|javascript|refactor|bug|fix/i], primary: 'EtherForge', secondary: ['EtherLens'] },
    { cat: 'RPSystem', patterns: [/rp|roleplay|jeu|game|serveur|server|quête|quest|mission/i], primary: 'EtherSim', secondary: ['EtherForge'] },
    { cat: 'Économie', patterns: [/économie|economy|argent|money|banque|bank|transaction|crypto/i], primary: 'EtherForge', secondary: ['EtherGuard'] },
    { cat: 'Social', patterns: [/faction|clan|guild|groupe|group|ami|friend|relation|social/i], primary: 'EtherSim', secondary: ['EtherPrism'] },
    { cat: 'Événements', patterns: [/event|événement|planif|schedule|timer|cron|trigger/i], primary: 'EtherWeave', secondary: ['EtherSim'] },
];

// ══════════════════════════════════════════════════════════════════════════════
// CACHE LRU SIMPLE
// ══════════════════════════════════════════════════════════════════════════════
class LRUCache {
    #cache = new Map();
    #ttl;
    #maxSize;

    constructor(maxSize = 100, ttl = 60_000) {
        this.#maxSize = maxSize;
        this.#ttl = ttl;
    }

    set(key, value) {
        if (this.#cache.size >= this.#maxSize) {
            this.#cache.delete(this.#cache.keys().next().value);
        }
        this.#cache.set(key, { value, expiresAt: Date.now() + this.#ttl });
    }

    get(key) {
        const entry = this.#cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) { this.#cache.delete(key); return null; }
        // LRU: re-insert
        this.#cache.delete(key);
        this.#cache.set(key, entry);
        return entry.value;
    }

    has(key) { return !!this.get(key); }
    delete(key) { this.#cache.delete(key); }
    clear() { this.#cache.clear(); }
    get size() { return this.#cache.size; }
}

// ══════════════════════════════════════════════════════════════════════════════
// TROXT BRAIN v4.0.0
// ══════════════════════════════════════════════════════════════════════════════
export class TroxtBrain extends EventEmitter {

    // ── Champs privés ────────────────────────────────────────────────────────
    #state = BRAIN_STATES.IDLE;
    #startedAt = Date.now();
    #config;
    #cache;
    #auditLog = [];
    #hooks = new Map();
    #activeRequests = new Map(); // requestId → { startedAt, input }
    #learningData = [];        // Historique pour apprentissage
    #routingWeights = new Map(); // category:agent → score moyen (routing adaptatif)
    #categoryStats = new Map(); // category → { count, successCount, avgMs }

    // ── Métriques ────────────────────────────────────────────────────────────
    metrics = {
        requestsCompleted: 0,
        requestsFailed: 0,
        requestsBlocked: 0,
        requestsCached: 0,
        totalProcessingMs: 0,
        avgProcessingMs: 0,
        categoryDistribution: {},
        agentUsageCount: {},
        peakConcurrent: 0,
        learningIterations: 0,
        cacheHits: 0,
        thirdEyeBlocks: 0,
    };

    // ── Dépendances publiques (backward compat) ───────────────────────────────
    bus;
    thirdEye;
    history;
    scoreHistory;

    // ══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTEUR
    // ══════════════════════════════════════════════════════════════════════════
    constructor(config = {}) {
        super();
        this.setMaxListeners(50);
        this.#config = { ...DEFAULT_CONFIG, ...config };

        // Dépendances
        this.scoreHistory = new AgentScoreHistory();
        this.history = new DecisionHistory();
        this.bus = new AgentBus();
        this.thirdEye = new ThirdEye(this.scoreHistory);
        this.#cache = new LRUCache(200, this.#config.cacheTTL);

        // Validation NamingRules
        this.bus.activateNamingValidation(`TroxT Brain v${VERSION}`);

        // Init stats catégories
        for (const { cat } of CATEGORY_MAP) {
            this.#categoryStats.set(cat, { count: 0, successCount: 0, totalMs: 0 });
        }

        this.#log('info', `✅ TroxT Brain v${VERSION} initialisé`);
        this.emit('brain:ready', { version: VERSION, ts: Date.now() });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HOOKS
    // ══════════════════════════════════════════════════════════════════════════
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

    async #runHooks(event, data) {
        if (!this.#config.enableHooks) return data;
        const hooks = this.#hooks.get(event) || [];
        let result = data;
        for (const fn of hooks) {
            try { result = (await fn(result, event)) ?? result; }
            catch (e) { this.#log('warn', `Hook ${event}: ${e.message}`); }
        }
        return result;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PROCESS PRINCIPAL — 7 ÉTAPES
    // ══════════════════════════════════════════════════════════════════════════
    async process(input, options = {}) {
        const globalStart = Date.now();
        const requestId = generateRequestId();
        const inputStr = this.#normalizeInput(input);

        // Concurrence
        if (this.#activeRequests.size >= this.#config.maxConcurrentRequests) {
            const result = this.#makeBlockedRecord(requestId, input, 'MAX_CONCURRENT_REACHED');
            this.metrics.requestsBlocked++;
            return result;
        }

        this.#activeRequests.set(requestId, { startedAt: globalStart, input: inputStr });
        this.#updatePeakConcurrent();

        try {
            // ── Hook pre-process ─────────────────────────────────────────────────
            const enrichedInput = await this.#runHooks('pre:process', { input: inputStr, requestId, options });
            const finalInput = enrichedInput?.input || inputStr;

            // ── Cache ────────────────────────────────────────────────────────────
            if (this.#config.enableCaching && !options.skipCache) {
                const cached = this.#cache.get(this.#cacheKey(finalInput));
                if (cached) {
                    this.metrics.requestsCached++;
                    this.metrics.cacheHits++;
                    this.#log('debug', `Cache hit: ${requestId.slice(0, 8)}`);
                    return { ...cached, requestId, fromCache: true };
                }
            }

            // ════════════════════════════════════════════════════════════════════
            // ÉTAPE 1 : COMPRENDRE — Enrichissement contexte
            // ════════════════════════════════════════════════════════════════════
            this.#setState(BRAIN_STATES.CLASSIFYING);
            const context = this.#buildContext(finalInput, requestId, options);
            this.#audit('CONTEXT_BUILT', requestId, { context });
            this.emit('brain:step', { step: 1, name: 'Comprendre', requestId });

            // ════════════════════════════════════════════════════════════════════
            // ÉTAPE 2 : SÉCURISER — Pre-flight security check
            // ════════════════════════════════════════════════════════════════════
            this.#setState(BRAIN_STATES.SECURING);
            const securityCheck = this.#preFlight(finalInput, context);
            if (securityCheck.blocked) {
                const record = this.#makeBlockedRecord(requestId, input, securityCheck.reason);
                this.#finalizeRequest(requestId, record, false, globalStart);
                this.emit('brain:blocked', { requestId, reason: securityCheck.reason });
                return record;
            }
            this.emit('brain:step', { step: 2, name: 'Sécuriser', requestId });

            // ════════════════════════════════════════════════════════════════════
            // ÉTAPE 3 : CLASSIFIER
            // ════════════════════════════════════════════════════════════════════
            const classification = this.#classify(finalInput, context);
            context.category = classification.category;
            context.confidence = classification.confidence;
            this.#updateCategoryStats(classification.category);
            this.#audit('CLASSIFIED', requestId, { category: classification.category, confidence: classification.confidence });
            this.emit('brain:step', { step: 3, name: 'Classifier', requestId, data: classification });

            // ════════════════════════════════════════════════════════════════════
            // ÉTAPE 4 : PLANIFIER
            // ════════════════════════════════════════════════════════════════════
            this.#setState(BRAIN_STATES.PLANNING);
            const packets = this.#plan(finalInput, classification, context, requestId);
            this.#updateAgentUsage(packets);
            this.#audit('PLANNED', requestId, { packetCount: packets.length, agents: packets.map(p => p.targetAgent) });
            this.emit('brain:step', { step: 4, name: 'Planifier', requestId, data: { packets: packets.length } });

            // ThirdEye assurance avant distribution
            const assurance = this.thirdEye.assureDecision?.(packets) || { decision: 'approved', warnings: [] };
            if (assurance.decision === 'blocked') {
                this.metrics.thirdEyeBlocks++;
                const record = this.#makeBlockedRecord(requestId, input, 'THIRD_EYE_BLOCKED', packets, assurance);
                this.#finalizeRequest(requestId, record, false, globalStart);
                this.emit('brain:thirdEyeBlock', { requestId, assurance });
                return record;
            }

            // ════════════════════════════════════════════════════════════════════
            // ÉTAPE 5 : DISTRIBUER
            // ════════════════════════════════════════════════════════════════════
            this.#setState(BRAIN_STATES.DISTRIBUTING);
            this.emit('brain:step', { step: 5, name: 'Distribuer', requestId, data: { agents: packets.map(p => p.targetAgent) } });

            const results = await this.#distribute(packets, context);

            // ════════════════════════════════════════════════════════════════════
            // ÉTAPE 6 : SCORER
            // ════════════════════════════════════════════════════════════════════
            this.#setState(BRAIN_STATES.SCORING);
            this.emit('brain:step', { step: 6, name: 'Scorer', requestId });

            const scored = results.map(r => this.thirdEye.scoreResult?.(r) || { globalScore: 50, agent: r.agent, status: r.status });
            const predictions = this.thirdEye.predict?.(results, []) || [];
            const avgScore = scored.reduce((a, s) => a + (s.globalScore || 0), 0) / Math.max(scored.length, 1);

            // Apprentissage des poids de routing
            if (this.#config.enableLearning) {
                this.#learn(classification.category, packets, scored);
            }

            // ════════════════════════════════════════════════════════════════════
            // ÉTAPE 7 : VALIDER + FUSIONNER
            // ════════════════════════════════════════════════════════════════════
            this.#setState(BRAIN_STATES.VALIDATING);
            this.emit('brain:step', { step: 7, name: 'Valider', requestId });

            const finalOutput = this.#merge(results, scored, predictions, classification, context);
            const hasFailures = results.some(r => r.status === 'failure');
            const status = hasFailures ? 'partial' : 'completed';
            const durationMs = Date.now() - globalStart;

            const record = {
                id: requestId,
                requestId,
                version: VERSION,
                input: finalInput,
                category: classification.category,
                categoryConfidence: classification.confidence,
                context,
                plan: packets,
                results,
                thirdEyeAssurance: assurance,
                scored,
                predictions,
                finalOutput,
                status,
                fromCache: false,
                durationMs,
                createdAt: globalStart,
                completedAt: Date.now(),
            };

            // Hook post-process
            const finalRecord = await this.#runHooks('post:process', record) || record;

            // Mise en cache si succès
            if (!hasFailures && this.#config.enableCaching) {
                this.#cache.set(this.#cacheKey(finalInput), finalRecord);
            }

            // Historique
            this.history.push?.(finalRecord);

            this.#finalizeRequest(requestId, finalRecord, !hasFailures, globalStart);
            this.#audit('COMPLETED', requestId, { status, durationMs, avgScore: Math.round(avgScore) });
            this.emit('brain:completed', { requestId, status, durationMs, avgScore: Math.round(avgScore) });

            return finalRecord;

        } catch (err) {
            this.#setState(BRAIN_STATES.ERROR);
            this.#log('error', `process() fatal: ${err.message}`);
            this.emit('brain:error', { requestId, error: err.message });

            const record = this.#makeFailRecord(requestId, input, err);
            this.#finalizeRequest(requestId, record, false, globalStart);
            return record;

        } finally {
            this.#activeRequests.delete(requestId);
            this.#setState(BRAIN_STATES.IDLE);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 1 : BUILD CONTEXT
    // ══════════════════════════════════════════════════════════════════════════
    #buildContext(input, requestId, options = {}) {
        const hour = new Date().getHours();
        return {
            requestId,
            source: options.source || 'api',
            adminId: options.adminId || null,
            playerId: options.playerId || null,
            sessionId: options.sessionId || null,
            timestamp: Date.now(),
            hour,
            isNightTime: hour < 6 || hour > 22,
            environment: process.env.NODE_ENV || 'development',
            inputLength: input.length,
            wordCount: input.split(/\s+/).filter(Boolean).length,
            ...options.context,
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 2 : PRE-FLIGHT SECURITY
    // ══════════════════════════════════════════════════════════════════════════
    #preFlight(input, context) {
        // Injection basique
        if (/eval\s*\(|process\.exit|require\s*\(.*child_process/i.test(input)) {
            return { blocked: true, reason: 'CODE_INJECTION_DETECTED' };
        }
        // Longueur excessive
        if (input.length > 50_000) {
            return { blocked: true, reason: 'INPUT_TOO_LARGE' };
        }
        // Tentatives de manipulation du brain
        if (/ignore.*(instruction|rule|prompt)|jailbreak|act as/i.test(input)) {
            return { blocked: true, reason: 'PROMPT_INJECTION_DETECTED' };
        }
        return { blocked: false };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 3 : CLASSIFIER (enrichi + confiance)
    // ══════════════════════════════════════════════════════════════════════════
    #classify(input, context = {}) {
        const lower = input.toLowerCase();
        const matches = [];

        for (const def of CATEGORY_MAP) {
            const matchCount = def.patterns.filter(p => p.test(lower)).length;
            if (matchCount > 0) {
                let score = matchCount * 30;
                // Bonus routing adaptatif si on a de l'historique
                if (this.#config.enablePredictiveRouting) {
                    const key = `${def.cat}:${def.primary}`;
                    const w = this.#routingWeights.get(key) || 0;
                    score += w * 10;
                }
                matches.push({ ...def, score });
            }
        }

        if (matches.length === 0) {
            return { category: 'Architecture', primary: 'EtherForge', secondary: ['EtherWeave'], confidence: 40 };
        }

        matches.sort((a, b) => b.score - a.score);
        const best = matches[0];
        const confidence = Math.min(99, 50 + best.score);

        return {
            category: best.cat,
            primary: best.primary,
            secondary: best.secondary || [],
            confidence: Math.round(confidence),
            allMatches: matches.slice(0, 3).map(m => ({ category: m.cat, score: m.score })),
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 4 : PLANIFIER (routing adaptatif)
    // ══════════════════════════════════════════════════════════════════════════
    #plan(input, classification, context, requestId) {
        const packets = [];
        const lower = input.toLowerCase();
        const base = {
            context: `EtherWorld RP — ${classification.category}`,
            parentRequestId: requestId,
        };

        const { primary, secondary } = classification;

        // Agent principal
        packets.push(this.#createPacket(primary, input, base, 'high', [], classification.category));

        // Agents secondaires selon classification
        for (const agent of secondary) {
            if (!this.#agentIsAvailable(agent)) continue;
            packets.push(this.#createPacket(
                agent,
                `Support ${classification.category}: ${input.slice(0, 200)}`,
                base, 'medium',
                [packets[0].id],
                classification.category
            ));
        }

        // Logique supplémentaire basée sur le contenu
        if (/variante|catégorie|type|classe|prototype/i.test(lower)) {
            if (!packets.find(p => p.targetAgent === 'EtherPrism')) {
                packets.push(this.#createPacket('EtherPrism', `Créer les variantes pour: ${input}`, base, 'medium', [], classification.category));
            }
        }

        if (/connect|relier|synchronis|flux|pipeline|websocket/i.test(lower)) {
            if (!packets.find(p => p.targetAgent === 'EtherWeave')) {
                packets.push(this.#createPacket('EtherWeave', `Connecter les modules pour: ${input}`, base, 'medium', packets.map(p => p.id), classification.category));
            }
        }

        if (/achat|buy|clé|key|property|door|permission|sécuris/i.test(lower)) {
            if (!packets.find(p => p.targetAgent === 'EtherGuard')) {
                packets.push(this.#createPacket('EtherGuard', `Vérifier sécurité: ${input}`, base, 'high', packets.map(p => p.id), classification.category));
            }
        }

        if (/simul|test|scénario|scenario|charge|stress/i.test(lower)) {
            if (!packets.find(p => p.targetAgent === 'EtherSim')) {
                packets.push(this.#createPacket('EtherSim', `Simuler: ${input}`, base, 'medium', [], classification.category));
            }
        }

        // EtherLens en fin de pipeline (inspection + validation)
        if (!packets.find(p => p.targetAgent === 'EtherLens')) {
            packets.push(this.#createPacket(
                'EtherLens',
                `Inspecter et valider le pipeline: ${input}`,
                base, 'low',
                packets.map(p => p.id),
                classification.category
            ));
        }

        return packets;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 5 : DISTRIBUER
    // ══════════════════════════════════════════════════════════════════════════
    async #distribute(packets, context) {
        // Observer via ThirdEye
        try {
            const telem = this.bus.getAllTelemetry?.() || {};
            const obs = this.thirdEye.observe?.(telem) || [];
            const blocks = obs.filter(a => a.level === 'BLACK' || a.level === 'RED');

            if (blocks.length > 0) {
                this.metrics.thirdEyeBlocks++;
                return packets.map(p => ({
                    taskId: p.id,
                    agent: p.targetAgent,
                    status: 'failure',
                    output: { blocked: true, thirdEyeAlert: blocks[0]?.message },
                    confidence: 0,
                    warnings: [blocks[0]?.message ?? 'Blocage Third Eye'],
                    completedAt: Date.now(),
                    durationMs: 0,
                }));
            }
        } catch { /* ThirdEye non critique */ }

        // Dispatch réel
        const { results } = await this.bus.dispatchAll(packets, {
            timeout: this.#config.requestTimeout,
            retryAttempts: this.#config.autoRetryOnFail ? 1 : 0,
        });

        return Array.isArray(results) ? results : [];
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ÉTAPE 6/7 : MERGER + VALIDER
    // ══════════════════════════════════════════════════════════════════════════
    #merge(results, scores, predictions, classification, context) {
        const successful = results.filter(r => r.status !== 'failure');
        const failed = results.filter(r => r.status === 'failure');
        const avgScore = scores.reduce((a, s) => a + (s.globalScore || 0), 0) / Math.max(scores.length, 1);
        const maxScore = Math.max(...scores.map(s => s.globalScore || 0), 0);
        const minScore = Math.min(...scores.map(s => s.globalScore || 100), 100);

        // Validation qualité minimale
        const qualityOk = avgScore >= this.#config.minConfidenceThreshold;

        // Agréger les outputs par agent
        const agentOutputs = {};
        for (const r of results) {
            agentOutputs[r.agent] = {
                output: r.output,
                status: r.status,
                confidence: r.confidence || 0,
                durationMs: r.durationMs || 0,
            };
        }

        return {
            category: classification.category,
            categoryConfidence: classification.confidence,
            agentOutputs,
            scores: scores.map(s => ({
                agent: s.agent,
                globalScore: s.globalScore,
                status: s.status,
            })),
            avgConfidenceScore: Math.round(avgScore),
            maxScore: Math.round(maxScore),
            minScore: Math.round(minScore),
            qualityOk,
            predictions,
            summary: this.#buildSummary(successful, failed, classification.category, Math.round(avgScore)),
            agentCount: results.length,
            successCount: successful.length,
            failureCount: failed.length,
            failedAgents: failed.map(r => r.agent),
            environment: context.environment,
            validatedAt: Date.now(),
        };
    }

    #buildSummary(success, failed, category, avgScore) {
        if (success.length === 0) return `❌ Échec complet — catégorie: ${category}`;
        const agents = success.map(r => r.agent).join(', ');
        const failNote = failed.length > 0 ? ` · ⚠️ ${failed.length} échec(s)` : '';
        return `✅ ${success.length} agent(s) complétés (${agents})${failNote} · Score: ${avgScore}/100 · Catégorie: ${category}`;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // APPRENTISSAGE ADAPTATIF
    // ══════════════════════════════════════════════════════════════════════════
    #learn(category, packets, scores) {
        for (const score of scores) {
            const key = `${category}:${score.agent}`;
            const cur = this.#routingWeights.get(key) || 0;
            const val = score.globalScore / 100;
            // Moyenne mobile pondérée
            this.#routingWeights.set(key, cur * 0.8 + val * 0.2);
        }

        this.#learningData.push({ category, ts: Date.now(), avgScore: scores.reduce((a, s) => a + s.globalScore, 0) / scores.length });
        if (this.#learningData.length > 1000) this.#learningData.shift();

        this.metrics.learningIterations++;
        this.emit('brain:learned', { category, iteration: this.metrics.learningIterations });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════════════════
    #normalizeInput(input) {
        if (typeof input === 'string') return input.trim();
        if (typeof input === 'object' && input !== null) {
            return input.intent || input.mission || input.text || JSON.stringify(input);
        }
        return String(input || '');
    }

    #createPacket(agent, mission, base, priority, dependencies, category = '') {
        return {
            id: generateTaskId(),
            targetAgent: agent,
            mission,
            context: base.context,
            category,
            input: {},
            expectedOutput: 'Structured TypeScript module with events and types',
            rules: [
                'Ne pas modifier les systèmes existants',
                'Respecter les NamingRules officielles',
                "Rester dans le périmètre de spécialité de l'agent",
                'Documenter chaque sortie avec JSDoc',
                'Respecter l'architecture EtherWorld QC RP',
            ],
            priority,
            dependencies,
            validationBy: `TroxTBrain v${VERSION}`,
            createdAt: Date.now(),
            parentRequestId: base.parentRequestId,
        };
    }

    #agentIsAvailable(agentName) {
        return this.bus.hasAgent?.(agentName) ?? true;
    }

    #cacheKey(input) {
        return `brain:${Buffer.from(input.slice(0, 200)).toString('base64').slice(0, 32)}`;
    }

    #makeBlockedRecord(requestId, input, reason, packets = [], assurance = null) {
        this.metrics.requestsBlocked++;
        return {
            id: requestId,
            requestId,
            version: VERSION,
            input: this.#normalizeInput(input),
            category: 'BLOCKED',
            plan: packets,
            results: [],
            thirdEyeAssurance: assurance,
            finalOutput: { blocked: true, reason },
            status: 'blocked',
            durationMs: 0,
            createdAt: Date.now(),
            completedAt: Date.now(),
        };
    }

    #makeFailRecord(requestId, input, err) {
        this.metrics.requestsFailed++;
        return {
            id: requestId,
            requestId,
            version: VERSION,
            input: this.#normalizeInput(input),
            category: 'ERROR',
            plan: [],
            results: [],
            finalOutput: { error: err.message, code: err.code || 'BRAIN_ERROR' },
            status: 'failed',
            durationMs: 0,
            createdAt: Date.now(),
            completedAt: Date.now(),
        };
    }

    #finalizeRequest(requestId, record, success, startTime) {
        const ms = Date.now() - startTime;
        this.metrics.totalProcessingMs += ms;

        if (success) {
            this.metrics.requestsCompleted++;
        } else {
            this.metrics.requestsFailed++;
        }

        this.metrics.avgProcessingMs = Math.round(
            this.metrics.totalProcessingMs /
            Math.max(1, this.metrics.requestsCompleted + this.metrics.requestsFailed)
        );

        const cat = record.category;
        if (cat && this.#categoryStats.has(cat)) {
            const s = this.#categoryStats.get(cat);
            s.count++;
            s.totalMs += ms;
            if (success) s.successCount++;
            this.metrics.categoryDistribution[cat] = s.count;
        }
    }

    #updateAgentUsage(packets) {
        for (const p of packets) {
            const k = p.targetAgent;
            this.metrics.agentUsageCount[k] = (this.metrics.agentUsageCount[k] || 0) + 1;
        }
    }

    #updateCategoryStats(cat) {
        if (!this.#categoryStats.has(cat)) {
            this.#categoryStats.set(cat, { count: 0, successCount: 0, totalMs: 0 });
        }
    }

    #updatePeakConcurrent() {
        const current = this.#activeRequests.size;
        if (current > this.metrics.peakConcurrent) {
            this.metrics.peakConcurrent = current;
        }
    }

    #setState(state) {
        const prev = this.#state;
        this.#state = state;
        if (prev !== state) {
            this.emit('brain:stateChange', { from: prev, to: state, ts: Date.now() });
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // AUDIT
    // ══════════════════════════════════════════════════════════════════════════
    #audit(action, requestId, data = {}) {
        if (!this.#config.enableAudit) return;
        if (this.#auditLog.length >= this.#config.maxAuditEntries) {
            this.#auditLog.splice(0, Math.floor(this.#config.maxAuditEntries * 0.1));
        }
        this.#auditLog.push({
            action,
            requestId: requestId?.slice(0, 8) + '…',
            ts: Date.now(),
            iso: new Date().toISOString(),
            ...data,
        });
    }

    getAuditLog(limit = 100) {
        return this.#auditLog.slice(-limit);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // API PUBLIQUE — ACTIONS DIRECTES
    // ══════════════════════════════════════════════════════════════════════════

    /** Classifier uniquement sans exécution */
    classify(input) {
        return this.#classify(this.#normalizeInput(input), {});
    }

    /** Planifier uniquement sans exécution */
    plan(input, options = {}) {
        const str = this.#normalizeInput(input);
        const cls = this.#classify(str, {});
        const reqId = generateRequestId();
        return {
            classification: cls,
            packets: this.#plan(str, cls, {}, reqId),
        };
    }

    /** Dispatch direct vers un agent spécifique */
    async ask(agentName, mission, options = {}) {
        const packet = this.#createPacket(
            agentName, mission,
            { context: 'EtherWorld RP — Direct', parentRequestId: generateRequestId() },
            'high', [], 'Direct'
        );
        return this.bus.dispatch(packet, options);
    }

    /** Broadcast à tous les agents */
    async broadcast(mission, options = {}) {
        return this.process(mission, { ...options, broadcast: true });
    }

    /** Vider le cache */
    clearCache() {
        this.#cache.clear();
        return { cleared: true };
    }

    /** Reset des métriques */
    resetMetrics() {
        this.metrics.requestsCompleted = 0;
        this.metrics.requestsFailed = 0;
        this.metrics.requestsBlocked = 0;
        this.metrics.requestsCached = 0;
        this.metrics.totalProcessingMs = 0;
        this.metrics.avgProcessingMs = 0;
        this.metrics.categoryDistribution = {};
        this.metrics.agentUsageCount = {};
        this.metrics.peakConcurrent = 0;
        this.metrics.learningIterations = 0;
        this.metrics.cacheHits = 0;
        this.metrics.thirdEyeBlocks = 0;
        return { reset: true };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STATUS & INTROSPECTION
    // ══════════════════════════════════════════════════════════════════════════
    getStatus() {
        let telem = {};
        let agentStatuses = {};

        try {
            telem = this.bus.getAllTelemetry?.() || {};
            agentStatuses = Object.fromEntries(
                Object.entries(telem).map(([name, t]) => [
                    name,
                    {
                        available: t?.status !== 'blocked',
                        currentTask: t?.taskId !== 'idle' ? t?.taskId : undefined,
                    },
                ])
            );
        } catch { /* non critique */ }

        return {
            name: `TroxT Brain v${VERSION}`,
            version: VERSION,
            state: this.#state,
            healthy: this.#state !== BRAIN_STATES.ERROR,
            activeRequests: this.#activeRequests.size,
            completedRequests: this.metrics.requestsCompleted,
            failedRequests: this.metrics.requestsFailed,
            blockedRequests: this.metrics.requestsBlocked,
            cachedRequests: this.metrics.requestsCached,
            avgProcessingMs: this.metrics.avgProcessingMs,
            peakConcurrent: this.metrics.peakConcurrent,
            agentStatuses,
            thirdEyeAlerts: this.thirdEye.getAlerts?.() || [],
            cacheSize: this.#cache.size,
            auditLogSize: this.#auditLog.length,
            learningIterations: this.metrics.learningIterations,
            routingWeights: Object.fromEntries(this.#routingWeights),
            categoryStats: Object.fromEntries(
                [...this.#categoryStats.entries()].map(([k, v]) => [k, {
                    ...v,
                    successRate: v.count > 0 ? Math.round((v.successCount / v.count) * 100) : null,
                    avgMs: v.count > 0 ? Math.round(v.totalMs / v.count) : null,
                }])
            ),
            uptime: Date.now() - this.#startTime,
            startedAt: this.#startTime,
        };
    }

    getStats() {
        return {
            ...this.metrics,
            state: this.#state,
            uptime: Date.now() - this.#startTime,
            version: VERSION,
            timestamp: Date.now(),
        };
    }

    getCategories() {
        return CATEGORY_MAP.map(c => ({
            category: c.cat,
            primary: c.primary,
            secondary: c.secondary,
        }));
    }

    getRoutingWeights() {
        return Object.fromEntries(this.#routingWeights);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BACKWARD COMPAT
    // ══════════════════════════════════════════════════════════════════════════
    get state() { return this.#state; }
    get startedAt() { return this.#startTime; }
    get requestsCompleted() { return this.metrics.requestsCompleted; }
    get requestsFailed() { return this.metrics.requestsFailed; }

    // ══════════════════════════════════════════════════════════════════════════
    // DESTROY
    // ══════════════════════════════════════════════════════════════════════════
    destroy() {
        this.bus?.destroy?.();
        this.#cache.clear();
        this.#auditLog.length = 0;
        this.#activeRequests.clear();
        this.#routingWeights.clear();
        this.#learningData.length = 0;
        this.#hooks.clear();
        this.removeAllListeners();
        this.#log('info', 'TroxT Brain v4 détruit proprement');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // LOG
    // ══════════════════════════════════════════════════════════════════════════
    #log(level, message) {
        const prefix = `[TroxT Brain v${VERSION}]`;
        switch (level) {
            case 'error': console.error(`${prefix} ❌ ${message}`); break;
            case 'warn': console.warn(`${prefix} ⚠️ ${message}`); break;
            case 'debug': if (this.#config.logLevel === 'debug') console.debug(`${prefix} 🔍 ${message}`); break;
            default: console.log(`${prefix} ℹ️ ${message}`); break;
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON + EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export const brain = new TroxtBrain();
export default TroxtBrain;