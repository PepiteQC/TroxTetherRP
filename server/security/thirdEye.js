/**
 * ThirdEye v4.0.0 — Surveillance IA temps réel
 * Monitore TOUT — bloque avant exécution si risque RED
 * Port-Éther RP — Fichier: server/brain/ThirdEye.ts
 */

import { EventEmitter } from 'events';
import type { RiskLevel } from './TroxTBrain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThreatSignal {
  type: ThreatType;
  source: string;       // playerId | 'system' | 'admin'
  details: string;
  severity: 1 | 2 | 3 | 4 | 5;  // 1=mineur, 5=critique
  timestamp: number;
}

export type ThreatType =
  | 'rate_limit'         // Trop de requêtes
  | 'invalid_payload'    // Données malformées
  | 'permission_bypass'  // Tentative d'élévation
  | 'economy_abuse'      // Duplication d'argent
  | 'position_hack'      // Téléportation illégale
  | 'item_dupe'          // Duplication d'items
  | 'chat_spam'          // Spam chat
  | 'admin_impersonation'// Usurpation admin
  | 'bulk_operation'     // Opération de masse non autorisée
  | 'suspicious_pattern';// Pattern suspect détecté

export interface PlayerTrustScore {
  playerId: string;
  score: number;         // 0-100 (100 = confiance totale)
  violations: number;
  lastViolation?: number;
  banned: boolean;
  tempBanExpiry?: number;
}

// ─── ThirdEye ─────────────────────────────────────────────────────────────────

export class ThirdEye extends EventEmitter {
  private static instance: ThirdEye;

  private currentRisk: RiskLevel = 'GREEN';
  private threatLog: ThreatSignal[] = [];
  private trustScores = new Map<string, PlayerTrustScore>();
  private rateLimitMap = new Map<string, number[]>(); // playerId → timestamps

  // Seuils par niveau
  private readonly THRESHOLDS = {
    GREEN:  { maxThreats: 5,  windowMs: 60_000 },
    YELLOW: { maxThreats: 15, windowMs: 60_000 },
    ORANGE: { maxThreats: 30, windowMs: 60_000 },
    RED:    { maxThreats: 50, windowMs: 60_000 },
  };

  static getInstance(): ThirdEye {
    if (!ThirdEye.instance) ThirdEye.instance = new ThirdEye();
    return ThirdEye.instance;
  }

  // ─── Analyse d'une action avant exécution ─────────────────────────────────

  analyze(action: string, source: string, payload?: unknown): {
    allowed: boolean;
    risk: RiskLevel;
    reason?: string;
  } {
    const trust = this.getTrust(source);

    // Joueur banni
    if (trust.banned) {
      if (trust.tempBanExpiry && Date.now() > trust.tempBanExpiry) {
        trust.banned = false; // Tempban expiré
      } else {
        return { allowed: false, risk: 'RED', reason: 'Joueur banni' };
      }
    }

    // Rate limiting
    if (!this.checkRateLimit(source)) {
      this.report({ type: 'rate_limit', source, details: action, severity: 2, timestamp: Date.now() });
      return { allowed: false, risk: 'YELLOW', reason: 'Rate limit dépassé' };
    }

    // Score de confiance trop bas
    if (trust.score < 20) {
      return { allowed: false, risk: 'ORANGE', reason: `Score confiance trop bas: ${trust.score}` };
    }

    // Actions sensibles nécessitent plus de confiance
    const sensitiveActions = ['admin_', 'delete_', 'ban_', 'reset_', 'bulk_'];
    const isSensitive = sensitiveActions.some(a => action.startsWith(a));
    if (isSensitive && trust.score < 80) {
      return { allowed: false, risk: 'ORANGE', reason: 'Action sensible — confiance insuffisante' };
    }

    return { allowed: true, risk: this.currentRisk };
  }

  // ─── Signalement d'une menace ─────────────────────────────────────────────

