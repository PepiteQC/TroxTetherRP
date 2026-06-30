// ══════════════════════════════════════════════════════════════════════════════
// Ether-Forge — Agent de construction technique
// Transforme les idées en structure concrète : modules, systèmes, code
// ══════════════════════════════════════════════════════════════════════════════

import type { TroxtTaskPacket, AgentResult, AgentTelemetry } from '../types.js';
import { generateTaskId } from '../rules/NamingRules.js';

export class EtherForge {
  readonly name = 'EtherForge' as const;

  private currentTask: string | null = null;
  private tasksCompleted = 0;

  async process(packet: TroxtTaskPacket): Promise<AgentResult> {
    this.currentTask = packet.id;
    const start = Date.now();

    const result = this.buildTechnicalSpec(packet);
    this.tasksCompleted++;
    this.currentTask = null;

    return {
      taskId: packet.id,
      agent: this.name,
      status: result.warnings.length > 0 ? 'partial' : 'success',
      output: result.output,
      confidence: result.confidence,
      warnings: result.warnings,
      completedAt: Date.now(),
      durationMs: Date.now() - start,
    };
  }

  private buildTechnicalSpec(packet: TroxtTaskPacket) {
    const { mission, input, rules } = packet;
    const warnings: string[] = [];
    let confidence = 0.88;

    const output: Record<string, unknown> = {
      agent: 'EtherForge',
      mission,
      technicalSpec: this.generateSpec(mission, input),
      files: this.suggestFiles(mission),
      functions: this.suggestFunctions(mission),
      events: this.suggestEvents(mission),
      dependencies: this.detectDependencies(mission),
      integrationSteps: this.generateIntegrationSteps(mission),
      restrictionsApplied: rules,
    };

    if (!this.mentionsSave(mission)) {
      warnings.push('SaveSystem non mentionné dans la mission — connexion requise via Ether-Weave');
      confidence -= 0.05;
    }
    if (!this.mentionsSecurity(mission)) {
      warnings.push('Validation de sécurité non définie — Ether-Guard recommandé');
      confidence -= 0.03;
    }

    return { output, warnings, confidence };
  }

  private generateSpec(mission: string, input: Record<string, unknown>) {
    return {
      name: this.extractSystemName(mission),
      purpose: mission,
      inputSchema: input,
      architecture: 'TypeScript module, ESM, strict mode',
      pattern: 'Service class with dependency injection',
      testable: true,
    };
  }

  private suggestFiles(mission: string): string[] {
    const name = this.extractSystemName(mission);
    return [
      `${name}.ts`,
      `${name}.types.ts`,
      `${name}.events.ts`,
      `tests/${name}.test.ts`,
    ];
  }

  private suggestFunctions(mission: string): string[] {
    const name = this.extractSystemName(mission);
    return [
      `initialize${name}()`,
      `validate${name}(input)`,
      `process${name}(payload)`,
      `emit${name}Event(event, data)`,
    ];
  }

  private suggestEvents(mission: string): string[] {
    const lower = mission.toLowerCase();
    const events: string[] = [];
    if (lower.includes('propriét') || lower.includes('property')) {
      events.push('property:buy', 'property:sell', 'property:lock');
    }
    if (lower.includes('inventaire') || lower.includes('inventory')) {
      events.push('inventory:addItem', 'inventory:removeItem', 'inventory:useItem');
    }
    if (lower.includes('porte') || lower.includes('door')) {
      events.push('door:open', 'door:close', 'door:lock');
    }
    if (lower.includes('meuble') || lower.includes('furniture')) {
      events.push('furniture:place', 'furniture:save');
    }
    return events.length > 0 ? events : [`${this.extractSystemName(mission).toLowerCase()}:created`];
  }

  private detectDependencies(mission: string): string[] {
    const lower = mission.toLowerCase();
    const deps: string[] = [];
    if (lower.includes('clé') || lower.includes('key')) deps.push('KeySystem');
    if (lower.includes('inventaire') || lower.includes('inventory')) deps.push('InventorySystem');
    if (lower.includes('sauvegarde') || lower.includes('save')) deps.push('SaveSystem');
    if (lower.includes('achat') || lower.includes('purchase')) deps.push('EconomySystem');
    if (lower.includes('porte') || lower.includes('door')) deps.push('DoorSystem');
    return deps;
  }

  private generateIntegrationSteps(mission: string): string[] {
    const name = this.extractSystemName(mission);
    return [
      `1. Créer le fichier ${name}.ts`,
      `2. Définir les types dans ${name}.types.ts`,
      `3. Implémenter les fonctions principales`,
      `4. Enregistrer les événements dans le bus`,
      `5. Connecter via Ether-Weave`,
      `6. Valider avec Ether-Guard`,
      `7. Tester avec Ether-Sim`,
    ];
  }

  private extractSystemName(mission: string): string {
    const known = ['PropertySystem', 'PurchaseSystem', 'KeySystem', 'DoorSystem',
      'InventorySystem', 'FurnitureSystem', 'SaveSystem', 'EconomySystem', 'NPCSystem'];
    for (const n of known) {
      if (mission.includes(n)) return n;
    }
    const words = mission.split(' ');
    return words.length > 1 ? `${words[0]}System` : 'UnknownSystem';
  }

  private mentionsSave(mission: string): boolean {
    return /save|sauvegarder|persist/i.test(mission);
  }

  private mentionsSecurity(mission: string): boolean {
    return /sécurit|guard|permission|validation|protect/i.test(mission);
  }

  getTelemetry(): AgentTelemetry {
    return {
      agent: this.name,
      taskId: this.currentTask ?? 'idle',
      status: this.currentTask ? 'working' : 'pending',
      confidence: 0.88,
      riskLevel: 'low',
      estimatedCompletion: 'short',
      dependencies: ['EtherWeave', 'EtherGuard'],
      timestamp: Date.now(),
    };
  }

  getStats() {
    return { tasksCompleted: this.tasksCompleted, currentTask: this.currentTask };
  }
}
