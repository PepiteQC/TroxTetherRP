// ══════════════════════════════════════════════════════════════════════════════
// Ether-Weave — Agent de connexion inter-modules
// Relie les systèmes ensemble — aucun module ne doit vivre isolé
// ══════════════════════════════════════════════════════════════════════════════

import type { TroxtTaskPacket, AgentResult, AgentTelemetry } from '../types.js';
import { SYSTEM_EVENTS } from '../rules/NamingRules.js';

interface ConnectionPlan {
  from: string;
  to: string;
  event: string;
  trigger: string;
  payload: string[];
  blocking: boolean;
}

export class EtherWeave {
  readonly name = 'EtherWeave' as const;

  private currentTask: string | null = null;
  private tasksCompleted = 0;

  // Carte des connexions connues du système EtherWorld RP
  private readonly KNOWN_CONNECTIONS: ConnectionPlan[] = [
    {
      from: 'PurchaseSystem',
      to: 'InventorySystem',
      event: SYSTEM_EVENTS.INVENTORY_ADD_KEY,
      trigger: SYSTEM_EVENTS.PROPERTY_BUY,
      payload: ['keyId', 'propertyId', 'playerId'],
      blocking: true,
    },
    {
      from: 'InventorySystem',
      to: 'DoorSystem',
      event: SYSTEM_EVENTS.DOOR_OPEN,
      trigger: SYSTEM_EVENTS.INVENTORY_USE_ITEM,
      payload: ['keyId', 'doorId', 'playerId'],
      blocking: false,
    },
    {
      from: 'PropertySystem',
      to: 'SaveSystem',
      event: SYSTEM_EVENTS.SAVE_WORLD,
      trigger: SYSTEM_EVENTS.PROPERTY_BUY,
      payload: ['propertyId', 'ownerId', 'timestamp'],
      blocking: false,
    },
    {
      from: 'FurnitureSystem',
      to: 'SaveSystem',
      event: SYSTEM_EVENTS.FURNITURE_SAVE,
      trigger: SYSTEM_EVENTS.FURNITURE_PLACE,
      payload: ['furnitureId', 'position', 'propertyId'],
      blocking: false,
    },
    {
      from: 'EconomySystem',
      to: 'PurchaseSystem',
      event: SYSTEM_EVENTS.ECONOMY_PURCHASE,
      trigger: SYSTEM_EVENTS.PROPERTY_BUY,
      payload: ['playerId', 'amount', 'currency'],
      blocking: true,
    },
  ];

  async process(packet: TroxtTaskPacket): Promise<AgentResult> {
    this.currentTask = packet.id;
    const start = Date.now();

    const connections = this.planConnections(packet);
    this.tasksCompleted++;
    this.currentTask = null;

    return {
      taskId: packet.id,
      agent: this.name,
      status: 'success',
      output: connections,
      confidence: 0.87,
      warnings: connections.missingConnections.length > 0
        ? connections.missingConnections.map((m: string) => `Connexion manquante: ${m}`)
        : [],
      completedAt: Date.now(),
      durationMs: Date.now() - start,
    };
  }

  private planConnections(packet: TroxtTaskPacket) {
    const { mission, input } = packet;
    const systems = this.detectSystems(mission, input);
    const relevantConnections = this.findRelevantConnections(systems);
    const missingConnections = this.detectMissingConnections(systems, relevantConnections);
    const executionOrder = this.calculateExecutionOrder(systems);
    const dataFlow = this.buildDataFlow(relevantConnections);

    return {
      agent: 'EtherWeave',
      mission,
      detectedSystems: systems,
      connectionPlan: relevantConnections,
      missingConnections,
      executionOrder,
      dataFlow,
      synchronizationPoints: this.findSyncPoints(relevantConnections),
      totalEvents: relevantConnections.length,
    };
  }

  private detectSystems(mission: string, input: Record<string, unknown>): string[] {
    const systems: string[] = [];
    const text = mission + ' ' + JSON.stringify(input);
    const patterns: [RegExp, string][] = [
      [/property|propriété/i, 'PropertySystem'],
      [/purchase|achat/i, 'PurchaseSystem'],
      [/key|clé/i, 'KeySystem'],
      [/inventory|inventaire/i, 'InventorySystem'],
      [/door|porte/i, 'DoorSystem'],
      [/furniture|meuble/i, 'FurnitureSystem'],
      [/save|sauvegarde/i, 'SaveSystem'],
      [/economy|économie/i, 'EconomySystem'],
      [/npc|entit/i, 'NPCSystem'],
    ];
    for (const [pattern, name] of patterns) {
      if (pattern.test(text)) systems.push(name);
    }
    return [...new Set(systems)];
  }

  private findRelevantConnections(systems: string[]): ConnectionPlan[] {
    return this.KNOWN_CONNECTIONS.filter(
      c => systems.includes(c.from) || systems.includes(c.to)
    );
  }

  private detectMissingConnections(systems: string[], connections: ConnectionPlan[]): string[] {
    const missing: string[] = [];
    const connectedSystems = new Set([
      ...connections.map(c => c.from),
      ...connections.map(c => c.to),
    ]);
    for (const s of systems) {
      if (!connectedSystems.has(s) && systems.length > 1) {
        missing.push(`${s} n'est connecté à aucun autre système détecté`);
      }
    }
    if (systems.includes('PurchaseSystem') && !systems.includes('SaveSystem')) {
      missing.push('SaveSystem absent — les achats ne seront pas persistés');
    }
    if (systems.includes('KeySystem') && !systems.includes('DoorSystem')) {
      missing.push('DoorSystem absent — les clés ne pourront pas ouvrir de portes');
    }
    return missing;
  }

  private calculateExecutionOrder(systems: string[]): string[] {
    const priority = ['EconomySystem', 'PropertySystem', 'OwnershipSystem', 'KeySystem',
      'InventorySystem', 'DoorSystem', 'SaveSystem', 'FurnitureSystem',
      'NPCSystem', 'UISystem'];
    return priority.filter(p => systems.includes(p));
  }

  private buildDataFlow(connections: ConnectionPlan[]): Record<string, unknown>[] {
    return connections.map(c => ({
      step: `${c.from} → ${c.to}`,
      trigger: c.trigger,
      emits: c.event,
      data: c.payload,
      blocking: c.blocking ? '⚠️ BLOQUANT' : '✓ Asynchrone',
    }));
  }

  private findSyncPoints(connections: ConnectionPlan[]): string[] {
    return connections
      .filter(c => c.blocking)
      .map(c => `SYNC: ${c.from} doit compléter avant ${c.to}`);
  }

  getTelemetry(): AgentTelemetry {
    return {
      agent: this.name,
      taskId: this.currentTask ?? 'idle',
      status: this.currentTask ? 'working' : 'pending',
      confidence: 0.87,
      riskLevel: 'low',
      estimatedCompletion: 'short',
      dependencies: [],
      timestamp: Date.now(),
    };
  }

  getStats() {
    return { tasksCompleted: this.tasksCompleted, currentTask: this.currentTask };
  }
}