  report(threat: ThreatSignal): void {
    this.threatLog.push(threat);
    if (this.threatLog.length > 500) this.threatLog.shift();

    // Mise à jour du score de confiance
    const trust = this.getTrust(threat.source);
    trust.violations++;
    trust.lastViolation = threat.timestamp;
    trust.score = Math.max(0, trust.score - threat.severity * 5);
    this.trustScores.set(threat.source, trust);

    // Ban auto si score trop bas
    if (trust.score <= 0 && !trust.banned) {
      trust.banned = true;
      trust.tempBanExpiry = Date.now() + 30 * 60 * 1000; // 30 min
      this.emit('player:banned', { playerId: threat.source, reason: threat.type });
      console.log(`🚫 [THIRD EYE] Ban auto: ${threat.source} — ${threat.type}`);
    }

    // Recalcul du niveau de risque global
    this.recalcRiskLevel();

    this.emit('threat:detected', threat);
    console.log(`👁 [THIRD EYE] ${threat.severity >= 4 ? '🚨' : '⚠️'} ${threat.type} — ${threat.source}`);
  }

  // ─── Rate limiting par joueur ─────────────────────────────────────────────

  private checkRateLimit(source: string, maxPerMin = 60): boolean {
    const now = Date.now();
    const window = 60_000;
    const times = (this.rateLimitMap.get(source) ?? []).filter(t => now - t < window);
    times.push(now);
    this.rateLimitMap.set(source, times);
    return times.length <= maxPerMin;
  }

  // ─── Recalcul du niveau de risque global ─────────────────────────────────

  private recalcRiskLevel(): void {
    const now = Date.now();
    const recentThreats = this.threatLog.filter(t => now - t.timestamp < 60_000);
    const criticalThreats = recentThreats.filter(t => t.severity >= 4).length;
    const totalThreats = recentThreats.length;

    let newRisk: RiskLevel = 'GREEN';
    if (criticalThreats >= 5 || totalThreats >= 50) newRisk = 'RED';
    else if (criticalThreats >= 2 || totalThreats >= 30) newRisk = 'ORANGE';
    else if (criticalThreats >= 1 || totalThreats >= 15) newRisk = 'YELLOW';

    if (newRisk !== this.currentRisk) {
      const prev = this.currentRisk;
      this.currentRisk = newRisk;
      this.emit('risk:changed', { from: prev, to: newRisk });
    }
  }

  // ─── Gestion du trust ─────────────────────────────────────────────────────

  private getTrust(playerId: string): PlayerTrustScore {
    if (!this.trustScores.has(playerId)) {
      this.trustScores.set(playerId, {
        playerId,
        score: 100,
        violations: 0,
        banned: false,
      });
    }
    return this.trustScores.get(playerId)!;
  }

  rehabilitate(playerId: string, amount = 10): void {
    const trust = this.getTrust(playerId);
    trust.score = Math.min(100, trust.score + amount);
    this.trustScores.set(playerId, trust);
  }

  unban(playerId: string): void {
    const trust = this.getTrust(playerId);
    trust.banned = false;
    trust.tempBanExpiry = undefined;
    trust.score = 50; // Reset partiel
    this.trustScores.set(playerId, trust);
  }

  // ─── Accesseurs ────────────────────────────────────────────────────────────

  getRiskLevel()                     { return this.currentRisk; }
  getRecentThreats(n = 20)          { return this.threatLog.slice(-n); }
  getPlayerTrust(id: string)        { return this.getTrust(id); }
  getAllTrustScores()                { return Array.from(this.trustScores.values()); }
  isBanned(id: string)              { return this.getTrust(id).banned; }

  getStats() {
    const now = Date.now();
    return {
      riskLevel: this.currentRisk,
      totalThreats: this.threatLog.length,
      recentThreats: this.threatLog.filter(t => now - t.timestamp < 60_000).length,
      bannedPlayers: [...this.trustScores.values()].filter(p => p.banned).length,
      avgTrustScore: [...this.trustScores.values()].reduce((s, p) => s + p.score, 0) / Math.max(1, this.trustScores.size),
    };
  }
}

export default ThirdEye.getInstance();