// ============================================================
// ThirdEyeSystem.ts
// Surveillance rapide : risques, alertes, confiance.
// ============================================================

import type { SystemContext, TroxTSystem } from "./types";
export type ThirdEyeLevel = "GREEN" | "YELLOW" | "ORANGE" | "RED" | "BLACK";
export interface ThirdEyeAlert { id: string; level: ThirdEyeLevel; source: string; message: string; recommendation?: string; createdAt: number; data?: unknown; }

export class ThirdEyeSystem implements TroxTSystem {
  readonly id = "third-eye";
  readonly name = "TroxT Third Eye System";
  status: TroxTSystem["status"] = "created";
  private context!: SystemContext;
  private alerts: ThirdEyeAlert[] = [];
  initialize(context: SystemContext): void { this.context = context; }
  alert(level: ThirdEyeLevel, source: string, message: string, data?: unknown, recommendation?: string): ThirdEyeAlert { const alert: ThirdEyeAlert = { id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, level, source, message, recommendation, createdAt: Date.now(), data }; this.alerts.unshift(alert); if (this.alerts.length > 500) this.alerts.pop(); this.context.emit("thirdeye:alert", alert); return { ...alert }; }
  assessPlacement(payload: { playerId: string; propertyId?: string; objectType: string }): ThirdEyeLevel { if (!payload.propertyId) { this.alert("YELLOW", "BuildSystem", "Objet placé hors propriété.", payload, "Valider si l'objet est décoratif public ou abusif."); return "YELLOW"; } return "GREEN"; }
  getAlerts(limit = 50): ThirdEyeAlert[] { return this.alerts.slice(0, limit).map(a => ({ ...a })); }
  snapshot() { return { alerts: this.getAlerts(200) }; }
  restore(snapshot: { alerts?: ThirdEyeAlert[] }): void { this.alerts = [...(snapshot.alerts ?? [])]; }
}
