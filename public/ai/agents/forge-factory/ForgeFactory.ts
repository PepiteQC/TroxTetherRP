// ══════════════════════════════════════════════════════════════════════════════
// Forge-Factory — Agent de production massive
// BLOQUÉ si NamingRules pas validées par TroxT Brain
// ══════════════════════════════════════════════════════════════════════════════

import type { TroxtTaskPacket, AgentResult, AgentTelemetry } from '../types.js';
import { generatePropertyId, generateVehicleId, generateNpcId, PROPERTY_CATEGORIES, PROPERTY_ZONES, VEHICLE_ROLES } from '../rules/NamingRules.js';

export class ForgeFactory {
  readonly name = 'ForgeFactory' as const;

  private currentTask: string | null = null;
  private tasksCompleted = 0;
  private namingRulesValidated = false;
  private validatedBy: string | null = null;

  validateNamingRules(validatedBy: string): void {
    this.namingRulesValidated = true;
    this.validatedBy = validatedBy;
  }

  async process(packet: TroxtTaskPacket): Promise<AgentResult> {
    if (!this.namingRulesValidated) {
      return {
        taskId: packet.id,
        agent: this.name,
        status: 'failure',
        output: {
          blocked: true,
          reason: 'NamingRules non validées par TroxT Brain',
          action: 'Attendre validation du format d\'IDs avant production massive',
          signal: 'BLACK — Blocage immédiat',
        },
        confidence: 0,
        warnings: ['BLOCAGE: NamingRules doivent être validées par TroxT Brain avant production'],
        completedAt: Date.now(),
        durationMs: 0,
      };
    }

    this.currentTask = packet.id;
    const start = Date.now();
    const batch = this.generateBatch(packet);
    this.tasksCompleted++;
    this.currentTask = null;

    return {
      taskId: packet.id,
      agent: this.name,
      status: 'success',
      output: batch,
      confidence: 0.96,
      warnings: [],
      completedAt: Date.now(),
      durationMs: Date.now() - start,
    };
  }

  private generateBatch(packet: TroxtTaskPacket) {
    const { mission, input } = packet;
    const count = Number(input.count ?? 10);

    if (/maison|house|property/i.test(mission)) {
      return this.generateHouses(count);
    }
    if (/véhicule|vehicle/i.test(mission)) {
      return this.generateVehicles(count);
    }
    if (/npc|entit/i.test(mission)) {
      return this.generateNPCs(count);
    }
    return this.generateProps(count, mission);
  }

  private generateHouses(count: number) {
    const items = [];
    let idx = 1;
    for (const category of PROPERTY_CATEGORIES) {
      for (const zone of PROPERTY_ZONES) {
        if (idx > count) break;
        items.push({
          id: generatePropertyId(category, zone, idx),
          category,
          zone,
          status: 'available',
          price: this.housePrice(category),
          furnitureSlots: this.furnitureSlots(category),
          createdAt: Date.now(),
        });
        idx++;
      }
      if (idx > count) break;
    }
    return {
      agent: 'ForgeFactory',
      type: 'houses',
      count: items.length,
      validatedBy: this.validatedBy,
      items,
      format: 'house_{category}_{zone}_{index}',
    };
  }

  private generateVehicles(count: number) {
    const models: Record<string, string[]> = {
      civil: ['sedan', 'suv', 'pickup'],
      police: ['cruiser', 'suv_police'],
      ems: ['ambulance', 'moto_ems'],
      fire: ['camion', 'suv_fire'],
      government: ['limousine', 'suv_blinde'],
      criminal: ['muscle', 'van'],
      race: ['formula', 'gtr'],
      utility: ['camion', 'fourgon'],
    };
    const items = [];
    let idx = 1;
    for (const role of VEHICLE_ROLES) {
      for (const model of (models[role] ?? ['default'])) {
        if (idx > count) break;
        items.push({
          id: generateVehicleId(role, model, idx),
          role,
          model,
          seats: role === 'race' ? 2 : 4,
          status: 'available',
          createdAt: Date.now(),
        });
        idx++;
      }
      if (idx > count) break;
    }
    return {
      agent: 'ForgeFactory',
      type: 'vehicles',
      count: items.length,
      validatedBy: this.validatedBy,
      items,
      format: 'vehicle_{role}_{model}_{index}',
    };
  }

  private generateNPCs(count: number) {
    const types = ['guard', 'merchant', 'civilian', 'officer', 'technician', 'boss'];
    const items = [];
    for (let i = 1; i <= count; i++) {
      const type = types[(i - 1) % types.length]!;
      items.push({
        id: generateNpcId(type, i),
        type,
        hp: type === 'boss' ? 1000 : type === 'guard' ? 200 : 80,
        aggroRange: type === 'boss' ? 20 : type === 'guard' ? 10 : 0,
        status: 'idle',
        createdAt: Date.now(),
      });
    }
    return {
      agent: 'ForgeFactory',
      type: 'npcs',
      count: items.length,
      validatedBy: this.validatedBy,
      items,
      format: 'npc_{type}_{index}',
    };
  }

  private generateProps(count: number, mission: string) {
    const items = [];
    for (let i = 1; i <= count; i++) {
      items.push({
        id: `prop_generic_${String(i).padStart(3, '0')}`,
        mission,
        index: i,
        createdAt: Date.now(),
      });
    }
    return {
      agent: 'ForgeFactory',
      type: 'props',
      count: items.length,
      validatedBy: this.validatedBy,
      items,
    };
  }

  private housePrice(category: string): number {
    const prices: Record<string, number> = {
      poor: 5000, modest: 15000, standard: 45000,
      rural: 35000, rich: 120000, villa: 350000, manor: 1200000,
    };
    return prices[category] ?? 10000;
  }

  private furnitureSlots(category: string): number {
    const slots: Record<string, number> = {
      poor: 5, modest: 10, standard: 15, rural: 18,
      rich: 25, villa: 35, manor: 60,
    };
    return slots[category] ?? 10;
  }

  getTelemetry(): AgentTelemetry {
    return {
      agent: this.name,
      taskId: this.currentTask ?? 'idle',
      status: this.namingRulesValidated
        ? (this.currentTask ? 'working' : 'pending')
        : 'blocked',
      confidence: this.namingRulesValidated ? 0.96 : 0,
      riskLevel: this.namingRulesValidated ? 'low' : 'critical',
      estimatedCompletion: 'medium',
      dependencies: this.namingRulesValidated ? [] : ['NamingRulesValidation'],
      timestamp: Date.now(),
    };
  }

  getStats() {
    return {
      tasksCompleted: this.tasksCompleted,
      currentTask: this.currentTask,
      namingRulesValidated: this.namingRulesValidated,
      validatedBy: this.validatedBy,
    };
  }
}
