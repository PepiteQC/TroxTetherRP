import { EventEmitter } from 'events';
import { Logger } from '../lib/logger.js';
import { Database } from '../lib/database.js';
import { RedisClient } from '../lib/redis.js';
import { Optimizer } from '../optimizer/Optimizer.js';
import { AgentBus } from '../agents/AgentBus.js';
import { Brain } from '../brain/Brain.js';
import { Engine } from '../engine/Engine.js';
import { EtherPrism } from '../etherprism/EtherPrism.js';
import { HealthMonitor } from '../monitoring/HealthMonitor.js';
import { Telemetry } from '../monitoring/Telemetry.js';
import { AutoScaler } from '../scaling/AutoScaler.js';
import { APIServer } from '../api/APIServer.js';
import { StateMachine, SystemState } from './StateMachine.js';
import { EventBus } from './EventBus.js';
import { ForgeBridge } from '../forge/ForgeBridge.js';
import type { SystemConfig, SystemStatus } from '../types/index.js';

export class TroxtOS extends EventEmitter {
  private stateMachine: StateMachine;
  private eventBus: EventBus;
  private config: SystemConfig;
  private log: Logger;
  private startTime: number = 0;

  // Services
  private db!: Database;
  private redis!: RedisClient;
  private optimizer!: Optimizer;
  private agentBus!: AgentBus;
  private brain!: Brain;
  private engine!: Engine;
  private etherPrism!: EtherPrism;
  private health!: HealthMonitor;
  private telemetry!: Telemetry;
  private autoScaler!: AutoScaler;
  private api!: APIServer;
  private forge!: ForgeBridge;

  constructor(config: SystemConfig) {
    super();
    this.config = config;
    this.log = new Logger('TroxT:Core');
    this.stateMachine = new StateMachine();
    this.eventBus = new EventBus();
    this.log.info('TroxT OS instance créée');
  }

  async initialize(): Promise<void> {
    this.stateMachine.transition(SystemState.INITIALIZING);
    this.log.info('Initialisation des services...');

    try {
      // 1. Database
      this.db = new Database(this.config.database);
      await this.db.connect();
      this.log.success('Database connectée');

      // 2. Redis
      this.redis = new RedisClient(this.config.redis);
      await this.redis.connect();
      this.log.success('Redis connecté');

      // 3. Event Bus
      this.eventBus.register('system:error', this.handleError.bind(this));
      this.eventBus.register('system:critical', this.handleCritical.bind(this));
      this.eventBus.register('optimizer:mutation', this.handleMutation.bind(this));
      this.eventBus.register('etherprism:evolution', this.handleEvolution.bind(this));

      // 4. Optimizer
      this.optimizer = new Optimizer(this.config.optimizer, this.db, this.redis);
      await this.optimizer.initialize();
      this.log.success('Optimizer initialisé');

      // 5. Agent Bus
      this.agentBus = new AgentBus(this.config.agents, this.redis);
      this.agentBus.on('agent:status', (data) => this.eventBus.emit('agent:status', data));
      await this.agentBus.initialize();
      this.log.success(`Agent Bus initialisé (${this.agentBus.getAgentCount()} agents)`);

      // 6. Brain
      this.brain = new Brain(this.optimizer, this.agentBus, this.redis);
      await this.brain.initialize();
      this.log.success('Brain initialisé');

      // 7. EtherPrism
      if (this.config.etherprism.enabled) {
        this.etherPrism = new EtherPrism(this.config.etherprism, this.redis);
        this.etherPrism.on('brain:born', (data) => this.eventBus.emit('etherprism:evolution', data));
        await this.etherPrism.initialize();
        this.log.success(`EtherPrism initialisé (${this.config.etherprism.populationSize} cerveaux)`);
      }

      // 8. Forge Bridge
      if (this.config.forge.enabled) {
        this.forge = new ForgeBridge(this.config.forge, this.redis);
        await this.forge.initialize();
        this.log.success('Forge Bridge initialisé');
      }

      // 9. Monitoring
      this.health = new HealthMonitor(this.config.health, this.eventBus);
      this.telemetry = new Telemetry(this.config.telemetry, this.db, this.redis);
      this.autoScaler = new AutoScaler(this.config.agents, this.agentBus, this.health);

      // 10. API Server
      this.api = new APIServer(this.config.server, {
        db: this.db,
        redis: this.redis,
        optimizer: this.optimizer,
        agentBus: this.agentBus,
        brain: this.brain,
        etherPrism: this.etherPrism,
        forge: this.forge,
        health: this.health,
        telemetry: this.telemetry,
        eventBus: this.eventBus,
      });

      this.stateMachine.transition(SystemState.READY);
      this.log.success('✅ Initialisation terminée avec succès');
    } catch (err) {
      this.log.error('❌ Échec initialisation', err);
      this.stateMachine.transition(SystemState.CRITICAL);
      throw err;
    }
  }

