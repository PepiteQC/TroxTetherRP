// ============================================================
// C:\TroxTServerRP\server\core\TroxTServer.ts
// Orchestrateur Principal — Production Ready / AAA Grade
// ============================================================

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import type { Server } from 'http';

// ── Engine ────────────────────────────────────────────────
import { PhysicsWorld } from '../engine/PhysicsWorld.js';
import { EntityManager } from '../engine/EntityManager.js';
import { WorldStateManager } from '../engine/WorldState.js';
import { EventBus } from '../engine/EventBus.js';

// ── Core ──────────────────────────────────────────────────
import { WorldManager } from './WorldManager.js';
import { PlayerManager } from './PlayerManager.js';

// ── Network ───────────────────────────────────────────────
import { WebSocketGateway } from '../network/WebSocketGateway.js';
import { PacketHandler } from '../network/PacketHandler.js';
import { Authority } from '../network/Authority.js';

// ── Agents ────────────────────────────────────────────────
import { TroxTBrain } from '../troxt-core/Brain.js';
import { ThirdEye } from '../troxt-core/ThirdEye.js';
import { Intellectus } from '../intellectus/index.js';

// ── Logger & Config ───────────────────────────────────────
import { logger } from '../lib/logger.js';
import type { ServerSettings } from '../lib/settings.js';

// ============================================================
// Types
// ============================================================

export interface TroxTBusPayloads {
  'player:connected': {
    id: string;
    ip: string;
    name: string;
  };

  'player:disconnected': {
    id: string;
    reason: string;
  };

  'entity:spawned': {
    id: string;
    type: string;
  };

  'thirdeye:critical': {
    code: string;
    message: string;
    severity: number;
  };

  'bootstrap:complete': {
    totalMs: number;
    steps: number;
  };

  'gameloop:slow': {
    tickMs: number;
    budget: number;
    drops: number;
  };

  'server:stats': {
    tick: number;
    memoryMb: number;
    droppedTicks: number;
    avgTickMs: number;
  };

  'server:ready': {
    tick: number;
    ts: number;
  };

  'server:stopped': void;

  'server:shutdown': {
    signal: string;
    timestamp: number;
  };
}

type ServerState = 'stopped' | 'starting' | 'running' | 'stopping';

type LifecycleService = {
  stop?: () => void | Promise<void>;
  dispose?: () => void | Promise<void>;
};

export interface ServerDiagnostics {
  state: ServerState;
  tick: number;
  tickRate: number;
  uptime: number;

  players: number;
  entities: number;

  memoryMb: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  } | null;

  performance: {
    droppedTicks: number;
    avgTickMs: number;
    lastTickMs: number;
    maxTickMs: number;
    tickBudgetMs: number;
  };

  agents: {
    brain: boolean;
    thirdEye: boolean;
    intellectus: boolean;
  };
}

// ============================================================
// TroxTServer
// ============================================================

export class TroxTServer extends EventEmitter {
  private static _instance: TroxTServer | null = null;

  static getInstance(): TroxTServer {
    if (!TroxTServer._instance) {
      TroxTServer._instance = new TroxTServer();
    }

    return TroxTServer._instance;
  }

  // ── État serveur ─────────────────────────────────────────
  public state: ServerState = 'stopped';
  public settings: ServerSettings | null = null;

  // ── Engine ───────────────────────────────────────────────
  public physics: PhysicsWorld | null = null;
  public entityManager: EntityManager | null = null;
  public worldState: WorldStateManager | null = null;
  public bus: EventBus | null = null;

  // ── Core Managers ────────────────────────────────────────
  public worldManager: WorldManager | null = null;
  public playerManager: PlayerManager | null = null;
  public gateway: WebSocketGateway | null = null;

  // ── Agents IA ────────────────────────────────────────────
  public brain: TroxTBrain | null = null;
  public thirdEye: ThirdEye | null = null;
  public intellectus: Intellectus | null = null;

  // ── Clock interne ────────────────────────────────────────
  private _tick = 0;
  private _tickRate = 20;
  private _stepMs = 50;
  private _tickBudgetMs = 62.5;

  private _tickTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastRealTime = 0;
  private _expectedTime = 0;

  private _shuttingDown = false;
  private _eventsBound = false;

  // ── Handlers internes, gardés en référence pour cleanup ──
  private _onPlayerConnected:
    | ((data: TroxTBusPayloads['player:connected']) => void)
    | null = null;

  private _onPlayerDisconnected:
    | ((data: TroxTBusPayloads['player:disconnected']) => void)
    | null = null;

