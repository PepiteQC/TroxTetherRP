// ══════════════════════════════════════════════════════════════════════════════
// Ether-Guard — Agent de sécurité, permissions et anti-abus
// Protège l'intégrité du monde EtherWorld RP
// ══════════════════════════════════════════════════════════════════════════════

import type { TroxtTaskPacket, AgentResult, AgentTelemetry } from '../types.js';

export type PlayerRole = 'admin' | 'staff' | 'resident' | 'visitor' | 'banned';

interface PermissionCheck {
  allowed: boolean;
  reason: string;
  requiredRole?: PlayerRole;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
}

const PERMISSION_MAP: Record<string, PlayerRole[]> = {
  'property:buy': ['resident', 'staff', 'admin'],
  'property:lock': ['resident', 'staff', 'admin'],
  'property:unlock': ['staff', 'admin'],
  'door:open': ['resident', 'staff', 'admin'],
  'door:lock': ['staff', 'admin'],
  'furniture:place': ['resident', 'staff', 'admin'],
  'economy:transfer': ['resident', 'staff', 'admin'],
  'npc:spawn': ['staff', 'admin'],
  'system:saveWorld': ['admin'],
  'system:loadWorld': ['admin'],
};

export class EtherGuard {
  readonly name = 'EtherGuard' as const;

  private currentTask: string | null = null;
  private tasksCompleted = 0;
  private readonly abuseLog: { playerId: string; action: string; timestamp: number }[] = [];
  private readonly keyRegistry = new Map<string, Set<string>>();

  async process(packet: TroxtTaskPacket): Promise<AgentResult> {
    this.currentTask = packet.id;
    const start = Date.now();

    const audit = this.fullSecurityAudit(packet);
    this.tasksCompleted++;
    this.currentTask = null;

    return {
      taskId: packet.id,
      agent: this.name,
      status: audit.approved ? 'success' : 'partial',
      output: audit,
      confidence: audit.approved ? 0.93 : 0.72,
      warnings: audit.violations,
      completedAt: Date.now(),
      durationMs: Date.now() - start,
    };
  }

  private fullSecurityAudit(packet: TroxtTaskPacket) {
    const { mission, input } = packet;
    const violations: string[] = [];
    const passed: string[] = [];

    const roleCheck = this.checkPermissions(input);
    if (!roleCheck.allowed) violations.push(roleCheck.reason);
    else passed.push('Permissions validées');

    const dupCheck = this.checkDuplication(input);
    if (dupCheck.found) violations.push(dupCheck.message);
    else passed.push('Pas de duplication détectée');

    const abuseCheck = this.detectAbuse(input);
    if (abuseCheck.suspicious) violations.push(abuseCheck.reason);
    else passed.push('Comportement normal');

    const keyCheck = this.validateKeyIntegrity(input);
    if (!keyCheck.valid) violations.push(keyCheck.reason);
    else passed.push('Intégrité des clés OK');

    const purchaseCheck = this.validatePurchase(input);
    if (!purchaseCheck.valid) violations.push(purchaseCheck.reason);
    else passed.push('Achat valide');

    return {
      agent: 'EtherGuard',
      mission,
      approved: violations.length === 0,
      violations,
      passed,
      riskScore: Math.min(100, violations.length * 25),
      recommendation: violations.length === 0
        ? 'Approuvé — aucun risque détecté'
        : `${violations.length} violation(s) — correction requise avant déploiement`,
    };
  }

  checkPermission(action: string, playerRole: PlayerRole): PermissionCheck {
    const allowed = PERMISSION_MAP[action];
    if (!allowed) {
      return { allowed: true, reason: 'Action non réglementée', riskLevel: 'low' };
    }
    if (allowed.includes(playerRole)) {
      return { allowed: true, reason: `Rôle "${playerRole}" autorisé`, riskLevel: 'safe' };
    }
    const minRole = allowed[0];
    return {
      allowed: false,
      reason: `Rôle insuffisant: "${playerRole}" — minimum requis: "${minRole}"`,
      requiredRole: minRole,
      riskLevel: 'high',
    };
  }

  private checkPermissions(input: Record<string, unknown>): { allowed: boolean; reason: string } {
    const action = String(input.action ?? '');
    const role = String(input.playerRole ?? 'visitor') as PlayerRole;
    if (!action) return { allowed: true, reason: 'Pas d\'action à vérifier' };
    const check = this.checkPermission(action, role);
    return { allowed: check.allowed, reason: check.reason };
  }

  private checkDuplication(input: Record<string, unknown>): { found: boolean; message: string } {
    const keyId = String(input.keyId ?? '');
    const playerId = String(input.playerId ?? '');
    if (!keyId || !playerId) return { found: false, message: '' };

    const owners = this.keyRegistry.get(keyId);
    if (owners && owners.has(playerId)) {
      return { found: true, message: `Duplication détectée: joueur "${playerId}" possède déjà la clé "${keyId}"` };
    }
    return { found: false, message: '' };
  }

  registerKey(keyId: string, playerId: string): void {
    if (!this.keyRegistry.has(keyId)) {
      this.keyRegistry.set(keyId, new Set());
    }
    this.keyRegistry.get(keyId)!.add(playerId);
  }

  revokeKey(keyId: string, playerId: string): void {
    this.keyRegistry.get(keyId)?.delete(playerId);
  }

  private detectAbuse(input: Record<string, unknown>): { suspicious: boolean; reason: string } {
    const playerId = String(input.playerId ?? '');
    const now = Date.now();
    const recent = this.abuseLog.filter(
      l => l.playerId === playerId && now - l.timestamp < 10_000
    );
    if (recent.length > 5) {
      return { suspicious: true, reason: `Comportement suspect: ${recent.length} actions en 10s pour "${playerId}"` };
    }
    if (playerId) {
      this.abuseLog.push({ playerId, action: String(input.action ?? ''), timestamp: now });
      if (this.abuseLog.length > 1000) this.abuseLog.splice(0, 500);
    }
    return { suspicious: false, reason: '' };
  }

  private validateKeyIntegrity(input: Record<string, unknown>): { valid: boolean; reason: string } {
    const keyId = String(input.keyId ?? '');
    if (!keyId) return { valid: true, reason: 'Pas de clé dans cette opération' };
    if (!/^key_[a-z0-9_]+_\d+$/.test(keyId)) {
      return { valid: false, reason: `Format de clé invalide: "${keyId}" — attendu: key_{type}_{index}` };
    }
    return { valid: true, reason: 'Format de clé valide' };
  }

  private validatePurchase(input: Record<string, unknown>): { valid: boolean; reason: string } {
    const price = Number(input.price ?? 0);
    const balance = Number(input.playerBalance ?? Infinity);
    if (price > 0 && balance < price) {
      return { valid: false, reason: `Fonds insuffisants: solde ${balance} < prix ${price}` };
    }
    if (price < 0) {
      return { valid: false, reason: `Prix invalide: ${price} — exploitation possible` };
    }
    return { valid: true, reason: 'Achat financièrement valide' };
  }

  getTelemetry(): AgentTelemetry {
    return {
      agent: this.name,
      taskId: this.currentTask ?? 'idle',
      status: this.currentTask ? 'working' : 'pending',
      confidence: 0.93,
      riskLevel: 'low',
      estimatedCompletion: 'short',
      dependencies: [],
      timestamp: Date.now(),
    };
  }

  getStats() {
    return {
      tasksCompleted: this.tasksCompleted,
      currentTask: this.currentTask,
      keysRegistered: this.keyRegistry.size,
      abuseLogsCount: this.abuseLog.length,
    };
  }
}
