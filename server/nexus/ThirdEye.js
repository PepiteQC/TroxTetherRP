// ══════════════════════════════════════════════════════════════════════════════
// TroxT Third Eye v4.0.0 — Couche d'observation, prédiction et assurance
// Voit tout · Comprend vite · Prédit les risques · Protège la cohérence
// Apprentissage adaptatif · Audit complet · Incidents · Hooks
// ══════════════════════════════════════════════════════════════════════════════
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════
const VERSION = '4.0.0';

const ALERT_COLORS = {
    GREEN: '#22c55e',
    BLUE: '#60a5fa',
    YELLOW: '#fbbf24',
    ORANGE: '#f97316',
    RED: '#ef4444',
    BLACK: '#18181b',
};

const ALERT_PRIORITY = { BLACK: 5, RED: 4, ORANGE: 3, YELLOW: 2, BLUE: 1, GREEN: 0 };

const SCORE_WEIGHTS = {
    technicalQuality: 0.25,
    security: 0.20,
    compatibility: 0.15,
    clarity: 0.15,
    roleCompliance: 0.10,
    performance: 0.10,
    reusability: 0.05,
};

const DEFAULT_CONFIG = {
    maxAlerts: 500,
    maxIncidents: 200,
    maxAuditEntries: 2_000,
    maxPatternHistory: 100,
    maxObservationHistory: 300,
    enableLearning: true,
    enableIncidents: true,
    enablePatternDetect: true,
    enableTrendAnalysis: true,
    enableHooks: true,
    enableAudit: true,
    alertTTL: 24 * 60 * 60_000,   // 24h
    criticalAlertWebhook: null,
    riskBlockThreshold: 50,
    confidenceLowThreshold: 0.65,
    anomalyZThreshold: 2.5,
    learningRate: 0.1,
    decayRate: 0.02,
};

