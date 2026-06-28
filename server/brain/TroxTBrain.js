/**
 * TroxTBrain v4.0.0 — Orchestrateur central
 * Chef d'orchestre de tous les agents EtherWorld
 * Port-Éther RP — Fichier: server/brain/TroxTBrain.ts
 */

import { EventEmitter } from 'events';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentId =
  | 'ether-forge' | 'ether-lens' | 'ether-prism' | 'ether-weave'
  | 'forge-factory' | 'ether-guard' | 'ether-ui' | 'ether-sim'
  | 'ether-deploy' | 'ether-memory' | 'ether-core';

export type RiskLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface AgentTask {
  id: string;
  agentId: AgentId;
  mission: string;
  priority: number;          // 1-10
  payload: Record<string, unknown>;
  requestedBy: string;       // 'admin' | playerId
  timestamp: number;
}

export interface AgentResult {
  taskId: string;
  agentId: AgentId;
  success: boolean;
  output: unknown;
  files: string[];
  connections: string[];
  risks: string[];
  confidence: number;        // 0-100
  needsBrainValidation: boolean;
  needsThirdEyeValidation: boolean;
  executionMs: number;
}

export interface BrainPlan {
  planId: string;
  originalRequest: string;
  agents: AgentId[];
  tasks: AgentTask[];
  estimatedMs: number;
  riskLevel: RiskLevel;
}

// ─── Agent Registry ───────────────────────────────────────────────────────────

const AGENT_ROLES: Record<AgentId, string> = {
  'ether-forge':   'Construit — code, modules, systèmes RP',
  'ether-lens':    'Inspecte — bugs, risques, audit qualité',
  'ether-prism':   'Transforme — schémas RP complets importables en jeu',
  'ether-weave':   'Connecte — systèmes entre eux',
  'forge-factory': 'Produit — masse, props, configs, items',
  'ether-guard':   'Sécurise — permissions, anti-abus, RBAC',
  'ether-ui':      'Interface — HUD, menus, UX joueur',
  'ether-sim':     'Teste — scénarios RP réels, simulation joueurs',
  'ether-deploy':  'Livre — release, build stable, hot-deploy',
  'ether-memory':  'Mémorise — décisions, historique, patterns',
  'ether-core':    'Standardise — noms, IDs, conventions globales',
};

// ─── TroxTBrain ───────────────────────────────────────────────────────────────

export class TroxTBrain extends EventEmitter {
  private static instance: TroxTBrain;
  private taskQueue: AgentTask[] = [];
  private results: Map<string, AgentResult> = new Map();
  private planHistory: BrainPlan[] = [];
  private isProcessing = false;
  private thirdEyeRisk: RiskLevel = 'GREEN';

  // Statistiques
  private stats = {
    totalTasks: 0,
    successfulTasks: 0,
    failedTasks: 0,
    avgConfidence: 0,
    uptime: Date.now(),
  };

  static getInstance(): TroxTBrain {
    if (!TroxTBrain.instance) TroxTBrain.instance = new TroxTBrain();
    return TroxTBrain.instance;
  }

  // ─── Pipeline Brain en 5 étapes ────────────────────────────────────────────

  async process(request: string, requestedBy = 'admin'): Promise<BrainPlan> {
    console.log(`\n🧠 [BRAIN] Traitement: "${request.slice(0, 80)}..."`);

    // Étape 1 — Analyse et compréhension
    const analysis = this.analyzeRequest(request);

    // Étape 2 — Sélection des agents
    const selectedAgents = this.selectAgents(analysis);

    // Étape 3 — Planification
    const plan = this.buildPlan(request, selectedAgents, requestedBy);

    // Étape 4 — Validation Third Eye
    const approved = this.validateWithThirdEye(plan);
    if (!approved) {
      this.emit('plan:blocked', { plan, reason: 'Third Eye: risque trop élevé' });
      throw new Error(`Plan bloqué par Third Eye — niveau: ${this.thirdEyeRisk}`);
    }

    // Étape 5 — Exécution parallèle ou séquentielle
    this.planHistory.push(plan);
    this.emit('plan:started', plan);
    await this.executePlan(plan);

    return plan;
  }

  // ─── Analyse de la requête ─────────────────────────────────────────────────

  private analyzeRequest(request: string): Record<string, boolean> {
    const r = request.toLowerCase();
    return {
      needsCode:       r.includes('crée') || r.includes('génère') || r.includes('construit'),
      needsSecurity:   r.includes('sécuris') || r.includes('permission') || r.includes('admin'),
      needsUI:         r.includes('hud') || r.includes('menu') || r.includes('interface'),
      needsTest:       r.includes('test') || r.includes('simul') || r.includes('vérifie'),
      needsItems:      r.includes('item') || r.includes('prop') || r.includes('objet'),
      needsConnect:    r.includes('connect') || r.includes('lie') || r.includes('integr'),
      needsAudit:      r.includes('audit') || r.includes('bug') || r.includes('inspect'),
      isHighRisk:      r.includes('supprime') || r.includes('efface') || r.includes('reset'),
    };
  }

  // ─── Sélection automatique des agents ─────────────────────────────────────

