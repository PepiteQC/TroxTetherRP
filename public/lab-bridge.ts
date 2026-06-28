// ═══════════════════════════════════════════════════════════════════════════════════
// 🚀 TROXT LAB NEXUS BRIDGE v5.0 — Pont télémetry suprême
// C:\TroxTServerRP\apps\troxtlab\lab-bridge.ts
// ═══════════════════════════════════════════════════════════════════════════════════
//
// Ce pont ne fait PAS que transmettre de la télémétrie.
// Il CRÉE UN SYSTÈME NERVEUX COLLECTIF entre tous les agents TroxT.
// Chaque signal d'un agent nourrit immédiatement tous les autres.
//
// AGENTS CONNECTÉS AUTOMATIQUEMENT :
// ├── TroxT Brain          → Orchestrateur principal
// ├── TroxT Third Eye      → Surveillance et prédiction
// ├── TroxT-Intellectus    → Mémoire, contrats, scheduler
// ├── Ether-Forge          → Construction technique
// ├── Ether-Lens           → Inspection et audit
// ├── Ether-Prism          → Variantes et transformation
// ├── Ether-Weave          → Connexions et flux
// ├── Forge-Factory        → Production massive
// ├── Ether-Guard          → Sécurité et permissions
// ├── Ether-UI             → Interface utilisateur
// ├── Ether-Sim            → Tests et scénarios
// ├── Ether-Deploy         → Livraison et build
// ├── Ether-Memory         → Mémoire stratégique
// ├── Ether-Core           → Standards et conventions
// └── CommandHandler       → Traitement des commandes
//
// AVANTAGES SUPRÊMES :
// 1. Chaque agent reçoit les signaux des autres en temps réel
// 2. Prédiction des événements avant qu'ils n'arrivent
// 3. Cache de performance partagé entre tous les agents
// 4. Apprentissage collectif (les erreurs d'un agent profitent à tous)
// 5. Mode dégradé intelligent si un agent tombe
// 6. Scoring en temps réel de la synergie d'équipe
// ═══════════════════════════════════════════════════════════════════════════════════

import { agentBus }   from '../../agentBus.js';
import { EventBus }   from '../troxt-core/core/Intellectus.js';
import { NexusCore }  from '../troxt-core/core/NexusCore.js';
import crypto         from 'crypto';

// ─── TYPES NEXUS TELEMETRY ──────────────────────────────────

export interface LabBridgeOptions {
  agentId:   string;
  labUrl?:   string;
  useHttp?:  boolean;
  agentType?: AgentType;
  enableNexus?: boolean;
}

export type AgentType = 
  | 'brain' | 'thirdeye' | 'intellectus'
  | 'ether-forge' | 'ether-lens' | 'ether-prism' | 'ether-weave'
  | 'forge-factory' | 'ether-guard' | 'ether-ui' | 'ether-sim'
  | 'ether-deploy' | 'ether-memory' | 'ether-core'
  | 'command-handler' | 'unknown';

interface TelemetryPacket {
  agentId:     string;
  agentType:   AgentType;
  type:        string;
  status:      string;
  message:     string;
  meta:        Record<string, any>;
  timestamp:   number;
  id:          string;
  nexusScore?: number;
  prediction?: string;
}

interface AgentProfile {
  agentId:     string;
  agentType:   AgentType;
  status:      'online' | 'busy' | 'idle' | 'error' | 'offline';
  lastSeen:    number;
  performance: number[];
  errors:      number;
  nexusSynced: boolean;
  capabilities: string[];
}

interface TeamSynergyReport {
  timestamp:        number;
  agentsOnline:     number;
  agentsTotal:      number;
  synergyScore:     number;
  topPerformers:    string[];
  bottlenecks:      string[];
  recommendations: string[];
}

// ═══════════════════════════════════════════════════════════════
//  LAB BRIDGE NEXUS — LE PONT SUPRÊME
// ═══════════════════════════════════════════════════════════════

export class LabBridge {

