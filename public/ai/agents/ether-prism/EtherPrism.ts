// ══════════════════════════════════════════════════════════════════════════════
// Ether-Prism — Agent de transformation et variantes
// Transforme une idée brute en plusieurs versions structurées
// ══════════════════════════════════════════════════════════════════════════════

import type { TroxtTaskPacket, AgentResult, AgentTelemetry } from '../types.js';
import { generatePropertyId, generateVehicleId, PROPERTY_CATEGORIES, PROPERTY_ZONES, VEHICLE_ROLES } from '../rules/NamingRules.js';

export const HOUSE_VARIANTS = [
  { category: 'poor' as const, label: 'Maison pauvre', price: 5_000, size: 'small', features: ['1 pièce', 'état délabré', 'pas de garage'] },
  { category: 'modest' as const, label: 'Maison modeste', price: 15_000, size: 'small', features: ['2 pièces', 'cuisine basique', 'cour'] },
  { category: 'standard' as const, label: 'Maison standard', price: 45_000, size: 'medium', features: ['3 pièces', 'garage 1 véhicule', 'jardin'] },
  { category: 'rural' as const, label: 'Maison de campagne', price: 35_000, size: 'medium', features: ['4 pièces', 'terrain', 'grange'] },
  { category: 'rich' as const, label: 'Maison riche', price: 120_000, size: 'large', features: ['5 pièces', 'piscine', 'garage 2 véhicules'] },
  { category: 'villa' as const, label: 'Villa', price: 350_000, size: 'large', features: ['7 pièces', 'piscine chauffée', 'cinéma', 'spa'] },
  { category: 'manor' as const, label: 'Manoir', price: 1_200_000, size: 'xl', features: ['12 pièces', 'domaine', 'hélicoptère', 'garde du corps'] },
] as const;

export const VEHICLE_VARIANTS = [
  { role: 'civil' as const, label: 'Véhicule civil', examples: ['Sedan', 'SUV', 'Pickup'], accessible: true },
  { role: 'police' as const, label: 'Véhicule de police', examples: ['Cruiser', 'SUV Police', 'Moto'], accessible: false, jobRequired: 'police' },
  { role: 'ems' as const, label: 'Ambulance / EMS', examples: ['Ambulance', 'Moto EMS'], accessible: false, jobRequired: 'ems' },
  { role: 'fire' as const, label: 'Pompier', examples: ['Camion pompier', 'SUV pompier'], accessible: false, jobRequired: 'firefighter' },
  { role: 'government' as const, label: 'Gouvernement', examples: ['Limousine', 'VUS blindé'], accessible: false, jobRequired: 'government' },
  { role: 'criminal' as const, label: 'Criminel', examples: ['Muscle car', 'Van teinté'], accessible: false, jobRequired: 'criminal' },
  { role: 'race' as const, label: 'Course', examples: ['Formula RP', 'GTR'], accessible: true, license: 'course' },
  { role: 'utility' as const, label: 'Utilitaire', examples: ['Camion', 'Fourgon'], accessible: true },
] as const;

export class EtherPrism {
  readonly name = 'EtherPrism' as const;

  private currentTask: string | null = null;
  private tasksCompleted = 0;

  async process(packet: TroxtTaskPacket): Promise<AgentResult> {
    this.currentTask = packet.id;
    const start = Date.now();

    const { mission } = packet;
    let output: Record<string, unknown>;

    if (/maison|house|immobilier|property/i.test(mission)) {
      output = this.generateHouseVariants();
    } else if (/véhicule|vehicle|voiture|car/i.test(mission)) {
      output = this.generateVehicleVariants();
    } else if (/npc|entit|entity|personnage/i.test(mission)) {
      output = this.generateNPCVariants();
    } else {
      output = this.generateGenericVariants(mission);
    }

    this.tasksCompleted++;
    this.currentTask = null;

    return {
      taskId: packet.id,
      agent: this.name,
      status: 'success',
      output,
      confidence: 0.91,
      warnings: [],
      completedAt: Date.now(),
      durationMs: Date.now() - start,
    };
  }

  private generateHouseVariants() {
    const variants = HOUSE_VARIANTS.map((h, i) => ({
      ...h,
      id: generatePropertyId(h.category, 'urban', i + 1),
      furnitureSlots: { poor: 5, modest: 10, standard: 15, rural: 18, rich: 25, villa: 35, manor: 60 }[h.category],
      doorCount: { poor: 1, modest: 1, standard: 2, rural: 2, rich: 3, villa: 5, manor: 10 }[h.category],
    }));
    return {
      agent: 'EtherPrism',
      type: 'house_variants',
      count: variants.length,
      variants,
      namingStandard: 'house_{category}_{zone}_{index}',
      priceRange: { min: 5_000, max: 1_200_000 },
      ready: true,
    };
  }

  private generateVehicleVariants() {
    const variants = VEHICLE_VARIANTS.map((v, i) => ({
      ...v,
      id: generateVehicleId(v.role, v.examples[0]!.replace(' ', '_'), i + 1),
      maxSpeed: { civil: 120, police: 200, ems: 180, fire: 160, government: 150, criminal: 220, race: 300, utility: 100 }[v.role],
      seats: { civil: 4, police: 4, ems: 3, fire: 6, government: 5, criminal: 4, race: 2, utility: 2 }[v.role],
    }));
    return {
      agent: 'EtherPrism',
      type: 'vehicle_variants',
      count: variants.length,
      variants,
      namingStandard: 'vehicle_{role}_{model}_{index}',
    };
  }

  private generateNPCVariants() {
    const types = [
      { role: 'guard', label: 'Garde', hp: 200, aggroRange: 10, patrol: true },
      { role: 'merchant', label: 'Marchand', hp: 100, aggroRange: 0, dialog: 5 },
      { role: 'civilian', label: 'Civil', hp: 80, aggroRange: 0, wandering: true },
      { role: 'boss', label: 'Boss', hp: 1000, aggroRange: 20, phases: 3 },
      { role: 'officer', label: 'Officier de police', hp: 250, aggroRange: 15, authority: true },
      { role: 'technician', label: 'Technicien', hp: 80, aggroRange: 0, interaction: 'repair' },
    ];
    return {
      agent: 'EtherPrism',
      type: 'npc_variants',
      count: types.length,
      variants: types,
      namingStandard: 'npc_{role}_{index}',
    };
  }

  private generateGenericVariants(mission: string) {
    return {
      agent: 'EtherPrism',
      type: 'generic_variants',
      mission,
      variants: [
        { tier: 'basic', label: 'Version basique', complexity: 'low' },
        { tier: 'standard', label: 'Version standard', complexity: 'medium' },
        { tier: 'advanced', label: 'Version avancée', complexity: 'high' },
        { tier: 'premium', label: 'Version premium', complexity: 'very_high' },
      ],
    };
  }

  getTelemetry(): AgentTelemetry {
    return {
      agent: this.name,
      taskId: this.currentTask ?? 'idle',
      status: this.currentTask ? 'working' : 'pending',
      confidence: 0.91,
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