  private selectAgents(analysis: Record<string, boolean>): AgentId[] {
    const agents: AgentId[] = ['ether-core']; // toujours inclus

    if (analysis.needsCode)     agents.push('ether-forge');
    if (analysis.needsSecurity) agents.push('ether-guard');
    if (analysis.needsUI)       agents.push('ether-ui');
    if (analysis.needsTest)     agents.push('ether-sim');
    if (analysis.needsItems)    agents.push('forge-factory');
    if (analysis.needsConnect)  agents.push('ether-weave');
    if (analysis.needsAudit)    agents.push('ether-lens');

    // Toujours finir avec memory et deploy
    agents.push('ether-memory', 'ether-deploy');

    return [...new Set(agents)]; // déduplique
  }

  // ─── Construction du plan ──────────────────────────────────────────────────

  private buildPlan(request: string, agents: AgentId[], requestedBy: string): BrainPlan {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const tasks: AgentTask[] = agents.map((agentId, i) => ({
      id: `${planId}_task_${i}`,
      agentId,
      mission: `[${agentId.toUpperCase()}] ${request}`,
      priority: 10 - i,
      payload: { request, planId },
      requestedBy,
      timestamp: Date.now(),
    }));

    return {
      planId,
      originalRequest: request,
      agents,
      tasks,
      estimatedMs: agents.length * 150,
      riskLevel: this.thirdEyeRisk,
    };
  }

  // ─── Validation Third Eye ──────────────────────────────────────────────────

  private validateWithThirdEye(plan: BrainPlan): boolean {
    // Bloque si risque ORANGE ou RED
    if (this.thirdEyeRisk === 'RED')    return false;
    if (this.thirdEyeRisk === 'ORANGE') {
      // Autorise seulement les opérations sûres
      const safeAgents: AgentId[] = ['ether-lens', 'ether-memory', 'ether-core'];
      return plan.agents.every(a => safeAgents.includes(a));
    }
    return true;
  }

  // ─── Exécution du plan ─────────────────────────────────────────────────────

  private async executePlan(plan: BrainPlan): Promise<void> {
    this.isProcessing = true;

    for (const task of plan.tasks) {
      const start = Date.now();
      this.emit('task:started', task);

      try {
        // Simulation de l'exécution agent (à connecter aux vrais agents)
        const result = await this.dispatchToAgent(task);
        this.results.set(task.id, result);
        this.stats.successfulTasks++;
        this.emit('task:completed', result);
      } catch (err) {
        this.stats.failedTasks++;
        this.emit('task:failed', { task, error: String(err) });
      }

      this.stats.totalTasks++;
    }

    this.isProcessing = false;
    this.emit('plan:completed', { planId: plan.planId, results: this.results });
  }

  // ─── Dispatch vers un agent ────────────────────────────────────────────────

  private async dispatchToAgent(task: AgentTask): Promise<AgentResult> {
    const start = Date.now();

    // Interface pour connecter les vrais agents
    // Chaque agent implémente AgentHandler et est enregistré ici
    const handler = this.agentHandlers.get(task.agentId);

    if (handler) {
      return handler(task);
    }

    // Fallback : log que l'agent n'est pas encore connecté
    console.log(`  ⚡ [${task.agentId.toUpperCase()}] Mission: ${task.mission.slice(0, 60)}`);

    return {
      taskId: task.id,
      agentId: task.agentId,
      success: true,
      output: `Agent ${task.agentId} exécuté (mode stub)`,
      files: [],
      connections: [],
      risks: [],
      confidence: 75,
      needsBrainValidation: false,
      needsThirdEyeValidation: false,
      executionMs: Date.now() - start,
    };
  }

  // ─── Registre des handlers d'agents ──────────────────────────────────────

  private agentHandlers = new Map<AgentId, (task: AgentTask) => Promise<AgentResult>>();

  registerAgent(id: AgentId, handler: (task: AgentTask) => Promise<AgentResult>): void {
    this.agentHandlers.set(id, handler);
    console.log(`✅ [BRAIN] Agent enregistré: ${id}`);
  }

  // ─── Third Eye — mise à jour du niveau de risque ──────────────────────────

  setRiskLevel(level: RiskLevel): void {
    const prev = this.thirdEyeRisk;
    this.thirdEyeRisk = level;
    if (prev !== level) {
      this.emit('risk:changed', { from: prev, to: level });
      console.log(`👁 [THIRD EYE] Risque: ${prev} → ${level}`);
    }
  }

  getRiskLevel(): RiskLevel { return this.thirdEyeRisk; }

  async initialize(): Promise<void> {
    console.log('🧠 [BRAIN] TroxTBrain v4.0.0 initialisé');
    this.emit('brain:ready', { agents: Object.keys(AGENT_ROLES) });
  }

  get state(): string {
    return this.isProcessing ? 'PROCESSING' : IDLE[\];
  }

  // ─── Accesseurs ────────────────────────────────────────────────────────────

  getStats()        { return { ...this.stats, agents: Object.keys(AGENT_ROLES) }; }
  getPlanHistory()  { return this.planHistory.slice(-20); }
  isRunning()       { return this.isProcessing; }
}

export default TroxTBrain.getInstance();