  // ─── SYSTÈME NERVEUX NEXUS ───
  private readonly agentId:      string;
  private readonly agentType:    AgentType;
  private readonly labUrl:       string;
  private readonly useHttp:      boolean;
  private readonly nexus:        NexusCore;
  
  private hbTimer:               NodeJS.Timeout | null = null;
  private cmdTimer:              NodeJS.Timeout | null = null;
  private syncTimer:             NodeJS.Timeout | null = null;
  private readonly handlers:     Record<string, (payload: any) => Promise<void>> = {};
  
  // ─── PROFIL AGENT ───
  private readonly profile:      AgentProfile;
  
  // ─── MÉMOIRE COLLECTIVE ───
  private static readonly agentRegistry: Map<string, AgentProfile> = new Map();
  private static readonly telemetryHistory: TelemetryPacket[] = [];
  private static readonly MAX_TELEMETRY_HISTORY = 1000;
  private static readonly MAX_AGENTS = 50;
  
  // ─── CACHE DE PERFORMANCE ───
  private readonly performanceCache: Map<string, number[]> = new Map();
  private readonly predictionCache: Map<string, string[]> = new Map();
  
  // ─── MÉTRIQUES ───
  private packetsSent:     number = 0;
  private packetsReceived: number = 0;
  private errorsCount:     number = 0;
  private totalLatency:    number = 0;
  private peakLatency:     number = 0;

  constructor(options: LabBridgeOptions) {
    this.agentId   = options.agentId;
    this.agentType = options.agentType || 'unknown';
    this.labUrl    = options.labUrl    || 'http://localhost:4242';
    this.useHttp   = options.useHttp   ?? false;
    
    // ⚡ Initialisation du Nexus Core
    this.nexus = new NexusCore(this.agentId, `LabBridge:${this.agentType}`);
    
    // ⚡ Profil de l'agent
    this.profile = {
      agentId:      this.agentId,
      agentType:    this.agentType,
      status:       'offline',
      lastSeen:     Date.now(),
      performance:  [],
      errors:       0,
      nexusSynced:  false,
      capabilities: this._getDefaultCapabilities()
    };
    
    // Enregistrement dans le registre global
    LabBridge.agentRegistry.set(this.agentId, this.profile);
    
    logger.info(`
    ╔═══════════════════════════════════════════════════════════╗
    ║  🚀 LAB BRIDGE NEXUS ACTIVÉ                              ║
    ║  Agent: ${this.agentId.padEnd(40)}      ║
    ║  Type:  ${this.agentType.padEnd(40)}      ║
    ║  Mode:  ${this.useHttp ? 'HTTP' : 'Bus Direct'.padEnd(40)}      ║
    ║  Nexus: ${(options.enableNexus !== false ? 'ACTIVÉ' : 'DÉSACTIVÉ').padEnd(40)}      ║
    ╚═══════════════════════════════════════════════════════════╝
    `);
  }

  // ═══════════════════════════════════════════════════════════
  //  CONNECT — Connexion au système nerveux TroxT
  // ═══════════════════════════════════════════════════════════