  async start(): Promise<void> {
    if (this.stateMachine.current !== SystemState.READY) {
      throw new Error(`Impossible de démarrer depuis l'état: ${this.stateMachine.current}`);
    }

    this.stateMachine.transition(SystemState.STARTING);
    this.startTime = Date.now();
    this.log.info('Démarrage des services...');

    try {
      // 1. Monitoring
      this.health.start();
      this.telemetry.start();
      this.autoScaler.start();
      this.log.success('Monitoring actif');

      // 2. API
      await this.api.start();
      this.log.success(`API Server démarré sur le port ${this.config.server.port}`);

      // 3. Engine (cycle infini)
      this.engine = new Engine({
        brain: this.brain,
        optimizer: this.optimizer,
        agentBus: this.agentBus,
        etherPrism: this.etherPrism,
        forge: this.forge,
        eventBus: this.eventBus,
        config: this.config,
      });
      this.engine.start();
      this.log.success('Moteur de cycle infini démarré');

      // 4. Auto-démarrer EtherPrism
      if (this.etherPrism) {
        this.etherPrism.startEvolution();
      }

      this.stateMachine.transition(SystemState.RUNNING);
      this.emit('started', { uptime: this.uptime });
      this.log.success('✅ TroxT OS pleinement opérationnel');
    } catch (err) {
      this.log.error('❌ Échec démarrage', err);
      this.stateMachine.transition(SystemState.CRITICAL);
      await this.handleCritical(err);
    }
  }

  async execute(request: string, userId?: string, options?: {
    useCollective?: boolean;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    timeout?: number;
  }): Promise<any> {
    const state = this.stateMachine.current;
    if (state === SystemState.CRITICAL || state === SystemState.SHUTTING_DOWN) {
      throw new Error(`Système indisponible (état: ${state})`);
    }

    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.log.info(`📨 [${requestId}] ${request.slice(0, 80)}...`);

    try {
      // Exécution via le Brain
      const result = await this.brain.execute(request, userId, options);

      // Auto-optimisation
      const duration = Date.now() - startTime;
      await this.optimizer.evolve(
        result.promptUsed || 'router',
        result,
        duration
      );

      // Nourrir EtherPrism
      if (this.etherPrism && result.validation) {
        await this.etherPrism.learn(request, result, duration);
      }

      // Métriques
      this.eventBus.emit('request:completed', {
        requestId,
        duration,
        score: result.validation?.score || 0,
        agents: result.agents_impliques?.length || 0,
      });

      return result;
    } catch (err) {
      this.log.error(`❌ [${requestId}] Échec`, err);
      this.eventBus.emit('request:failed', { requestId, error: err.message });
      throw err;
    }
  }

  private async handleError(data: any): Promise<void> {
    this.log.warn('Erreur système', data);
    if (this.stateMachine.current === SystemState.RUNNING) {
      this.stateMachine.transition(SystemState.DEGRADED);
      await this.recover();
    }
  }

  private async handleCritical(data: any): Promise<void> {
    this.log.error('État critique', data);
    this.stateMachine.transition(SystemState.CRITICAL);
    await this.recover();
  }

  private async handleMutation(data: any): Promise<void> {
    this.log.info(`🧬 Mutation: ${data.type} — nouveau score: ${data.score}`);
    this.telemetry.recordMutation(data);
  }

  private async handleEvolution(data: any): Promise<void> {
    this.log.info(`🔮 Évolution: cerveau ${data.brainId} — génération ${data.generation}`);
    this.telemetry.recordEvolution(data);
  }

  private async recover(): Promise<void> {
    const attempts = this.stateMachine.recoveryAttempts;
    if (attempts >= this.config.health.maxRetries) {
      this.log.error('💀 Nombre max de tentatives atteint');
      return;
    }

    this.stateMachine.transition(SystemState.RECOVERING);
    this.log.info(`🔄 Tentative de récupération #${attempts + 1}`);

    try {
      await this.db.ping();
      await this.redis.ping();
      await this.optimizer.initialize();
      await this.agentBus.initialize();
      this.health.reset();
      this.stateMachine.resetRecovery();
      this.stateMachine.transition(SystemState.RUNNING);
      this.log.success('✅ Récupération réussie');
    } catch (err) {
      this.log.error('❌ Échec récupération', err);
      this.stateMachine.transition(SystemState.CRITICAL);
      await this.recover();
    }
  }

  async shutdown(): Promise<void> {
    this.stateMachine.transition(SystemState.SHUTTING_DOWN);
    this.log.info('Arrêt du système...');

    try {
      this.engine?.stop();
      this.health?.stop();
      this.telemetry?.stop();
      this.autoScaler?.stop();
      await this.api?.stop();
      this.etherPrism?.stopEvolution();
      await this.db?.disconnect();
      await this.redis?.disconnect();
      this.stateMachine.transition(SystemState.STOPPED);
      this.log.success('✅ Système arrêté proprement');
    } catch (err) {
      this.log.error('❌ Erreur lors de l\'arrêt', err);
    }
  }

  get uptime(): number {
    return this.startTime ? Date.now() - this.startTime : 0;
  }

  getStatus(): SystemStatus {
    return {
      state: this.stateMachine.current,
      uptime: this.uptime,
      version: this.config.version,
      mode: this.config.mode,
      services: {
        database: this.db?.isConnected() || false,
        redis: this.redis?.isConnected() || false,
        api: this.api?.isRunning() || false,
        engine: this.engine?.isRunning() || false,
        etherprism: this.etherPrism?.isActive() || false,
        forge: this.forge?.isReady() || false,
      },
      agents: this.agentBus?.getMetrics() || { total: 0, active: 0, idle: 0, failed: 0 },
      optimizer: this.optimizer?.getStats() || { totalPrompts: 0, averageScore: 0, mutations: 0 },
      intelligence: this.etherPrism?.getStats() || { totalBrains: 0, averageIQ: 0, generation: 0 },
      health: this.health?.getLastStatus() || null,
      metrics: this.telemetry?.getLatestSnapshot() || null,
    };
  }
}