// TroxTBrain.ts — Unification des agents TroxT
// Système d'orchestration cognitive et surveillance temps réel (ThirdEye)

// Simple custom browser-safe implementation of EventEmitter
export class EventEmitter {
  private listeners: Record<string, Function[]> = {};

  on(event: string, fn: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(fn);
    return this;
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(fn => fn(...args));
    }
    return true;
  }
}

// List of all 16 agents of the official TroxT RP specification
export const agents = [
  { id: "ether-core", role: "Standardise les noms, IDs et conventions." },
  { id: "ether-prism", role: "Transforme les demandes en schemas RP importables." },
  { id: "ether-forge", role: "Construit les modules Node et patterns Lua." },
  { id: "ether-weave", role: "Connecte economie, territory, maisons et joueurs." },
  { id: "ether-guard", role: "Protege permissions, transactions et anti-abus." },
  { id: "ether-ui", role: "Prepare HUD, menus et UX joueur." },
  { id: "ether-lens", role: "Inspecte bugs, failles et equilibre RP." },
  { id: "ether-sim", role: "Simule les scenarios RP multi-joueurs." },
  { id: "forge-factory", role: "Produit items, props et configurations en masse." },
  { id: "ether-deploy", role: "Prepare une livraison stable sans coupure." },
  { id: "ether-memory", role: "Memorise decisions, patterns et historique." },
  { id: "troxt-third-eye", role: "Surveille le risque avant execution." },
  { id: "arcadius", role: "Bus d'evenements priorise." },
  { id: "benedictus", role: "Contrats et validations structurees." },
  { id: "momentus", role: "Retry, timeout, concurrence et autosave." },
  { id: "decaprius", role: "Commandes, rollback et telemetrie." },
];

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
  output: any;
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
    if (!TroxTBrain.instance) {
      TroxTBrain.instance = new TroxTBrain();
    }
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
      needsCode:       r.includes('crée') || r.includes('génère') || r.includes('construit') || r.includes('code'),
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
    const selected: AgentId[] = ['ether-core']; // toujours inclus

    if (analysis.needsCode)     selected.push('ether-forge');
    if (analysis.needsSecurity) selected.push('ether-guard');
    if (analysis.needsUI)       selected.push('ether-ui');
    if (analysis.needsTest)     selected.push('ether-sim');
    if (analysis.needsItems)    selected.push('forge-factory');
    if (analysis.needsConnect)  selected.push('ether-weave');
    if (analysis.needsAudit)    selected.push('ether-lens');

    // Toujours finir avec memory et deploy
    selected.push('ether-memory', 'ether-deploy');

    return [...new Set(selected)]; // déduplique
  }

  // ─── Construction du plan ──────────────────────────────────────────────────

  private buildPlan(request: string, selectedAgents: AgentId[], requestedBy: string): BrainPlan {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const tasks: AgentTask[] = selectedAgents.map((agentId, i) => ({
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
      agents: selectedAgents,
      tasks,
      estimatedMs: selectedAgents.length * 150,
      riskLevel: this.thirdEyeRisk,
    };
  }

  // ─── Validation Third Eye ──────────────────────────────────────────────────

  private validateWithThirdEye(plan: BrainPlan): boolean {
    if (this.thirdEyeRisk === 'RED')    return false;
    if (this.thirdEyeRisk === 'ORANGE') {
      const safeAgents: AgentId[] = ['ether-lens', 'ether-memory', 'ether-core'];
      return plan.agents.every(a => safeAgents.includes(a));
    }
    return true;
  }

  // ─── Exécution du plan ─────────────────────────────────────────────────────

  private async executePlan(plan: BrainPlan): Promise<void> {
    this.isProcessing = true;

    for (const task of plan.tasks) {
      this.emit('task:started', task);

      try {
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
    const handler = this.agentHandlers.get(task.agentId);

    if (handler) {
      return handler(task);
    }

    // Default stub response
    return {
      taskId: task.id,
      agentId: task.agentId,
      success: true,
      output: `Agent ${task.agentId} exécuté (mode stub)`,
      files: [],
      connections: [],
      risks: [],
      confidence: 85,
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

  setRiskLevel(level: RiskLevel): void {
    const prev = this.thirdEyeRisk;
    this.thirdEyeRisk = level;
    if (prev !== level) {
      this.emit('risk:changed', { from: prev, to: level });
      console.log(`👁 [THIRD EYE] Risque: ${prev} → ${level}`);
    }
  }

  getRiskLevel(): RiskLevel { return this.thirdEyeRisk; }

  getStats()        { return { ...this.stats, agents: Object.keys(AGENT_ROLES) }; }
  getPlanHistory()  { return this.planHistory.slice(-20); }
  isRunning()       { return this.isProcessing; }
}

export const brainInstance = TroxTBrain.getInstance();

// ─── ArcadiusBus ─────────────────────────────────────────────────────────────

export class ArcadiusBus {
  history: any[] = [];
  listeners: Map<string, Function[]> = new Map();

  on(type: string, handler: Function) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  async emit(type: string, payload: any, priority = "normal") {
    const event = {
      id: Math.random().toString(36).slice(2, 10),
      type,
      payload,
      priority,
      createdAt: new Date().toISOString(),
    };
    this.history.unshift(event);
    this.history = this.history.slice(0, 100);

    const handlers = this.listeners.get(type) ?? [];
    await Promise.all(handlers.map((handler) => handler(event)));
    return event;
  }
}

// ─── BenedictusContracts ─────────────────────────────────────────────────────

export class BenedictusContracts {
  validateCommand(input: any) {
    const prompt = String(input?.prompt ?? "").trim();
    if (prompt.length < 4) {
      return { ok: false, reason: "La commande est trop courte." };
    }
    if (prompt.length > 1200) {
      return { ok: false, reason: "La commande depasse la limite de 1200 caracteres." };
    }
    return { ok: true, prompt };
  }

  validateBuildPatch(input: any) {
    if (!input?.type || !input?.position) {
      return { ok: false, reason: "Patch BuildRealtime invalide." };
    }
    return { ok: true, patch: input };
  }
}

// ─── DecapriusCommands ───────────────────────────────────────────────────────

export class DecapriusCommands {
  contracts: BenedictusContracts;
  thirdEye: ThirdEye;
  bus: ArcadiusBus;

  constructor({ contracts, thirdEye, bus }: { contracts: BenedictusContracts; thirdEye: ThirdEye; bus: ArcadiusBus }) {
    this.contracts = contracts;
    this.thirdEye = thirdEye;
    this.bus = bus;
  }

  async executeAdminCommand(input: any, handler: Function) {
    const contract = this.contracts.validateCommand(input);
    if (!contract.ok) return { ok: false, reason: contract.reason, risk: "YELLOW" };

    const allowed = this.thirdEye.analyze(contract.prompt || "", "admin");
    if (!allowed.allowed) return { ok: false, reason: allowed.reason, risk: allowed.risk };

    await this.bus.emit("admin.command.accepted", { prompt: contract.prompt, risk: allowed.risk }, "high");
    const result = await handler(contract.prompt, allowed.risk);
    await this.bus.emit("admin.command.completed", result, "normal");
    return { ok: true, result, risk: allowed.risk };
  }
}

// ─── LotusMemory ─────────────────────────────────────────────────────────────

export class LotusMemory {
  versions: any[] = [];
  state = {
    players: [] as any[],
    houses: [] as any[],
    weapons: [] as any[],
    rpSchemas: [] as any[],
    buildPatches: [] as any[],
  };

  read() {
    return JSON.parse(JSON.stringify(this.state));
  }

  mutate(label: string, updater: Function) {
    const next = JSON.parse(JSON.stringify(this.state));
    updater(next);
    this.state = next;
    this.versions.unshift({
      id: Math.random().toString(36).slice(2, 10),
      label,
      createdAt: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(this.state)),
    });
    this.versions = this.versions.slice(0, 20);
    return this.read();
  }
}

// ─── MomentusScheduler ───────────────────────────────────────────────────────

export class MomentusScheduler {
  tasks: Map<string, any> = new Map();

  every(name: string, intervalMs: number, task: () => void) {
    this.stop(name);
    const timer = setInterval(task, intervalMs);
    this.tasks.set(name, timer);
    return timer;
  }

  stop(name: string) {
    const timer = this.tasks.get(name);
    if (timer) clearInterval(timer);
    this.tasks.delete(name);
  }

  stopAll() {
    for (const name of this.tasks.keys()) {
      this.stop(name);
    }
  }
}

// ─── RiskPredictor ───────────────────────────────────────────────────────────

export const RISK_LEVEL = Object.freeze({
  GREEN:  'GREEN' as RiskLevel,
  YELLOW: 'YELLOW' as RiskLevel,
  ORANGE: 'ORANGE' as RiskLevel,
  RED:    'RED' as RiskLevel,
  BLACK:  'BLACK' as RiskLevel,
});

export class RiskPredictor {
  brain: TroxTBrain;
  constructor(brain: TroxTBrain) {
    this.brain = brain;
  }

  async predict(understanding: any, intents: any, context: any) {
    const complexity = understanding?.complexity ?? context?.complexity ?? 'simple';
    const confidence = understanding?.confidence ?? 0.5;

    const riskMap: Record<string, number> = { simple: 0.1, medium: 0.3, complex: 0.6, critical: 0.9 };
    const baseRisk = riskMap[complexity] ?? 0.3;

    const level = baseRisk < 0.2 ? RISK_LEVEL.GREEN
                : baseRisk < 0.4 ? RISK_LEVEL.YELLOW
                : baseRisk < 0.7 ? RISK_LEVEL.ORANGE
                : baseRisk < 0.9 ? RISK_LEVEL.RED
                : RISK_LEVEL.BLACK;

    return Object.freeze({
      level,
      score: Math.round(baseRisk * 100),
      factors: [
        { name: 'complexity', value: complexity, weight: 0.5 },
        { name: 'confidence', value: confidence, weight: 0.3 },
      ],
      confidence: Math.min(1, confidence + 0.2),
    });
  }
}

// ─── ThirdEye ────────────────────────────────────────────────────────────────

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

export class ThirdEye extends EventEmitter {
  private static instance: ThirdEye;

  private currentRisk: RiskLevel = 'GREEN';
  private threatLog: ThreatSignal[] = [];
  private trustScores = new Map<string, PlayerTrustScore>();
  private rateLimitMap = new Map<string, number[]>(); // playerId → timestamps

  static getInstance(): ThirdEye {
    if (!ThirdEye.instance) {
      ThirdEye.instance = new ThirdEye();
    }
    return ThirdEye.instance;
  }

  // ─── Analyse d'une action avant exécution ─────────────────────────────────

  analyze(action: string, source: string): {
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

export const thirdEyeInstance = ThirdEye.getInstance();

// ─── ThirdEyeBridge ──────────────────────────────────────────────────────────

export const THIRD_EYE_ACTION = Object.freeze({
  ALLOW:         'ALLOW',
  MONITOR:       'MONITOR',
  RESTRICT:      'RESTRICT',
  DELAY:         'DELAY',
  BLOCK:         'BLOCK',
  EMERGENCY:     'EMERGENCY',
});

const RISK_SEVERITY: Record<string, number> = Object.freeze({
  GREEN:  0, BLUE: 1, YELLOW: 2, ORANGE: 3, RED: 4, BLACK: 5,
});

export class ThirdEyeBridge extends EventEmitter {
  brain: TroxTBrain;
  version = '4.0.0';
  _opts: any;
  _connected = false;
  _assessmentLog: any[] = [];
  _blockedCount = 0;
  _allowedCount = 0;
  _failures = 0;
  _failureLimit = 5;
  _circuitOpen = false;
  _lastFailureAt: number | null = null;

  constructor(brain: TroxTBrain, opts: any = {}) {
    super();
    this.brain   = brain;

    this._opts = Object.freeze({
      timeoutMs:  opts.timeoutMs  ?? 5000,
      strictMode: opts.strictMode ?? false,
    });
  }

  async connect() {
    this._connected = true;
    this.emit('thirdeye:connected', { version: this.version });
    return this;
  }

  async assess(data: any) {
    const t0 = Date.now();

    if (this._circuitOpen) {
      if (this._lastFailureAt && Date.now() - this._lastFailureAt > 30000) {
        this._circuitOpen = false;
        this._failures    = 0;
      } else {
        return this._buildAssessment(THIRD_EYE_ACTION.ALLOW, 'GREEN', 0, 'Circuit ouvert — bypass', t0);
      }
    }

    try {
      return await Promise.race([
        this._performAssessment(data, t0),
        this._timeout(t0),
      ]);
    } catch (err: any) {
      this._failures++;
      this._lastFailureAt = Date.now();
      if (this._failures >= this._failureLimit) {
        this._circuitOpen = true;
        this.emit('thirdeye:circuit:open');
      }

      return this._buildAssessment(
        THIRD_EYE_ACTION.MONITOR,
        'YELLOW',
        0.3,
        `Erreur Third Eye — mode dégradé: ${err.message}`,
        t0
      );
    }
  }

  private async _performAssessment(data: any, t0: number) {
    const risk       = data.riskPrediction ?? {};
    const riskLevel  = risk.level ?? 'GREEN';
    const riskScore  = risk.score ?? 0;
    const severity   = RISK_SEVERITY[riskLevel] ?? 0;

    let action;
    let reason;

    if (severity >= RISK_SEVERITY.BLACK) {
      action = THIRD_EYE_ACTION.EMERGENCY;
      reason = '☠️ Niveau BLACK — Urgence absolue';
    } else if (severity >= RISK_SEVERITY.RED) {
      action = THIRD_EYE_ACTION.BLOCK;
      reason = '🔴 Niveau RED — Risque critique';
    } else if (severity >= RISK_SEVERITY.ORANGE) {
      action = this._opts.strictMode
        ? THIRD_EYE_ACTION.BLOCK
        : THIRD_EYE_ACTION.RESTRICT;
      reason = '🔶 Niveau ORANGE — Restrictions actives';
    } else if (severity >= RISK_SEVERITY.YELLOW) {
      action = THIRD_EYE_ACTION.MONITOR;
      reason = '⚠️ Niveau YELLOW — Surveillance renforcée';
    } else if (severity >= RISK_SEVERITY.BLUE) {
      action = THIRD_EYE_ACTION.MONITOR;
      reason = 'ℹ️ Niveau BLUE — Monitoring standard';
    } else {
      action = THIRD_EYE_ACTION.ALLOW;
      reason = '✅ Niveau GREEN — Accès autorisé';
    }

    const criticalFactors = (risk.factors ?? []).filter((f: any) => f.severity === 'critical');
    if (criticalFactors.length > 0 && action === THIRD_EYE_ACTION.ALLOW) {
      action = THIRD_EYE_ACTION.MONITOR;
      reason = `⚠️ ${criticalFactors.length} facteur(s) critique(s) détecté(s)`;
    }

    const assessment: any = this._buildAssessment(action, riskLevel, riskScore, reason, t0);
    assessment.factors = risk.factors ?? [];

    this._assessmentLog.push({
      action, riskLevel, riskScore, timestamp: Date.now(),
    });
    if (this._assessmentLog.length > 200) this._assessmentLog.shift();

    if (action === THIRD_EYE_ACTION.BLOCK || action === THIRD_EYE_ACTION.EMERGENCY) {
      this._blockedCount++;
      this.emit('thirdeye:blocked', { action, reason, riskLevel });
    } else {
      this._allowedCount++;
    }

    this.emit('thirdeye:assessed', { action, riskLevel, latencyMs: Date.now() - t0 });
    return assessment;
  }

  private _buildAssessment(action: string, riskLevel: string, riskScore: number, reason: string, t0: number) {
    return {
      action,
      riskLevel,
      riskScore: Math.round(riskScore * 10000) / 10000,
      reason,
      factors:     [],
      assessedAt:  Date.now(),
      latencyMs:   Date.now() - t0,
      assessmentId: Math.random().toString(36).slice(2),
    };
  }

  private _timeout(t0: number) {
    return new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error('Third Eye timeout')), this._opts.timeoutMs)
    );
  }

  getStats() {
    return Object.freeze({
      connected:     this._connected,
      blockedCount:  this._blockedCount,
      allowedCount:  this._allowedCount,
      circuitOpen:   this._circuitOpen,
      failures:      this._failures,
      recentLog:     this._assessmentLog.slice(-10),
    });
  }
}

// ─── ThirdEyeSystem ──────────────────────────────────────────────────────────

export interface ThirdEyeSystemAlert { id: string; level: string; source: string; message: string; recommendation?: string; createdAt: number; data?: unknown; }

export class ThirdEyeSystem {
  readonly id = "third-eye";
  readonly name = "TroxT Third Eye System";
  status: string = "created";
  private context!: any;
  private alerts: ThirdEyeSystemAlert[] = [];

  initialize(context: any): void {
    this.context = context;
    this.status = "initialized";
  }

  alert(level: string, source: string, message: string, data?: unknown, recommendation?: string): ThirdEyeSystemAlert {
    const alert: ThirdEyeSystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      level,
      source,
      message,
      recommendation,
      createdAt: Date.now(),
      data
    };
    this.alerts.unshift(alert);
    if (this.alerts.length > 500) this.alerts.pop();
    if (this.context && typeof this.context.emit === 'function') {
      this.context.emit("thirdeye:alert", alert);
    }
    return { ...alert };
  }

  assessPlacement(payload: { playerId: string; propertyId?: string; objectType: string }): string {
    if (!payload.propertyId) {
      this.alert("YELLOW", "BuildSystem", "Objet placé hors propriété.", payload, "Valider si l'objet est décoratif public ou abusif.");
      return "YELLOW";
    }
    return "GREEN";
  }

  getAlerts(limit = 50): ThirdEyeSystemAlert[] {
    return this.alerts.slice(0, limit).map(a => ({ ...a }));
  }

  snapshot() {
    return { alerts: this.getAlerts(200) };
  }

  restore(snapshot: { alerts?: ThirdEyeSystemAlert[] }): void {
    this.alerts = [...(snapshot.alerts ?? [])];
  }
}