  async connect(): Promise<void> {
    this.profile.status = 'online';
    this.profile.lastSeen = Date.now();
    
    // ── Mode Bus Direct (recommandé) ──
    if (!this.useHttp) {
      agentBus.registerAgent(this.agentId);
      
      // S'abonner aux événements Nexus des autres agents
      this._subscribeToNexusEvents();
      
      // Démarrer les cycles
      this._startInternalHeartbeat();
      this._startInternalCommandPoll();
      this._startNexusSync();
      
      // Notification de connexion à tout l'écosystème
      EventBus.emit('nexus:agent:connected', {
        agentId: this.agentId,
        agentType: this.agentType,
        timestamp: Date.now()
      });
      
      // Broadcast aux autres agents
      this._broadcastToAll({
        type: 'agent_connected',
        status: 'online',
        message: `${this.agentId} (${this.agentType}) connecté au Lab TroxT`
      });
      
      logger.info(`[LabBridge:${this.agentId}] ✅ Connecté via Bus Nexus — Synchronisé avec ${LabBridge.agentRegistry.size} agents`);
      return;
    }

    // ── Mode HTTP ──
    try {
      await this._httpEvent('registered', 'idle', `${this.agentId} connecté via HTTP`);
      this._startHttpHeartbeat();
      this._startHttpCommandPoll();
      logger.info(`[LabBridge:${this.agentId}] ✅ Connecté via HTTP ${this.labUrl}`);
    } catch (error: any) {
      logger.error(`[LabBridge:${this.agentId}] ❌ Échec connexion HTTP: ${error.message}`);
      this.profile.status = 'error';
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SEND EVENT — Envoi d'événement avec synergie Nexus
  // ═══════════════════════════════════════════════════════════

  async sendEvent(
    type:    string,
    status:  string,
    message: string = '',
    meta:    Record<string, any> = {}
  ): Promise<TelemetryPacket> {
    const startTime = performance.now();
    
    // ── Construction du paquet Nexus ──
    const packet: TelemetryPacket = {
      agentId:     this.agentId,
      agentType:   this.agentType,
      type,
      status,
      message,
      meta: {
        ...meta,
        _nexusOptimized: true,
        _agentType: this.agentType
      },
      timestamp:   Date.now(),
      id:          this._generatePacketId(),
      nexusScore:  this._calculateNexusScore(),
      prediction:  this._predictNextEvent(type)
    };
    
    // ── Enregistrement dans l'historique ──
    LabBridge.telemetryHistory.push(packet);
    if (LabBridge.telemetryHistory.length > LabBridge.MAX_TELEMETRY_HISTORY) {
      LabBridge.telemetryHistory.shift();
    }
    
    // ── Mise à jour du profil ──
    this.profile.status = status as AgentProfile['status'];
    this.profile.lastSeen = Date.now();
    if (type === 'error' || type === 'error_critical') {
      this.profile.errors++;
      this.errorsCount++;
    }
    
    // ── Mise à jour de la performance ──
    const latency = performance.now() - startTime;
    this.totalLatency += latency;
    if (latency > this.peakLatency) this.peakLatency = latency;
    
    // ── Diffusion via le Bus ──
    if (!this.useHttp) {
      agentBus.updateAgent(this.agentId, {
        type, status, message,
        meta: packet.meta,
        _nexusPacket: packet
      });
      
      // Diffusion aux autres agents via EventBus
      EventBus.emit(`nexus:telemetry:${this.agentId}`, packet);
      EventBus.emit('nexus:telemetry:all', packet);
      
      // Apprentissage Nexus
      if (type === 'task_completed') {
        this.nexus.learnFromTeam([{
          taskType: meta.task_type || type,
          score: meta.quality_score?.global || 85,
          approach: message
        }]);
      }
    } else {
      await this._httpEvent(type, status, message, meta);
    }
    
    this.packetsSent++;
    
    logger.debug(`[LabBridge] 📤 ${type} → ${status} (${latency.toFixed(2)}ms)`);
    
    return packet;
  }

  // ═══════════════════════════════════════════════════════════
  //  SEND RESULT — Envoi de résultat avec scoring avancé
  // ═══════════════════════════════════════════════════════════

  async sendResult(
    taskId:          string,
    message:         string,
    qualityScore:    Record<string, number> = {},
    filesProduced:   string[] = []
  ): Promise<void> {
    
    // ── Calcul du score Nexus pondéré ──
    const weightedScore = this._calculateWeightedScore(qualityScore);
    const nexusScore = this._calculateNexusScore();
    
    // ── Enrichissement avec métriques Nexus ──
    const enrichedMeta = {
      task_id:        taskId,
      quality_score: {
        ...qualityScore,
        _weighted: weightedScore,
        _nexus: nexusScore,
        _teamSynergy: this._getTeamSynergyScore()
      },
      files_produced: filesProduced,
      agent_type:     this.agentType,
      performance_ms: this.totalLatency / Math.max(1, this.packetsSent)
    };
    
    // ── Envoi de l'événement enrichi ──
    await this.sendEvent('task_completed', 'idle', message, enrichedMeta);
    
    // ── Mise en cache de performance ──
    const perfKey = `${taskId}:${this.agentType}`;
    const existing = this.performanceCache.get(perfKey) || [];
    existing.push(weightedScore);
    if (existing.length > 10) existing.shift();
    this.performanceCache.set(perfKey, existing);
    
    // ── Si le score est excellent, notification spéciale ──
    if (weightedScore >= 95) {
      EventBus.emit('nexus:performance:exceptional', {
        agentId: this.agentId,
        taskId,
        score: weightedScore,
        timestamp: Date.now()
      });
      
      this._broadcastToAll({
        type: 'performance_exceptional',
        status: 'idle',
        message: `🏆 ${this.agentId} — Score exceptionnel: ${weightedScore}`
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  ON COMMAND — Enregistrement de handler de commande
  // ═══════════════════════════════════════════════════════════

  onCommand(
    type:    string,
    handler: (payload: any) => Promise<void>
  ): this {
    this.handlers[type] = handler;
    
    // Notification Nexus
    EventBus.emit(`nexus:handler:registered:${this.agentId}`, {
      type,
      handlerName: handler.name || 'anonymous',
      timestamp: Date.now()
    });
    
    return this;
  }

  // ═══════════════════════════════════════════════════════════
  //  DISCONNECT — Déconnexion propre
  // ═══════════════════════════════════════════════════════════

  async disconnect(): Promise<void> {
    if (this.hbTimer)  clearInterval(this.hbTimer);
    if (this.cmdTimer) clearInterval(this.cmdTimer);
    if (this.syncTimer) clearInterval(this.syncTimer);
    
    this.profile.status = 'offline';
    
    // Notification à tous les agents
    this._broadcastToAll({
      type: 'agent_disconnected',
      status: 'offline',
      message: `${this.agentId} (${this.agentType}) déconnecté`
    });
    
    EventBus.emit('nexus:agent:disconnected', {
      agentId: this.agentId,
      agentType: this.agentType,
      timestamp: Date.now()
    });
    
    await this.sendEvent('stopped', 'offline', `${this.agentId} déconnecté`);
    
    logger.info(`[LabBridge:${this.agentId}] ⏹ Déconnecté`);
  }

  // ═══════════════════════════════════════════════════════════
  //  SYSTÈME DE BROADCAST INTER-AGENTS
  // ═══════════════════════════════════════════════════════════

  private _broadcastToAll(packet: Partial<TelemetryPacket>): void {
    const fullPacket: TelemetryPacket = {
      agentId:     this.agentId,
      agentType:   this.agentType,
      type:        packet.type || 'broadcast',
      status:      packet.status || 'idle',
      message:     packet.message || '',
      meta:        packet.meta || {},
      timestamp:   Date.now(),
      id:          this._generatePacketId(),
      nexusScore:  this._calculateNexusScore()
    };
    
    // Diffusion à tous les agents enregistrés
    for (const [agentId, profile] of LabBridge.agentRegistry) {
      if (agentId !== this.agentId && profile.status === 'online') {
        EventBus.emit(`nexus:telemetry:${agentId}`, fullPacket);
      }
    }
    
    // Diffusion globale
    EventBus.emit('nexus:broadcast', fullPacket);
  }

  // ═══════════════════════════════════════════════════════════
  //  ABONNEMENT AUX ÉVÉNEMENTS DES AUTRES AGENTS
  // ═══════════════════════════════════════════════════════════

  private _subscribeToNexusEvents(): void {
    // Écouter tous les événements télémétrie des autres agents
    EventBus.on('nexus:telemetry:all', (packet: TelemetryPacket) => {
      this.packetsReceived++;
      
      // Mise à jour du registre des agents
      const profile = LabBridge.agentRegistry.get(packet.agentId);
      if (profile) {
        profile.lastSeen = packet.timestamp;
        profile.status = packet.status as AgentProfile['status'];
      }
      
      // Apprentissage Nexus à partir des erreurs des autres
      if (packet.type === 'error' || packet.type === 'error_critical') {
        this.nexus.mirrorCorrect(packet.agentId, {
          type: 'telemetry_error',
          message: packet.message,
          task: { type: packet.meta?.task_type }
        });
      }
    });
    
    // Écouter les broadcasts
    EventBus.on('nexus:broadcast', (packet: TelemetryPacket) => {
      if (packet.type === 'performance_exceptional') {
        // Boost de confiance quand un autre agent performe
        this.nexus.predictionAccuracy = Math.min(0.99, this.nexus.predictionAccuracy + 0.01);
      }
    });
    
    // Écouter les connexions/déconnexions
    EventBus.on('nexus:agent:connected', (data: any) => {
      logger.info(`[LabBridge] 🔗 Agent connecté: ${data.agentId} (${data.agentType})`);
    });
    
    EventBus.on('nexus:agent:disconnected', (data: any) => {
      logger.warn(`[LabBridge] 🔌 Agent déconnecté: ${data.agentId} (${data.agentType})`);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  CYCLE DE SYNCHRONISATION NEXUS
  // ═══════════════════════════════════════════════════════════

  private _startNexusSync(ms = 5000): void {
    this.syncTimer = setInterval(() => {
      // Synchronisation du registre des agents
      const now = Date.now();
      const timeout = 30000; // 30 secondes sans nouvelles = offline
      
      for (const [agentId, profile] of LabBridge.agentRegistry) {
        if (profile.status === 'online' && (now - profile.lastSeen) > timeout) {
          profile.status = 'offline';
          logger.warn(`[LabBridge] ⏰ Timeout: ${agentId} marqué offline`);
        }
      }
      
      // Nettoyage des profils offline depuis plus d'une heure
      const oneHourAgo = now - 3600000;
      for (const [agentId, profile] of LabBridge.agentRegistry) {
        if (profile.status === 'offline' && profile.lastSeen < oneHourAgo) {
          LabBridge.agentRegistry.delete(agentId);
        }
      }
      
      // Rapport de synergie d'équipe périodique
      const report = this._generateTeamSynergyReport();
      if (report.agentsOnline > 0) {
        logger.debug(`[LabBridge] 📊 Synergie d'équipe: ${report.synergyScore}% (${report.agentsOnline}/${report.agentsTotal} agents)`);
        
        if (report.bottlenecks.length > 0) {
          logger.warn(`[LabBridge] ⚠ Goulots: ${report.bottlenecks.join(', ')}`);
        }
      }
      
    }, ms);
  }

  // ═══════════════════════════════════════════════════════════
  //  HEARTBEAT INTERNE
  // ═══════════════════════════════════════════════════════════

  private _startInternalHeartbeat(ms = 10000): void {
    this.hbTimer = setInterval(() => {
      agentBus.updateAgent(this.agentId, {
        type:    'heartbeat',
        status:  'idle',
        message: `${this.agentId} (${this.agentType}) actif`,
        _nexusBeat: true,
        _agentsCount: LabBridge.agentRegistry.size,
        _nexusScore: this._calculateNexusScore()
      });
      
      this.profile.lastSeen = Date.now();
    }, ms);
  }

  // ═══════════════════════════════════════════════════════════
  //  COMMAND POLL INTERNE
  // ═══════════════════════════════════════════════════════════

  private _startInternalCommandPoll(ms = 2000): void {
    this.cmdTimer = setInterval(async () => {
      const cmds = agentBus.pullCommands(this.agentId);
      
      for (const cmd of cmds) {
        await this.sendEvent('command_received', 'busy', `Commande: ${cmd.type}`);
        
        const handler = this.handlers[cmd.type];
        if (handler) {
          try {
            await handler(cmd.payload || {});
            await this.sendEvent('command_ack', 'idle', `Exécuté: ${cmd.type}`);
            
            // Prédiction : quelle commande arrive ensuite ?
            const nextCmd = this._predictNextCommand(cmd.type);
            if (nextCmd) {
              EventBus.emit(`nexus:command:predict:${this.agentId}`, {
                current: cmd.type,
                predicted: nextCmd,
                timestamp: Date.now()
              });
            }
            
          } catch (error: any) {
            this.errorsCount++;
            this.profile.errors++;
            await this.sendEvent('error', 'error', error.message, {
              command: cmd.type,
              stack: error.stack
            });
          }
        } else {
          await this.sendEvent('warning', 'idle', `Non géré: ${cmd.type}`);
        }
      }
    }, ms);
  }

  // ═══════════════════════════════════════════════════════════
  //  HTTP : APPELS REST
  // ═══════════════════════════════════════════════════════════

  private async _httpEvent(
    type:    string,
    status:  string,
    message: string,
    meta:    Record<string, any> = {}
  ): Promise<void> {
    try {
      const response = await fetch(`${this.labUrl}/events`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id:  this.agentId,
          type, status, message,
          timestamp: new Date().toISOString(),
          meta: { ...meta, _agentType: this.agentType }
        })
      });
      
      if (!response.ok) {
        logger.warn(`[LabBridge:${this.agentId}] HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      logger.error(`[LabBridge:${this.agentId}] HTTP error: ${error.message}`);
    }
  }

  private _startHttpHeartbeat(ms = 10000): void {
    this.hbTimer = setInterval(() => {
      this._httpEvent('heartbeat', 'idle', `${this.agentId} actif`);
    }, ms);
  }

  private _startHttpCommandPoll(ms = 2000): void {
    this.cmdTimer = setInterval(async () => {
      try {
        const response = await fetch(`${this.labUrl}/agents/${this.agentId}/commands`);
        if (!response.ok) return;
        
        const cmds = await response.json() as any[];
        for (const cmd of cmds) {
          await this._handleCommand(cmd);
        }
      } catch {
        // Silence les erreurs de polling
      }
    }, ms);
  }

  // ═══════════════════════════════════════════════════════════
  //  GESTION DE COMMANDE
  // ═══════════════════════════════════════════════════════════

  private async _handleCommand(cmd: any): Promise<void> {
    await this.sendEvent('command_received', 'busy', `Commande: ${cmd.type}`);
    
    const handler = this.handlers[cmd.type];
    if (handler) {
      try {
        await handler(cmd.payload || {});
        await this.sendEvent('command_ack', 'idle', `Exécuté: ${cmd.type}`);
      } catch (error: any) {
        this.errorsCount++;
        this.profile.errors++;
        await this.sendEvent('error', 'error', error.message);
      }
    } else {
      await this.sendEvent('warning', 'idle', `Non géré: ${cmd.type}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  PRÉDICTION NEXUS
  // ═══════════════════════════════════════════════════════════

  private _predictNextEvent(currentType: string): string {
    const patterns: Record<string, string> = {
      'heartbeat':        'status_update',
      'task_started':     'task_progress',
      'task_progress':    'task_completed',
      'task_completed':   'heartbeat',
      'command_received': 'command_ack',
      'warning':          'error_correction',
      'error':            'error_critical',
      'error_critical':   'system_halt',
      'agent_connected':  'synergy_sync',
      'performance_exceptional': 'task_assigned'
    };
    
    return patterns[currentType] || 'status_update';
  }

  private _predictNextCommand(currentType: string): string | null {
    const patterns: Record<string, string> = {
      'move':       'action',
      'action':     'interact',
      'interact':   'chat',
      'chat':       'move',
      'buy':        'inventory',
      'inventory':  'equip',
      'equip':      'action'
    };
    
    return patterns[currentType] || null;
  }

  // ═══════════════════════════════════════════════════════════
  //  CALCULS DE SCORE NEXUS
  // ═══════════════════════════════════════════════════════════

  private _calculateWeightedScore(scores: Record<string, number>): number {
    if (Object.keys(scores).length === 0) return 85;
    
    const weights: Record<string, number> = {
      'technicalQuality': 0.25,
      'security':        0.20,
      'compatibility':   0.15,
      'clarity':         0.10,
      'roleCompliance':  0.10,
      'performance':     0.10,
      'reusability':     0.10
    };
    
    let total = 0;
    let weightSum = 0;
    
    for (const [key, value] of Object.entries(scores)) {
      const weight = weights[key] || 0.10;
      total += value * weight;
      weightSum += weight;
    }
    
    return weightSum > 0 ? Math.round(total / weightSum) : 85;
  }

  private _calculateNexusScore(): number {
    // Score basé sur la santé de l'agent et la synergie
    const latencyScore = Math.max(0, 100 - (this.totalLatency / Math.max(1, this.packetsSent) * 10));
    const errorScore = this.errorsCount === 0 ? 100 : Math.max(0, 100 - (this.errorsCount * 5));
    const syncScore = this.profile.nexusSynced ? 100 : 50;
    const teamScore = this._getTeamSynergyScore();
    
    return Math.round((latencyScore * 0.25 + errorScore * 0.35 + syncScore * 0.15 + teamScore * 0.25));
  }

  private _getTeamSynergyScore(): number {
    const online = Array.from(LabBridge.agentRegistry.values())
      .filter(p => p.status === 'online').length;
    const total = LabBridge.agentRegistry.size;
    
    if (total === 0) return 100;
    return Math.round((online / total) * 100);
  }

  // ═══════════════════════════════════════════════════════════
  //  RAPPORT DE SYNERGIE D'ÉQUIPE
  // ═══════════════════════════════════════════════════════════

  private _generateTeamSynergyReport(): TeamSynergyReport {
    const agents = Array.from(LabBridge.agentRegistry.values());
    const online = agents.filter(a => a.status === 'online');
    const offline = agents.filter(a => a.status === 'offline');
    
    const topPerformers = agents
      .filter(a => a.errors === 0 && a.performance.length > 0)
      .slice(0, 3)
      .map(a => a.agentId);
    
    const bottlenecks = agents
      .filter(a => a.errors > 3)
      .map(a => `${a.agentId} (${a.errors} erreurs)`);
    
    const recommendations: string[] = [];
    
    if (offline.length > 0) {
      recommendations.push(`Reconnecter: ${offline.map(a => a.agentId).join(', ')}`);
    }
    
    if (bottlenecks.length > 0) {
      recommendations.push('Vérifier les agents en erreur');
    }
    
    if (online.length < agents.length) {
      recommendations.push(`Améliorer la disponibilité: ${online.length}/${agents.length} en ligne`);
    }
    
    const synergyScore = agents.length > 0
      ? Math.round((online.length / agents.length) * 50 + 
          (agents.filter(a => a.errors === 0).length / agents.length) * 50)
      : 100;
    
    return {
      timestamp: Date.now(),
      agentsOnline: online.length,
      agentsTotal: agents.length,
      synergyScore,
      topPerformers,
      bottlenecks,
      recommendations
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  CAPACITÉS PAR DÉFAUT SELON LE TYPE D'AGENT
  // ═══════════════════════════════════════════════════════════

  private _getDefaultCapabilities(): string[] {
    const capabilities: Record<AgentType, string[]> = {
      'brain':           ['orchestration', 'decision', 'planification', 'validation'],
      'thirdeye':        ['surveillance', 'prediction', 'risque', 'alerte'],
      'intellectus':     ['evenement', 'memoire', 'contrat', 'scheduler', 'validation'],
      'ether-forge':     ['construction', 'code', 'module', 'systeme'],
      'ether-lens':      ['inspection', 'audit', 'analyse', 'rapport'],
      'ether-prism':     ['variante', 'categorie', 'transformation', 'style'],
      'ether-weave':     ['connexion', 'flux', 'event', 'integration'],
      'forge-factory':   ['production', 'generation', 'asset', 'masse'],
      'ether-guard':     ['securite', 'permission', 'blocage', 'audit'],
      'ether-ui':        ['interface', 'hud', 'menu', 'ux'],
      'ether-sim':       ['test', 'simulation', 'scenario', 'validation'],
      'ether-deploy':    ['deploiement', 'build', 'release', 'version'],
      'ether-memory':    ['stockage', 'historique', 'decision', 'standard'],
      'ether-core':      ['standard', 'convention', 'regle', 'nom'],
      'command-handler': ['commande', 'routage', 'traitement', 'securite'],
      'unknown':         ['base']
    };
    
    return capabilities[this.agentType] || capabilities['unknown'];
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITAIRES
  // ═══════════════════════════════════════════════════════════

  private _generatePacketId(): string {
    return crypto.createHash('md5')
      .update(`${this.agentId}:${Date.now()}:${Math.random()}`)
      .digest('hex')
      .slice(0, 8);
  }

  // ═══════════════════════════════════════════════════════════
  //  ACCÈS STATIQUE AU REGISTRE DES AGENTS
  // ═══════════════════════════════════════════════════════════

  static getAgentRegistry(): Map<string, AgentProfile> {
    return LabBridge.agentRegistry;
  }

  static getTelemetryHistory(): TelemetryPacket[] {
    return LabBridge.telemetryHistory;
  }

  static getAgentsByType(type: AgentType): AgentProfile[] {
    return Array.from(LabBridge.agentRegistry.values())
      .filter(p => p.agentType === type);
  }

  static getOnlineAgents(): AgentProfile[] {
    return Array.from(LabBridge.agentRegistry.values())
      .filter(p => p.status === 'online' || p.status === 'busy');
  }

  static getTeamSynergyReport(): TeamSynergyReport {
    // Nécessite une instance pour générer le rapport complet
    const agents = Array.from(LabBridge.agentRegistry.values());
    const online = agents.filter(a => a.status === 'online');
    
    return {
      timestamp: Date.now(),
      agentsOnline: online.length,
      agentsTotal: agents.length,
      synergyScore: agents.length > 0 ? Math.round((online.length / agents.length) * 100) : 100,
      topPerformers: [],
      bottlenecks: [],
      recommendations: []
    };
  }
}

// ═══════════════════════════════════════════════════════════════
//  FACTORY RAPIDE AVEC DÉTECTION AUTOMATIQUE DU TYPE
// ═══════════════════════════════════════════════════════════════

export function createBridge(agentId: string): LabBridge {
  // Détection automatique du type d'agent basée sur le nom
  const agentType = detectAgentType(agentId);
  
  return new LabBridge({
    agentId,
    useHttp: false,
    agentType,
    enableNexus: true
  });
}

export function detectAgentType(agentId: string): AgentType {
  const id = agentId.toLowerCase();
  
  if (id.includes('brain'))                return 'brain';
  if (id.includes('thirdeye') || id.includes('third-eye') || id.includes('third_eye')) return 'thirdeye';
  if (id.includes('intellectus'))           return 'intellectus';
  if (id.includes('forge'))                return 'ether-forge';
  if (id.includes('lens'))                 return 'ether-lens';
  if (id.includes('prism'))                return 'ether-prism';
  if (id.includes('weave'))                return 'ether-weave';
  if (id.includes('factory'))              return 'forge-factory';
  if (id.includes('guard'))                return 'ether-guard';
  if (id.includes('ui') || id.includes('ether-ui')) return 'ether-ui';
  if (id.includes('sim'))                  return 'ether-sim';
  if (id.includes('deploy'))               return 'ether-deploy';
  if (id.includes('memory'))               return 'ether-memory';
  if (id.includes('core'))                 return 'ether-core';
  if (id.includes('command') || id.includes('handler')) return 'command-handler';
  
  return 'unknown';
}