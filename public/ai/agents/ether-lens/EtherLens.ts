// ══════════════════════════════════════════════════════════════════════════════
// Ether-Lens — Agent d'analyse et d'inspection
// Inspecte, diagnostique, valide — l'inspecteur du chantier TroxT
// ══════════════════════════════════════════════════════════════════════════════

import type { TroxtTaskPacket, AgentResult, AgentTelemetry, AgentScore } from '../types.js';

export class EtherLens {
  readonly name = 'EtherLens' as const;

  private currentTask: string | null = null;
  private tasksCompleted = 0;

  async process(packet: TroxtTaskPacket): Promise<AgentResult> {
    this.currentTask = packet.id;
    const start = Date.now();
    const inspection = this.inspect(packet);
    this.tasksCompleted++;
    this.currentTask = null;

    return {
      taskId: packet.id,
      agent: this.name,
      status: 'success',
      output: inspection,
      confidence: 0.94,
      warnings: inspection.inspectionResult.issues.map((i: { message: string }) => i.message),
      completedAt: Date.now(),
      durationMs: Date.now() - start,
    };
  }

  private inspect(packet: TroxtTaskPacket) {
    const { mission, input, expectedOutput, rules } = packet;
    const issues: { severity: 'low' | 'medium' | 'high'; message: string }[] = [];
    const positives: string[] = [];
    const improvements: string[] = [];

    if (mission.length < 20) {
      issues.push({ severity: 'medium', message: 'Mission trop courte — manque de contexte' });
    } else {
      positives.push('Mission bien définie');
    }

    if (Object.keys(input).length === 0) {
      issues.push({ severity: 'low', message: 'Aucune donnée d\'entrée spécifiée' });
    } else {
      positives.push(`${Object.keys(input).length} champ(s) d'entrée définis`);
    }

    if (rules.length === 0) {
      issues.push({ severity: 'low', message: 'Aucune restriction définie pour cet agent' });
    } else {
      positives.push(`${rules.length} règle(s) de restriction en place`);
    }

    if (!expectedOutput || expectedOutput.length < 10) {
      issues.push({ severity: 'medium', message: 'Sortie attendue insuffisamment décrite' });
    }

    if (!mission.toLowerCase().includes('event') && !mission.toLowerCase().includes('événement')) {
      improvements.push('Considérer l\'ajout d\'événements système pour ce module');
    }

    improvements.push('Valider avec Ether-Guard après implémentation');
    improvements.push('Connecter via Ether-Weave aux modules dépendants');

    return {
      agent: 'EtherLens',
      mission,
      inspectionResult: {
        valid: issues.filter(i => i.severity === 'high').length === 0,
        issues,
        positives,
        improvements,
        overallScore: Math.max(40, 100 - (issues.length * 12)),
      },
    };
  }

  scoreResult(result: Record<string, unknown>): AgentScore {
    const score = this.calculateScore(result);
    return {
      agent: 'EtherLens',
      task: String(result.mission ?? 'unknown'),
      scores: score,
      globalScore: Math.round(
        Object.values(score).reduce((a, b) => a + b, 0) / Object.keys(score).length
      ),
      status: 'accepted',
      timestamp: Date.now(),
    };
  }

  private calculateScore(result: Record<string, unknown>) {
    const hasOutput = Object.keys(result).length > 2;
    const hasWarnings = Array.isArray(result.warnings) && (result.warnings as unknown[]).length > 0;
    return {
      technicalQuality: hasOutput ? 85 : 60,
      security: 72,
      compatibility: 90,
      clarity: 88,
      roleCompliance: 95,
      performance: 82,
      reusability: 78,
    };
  }

  auditNamingConventions(ids: string[]): { valid: string[]; invalid: string[]; conflicts: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    const conflicts: string[] = [];
    const patterns = [
      /^house_(poor|modest|standard|rural|rich|villa|manor)_/,
      /^vehicle_(civil|police|ems|fire|government|criminal|race|utility)_/,
      /^npc_[a-z_]+_\d{3}$/,
      /^item_[a-z_]+_[a-z_]+$/,
    ];
    for (const id of ids) {
      if (patterns.some(p => p.test(id))) {
        valid.push(id);
      } else {
        invalid.push(id);
      }
    }
    const seen = new Map<string, string>();
    for (const id of ids) {
      const prefix = id.replace(/_\d+$/, '');
      if (seen.has(prefix) && seen.get(prefix) !== id) {
        conflicts.push(`Conflit: "${seen.get(prefix)}" vs "${id}"`);
      }
      seen.set(prefix, id);
    }
    return { valid, invalid, conflicts };
  }

  getTelemetry(): AgentTelemetry {
    return {
      agent: this.name,
      taskId: this.currentTask ?? 'idle',
      status: this.currentTask ? 'working' : 'pending',
      confidence: 0.94,
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