  private _onThirdEyeCritical:
    | ((data: TroxTBusPayloads['thirdeye:critical']) => void)
    | null = null;

  // ── Métriques zéro-GC ────────────────────────────────────
  private _stats = {
    startTime: 0,
    droppedTicks: 0,
    tickMsHistory: new Float32Array(120),
    historyIdx: 0,
    historyFilled: 0,
    sumTickMs: 0,
    lastTickMs: 0,
    maxTickMs: 0,
  };

  private constructor() {
    super();
    this.setMaxListeners(64);
  }

  // ============================================================
  // INITIALISATION
  // ============================================================

  async initialize(httpServer: Server, settings: ServerSettings): Promise<void> {
    if (this.state !== 'stopped') {
      throw new Error(
        `[TroxTServer] Initialisation impossible — état actuel : ${this.state}`,
      );
    }

    this.state = 'starting';
    this.settings = settings;
    this._shuttingDown = false;

    this._resetRuntimeStats();

    const configuredTickRate = Number(settings.server?.tickRate ?? 20);

    this._tickRate = Number.isFinite(configuredTickRate)
      ? Math.max(1, Math.min(120, configuredTickRate))
      : 20;

    this._stepMs = 1000 / this._tickRate;
    this._tickBudgetMs = this._stepMs * 1.25;

    const bootStart = performance.now();

    logger.info('[TroxTServer] 🚀 Démarrage de la séquence serveur...');

    try {
      // 1. Event bus
      this.bus = EventBus.getInstance();

      // 2. Physics
      const gravityY = settings.world?.gravity?.y ?? -9.81;

      this.physics = new PhysicsWorld(gravityY);
      this.physics.start();

      // 3. Entity + World State
      this.entityManager = new EntityManager(this.physics);

      this.worldState = new WorldStateManager({
        worldName: settings.world?.name ?? 'TroxTWorld',
        timeOfDay: settings.world?.timeOfDay ?? 'day',
        weather: settings.world?.weather as any,
        gravity: Math.abs(gravityY),
        maxPlayers: settings.websocket?.maxConnections ?? 100,
      });

      // 4. World Manager
      this.worldManager = new WorldManager(this);
      await this.worldManager.loadWorld();

      // 5. Player Manager
      this.playerManager = new PlayerManager(this);

      // 6. Agents
      if (settings.features?.troxtBrain !== false) {
        this.brain = TroxTBrain.getInstance();
      }

      if (settings.features?.troxtThirdEye !== false) {
        this.thirdEye = ThirdEye.getInstance();
      }

      this.intellectus = new Intellectus(this.bus);

      // 7. Network
      const authority = new Authority();
      const handler = new PacketHandler(this.bus);

      this.gateway = new WebSocketGateway(
        httpServer,
        this.bus,
        handler,
        authority,
      );

      // 8. Events internes
      this._bindInternalEvents();

      // 9. Start runtime
      this.state = 'running';

      this._startDriftFreeLoop();

      this.brain?.activate();

      const bootMs = Math.round(performance.now() - bootStart);

      this.bus.emit('bootstrap:complete', {
        totalMs: bootMs,
        steps: 9,
      });

      logger.info(
        `[TroxTServer] ✅ Serveur en ligne — ${this._tickRate} TPS — boot ${bootMs}ms`,
      );

      this.emit('server:ready', {
        tick: this._tick,
        ts: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      logger.error(`[TroxTServer] 💥 Échec critique init : ${message}`);

      try {
        await this.shutdown();
      } catch (shutdownErr) {
        const shutdownMessage =
          shutdownErr instanceof Error
            ? shutdownErr.message
            : String(shutdownErr);

        logger.error(
          `[TroxTServer] 💥 Échec cleanup après init ratée : ${shutdownMessage}`,
        );
      }

      this.state = 'stopped';
      throw err;
    }
  }

  // ============================================================
  // GAME LOOP — Drift-Free / Monotonic Clock
  // ============================================================

  private _startDriftFreeLoop(): void {
    if (this._tickTimer) {
      clearTimeout(this._tickTimer);
      this._tickTimer = null;
    }

    const now = performance.now();

    this._lastRealTime = now;
    this._expectedTime = now + this._stepMs;

    const loop = (): void => {
      if (this.state !== 'running') {
        return;
      }

      const frameNow = performance.now();

      const rawDelta = (frameNow - this._lastRealTime) / 1000;
      const delta = this._clamp(rawDelta, 0, 0.1);

      this._lastRealTime = frameNow;

      const tickStart = performance.now();

      try {
        this._tick++;

        this._tickInput(delta);
        this._tickPhysics(delta);
        this._tickEntities(delta, frameNow);
        this._tickPlayers(delta, frameNow);
        this._tickSystems(delta, frameNow);
        this._tickBroadcast();
        this._tickStats();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error(`[TroxTServer] Erreur Tick ${this._tick}: ${message}`);

        this.thirdEye?.reportError('tick_exception', {
          tick: this._tick,
          error: message,
        });
      }

      const elapsed = performance.now() - tickStart;

      this._recordTickPerformance(elapsed);

      this._expectedTime += this._stepMs;

      let nextDelay = this._expectedTime - performance.now();

      const maxAllowedDrift = this._stepMs * 4;

      if (nextDelay < -maxAllowedDrift) {
        const lostTicks = Math.floor(Math.abs(nextDelay) / this._stepMs);

        this._stats.droppedTicks += lostTicks;
        this._expectedTime = performance.now() + this._stepMs;
        nextDelay = this._stepMs;

        logger.warn(
          `[TroxTServer] ⚠️ Drift majeur détecté — ${lostTicks} ticks sautés`,
        );
      }

      this._tickTimer = setTimeout(loop, Math.max(0, nextDelay));
    };

    this._tickTimer = setTimeout(loop, this._stepMs);
  }

  private _recordTickPerformance(ms: number): void {
    const s = this._stats;
    const idx = s.historyIdx;

    const oldValue = s.tickMsHistory[idx] ?? 0;

    s.tickMsHistory[idx] = ms;
    s.sumTickMs = s.sumTickMs - oldValue + ms;

    s.historyIdx = (idx + 1) % s.tickMsHistory.length;
    s.historyFilled = Math.min(s.historyFilled + 1, s.tickMsHistory.length);

    s.lastTickMs = ms;

    if (ms > s.maxTickMs) {
      s.maxTickMs = ms;
    }

    if (ms > this._tickBudgetMs) {
      s.droppedTicks++;

      if (s.droppedTicks % 25 === 0) {
        logger.warn(
          `[TroxTServer] ⚠️ Surcharge CPU — tick ${Math.round(ms)}ms / budget ${Math.round(
            this._tickBudgetMs,
          )}ms`,
        );

        this.bus?.emit('gameloop:slow', {
          tickMs: ms,
          budget: this._tickBudgetMs,
          drops: s.droppedTicks,
        });
      }
    }
  }

  // ============================================================
  // Sous-routines du tick
  // ============================================================

  private _tickInput(dt: number): void {
    this.playerManager?.processInputQueue(dt);
  }

  private _tickPhysics(dt: number): void {
    this.physics?.step(dt);
  }

  private _tickEntities(dt: number, ts: number): void {
    this.entityManager?.update(dt);
    this.worldState?.update(dt);

    void ts;
  }

  private _tickPlayers(dt: number, ts: number): void {
    this.playerManager?.updateAll(dt, ts);
  }

  private _tickSystems(dt: number, ts: number): void {
    this.brain?.tick(dt, ts);
    this.intellectus?.update(dt);
  }

  private _tickBroadcast(): void {
    this.gateway?.broadcast({
      type: 'WORLD_TICK',
      payload: {
        tick: this._tick,
        players: this.getPlayerCount(),
        entities: this.getEntityCount(),
      },
      timestamp: Date.now(),
    });
  }

  private _tickStats(): void {
    if (!this.bus) return;

    if (this._tick % this._tickRate !== 0) {
      return;
    }

    const mem = process.memoryUsage();

    this.bus.emit('server:stats', {
      tick: this._tick,
      memoryMb: Math.round(mem.heapUsed / 1024 / 1024),
      droppedTicks: this._stats.droppedTicks,
      avgTickMs: this._getAverageTickMs(),
    });
  }

  // ============================================================
  // Événements internes
  // ============================================================

  private _bindInternalEvents(): void {
    if (!this.bus || this._eventsBound) {
      return;
    }

    this._onPlayerConnected = (
      data: TroxTBusPayloads['player:connected'],
    ): void => {
      this.emit('player:connected', data);
    };

    this._onPlayerDisconnected = (
      data: TroxTBusPayloads['player:disconnected'],
    ): void => {
      this.emit('player:disconnected', data);
    };

    this._onThirdEyeCritical = (
      data: TroxTBusPayloads['thirdeye:critical'],
    ): void => {
      logger.error(
        `[TroxTServer] 🚨 ThirdEye Critical [${data.code}] severity=${data.severity}: ${data.message}`,
      );

      this.emit('thirdeye:critical', data);
    };

    this.bus.on('player:connected', this._onPlayerConnected);
    this.bus.on('player:disconnected', this._onPlayerDisconnected);
    this.bus.on('thirdeye:critical', this._onThirdEyeCritical);

    this._eventsBound = true;
  }

  private _unbindInternalEvents(): void {
    if (!this.bus || !this._eventsBound) {
      return;
    }

    if (this._onPlayerConnected) {
      this.bus.off('player:connected', this._onPlayerConnected);
    }

    if (this._onPlayerDisconnected) {
      this.bus.off('player:disconnected', this._onPlayerDisconnected);
    }

    if (this._onThirdEyeCritical) {
      this.bus.off('thirdeye:critical', this._onThirdEyeCritical);
    }

    this._onPlayerConnected = null;
    this._onPlayerDisconnected = null;
    this._onThirdEyeCritical = null;

    this._eventsBound = false;
  }

  // ============================================================
  // Diagnostics
  // ============================================================

  getPlayerCount(): number {
    return this.playerManager?.getOnlineCount() ?? 0;
  }

  getEntityCount(): number {
    return this.entityManager?.getCount() ?? 0;
  }

  getDiagnostics(): ServerDiagnostics {
    const mem = process.memoryUsage();

    return {
      state: this.state,
      tick: this._tick,
      tickRate: this._tickRate,

      uptime:
        this._stats.startTime > 0
          ? Math.floor((Date.now() - this._stats.startTime) / 1000)
          : 0,

      players: this.getPlayerCount(),
      entities: this.getEntityCount(),

      memoryMb: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
      },

      performance: {
        droppedTicks: this._stats.droppedTicks,
        lastTickMs: Math.round(this._stats.lastTickMs * 10) / 10,
        avgTickMs: this._getAverageTickMs(),
        maxTickMs: Math.round(this._stats.maxTickMs * 10) / 10,
        tickBudgetMs: Math.round(this._tickBudgetMs * 10) / 10,
      },

      agents: {
        brain: !!this.brain,
        thirdEye: !!this.thirdEye,
        intellectus: !!this.intellectus,
      },
    };
  }

  // ============================================================
  // Shutdown sécurisé
  // ============================================================

  async shutdown(): Promise<void> {
    if (this._shuttingDown) {
      return;
    }

    if (this.state === 'stopped') {
      return;
    }

    this._shuttingDown = true;
    this.state = 'stopping';

    logger.info('[TroxTServer] 🛑 Arrêt ordonné des services...');

    this.emit('server:shutdown', {
      signal: 'manual',
      timestamp: Date.now(),
    });

    if (this._tickTimer) {
      clearTimeout(this._tickTimer);
      this._tickTimer = null;
    }

    this._unbindInternalEvents();

    const steps: Array<[string, LifecycleService | null]> = [
      ['PlayerManager', this.playerManager],
      ['WorldManager', this.worldManager],
      ['EntityManager', this.entityManager],
      ['WorldState', this.worldState],
      ['Intellectus', this.intellectus],
      ['ThirdEye', this.thirdEye],
      ['Brain', this.brain],
      ['Gateway', this.gateway],
      ['Physics', this.physics],
    ];

    for (const [name, service] of steps) {
      if (!service) {
        continue;
      }

      try {
        if (service.stop) {
          await service.stop();
        }

        if (service.dispose) {
          await service.dispose();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        logger.warn(`[TroxTServer] Erreur fermeture ${name}: ${message}`);
      }
    }

    this.playerManager = null;
    this.worldManager = null;
    this.entityManager = null;
    this.worldState = null;

    this.intellectus = null;
    this.thirdEye = null;
    this.brain = null;

    this.gateway = null;
    this.physics = null;

    this.bus = null;
    this.settings = null;

    this.state = 'stopped';
    this._shuttingDown = false;

    TroxTServer._instance = null;

    logger.info('[TroxTServer] 💤 Séquence d’arrêt terminée.');

    this.emit('server:stopped');
  }

  // ============================================================
  // Helpers internes
  // ============================================================

  private _resetRuntimeStats(): void {
    this._tick = 0;

    this._stats.startTime = Date.now();
    this._stats.droppedTicks = 0;
    this._stats.historyIdx = 0;
    this._stats.historyFilled = 0;
    this._stats.sumTickMs = 0;
    this._stats.lastTickMs = 0;
    this._stats.maxTickMs = 0;
    this._stats.tickMsHistory.fill(0);
  }

  private _getAverageTickMs(): number {
    const count = Math.max(1, this._stats.historyFilled);
    const avg = this._stats.sumTickMs / count;

    return Math.round(avg * 10) / 10;
  }

  private _clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return min;
    }

    return Math.min(max, Math.max(min, value));
  }
}