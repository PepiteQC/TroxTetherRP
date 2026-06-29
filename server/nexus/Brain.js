// ══════════════════════════════════════════════════════════════════════════════
// TroxT Brain — Chef d'orchestre principal
// 5 étapes : Comprendre → Classifier → Distribuer → Vérifier → Valider
// ══════════════════════════════════════════════════════════════════════════════
import { AgentBus } from './AgentBus.js';
import { ThirdEye } from './ThirdEye.js';
import { DecisionHistory } from './memory/DecisionHistory.js';
import { AgentScoreHistory } from './memory/AgentScoreHistory.js';
import { generateRequestId, generateTaskId } from './rules/NamingRules.js';
export class TroxtBrain {
    state = 'idle';
    startedAt = Date.now();
    requestsCompleted = 0;
    requestsFailed = 0;
    bus;
    thirdEye;
    history;
    scoreHistory;
    constructor() {
        this.scoreHistory = new AgentScoreHistory();
        this.history = new DecisionHistory();
        this.bus = new AgentBus();
        this.thirdEye = new ThirdEye(this.scoreHistory);
        // NamingRules validées par TroxT Brain au démarrage
        this.bus.activateNamingValidation('TroxT Brain v3.0.0');
    }
    // ══════════════════════════════════════════════════════════════════════════
    // Les 5 étapes officielles de TroxT Brain
    // ══════════════════════════════════════════════════════════════════════════
    async process(input) {
        this.state = 'processing';
        const requestId = generateRequestId();
        // Étape 1 : Comprendre
        const category = this.classify(input);
        // Étape 2 : Planifier les missions
        const packets = this.plan(input, category, requestId);
        // Étape 3 : Assurance Third Eye avant distribution
        const assurance = this.thirdEye.assureDecision(packets);
        if (assurance.decision === 'blocked') {
            const record = {
                id: requestId, requestId, category, input, plan: packets, results: [],
                thirdEyeAssurance: assurance, finalOutput: { blocked: true, reason: assurance.warnings },
                status: 'failed', createdAt: Date.now(),
            };
            this.history.push(record);
            this.requestsFailed++;
            this.state = 'idle';
            return record;
        }
        // Étape 4 : Distribuer aux agents
        const results = await this.distribute(packets);
        // Étape 5 : Vérifier, scorer, valider
        this.state = 'validating';
        const scored = results.map(r => this.thirdEye.scoreResult(r));
        const predictions = this.thirdEye.predict(results, []);
        const finalOutput = this.merge(results, scored, predictions, category);
        const record = {
            id: requestId, requestId, category, input, plan: packets, results,
            thirdEyeAssurance: assurance, finalOutput,
            status: results.some(r => r.status === 'failure') ? 'failed' : 'completed',
            createdAt: Date.now(), completedAt: Date.now(),
        };
        this.history.push(record);
        results.some(r => r.status === 'failure') ? this.requestsFailed++ : this.requestsCompleted++;
        this.state = 'idle';
        return record;
    }
    // ── Étape 1 : Classifier ─────────────────────────────────────────────────
    classify(input) {
        const lower = input.toLowerCase();
        if (/maison|propriété|immobil|property|house/i.test(lower))
            return 'Immobilier';
        if (/véhicule|vehicle|voiture|car/i.test(lower))
            return 'Véhicules';
        if (/npc|entit|guard|marchand|boss/i.test(lower))
            return 'Entities';
        if (/inventaire|inventory|item|clé|key/i.test(lower))
            return 'Inventaire';
        if (/sécurité|guard|permission|abuse/i.test(lower))
            return 'Sécurité';
        if (/3d|scene|mesh|render|shader/i.test(lower))
            return '3D';
        if (/interface|ui|hud|panneau|wheel|roue/i.test(lower))
            return 'Interface';
        if (/database|db|schema|table/i.test(lower))
            return 'Database';
        if (/deploy|production|build/i.test(lower))
            return 'Déploiement';
        if (/système|system|module|architecture/i.test(lower))
            return 'Architecture';
        if (/effet|effect|particule|explosion/i.test(lower))
            return 'Effets';
        if (/doc|documentation|readme/i.test(lower))
            return 'Documentation';
        if (/optimis|performance|fps|lag/i.test(lower))
            return 'Optimisation';
        if (/code|function|class|typescript/i.test(lower))
            return 'Code';
        if (/rp|roleplay|jeu|game|serveur/i.test(lower))
            return 'RPSystem';
        return 'Architecture';
    }
    // ── Étape 2 : Planifier les missions ──────────────────────────────────────
    plan(input, category, requestId) {
        const packets = [];
        const lower = input.toLowerCase();
        const base = { context: `EtherWorld RP — ${category}`, parentRequestId: requestId };
        // Agent spécialisé principal selon la catégorie
        const primaryAgent = this.selectPrimaryAgent(category, lower);
        packets.push(this.createPacket(primaryAgent, input, base, 'high', []));
        // Ether-Prism si variantes nécessaires
        if (/variante|catégorie|type|classe/i.test(lower) || category === 'Immobilier' || category === 'Véhicules') {
            packets.push(this.createPacket('EtherPrism', `Créer les variantes pour: ${input}`, base, 'medium', []));
        }
        // Ether-Weave si connexion inter-modules
        if (/connect|relier|synchronis|flux/i.test(lower) || packets.length > 1) {
            packets.push(this.createPacket('EtherWeave', `Connecter les modules pour: ${input}`, base, 'medium', packets.map(p => p.id)));
        }
        // Ether-Guard si opérations critiques
        if (/achat|buy|clé|key|property|door|permission/i.test(lower)) {
            packets.push(this.createPacket('EtherGuard', `Vérifier sécurité et permissions pour: ${input}`, base, 'high', packets.map(p => p.id)));
        }
        // Ether-Lens toujours en fin de pipeline
        packets.push(this.createPacket('EtherLens', `Inspecter et valider: ${input}`, base, 'low', packets.map(p => p.id)));
        return packets;
    }
    // ── Étape 3-4 : Distribuer ───────────────────────────────────────────────
    async distribute(packets) {
        const obs = this.thirdEye.observe(this.bus.getAllTelemetry());
        const criticalBlocks = obs.filter(a => a.level === 'BLACK' || a.level === 'RED');
        if (criticalBlocks.length > 0) {
            return packets.map(p => ({
                taskId: p.id, agent: p.targetAgent,
                status: 'failure',
                output: { blocked: true, thirdEyeAlert: criticalBlocks[0]?.message },
                confidence: 0, warnings: [criticalBlocks[0]?.message ?? 'Blocage Third Eye'],
                completedAt: Date.now(), durationMs: 0,
            }));
        }
        return this.bus.dispatchAll(packets);
    }
    // ── Étape 5 : Fusionner et valider ───────────────────────────────────────
    merge(results, scores, predictions, category) {
        const successful = results.filter(r => r.status !== 'failure');
        const avgScore = scores.reduce((acc, s) => acc + s.globalScore, 0) / Math.max(scores.length, 1);
        return {
            category,
            agentOutputs: Object.fromEntries(results.map(r => [r.agent, r.output])),
            scores: scores.map(s => ({ agent: s.agent, globalScore: s.globalScore, status: s.status })),
            avgConfidenceScore: Math.round(avgScore),
            predictions,
            summary: this.buildSummary(successful, category),
            validatedAt: Date.now(),
        };
    }
    buildSummary(results, category) {
        if (results.length === 0)
            return `Échec complet pour catégorie ${category}`;
        const agents = results.map(r => r.agent).join(', ');
        return `${results.length} agent(s) complétés (${agents}) · Catégorie: ${category}`;
    }
    // ── Helpers ───────────────────────────────────────────────────────────────
    selectPrimaryAgent(category, lower) {
        const map = {
            Immobilier: 'EtherForge',
            Véhicules: 'EtherForge',
            Entities: 'EtherForge',
            Inventaire: 'EtherForge',
            Sécurité: 'EtherGuard',
            Interface: 'EtherUI',
            Optimisation: 'EtherLens',
            Documentation: 'EtherLens',
            'RPSystem': 'EtherSim',
        };
        return map[category] ?? 'EtherForge';
    }
    createPacket(agent, mission, base, priority, dependencies) {
        return {
            id: generateTaskId(),
            targetAgent: agent,
            mission,
            context: base.context,
            input: {},
            expectedOutput: 'Structured TypeScript module with events and types',
            rules: [
                'Ne pas modifier les systèmes existants',
                'Respecter les NamingRules officielles',
                'Rester dans le périmètre de spécialité de l\'agent',
            ],
            priority,
            dependencies,
            validationBy: 'TroxTBrain',
            createdAt: Date.now(),
            parentRequestId: base.parentRequestId,
        };
    }
    // ── Status & introspection ────────────────────────────────────────────────
    getStatus() {
        const telem = this.bus.getAllTelemetry();
        const agentStatuses = Object.fromEntries(Object.entries(telem).map(([name, t]) => [
            name,
            { available: t.status !== 'blocked', currentTask: t.taskId !== 'idle' ? t.taskId : undefined },
        ]));
        return {
            state: this.state,
            activeRequests: this.state === 'processing' ? 1 : 0,
            completedRequests: this.requestsCompleted,
            failedRequests: this.requestsFailed,
            agentStatuses,
            thirdEyeAlerts: this.thirdEye.getAlerts(),
            uptime: Date.now() - this.startedAt,
            startedAt: this.startedAt,
        };
    }
}
