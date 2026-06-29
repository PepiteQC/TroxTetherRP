// ══════════════════════════════════════════════════════════════════════════════
// TroxT Third Eye — Couche d'observation, prédiction et assurance stratégique
// Voit tout · Comprend vite · Prédit les risques · Protège la cohérence
// ══════════════════════════════════════════════════════════════════════════════
const ALERT_COLORS = {
    GREEN: '#22c55e', BLUE: '#60a5fa', YELLOW: '#fbbf24',
    ORANGE: '#f97316', RED: '#ef4444', BLACK: '#18181b',
};
export class ThirdEye {
    scoreHistory;
    alerts = [];
    MAX_ALERTS = 200;
    startedAt = Date.now();
    observationCount = 0;
    constructor(scoreHistory) {
        this.scoreHistory = scoreHistory;
    }
    // ── 1. Observation globale ────────────────────────────────────────────────
    observe(telemetry) {
        this.observationCount++;
        const newAlerts = [];
        for (const [agentName, t] of Object.entries(telemetry)) {
            const agent = agentName;
            if (t.status === 'blocked') {
                newAlerts.push(this.createAlert('BLACK', `${agent} est BLOQUÉ — production stoppée`, 'Données corrompues si production forcée', `Résoudre les dépendances de ${agent} avant de continuer`, agent, [agent]));
            }
            if (t.riskLevel === 'critical') {
                newAlerts.push(this.createAlert('RED', `${agent} signale un risque critique`, 'Instabilité système possible', `Inspection immédiate de ${agent} par Ether-Lens`, agent, [agent]));
            }
            if (t.confidence < 0.65 && t.status === 'working') {
                newAlerts.push(this.createAlert('ORANGE', `${agent} travaille avec une confiance faible (${Math.round(t.confidence * 100)}%)`, 'Résultat potentiellement incomplet ou incorrect', `Demander un audit Ether-Lens sur la tâche "${t.taskId}"`, agent, [agent]));
            }
        }
        this.pushAlerts(newAlerts);
        return newAlerts;
    }
    // ── 2. Assurance sur les choix ────────────────────────────────────────────
    assureDecision(packets) {
        const warnings = [];
        let riskScore = 0;
        const agents = packets.map(p => p.targetAgent);
        const hasSave = packets.some(p => /save|sauvegarder/i.test(p.mission));
        const hasGuard = agents.includes('EtherGuard');
        const hasWeave = agents.includes('EtherWeave');
        const hasFactory = agents.includes('ForgeFactory');
        const hasForge = agents.includes('EtherForge');
        if (hasFactory && !hasForge) {
            warnings.push('ForgeFactory lance une production sans EtherForge — risque de logique incohérente');
            riskScore += 25;
        }
        if (!hasSave && (packets.some(p => /property|inventory|furniture/i.test(p.mission)))) {
            warnings.push('SaveSystem non inclus — les données ne seront pas persistées');
            riskScore += 20;
        }
        if (!hasGuard && (packets.some(p => /purchase|buy|key/i.test(p.mission)))) {
            warnings.push('Ether-Guard absent — sécurité et permissions non vérifiées');
            riskScore += 30;
        }
        if (!hasWeave && packets.length > 2) {
            warnings.push('Ether-Weave absent — modules peuvent rester isolés');
            riskScore += 15;
        }
        const confidence = Math.max(0.4, 1 - riskScore / 100);
        const level = riskScore === 0 ? 'low' : riskScore < 30 ? 'medium' : riskScore < 60 ? 'high' : 'critical';
        return {
            decision: riskScore === 0 ? 'approved' : riskScore < 50 ? 'approved_with_warnings' : 'blocked',
            confidence: Math.round(confidence * 100) / 100,
            riskLevel: level,
            warnings,
            recommendedAction: this.buildRecommendation(riskScore, warnings),
        };
    }
    // ── 3. Prédiction des conséquences ────────────────────────────────────────
    predict(completedResults, pendingPackets) {
        const predictions = [];
        const completedSystems = completedResults
            .filter(r => r.status === 'success')
            .map(r => String(r.output.mission ?? ''));
        for (const packet of pendingPackets) {
            const deps = packet.dependencies;
            const missingDeps = deps.filter(dep => !completedResults.some(r => r.taskId === dep || String(r.output.mission ?? '').includes(dep)));
            if (missingDeps.length > 0) {
                predictions.push(`⚠️ "${packet.mission}" attend ${missingDeps.join(', ')} — blocage probable`);
            }
        }
        const hasFactory = pendingPackets.some(p => p.targetAgent === 'ForgeFactory');
        const hasNamingValidation = completedResults.some(r => String(r.output.namingStandard ?? '').length > 0);
        if (hasFactory && !hasNamingValidation) {
            predictions.push('⚠️ ForgeFactory va produire sans validation NamingRules — doublons possibles');
        }
        if (predictions.length === 0) {
            predictions.push('✅ Aucun blocage prédit — exécution peut continuer');
        }
        return predictions;
    }
    // ── 4. Score d'un résultat agent ──────────────────────────────────────────
    scoreResult(result) {
        const base = result.status === 'success' ? 85 : result.status === 'partial' ? 65 : 30;
        const confidenceBonus = Math.round(result.confidence * 15);
        const warningPenalty = result.warnings.length * 5;
        const durationPenalty = result.durationMs > 5000 ? 10 : result.durationMs > 2000 ? 5 : 0;
        const global = Math.max(0, Math.min(100, base + confidenceBonus - warningPenalty - durationPenalty));
        const score = {
            agent: result.agent,
            task: String(result.output.mission ?? result.taskId),
            scores: {
                technicalQuality: Math.min(100, base + confidenceBonus),
                security: result.agent === 'EtherGuard' ? 95 : 75,
                compatibility: 88,
                clarity: result.warnings.length === 0 ? 90 : 70,
                roleCompliance: 94,
                performance: Math.max(40, 100 - durationPenalty * 2),
                reusability: 80,
            },
            globalScore: global,
            status: global >= 80 ? 'accepted'
                : global >= 60 ? 'accepted_with_warnings'
                    : global >= 40 ? 'pending_review'
                        : 'rejected',
            timestamp: Date.now(),
        };
        this.scoreHistory.record(score);
        return score;
    }
    // ── 5. Réactions rapides ──────────────────────────────────────────────────
    react(telemetry) {
        const reactions = [];
        for (const [agentName, t] of Object.entries(telemetry)) {
            const agent = agentName;
            if (t.status === 'blocked') {
                reactions.push({ agent, signal: 'BLACK', reason: 'Agent bloqué — production stoppée' });
            }
            else if (t.riskLevel === 'critical') {
                reactions.push({ agent, signal: 'RED', reason: 'Risque critique détecté' });
            }
            else if (t.confidence < 0.7) {
                reactions.push({ agent, signal: 'ORANGE', reason: `Confiance faible: ${Math.round(t.confidence * 100)}%` });
            }
            else if (t.status === 'working') {
                reactions.push({ agent, signal: 'GREEN', reason: 'En cours — normal' });
            }
        }
        return reactions;
    }
    // ── 6. Détection de conflits ──────────────────────────────────────────────
    detectConventionConflict(ids) {
        const alerts = [];
        const seen = new Map();
        for (const id of ids) {
            const prefix = id.replace(/[_-]\d+$/, '');
            if (seen.has(prefix) && seen.get(prefix) !== id) {
                const alert = this.createAlert('ORANGE', `Convention incompatible: "${seen.get(prefix)}" vs "${id}"`, 'Doublons et incompatibilité de sauvegarde', 'Pause production. Validation NamingRules requise.', 'ThirdEye', []);
                alerts.push(alert);
            }
            seen.set(prefix, id);
        }
        this.pushAlerts(alerts);
        return alerts;
    }
    // ── Helpers ───────────────────────────────────────────────────────────────
    createAlert(level, message, risk, recommendation, source, affectedAgents) {
        return {
            id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            level,
            message,
            risk,
            recommendation,
            source,
            affectedAgents,
            timestamp: Date.now(),
            resolved: false,
        };
    }
    pushAlerts(alerts) {
        this.alerts.unshift(...alerts);
        if (this.alerts.length > this.MAX_ALERTS) {
            this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
        }
    }
    resolveAlert(id) {
        const alert = this.alerts.find(a => a.id === id);
        if (alert)
            alert.resolved = true;
    }
    getAlerts(level, includeResolved = false) {
        return this.alerts.filter(a => (!level || a.level === level) &&
            (includeResolved || !a.resolved));
    }
    getStatus() {
        const active = this.alerts.filter(a => !a.resolved);
        const criticalCount = active.filter(a => a.level === 'RED' || a.level === 'BLACK').length;
        const systemLevel = criticalCount > 0 ? 'RED'
            : active.some(a => a.level === 'ORANGE') ? 'ORANGE'
                : active.some(a => a.level === 'YELLOW') ? 'YELLOW'
                    : active.some(a => a.level === 'BLUE') ? 'BLUE'
                        : 'GREEN';
        return {
            systemLevel,
            systemLevelColor: ALERT_COLORS[systemLevel],
            activeAlerts: active.length,
            criticalAlerts: criticalCount,
            observationCount: this.observationCount,
            uptimeMs: Date.now() - this.startedAt,
            recentAlerts: this.alerts.slice(0, 10),
        };
    }
    buildRecommendation(riskScore, warnings) {
        if (riskScore === 0)
            return 'proceed';
        if (riskScore < 30)
            return 'proceed_with_guard_validation';
        if (riskScore < 60)
            return 'pause_and_add_missing_agents';
        return 'block_until_plan_corrected';
    }
}