// ══════════════════════════════════════════════════════════════════════════════
// RÈGLES D'ASSURANCE ENRICHIES
// ══════════════════════════════════════════════════════════════════════════════
const ASSURANCE_RULES = [
    {
        id: 'R001',
        name: 'ForgeFactory sans EtherForge',
        description: 'ForgeFactory doit toujours être accompagné d'EtherForge',
    test: (agents, packets) =>
agents.includes('ForgeFactory') && !agents.includes('EtherForge'),
    risk: 25,
        level: 'ORANGE',
            recommendation: 'Ajouter EtherForge au pipeline avant ForgeFactory',
  },
{
    id: 'R002',
        name: 'Données sans sauvegarde',
            description: 'Les opérations sur property/inventory doivent inclure un SaveSystem',
                test: (agents, packets) =>
                    !packets.some(p => /save|sauvegarder/i.test(p.mission)) &&
                    packets.some(p => /property|inventory|furniture|item/i.test(p.mission)),
                    risk: 20,
                        level: 'YELLOW',
                            recommendation: 'Inclure SaveSystem ou EtherWeave pour persistance',
  },
{
    id: 'R003',
        name: 'Transaction sans EtherGuard',
            description: 'Achats et transactions nécessitent EtherGuard',
                test: (agents, packets) =>
                    !agents.includes('EtherGuard') &&
                    packets.some(p => /purchase|buy|key|transaction|achat|payer/i.test(p.mission)),
                    risk: 35,
                        level: 'RED',
                            recommendation: 'Ajouter EtherGuard pour valider permissions et sécurité',
  },
{
    id: 'R004',
        name: 'Multi-agents sans EtherWeave',
            description: 'Plus de 2 agents sans EtherWeave risque l'isolement',
    test: (agents, packets) =>
        !agents.includes('EtherWeave') && packets.length > 2,
        risk: 15,
            level: 'YELLOW',
                recommendation: 'Ajouter EtherWeave pour interconnecter les modules',
  },
{
    id: 'R005',
        name: 'EtherLens absent en production',
            description: 'Pipeline sans EtherLens = pas de validation finale',
                test: (agents, packets) =>
                    !agents.includes('EtherLens') && packets.length > 1,
                    risk: 10,
                        level: 'YELLOW',
                            recommendation: 'Ajouter EtherLens en fin de pipeline pour validation',
  },
{
    id: 'R006',
        name: 'Pipeline trop long',
            description: 'Plus de 6 agents = risque de latence et deadlock',
                test: (agents, packets) => packets.length > 6,
                    risk: 20,
                        level: 'ORANGE',
                            recommendation: 'Réduire le pipeline ou utiliser dispatchAll par groupes',
  },
{
    id: 'R007',
        name: 'Dépendances circulaires',
            description: 'Détection de cycles dans les dépendances de tâches',
                test: (agents, packets) => {
                    const depMap = new Map(packets.map(p => [p.id, p.dependencies || []]));
                    const visited = new Set();
                    const inStack = new Set();
                    const hasCycle = (id) => {
                        if (inStack.has(id)) return true;
                        if (visited.has(id)) return false;
                        visited.add(id); inStack.add(id);
                        for (const dep of depMap.get(id) || []) {
                            if (hasCycle(dep)) return true;
                        }
                        inStack.delete(id);
                        return false;
                    };
                    return [...depMap.keys()].some(id => hasCycle(id));
                },
                    risk: 40,
                        level: 'RED',
                            recommendation: 'Résoudre les dépendances circulaires avant dispatch',
  },
{
    id: 'R008',
        name: '3D sans EtherSim',
            description: 'Les opérations 3D/render bénéficient de EtherSim pour validation',
                test: (agents, packets) =>
                    !agents.includes('EtherSim') &&
                    packets.some(p => /3d|shader|mesh|scene|render/i.test(p.mission)),
                    risk: 10,
                        level: 'BLUE',
                            recommendation: 'Ajouter EtherSim pour simuler le rendu avant production',
  },
{
    id: 'R009',
        name: 'Mission vide ou trop courte',
            description: 'Packets avec mission trop vague risquent une sortie incohérente',
                test: (agents, packets) =>
                    packets.some(p => !p.mission || p.mission.trim().length < 10),
                    risk: 15,
                        level: 'YELLOW',
                            recommendation: 'Enrichir les descriptions de mission avant dispatch',
  },
{
    id: 'R010',
        name: 'EtherUI sans contexte UI',
            description: 'EtherUI utilisé hors contexte interface = gaspillage',
                test: (agents, packets) =>
                    agents.includes('EtherUI') &&
                    !packets.some(p => /ui|hud|menu|bouton|interface|panneau|wheel/i.test(p.mission)),
                    risk: 5,
                        level: 'BLUE',
                            recommendation: 'Vérifier si EtherUI est vraiment nécessaire dans ce pipeline',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// ONLINE STATS (Welford)
// ══════════════════════════════════════════════════════════════════════════════
class OnlineStats {
    #n = 0; #mean = 0; #M2 = 0;

    update(x) {
        this.#n++;
        const d = x - this.#mean;
        this.#mean += d / this.#n;
        this.#M2 += d * (x - this.#mean);
    }

    get mean() { return this.#mean; }
    get variance() { return this.#n > 1 ? this.#M2 / (this.#n - 1) : 0; }
    get std() { return Math.sqrt(this.variance); }
    get count() { return this.#n; }

    zScore(x) {
        return this.std > 0 ? Math.abs((x - this.#mean) / this.std) : 0;
    }

    toJSON() {
        return { mean: Math.round(this.#mean), std: Math.round(this.std), count: this.#n };
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// THIRD EYE v4.0.0
// ══════════════════════════════════════════════════════════════════════════════
export class ThirdEye extends EventEmitter {

    // ── Champs privés ────────────────────────────────────────────────────────
    #config;
    #alerts = [];
    #incidents = [];
    #auditLog = [];
    #hooks = new Map();
    #agentScoreStats = new Map();    // agentName → OnlineStats (scores)
    #agentConfStats = new Map();    // agentName → OnlineStats (confidence)
    #ruleHitCount = new Map();    // ruleId → count
    #patternHistory = [];           // Patterns observés
    #observationHist = [];           // Historique télémetrie brute
    #learningWeights = new Map();    // agentName:metric → poids appris
    #startedAt = Date.now();

    // ── Métriques ────────────────────────────────────────────────────────────
    metrics = {
        observationCount: 0,
        assuranceCount: 0,
        predictionCount: 0,
        scoreCount: 0,
        alertsGenerated: 0,
        alertsResolved: 0,
        incidentsCreated: 0,
        incidentsResolved: 0,
        blocksTriggered: 0,
        anomaliesDetected: 0,
        rulesTriggered: 0,
        learningIterations: 0,
    };

    // ── Public (backward compat) ──────────────────────────────────────────────
    scoreHistory;
    observationCount = 0;
    startedAt = Date.now();

    // ══════════════════════════════════════════════════════════════════════════
    constructor(scoreHistory, config = {}) {
        super();
        this.setMaxListeners(30);
        this.#config = { ...DEFAULT_CONFIG, ...config };
        this.scoreHistory = scoreHistory;

        // Init stats par règle
        for (const rule of ASSURANCE_RULES) {
            this.#ruleHitCount.set(rule.id, 0);
        }

        this.emit('thirdEye:ready', { version: VERSION, rules: ASSURANCE_RULES.length });
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
        if (!this.#config.enableHooks) return data;
        const hooks = this.#hooks.get(event) || [];
        let result = data;
        for (const fn of hooks) {
            try { result = (await fn(result, event)) ?? result; } catch { /* ignore */ }
        }
        return result;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 1. OBSERVATION GLOBALE (enrichie)
    // ══════════════════════════════════════════════════════════════════════════
    observe(telemetry) {
        this.metrics.observationCount++;
        this.observationCount++;

        const newAlerts = [];
        const now = Date.now();

        // Historique télémetrie
        this.#observationHist.push({ telemetry, ts: now });
        if (this.#observationHist.length > this.#config.maxObservationHistory) {
            this.#observationHist.shift();
        }

        for (const [agentName, t] of Object.entries(telemetry)) {

            // ── Stats online (apprentissage) ────────────────────────────────────
            if (typeof t.confidence === 'number') {
                if (!this.#agentConfStats.has(agentName)) {
                    this.#agentConfStats.set(agentName, new OnlineStats());
                }
                const stats = this.#agentConfStats.get(agentName);
                stats.update(t.confidence);

                // Détection anomalie Z-score
                if (stats.count > 5 && stats.zScore(t.confidence) > this.#config.anomalyZThreshold) {
                    this.metrics.anomaliesDetected++;
                    newAlerts.push(this.#createAlert('ORANGE',
                        `${agentName} — Confiance anormale détectée (Z=${stats.zScore(t.confidence).toFixed(2)})`,
                        'Comportement statistiquement inhabituel',
                        `Inspecter les logs de ${agentName}`,
                        agentName, [agentName], 'ANOMALY'
                    ));
                }
            }

            // ── Règles d'observation ─────────────────────────────────────────────
            if (t.status === 'blocked') {
                newAlerts.push(this.#createAlert('BLACK',
                    `${agentName} est BLOQUÉ — production stoppée`,
                    'Données corrompues si production forcée',
                    `Résoudre les dépendances de ${agentName} avant de continuer`,
                    agentName, [agentName], 'BLOCKED'
                ));
                this.#triggerIncident(agentName, 'AGENT_BLOCKED', `${agentName} bloqué`);
            }

            if (t.riskLevel === 'critical') {
                newAlerts.push(this.#createAlert('RED',
                    `${agentName} signale un risque critique`,
                    'Instabilité système possible',
                    `Inspection immédiate de ${agentName} par Ether-Lens`,
                    agentName, [agentName], 'CRITICAL_RISK'
                ));
                this.#triggerIncident(agentName, 'CRITICAL_RISK', `${agentName} risque critique`);
            }

            if (typeof t.confidence === 'number' && t.confidence < this.#config.confidenceLowThreshold && t.status === 'working') {
                newAlerts.push(this.#createAlert('ORANGE',
                    `${agentName} — confiance faible (${Math.round(t.confidence * 100)}%)`,
                    'Résultat potentiellement incomplet',
                    `Audit Ether-Lens sur la tâche "${t.taskId || '?'}"`,
                    agentName, [agentName], 'LOW_CONFIDENCE'
                ));
            }

            if (typeof t.durationMs === 'number' && t.durationMs > 10_000) {
                newAlerts.push(this.#createAlert('YELLOW',
                    `${agentName} — temps de traitement excessif (${Math.round(t.durationMs / 1000)}s)`,
                    'Risque de timeout et blocage aval',
                    `Vérifier la charge de ${agentName}`,
                    agentName, [agentName], 'SLOW_AGENT'
                ));
            }

            if (typeof t.errorRate === 'number' && t.errorRate > 0.3) {
                newAlerts.push(this.#createAlert('RED',
                    `${agentName} — taux d'erreur élevé (${Math.round(t.errorRate * 100)}%)`,
                    'Agent instable — sorties non fiables',
                    `Mettre ${agentName} en standby et investiguer`,
                    agentName, [agentName], 'HIGH_ERROR_RATE'
                ));
            }
        }

        this.#pushAlerts(newAlerts);
        this.#audit('OBSERVE', 'ThirdEye', { agentCount: Object.keys(telemetry).length, newAlerts: newAlerts.length });
        this.emit('thirdEye:observed', { agentCount: Object.keys(telemetry).length, alerts: newAlerts.length });

        return newAlerts;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. ASSURANCE DÉCISION (règles enrichies)
    // ══════════════════════════════════════════════════════════════════════════
    assureDecision(packets) {
        this.metrics.assuranceCount++;

        const agents = packets.map(p => p.targetAgent);
        const warnings = [];
        const rulesHit = [];
        let riskScore = 0;

        // Évaluation de toutes les règles
        for (const rule of ASSURANCE_RULES) {
            try {
                if (rule.test(agents, packets)) {
                    warnings.push(`[${rule.id}] ${rule.name}: ${rule.description}`);
                    rulesHit.push({ id: rule.id, name: rule.name, risk: rule.risk, level: rule.level });
                    riskScore += rule.risk;
                    this.#ruleHitCount.set(rule.id, (this.#ruleHitCount.get(rule.id) || 0) + 1);
                    this.metrics.rulesTriggered++;

                    // Alertes pour règles critiques
                    if (ALERT_PRIORITY[rule.level] >= ALERT_PRIORITY.RED) {
                        this.#pushAlerts([this.#createAlert(
                            rule.level,
                            `Règle ${rule.id} déclenchée: ${rule.name}`,
                            rule.description,
                            rule.recommendation,
                            'ThirdEye', agents, rule.id
                        )]);
                    }
                }
            } catch { /* Règle ne doit pas crasher */ }
        }

        // Score et niveau de risque
        const confidence = Math.max(0.2, 1 - riskScore / 100);
        const level = riskScore === 0 ? 'none'
            : riskScore < 20 ? 'low'
                : riskScore < 40 ? 'medium'
                    : riskScore < 65 ? 'high'
                        : 'critical';

        const threshold = this.#config.riskBlockThreshold;
        const decision = riskScore === 0 ? 'approved'
            : riskScore < threshold * 0.6 ? 'approved_with_warnings'
                : riskScore < threshold ? 'proceed_with_caution'
                    : 'blocked';

        if (decision === 'blocked') this.metrics.blocksTriggered++;

        const result = {
            decision,
            confidence: Math.round(confidence * 100) / 100,
            riskLevel: level,
            riskScore,
            warnings,
            rulesHit,
            recommendedAction: this.#buildRecommendation(riskScore, warnings, rulesHit),
            agentCount: agents.length,
            packetCount: packets.length,
            evaluatedAt: Date.now(),
        };

        this.#audit('ASSURANCE', 'ThirdEye', { decision, riskScore, rulesHit: rulesHit.length });
        this.emit('thirdEye:assured', { decision, riskScore, rulesHit: rulesHit.length });

        return result;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. PRÉDICTION ENRICHIE
    // ══════════════════════════════════════════════════════════════════════════
    predict(completedResults, pendingPackets) {
        this.metrics.predictionCount++;

        const predictions = [];
        const risks = [];
        const opportunities = [];

        const completedIds = new Set(completedResults.map(r => r.taskId));
        const completedMissions = completedResults
            .filter(r => r.status !== 'failure')
            .map(r => String(r.output?.mission ?? ''));

        // Dépendances non satisfaites
        for (const packet of pendingPackets) {
            const missingDeps = (packet.dependencies || [])
                .filter(dep => !completedIds.has(dep));

            if (missingDeps.length > 0) {
                risks.push({
                    type: 'DEPENDENCY_MISSING',
                    packet: packet.targetAgent,
                    missing: missingDeps,
                    impact: 'high',
                });
                predictions.push(`⚠️ "${packet.mission?.slice(0, 60)}" — dépendances manquantes: ${missingDeps.length}`);
            }
        }

        // ForgeFactory sans NamingRules
        const hasFactory = pendingPackets.some(p => p.targetAgent === 'ForgeFactory');
        const hasNamingValidation = completedResults.some(r => String(r.output?.namingStandard ?? '').length > 0);
        if (hasFactory && !hasNamingValidation) {
            risks.push({ type: 'NAMING_UNSAFE', packet: 'ForgeFactory', impact: 'medium' });
            predictions.push('⚠️ ForgeFactory va produire sans validation NamingRules — doublons possibles');
        }

        // Charge totale
        const totalAgents = new Set(pendingPackets.map(p => p.targetAgent)).size;
        if (totalAgents > 5) {
            risks.push({ type: 'HIGH_LOAD', agents: totalAgents, impact: 'medium' });
            predictions.push(`⚠️ ${totalAgents} agents distincts — risque de contention`);
        }

        // Opportunités d'optimisation
        if (completedResults.filter(r => r.status === 'failure').length === 0 && pendingPackets.length === 0) {
            opportunities.push('✅ Pipeline propre — toutes les dépendances satisfaites');
        }

        if (predictions.length === 0) {
            predictions.push('✅ Aucun blocage prédit — exécution peut continuer');
        }

        // Apprentissage des patterns
        if (this.#config.enablePatternDetect) {
            this.#recordPattern(risks, completedResults.length, pendingPackets.length);
        }

        const result = { predictions, risks, opportunities, ts: Date.now() };
        this.emit('thirdEye:predicted', { riskCount: risks.length, predictionCount: predictions.length });

        return result;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 4. SCORE RÉSULTAT (pondéré + apprentissage)
    // ══════════════════════════════════════════════════════════════════════════
    scoreResult(result) {
        this.metrics.scoreCount++;

        const agent = result.agent || '?';
        const isSuccess = result.status === 'success';
        const isPartial = result.status === 'partial';
        const confidence = result.confidence || 0;
        const warnings = result.warnings || [];
        const durationMs = result.durationMs || 0;

        // Score composantes
        const scores = {
            technicalQuality: Math.min(100,
                (isSuccess ? 85 : isPartial ? 65 : 30) + Math.round(confidence * 15)
            ),
            security: agent === 'EtherGuard' ? 97
                : warnings.some(w => /security|permission|auth/i.test(w)) ? 60
                    : 80,
            compatibility: warnings.length === 0 ? 92 : Math.max(60, 92 - warnings.length * 8),
            clarity: warnings.length === 0 ? 92
                : warnings.length < 3 ? 75
                    : 60,
            roleCompliance: this.#computeRoleCompliance(agent, result),
            performance: durationMs > 8000 ? 40
                : durationMs > 5000 ? 60
                    : durationMs > 2000 ? 80
                        : 95,
            reusability: isSuccess ? 85 : 65,
        };

        // Score global pondéré
        let globalScore = 0;
        for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
            globalScore += (scores[key] || 0) * weight;
        }

        // Pénalités supplémentaires
        const warningPenalty = warnings.length * 3;
        globalScore = Math.max(0, Math.min(100, Math.round(globalScore - warningPenalty)));

        // Mise à jour stats online
        if (!this.#agentScoreStats.has(agent)) {
            this.#agentScoreStats.set(agent, new OnlineStats());
        }
        this.#agentScoreStats.get(agent).update(globalScore);

        // Apprentissage des poids de scoring
        if (this.#config.enableLearning) {
            this.#learnFromScore(agent, globalScore, isSuccess);
        }

        const status = globalScore >= 85 ? 'accepted'
            : globalScore >= 65 ? 'accepted_with_warnings'
                : globalScore >= 45 ? 'pending_review'
                    : 'rejected';

        const score = {
            agent,
            task: String(result.output?.mission ?? result.taskId ?? '?'),
            scores,
            globalScore,
            status,
            warnings,
            trend: this.#computeScoreTrend(agent, globalScore),
            timestamp: Date.now(),
        };

        this.scoreHistory?.record?.(score);
        this.#audit('SCORE', agent, { globalScore, status });
        this.emit('thirdEye:scored', { agent, globalScore, status });

        return score;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 5. RÉACTIONS RAPIDES (enrichies)
    // ══════════════════════════════════════════════════════════════════════════
    react(telemetry) {
        const reactions = [];

        for (const [agentName, t] of Object.entries(telemetry)) {
            let signal = 'GREEN';
            let reason = 'Nominal';
            let priority = 0;
            let action = null;

            if (t.status === 'blocked') {
                signal = 'BLACK';
                reason = 'Agent bloqué — production stoppée';
                priority = 10;
                action = `HALT:${agentName}`;
            } else if (t.riskLevel === 'critical') {
                signal = 'RED';
                reason = 'Risque critique détecté';
                priority = 9;
                action = `INSPECT:${agentName}`;
            } else if (typeof t.errorRate === 'number' && t.errorRate > 0.3) {
                signal = 'RED';
                reason = `Taux d'erreur: ${Math.round(t.errorRate * 100)}%`;
                priority = 8;
                action = `STANDBY:${agentName}`;
            } else if (typeof t.confidence === 'number' && t.confidence < this.#config.confidenceLowThreshold) {
                signal = 'ORANGE';
                reason = `Confiance faible: ${Math.round(t.confidence * 100)}%`;
                priority = 6;
                action = `AUDIT:${agentName}`;
            } else if (typeof t.durationMs === 'number' && t.durationMs > 10_000) {
                signal = 'YELLOW';
                reason = `Lent: ${Math.round(t.durationMs / 1000)}s`;
                priority = 4;
                action = `MONITOR:${agentName}`;
            } else if (t.status === 'working') {
                signal = 'BLUE';
                reason = 'En cours — suivi actif';
                priority = 2;
            }

            reactions.push({
                agent: agentName,
                signal,
                color: ALERT_COLORS[signal],
                reason,
                priority,
                action,
                timestamp: Date.now(),
            });
        }

        // Trier par priorité décroissante
        reactions.sort((a, b) => b.priority - a.priority);
        this.emit('thirdEye:reacted', { count: reactions.length });

        return reactions;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 6. DÉTECTION DE CONFLITS DE CONVENTIONS
    // ══════════════════════════════════════════════════════════════════════════
    detectConventionConflict(ids) {
        const alerts = [];
        const seen = new Map();
        const conflicts = [];

        for (const id of ids) {
            // Normalisation : retirer suffixe numérique
            const prefix = id.replace(/[_-]\d+$/, '').toLowerCase();

            if (seen.has(prefix) && seen.get(prefix) !== id) {
                conflicts.push({ a: seen.get(prefix), b: id, prefix });
                const alert = this.#createAlert('ORANGE',
                    `Convention incompatible: "${seen.get(prefix)}" vs "${id}"`,
                    'Doublons et incompatibilité de sauvegarde',
                    'Pause production. Validation NamingRules requise.',
                    'ThirdEye', [], 'NAMING_CONFLICT'
                );
                alerts.push(alert);
            }
            seen.set(prefix, id);
        }

        if (conflicts.length > 0) {
            this.#pushAlerts(alerts);
            this.emit('thirdEye:namingConflict', { conflicts });
        }

        return { alerts, conflicts };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 7. ANALYSE DE TENDANCES
    // ══════════════════════════════════════════════════════════════════════════
    getTrendAnalysis(agentName = null, windowMs = 300_000) {
        if (!this.#config.enableTrendAnalysis) return null;

        const now = Date.now();
        const alerts = this.#alerts
            .filter(a => now - a.timestamp < windowMs)
            .filter(a => !agentName || a.source === agentName);

        const byLevel = {};
        for (const a of alerts) {
            byLevel[a.level] = (byLevel[a.level] || 0) + 1;
        }

        const criticals = (byLevel.RED || 0) + (byLevel.BLACK || 0);
        const trend = criticals > 5 ? 'CRITICAL'
            : criticals > 2 ? 'DEGRADING'
                : (byLevel.ORANGE || 0) > 3 ? 'UNSTABLE'
                    : 'STABLE';

        const agentStats = agentName ? {
            scores: this.#agentScoreStats.get(agentName)?.toJSON() || null,
            confidence: this.#agentConfStats.get(agentName)?.toJSON() || null,
        } : null;

        return { trend, window: windowMs, alerts: alerts.length, byLevel, criticals, agentStats };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 8. INCIDENTS
    // ══════════════════════════════════════════════════════════════════════════
    #triggerIncident(agent, type, description) {
        if (!this.#config.enableIncidents) return null;
        if (this.#incidents.length >= this.#config.maxIncidents) {
            this.#incidents.pop();
        }

        const incident = {
            id: `inc_${randomUUID().slice(0, 8)}`,
            agent,
            type,
            description,
            status: 'OPEN',
            createdAt: Date.now(),
            resolvedAt: null,
            escalated: false,
        };

        this.#incidents.unshift(incident);
        this.metrics.incidentsCreated++;
        this.emit('thirdEye:incident', incident);
        this.#audit('INCIDENT', agent, { type, id: incident.id });

        return incident;
    }

    resolveIncident(id, notes = '') {
        const inc = this.#incidents.find(i => i.id === id);
        if (!inc) return { ok: false };
        inc.status = 'RESOLVED';
        inc.resolvedAt = Date.now();
        inc.notes = notes;
        this.metrics.incidentsResolved++;
        this.emit('thirdEye:incidentResolved', { id, notes });
        return { ok: true, id };
    }

    getIncidents(filter = null) {
        let inc = this.#incidents;
        if (filter?.status) inc = inc.filter(i => i.status === filter.status);
        if (filter?.agent) inc = inc.filter(i => i.agent === filter.agent);
        if (filter?.type) inc = inc.filter(i => i.type === filter.type);
        return inc;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GESTION DES ALERTES
    // ══════════════════════════════════════════════════════════════════════════
    #createAlert(level, message, risk, recommendation, source, affectedAgents, type = 'GENERIC') {
        this.metrics.alertsGenerated++;
        return {
            id: `alert_${randomUUID().slice(0, 8)}`,
            level,
            color: ALERT_COLORS[level],
            priority: ALERT_PRIORITY[level] || 0,
            message,
            risk,
            recommendation,
            source,
            affectedAgents,
            type,
            resolved: false,
            resolvedAt: null,
            resolvedBy: null,
            timestamp: Date.now(),
            iso: new Date().toISOString(),
        };
    }

    #pushAlerts(alerts) {
        if (alerts.length === 0) return;

        // Dédupliquer par message + source (fenêtre 30s)
        const now = Date.now();
        const deduped = alerts.filter(newAlert =>
            !this.#alerts.some(existing =>
                existing.message === newAlert.message &&
                existing.source === newAlert.source &&
                now - existing.timestamp < 30_000
            )
        );

        this.#alerts.unshift(...deduped);

        // Tri par priorité
        this.#alerts.sort((a, b) => b.priority - a.priority);

        // Limite
        if (this.#alerts.length > this.#config.maxAlerts) {
            this.#alerts = this.#alerts.slice(0, this.#config.maxAlerts);
        }

        // Nettoyage TTL
        const cutoff = now - this.#config.alertTTL;
        this.#alerts = this.#alerts.filter(a => a.timestamp > cutoff || !a.resolved);

        this.emit('thirdEye:alerts', { count: deduped.length, total: this.#alerts.length });
    }

    resolveAlert(id, resolvedBy = 'system') {
        const alert = this.#alerts.find(a => a.id === id);
        if (!alert) return { ok: false };
        alert.resolved = true;
        alert.resolvedAt = Date.now();
        alert.resolvedBy = resolvedBy;
        this.metrics.alertsResolved++;
        this.emit('thirdEye:alertResolved', { id, resolvedBy });
        return { ok: true, id };
    }

    resolveAllByLevel(level, resolvedBy = 'system') {
        let count = 0;
        for (const alert of this.#alerts) {
            if (alert.level === level && !alert.resolved) {
                alert.resolved = true;
                alert.resolvedAt = Date.now();
                alert.resolvedBy = resolvedBy;
                count++;
            }
        }
        this.metrics.alertsResolved += count;
        return { ok: true, count };
    }

    getAlerts(level = null, includeResolved = false, limit = 50) {
        let alerts = this.#alerts.filter(a =>
            (!level || a.level === level) &&
            (includeResolved || !a.resolved)
        );
        return alerts.slice(0, limit);
    }

    getAlertsByType(type) {
        return this.#alerts.filter(a => a.type === type && !a.resolved);
    }

    getAlertsByAgent(agentName) {
        return this.#alerts.filter(a => a.source === agentName || a.affectedAgents?.includes(agentName));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // APPRENTISSAGE
    // ══════════════════════════════════════════════════════════════════════════
    #learnFromScore(agent, score, success) {
        const key = `${agent}:score`;
        const cur = this.#learningWeights.get(key) || 0.5;
        this.#learningWeights.set(key, cur * (1 - this.#config.learningRate) + (score / 100) * this.#config.learningRate);
        this.metrics.learningIterations++;
    }

    #recordPattern(risks, completedCount, pendingCount) {
        this.#patternHistory.push({
            risks: risks.map(r => r.type),
            completedCount,
            pendingCount,
            ts: Date.now(),
        });
        if (this.#patternHistory.length > this.#config.maxPatternHistory) {
            this.#patternHistory.shift();
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SCORE HELPERS
    // ══════════════════════════════════════════════════════════════════════════
    #computeRoleCompliance(agent, result) {
        const roleMap = {
            EtherForge: /module|class|system|interface|create/i,
            EtherLens: /inspect|audit|validate|review/i,
            EtherPrism: /variant|type|category|schema/i,
            EtherWeave: /connect|sync|pipeline|flow/i,
            ForgeFactory: /produc|generat|build|output/i,
            EtherGuard: /securi|permission|auth|protect/i,
            EtherUI: /ui|hud|interface|menu|panel/i,
            EtherSim: /simul|test|scenario|scene/i,
        };
        const pattern = roleMap[agent];
        if (!pattern) return 85;
        const missionStr = String(result.output?.mission || result.taskId || '');
        return pattern.test(missionStr) ? 96 : 72;
    }

    #computeScoreTrend(agent, newScore) {
        const stats = this.#agentScoreStats.get(agent);
        if (!stats || stats.count < 2) return 'STABLE';
        const delta = newScore - stats.mean;
        return delta > 8 ? 'IMPROVING' : delta < -8 ? 'DEGRADING' : 'STABLE';
    }

    // ══════════════════════════════════════════════════════════════════════════
    // AUDIT
    // ══════════════════════════════════════════════════════════════════════════
    #audit(action, source, data = {}) {
        if (!this.#config.enableAudit) return;
        if (this.#auditLog.length >= this.#config.maxAuditEntries) {
            this.#auditLog.splice(0, Math.floor(this.#config.maxAuditEntries * 0.1));
        }
        this.#auditLog.push({
            action, source,
            timestamp: Date.now(),
            iso: new Date().toISOString(),
            ...data,
        });
    }

    getAuditLog(limit = 100, source = null) {
        let log = this.#auditLog;
        if (source) log = log.filter(e => e.source === source);
        return log.slice(-limit);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // RECOMMENDATION
    // ══════════════════════════════════════════════════════════════════════════
    #buildRecommendation(riskScore, warnings, rulesHit) {
        if (riskScore === 0) return 'proceed';
        if (riskScore < 20) return 'proceed_with_monitoring';
        if (riskScore < 40) return 'proceed_with_guard_validation';
        if (riskScore < 65) return 'pause_and_add_missing_agents';
        return 'block_until_plan_corrected';
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STATUS & STATISTIQUES
    // ══════════════════════════════════════════════════════════════════════════
    getStatus() {
        const active = this.#alerts.filter(a => !a.resolved);
        const criticalCnt = active.filter(a => ALERT_PRIORITY[a.level] >= ALERT_PRIORITY.RED).length;
        const openIncidents = this.#incidents.filter(i => i.status === 'OPEN').length;

        const systemLevel = criticalCnt > 0 ? 'RED'
            : active.some(a => a.level === 'ORANGE') ? 'ORANGE'
                : active.some(a => a.level === 'YELLOW') ? 'YELLOW'
                    : active.some(a => a.level === 'BLUE') ? 'BLUE'
                        : 'GREEN';

        return {
            name: `ThirdEye v${VERSION}`,
            version: VERSION,
            systemLevel,
            systemLevelColor: ALERT_COLORS[systemLevel],
            healthy: systemLevel !== 'RED' && systemLevel !== 'BLACK',
            activeAlerts: active.length,
            criticalAlerts: criticalCnt,
            openIncidents,
            observationCount: this.observationCount,
            ruleCount: ASSURANCE_RULES.length,
            topRulesHit: [...this.#ruleHitCount.entries()]
                .sort((a, b) => b[1] - a[1]).slice(0, 5)
                .map(([id, count]) => ({ id, count })),
            agentHealthMap: Object.fromEntries(
                [...this.#agentScoreStats.entries()]
                    .map(([k, v]) => [k, v.toJSON()])
            ),
            learningWeights: Object.fromEntries(this.#learningWeights),
            trend: this.getTrendAnalysis(),
            metrics: this.metrics,
            uptimeMs: Date.now() - this.#startedAt,
            recentAlerts: this.#alerts.slice(0, 10),
        };
    }

    getStats() {
        return {
            ...this.metrics,
            alertsActive: this.#alerts.filter(a => !a.resolved).length,
            alertsTotal: this.#alerts.length,
            incidents: this.#incidents.length,
            auditLogSize: this.#auditLog.length,
            patterns: this.#patternHistory.length,
            uptime: Date.now() - this.#startedAt,
            version: VERSION,
            timestamp: Date.now(),
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BACKWARD COMPAT
    // ══════════════════════════════════════════════════════════════════════════
    // Garder anciens noms de méthodes
    pushAlerts(alerts) { return this.#pushAlerts(alerts); }
    createAlert(level, message, risk, recommendation, source, affectedAgents) {
        return this.#createAlert(level, message, risk, recommendation, source, affectedAgents);
    }
    buildRecommendation(riskScore, warnings) {
        return this.#buildRecommendation(riskScore, warnings, []);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DESTROY
    // ══════════════════════════════════════════════════════════════════════════
    destroy() {
        this.#alerts.length = 0;
        this.#incidents.length = 0;
        this.#auditLog.length = 0;
        this.#agentScoreStats.clear();
        this.#agentConfStats.clear();
        this.#hooks.clear();
        this.#learningWeights.clear();
        this.removeAllListeners();
    }
}

export default ThirdEye;