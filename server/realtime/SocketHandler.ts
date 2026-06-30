/**
 * SocketHandler v2.0.0 — Gestionnaire WebSocket Ultra
 * Tous les événements temps réel du serveur RP
 * Port-Éther RP — Fichier: server/realtime/SocketHandler.ts
 *
 * Améliorations v2:
 * - Rate limiting par événement
 * - Middleware d'auth centralisé
 * - Rooms géographiques (proximity)
 * - Inventaire complet (use/drop/give)
 * - Transfert bancaire P2P
 * - Système de factions
 * - Audit log socket
 * - Métriques temps réel
 * - Gestion d'erreurs typée
 * - Anti-cheat enrichi
 */

import { Server as IOServer, Socket } from 'socket.io';
import ThirdEye from '../brain/ThirdEye';
import PlayerManager from '../core/PlayerManager';
import EconomyEngine from '../rp/EconomyEngine';
import JobEngine from '../rp/JobEngine';
import WorldEngine from '../world/WorldEngine';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

type Weather = import('../world/WorldEngine').Weather;
type Player = NonNullable<ReturnType<typeof PlayerManager.get>>;
type EventResult = Record<string, unknown>;

interface AuthData {
  steamId?: string;
  name?: string;
  token?: string;
}

interface PositionData {
  x: number;
  y: number;
  z: number;
  heading?: number;
  speed?: number;
  anim?: string;
}

interface BankData { amount: number; note?: string; }
interface TransferData { targetId: string; amount: number; note?: string; }
interface JobData { jobId: string; }
interface DutyData { onDuty: boolean; }
interface ChatData { message: string; channel: ChatChannel; }
interface InteractData { poiId: string; action: string; payload?: unknown; }
interface AdminCmdData { command: string; args: unknown[]; adminKey?: string; }
interface InvUseData { itemId: string; quantity?: number; }
interface InvDropData { itemId: string; quantity?: number; }
interface InvGiveData { itemId: string; targetId: string; quantity?: number; }
interface FactionData { factionId: string; action: 'join' | 'leave' | 'info'; }
interface EmoteData { emote: string; }
interface VehicleData { vehicleId: string; action: 'enter' | 'exit' | 'lock' | 'unlock'; }
interface HouseData { houseId: string; action: 'enter' | 'exit' | 'buy' | 'sell'; }

type ChatChannel = 'local' | 'global' | 'job' | 'radio' | 'faction' | 'whisper';
type NotifType = 'success' | 'error' | 'info' | 'warning';

interface SocketMeta {
  connectedAt: number;
  lastActivity: number;
  requestCount: number;
  rateLimits: Map<string, { count: number; resetAt: number }>;
  ip: string;
  banned: boolean;
}

interface AuditEntry {
  event: string;
  socketId: string;
  playerId?: string;
  data?: unknown;
  ts: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ÉVÉNEMENTS — Dictionnaire centralisé
// ══════════════════════════════════════════════════════════════════════════════

export const EVENTS = {
  // Auth
  C_AUTH: 'auth',
  S_AUTH_OK: 'AUTH:OK',
  S_AUTH_ERR: 'AUTH:ERROR',

  // Joueur
  C_POSITION: 'player:position',
  C_PLAYER_EMOTE: 'player:emote',
  S_PLAYER_JOIN: 'PLAYER:JOINED',
  S_PLAYER_LEAVE: 'PLAYER:LEFT',
  S_PLAYER_MOVE: 'PLAYER:MOVED',
  S_PLAYER_UPDATE: 'PLAYER:UPDATE',
  S_PLAYER_EMOTE: 'PLAYER:EMOTE',
  S_PLAYERS_NEARBY: 'PLAYERS:NEARBY',

  // Économie
  C_BANK_DEPOSIT: 'bank:deposit',
  C_BANK_WITHDRAW: 'bank:withdraw',
  C_BANK_TRANSFER: 'bank:transfer',
  C_BANK_BALANCE: 'bank:balance',
  S_BANK_RESULT: 'BANK:RESULT',

  // Jobs
  C_JOB_JOIN: 'job:join',
  C_JOB_LEAVE: 'job:leave',
  C_JOB_DUTY: 'job:duty',
  S_JOB_RESULT: 'JOB:RESULT',
  S_SALARY_PAID: 'JOB:SALARY',

  // Inventaire
  C_INV_USE: 'inventory:use',
  C_INV_DROP: 'inventory:drop',
  C_INV_GIVE: 'inventory:give',
  S_INV_UPDATE: 'INVENTORY:UPDATE',

  // Véhicules
  C_VEHICLE: 'vehicle:action',
  S_VEHICLE_RESULT: 'VEHICLE:RESULT',

  // Maisons
  C_HOUSE: 'house:action',
  S_HOUSE_RESULT: 'HOUSE:RESULT',

  // Factions
  C_FACTION: 'faction:action',
  S_FACTION_RESULT: 'FACTION:RESULT',
  S_FACTION_UPDATE: 'FACTION:UPDATE',

  // Monde
  C_WORLD_STATE: 'world:state',
  S_WORLD_STATE: 'WORLD:STATE',
  S_WORLD_TIME: 'WORLD:TIME',
  S_WORLD_WEATHER: 'WORLD:WEATHER',

  // Interaction
  C_INTERACT: 'interact',
  S_INTERACT_RESULT: 'INTERACT:RESULT',

  // Chat
  C_CHAT: 'chat',
  S_CHAT: 'CHAT:MESSAGE',

  // Admin
  C_ADMIN_CMD: 'admin:command',
  S_ADMIN_RESULT: 'ADMIN:RESULT',
  S_ADMIN_BROADCAST: 'ADMIN:BROADCAST',

  // Système
  S_PING: 'PING',
  S_PONG: 'PONG',
  S_ERROR: 'ERROR',
  S_NOTIFICATION: 'NOTIFICATION',
  S_STATS: 'SERVER:STATS',
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  maxMessageLength: 500,
  maxPositionDelta: 200,        // Unités/tick — anti-teleport
  maxPositionRate: 50,         // Updates/sec max
  bankMinAmount: 1,
  bankMaxAmount: 1_000_000,
  pingInterval: 30_000,
  nearbyRadius: 150,
  rateLimits: {
    auth: { max: 5, window: 60_000 },
    position: { max: 30, window: 1_000 },
    chat: { max: 5, window: 3_000 },
    bank: { max: 10, window: 60_000 },
    interact: { max: 20, window: 10_000 },
    admin: { max: 30, window: 60_000 },
    job: { max: 5, window: 30_000 },
    inventory: { max: 20, window: 10_000 },
    default: { max: 60, window: 10_000 },
  } as Record<string, { max: number; window: number }>,
  maxAuditEntries: 5_000,
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// ÉTAT GLOBAL DU HANDLER
// ══════════════════════════════════════════════════════════════════════════════

const socketMeta = new Map<string, SocketMeta>();
const auditLog: AuditEntry[] = [];
let ioGlobal: IOServer | null = null;

const serverMetrics = {
  totalConnections: 0,
  currentConnections: 0,
  peakConnections: 0,
  totalEvents: 0,
  totalMessages: 0,
  totalBankOps: 0,
  startedAt: Date.now(),
};

// ══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════════

function log(level: 'info' | 'warn' | 'error' | 'debug', msg: string): void {
  const prefix = `[SOCKET v2]`;
  const icons = { info: 'ℹ️', warn: '⚠️', error: '❌', debug: '🔍' };
  console.log(`${icons[level]} ${prefix} ${msg}`);
}

function notify(
  io: IOServer,
  target: string,
  type: NotifType,
  message: string,
  data?: Record<string, unknown>
): void {
  io.to(target).emit(EVENTS.S_NOTIFICATION, { type, message, ts: Date.now(), ...data });
}

function emitError(socket: Socket, message: string, code = 'GENERIC_ERROR'): void {
  socket.emit(EVENTS.S_ERROR, { message, code, ts: Date.now() });
}

function audit(event: string, socketId: string, playerId?: string, data?: unknown): void {
  if (auditLog.length >= CONFIG.maxAuditEntries) {
    auditLog.splice(0, Math.floor(CONFIG.maxAuditEntries * 0.1));
  }
  auditLog.push({ event, socketId, playerId, data, ts: Date.now() });
}

function validateAmount(amount: unknown, min = CONFIG.bankMinAmount, max = CONFIG.bankMaxAmount): boolean {
  return typeof amount === 'number' && Number.isFinite(amount) && amount >= min && amount <= max;
}

function distance(a: PositionData, b: PositionData): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

// ══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER
// ══════════════════════════════════════════════════════════════════════════════

function checkRateLimit(meta: SocketMeta, eventKey: string): boolean {
  const limit = CONFIG.rateLimits[eventKey] ?? CONFIG.rateLimits.default;
  const now = Date.now();
  const entry = meta.rateLimits.get(eventKey) || { count: 0, resetAt: now + limit.window };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + limit.window;
  }

  entry.count++;
  meta.rateLimits.set(eventKey, entry);

  return entry.count <= limit.max;
}

// ══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE D'AUTHENTIFICATION
// ══════════════════════════════════════════════════════════════════════════════

function requireAuth(
  socket: Socket,
  player: Player | undefined,
  meta: SocketMeta,
  event: string
): player is Player {
  meta.lastActivity = Date.now();
  meta.requestCount++;
  serverMetrics.totalEvents++;

  if (!player) {
    emitError(socket, 'Non authentifié', 'UNAUTHENTICATED');
    return false;
  }
  if (meta.banned) {
    socket.disconnect(true);
    return false;
  }
  if (!checkRateLimit(meta, event)) {
    emitError(socket, `Rate limit dépassé (${event})`, 'RATE_LIMITED');
    return false;
  }
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// SETUP PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

export function setupSocketHandler(io: IOServer): void {
  ioGlobal = io;
  log('info', `Gestionnaire WebSocket v2 initialisé`);

  // ── Événements monde globaux ───────────────────────────────────────────────
  WorldEngine.on('world:time_changed', (time) => {
    io.emit(EVENTS.S_WORLD_TIME, time);
  });

  WorldEngine.on('world:weather_changed', (weather) => {
    io.emit(EVENTS.S_WORLD_WEATHER, weather);
  });

  // ── Salaires automatiques ─────────────────────────────────────────────────
  JobEngine.on('salary:due', ({ playerId, jobId, amount }: { playerId: string; jobId: string; amount: number }) => {
    try {
      EconomyEngine.paySalary(playerId, PlayerManager.get(playerId)?.firstName ?? '', jobId, amount);
      notify(io, playerId, 'success', `💰 Salaire reçu: $${amount.toLocaleString()}`, { jobId, amount });
      io.to(playerId).emit(EVENTS.S_SALARY_PAID, { jobId, amount, ts: Date.now() });
      audit('salary:paid', playerId, playerId, { jobId, amount });
    } catch (e) {
      log('error', `Erreur salaire: ${playerId} — ${e}`);
    }
  });

  // ── Métriques périodiques ─────────────────────────────────────────────────
  setInterval(() => {
    const stats = getServerStats();
    io.to('admin_room').emit(EVENTS.S_STATS, stats);
  }, 60_000);

  // ══════════════════════════════════════════════════════════════════════════
  // CONNEXION
  // ══════════════════════════════════════════════════════════════════════════
  io.on('connection', (socket: Socket) => {
    serverMetrics.totalConnections++;
    serverMetrics.currentConnections++;
    if (serverMetrics.currentConnections > serverMetrics.peakConnections) {
      serverMetrics.peakConnections = serverMetrics.currentConnections;
    }

    // Initialiser les métadonnées du socket
    const meta: SocketMeta = {
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      requestCount: 0,
      rateLimits: new Map(),
      ip: (socket.handshake.headers['x-forwarded-for'] as string)
        ?? socket.handshake.address ?? 'unknown',
      banned: false,
    };
    socketMeta.set(socket.id, meta);

    log('info', `Nouvelle connexion: ${socket.id} (${meta.ip})`);

    let authenticatedPlayer: Player | undefined;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    // ── Ping/Pong keepalive ────────────────────────────────────────────────
    pingTimer = setInterval(() => {
      socket.emit(EVENTS.S_PING, { ts: Date.now() });
    }, CONFIG.pingInterval);

    socket.on(EVENTS.S_PONG, () => {
      meta.lastActivity = Date.now();
    });

    // ════════════════════════════════════════════════════════════════════════
    // AUTH
    // ════════════════════════════════════════════════════════════════════════
    socket.on(EVENTS.C_AUTH, (data: AuthData) => {
      if (!checkRateLimit(meta, 'auth')) {
        emitError(socket, 'Trop de tentatives d\'auth', 'RATE_LIMITED');
        return;
      }

      // Validation Third Eye
      const check = ThirdEye.analyze('auth', socket.id, data);
      if (!check.allowed) {
        socket.emit(EVENTS.S_AUTH_ERR, { message: check.reason, code: 'THIRD_EYE_BLOCKED' });
        audit('auth:blocked', socket.id, undefined, { reason: check.reason });
        return;
      }

      // Validation basique
      if (!data || typeof data !== 'object') {
        socket.emit(EVENTS.S_AUTH_ERR, { message: 'Données d\'auth invalides', code: 'INVALID_DATA' });
        return;
      }

      const steamId = data.steamId?.trim() || `anon_${socket.id.slice(0, 8)}`;
      const name = data.name?.trim() || 'Anonyme';

      try {
        const player = PlayerManager.connect(socket.id, steamId, { name });
        authenticatedPlayer = player;

        // Rooms
        socket.join(socket.id);            // Room personnelle
        socket.join(`zone:spawn`);         // Zone de départ
        if (player.job?.id) socket.join(`job:${player.job.id}`);

        // État initial complet
        socket.emit(EVENTS.S_AUTH_OK, {
          player,
          world: {
            time: WorldEngine.getTime(),
            weather: WorldEngine.getWeather(),
            districts: WorldEngine.getAllDistricts?.() || [],
            pois: WorldEngine.getAllPOIs?.() || [],
          },
          server: { players: PlayerManager.getCount(), ts: Date.now() },
        });

        // Annoncer aux autres
        socket.broadcast.emit(EVENTS.S_PLAYER_JOIN, {
          id: player.id,
          socketId: socket.id,
          name: `${player.firstName} ${player.lastName}`,
          position: player.position,
          job: player.job,
        });

        audit('auth:ok', socket.id, player.id, { steamId, name });
        log('info', `Auth OK: ${player.firstName} ${player.lastName} (${socket.id})`);

      } catch (e) {
        socket.emit(EVENTS.S_AUTH_ERR, { message: 'Erreur de connexion', code: 'CONNECT_FAILED' });
        log('error', `Auth failed: ${socket.id} — ${e}`);
      }
    });

    // ════════════════════════════════════════════════════════════════════════
    // POSITION & MOUVEMENT
    // ════════════════════════════════════════════════════════════════════════
    socket.on(EVENTS.C_POSITION, (data: PositionData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'position')) return;

      // Validation des coordonnées
      if (
        typeof data.x !== 'number' || typeof data.y !== 'number' || typeof data.z !== 'number' ||
        !Number.isFinite(data.x) || !Number.isFinite(data.y) || !Number.isFinite(data.z)
      ) {
        emitError(socket, 'Coordonnées invalides', 'INVALID_POSITION');
        return;
      }

      // Anti-teleport
      const prev = authenticatedPlayer!.position;
      const dist = distance(data, prev as PositionData);

      if (dist > CONFIG.maxPositionDelta) {
        ThirdEye.report?.({
          type: 'position_hack',
          source: socket.id,
          details: `Téléportation suspecte: ${dist.toFixed(0)}u`,
          severity: 3,
          timestamp: Date.now(),
        });

        // Renvoyer à la dernière position valide
        socket.emit(EVENTS.S_PLAYER_UPDATE, { position: prev });
        emitError(socket, 'Déplacement invalide', 'ANTICHEAT_POSITION');
        audit('anticheat:teleport', socket.id, authenticatedPlayer!.id, { dist, data });
        return;
      }

      // Vitesse suspecte
      if (typeof data.speed === 'number' && data.speed > 80) {
        ThirdEye.report?.({
          type: 'speed_hack',
          source: socket.id,
          details: `Vitesse: ${data.speed}`,
          severity: 2,
          timestamp: Date.now(),
        });
      }

      PlayerManager.updatePosition(socket.id, data);

      // Broadcast position (seulement aux joueurs proches)
      const nearby = PlayerManager.getOnline?.().filter(p =>
        p.socketId !== socket.id &&
        distance(p.position as PositionData, data) < CONFIG.nearbyRadius
      ) || [];

      const movePayload = {
        id: socket.id,
        position: data,
        heading: data.heading ?? 0,
        anim: data.anim,
      };

      if (nearby.length > 0) {
        for (const p of nearby) {
          io.to(p.socketId).emit(EVENTS.S_PLAYER_MOVE, movePayload);
        }
      } else {
        // Fallback: broadcast global si pas d'index de proximité
        socket.broadcast.emit(EVENTS.S_PLAYER_MOVE, movePayload);
      }
    });

    // ── Emotes ────────────────────────────────────────────────────────────
    socket.on(EVENTS.C_PLAYER_EMOTE, (data: EmoteData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'default')) return;

      const allowed = ['wave', 'dance', 'sit', 'kneel', 'salute', 'point', 'laugh', 'cry'];
      if (!allowed.includes(data.emote)) {
        emitError(socket, `Emote inconnue: ${data.emote}`, 'INVALID_EMOTE');
        return;
      }

      socket.broadcast.emit(EVENTS.S_PLAYER_EMOTE, {
        id: socket.id,
        emote: data.emote,
        ts: Date.now(),
      });
    });

    // ════════════════════════════════════════════════════════════════════════
    // BANQUE
    // ════════════════════════════════════════════════════════════════════════
    socket.on(EVENTS.C_BANK_DEPOSIT, (data: BankData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'bank')) return;

      const check = ThirdEye.analyze?.('bank_deposit', socket.id, data);
      if (check && !check.allowed) {
        emitError(socket, `Dépôt bloqué: ${check.reason}`, 'THIRD_EYE');
        return;
      }

      if (!validateAmount(data.amount)) {
        emitError(socket, `Montant invalide (${CONFIG.bankMinAmount}–${CONFIG.bankMaxAmount})`, 'INVALID_AMOUNT');
        return;
      }

      try {
        const result = EconomyEngine.transfer(
          socket.id, 'bank', data.amount, 'deposit',
          data.note || 'Dépôt bancaire', 'bank'
        );
        socket.emit(EVENTS.S_BANK_RESULT, {
          action: 'deposit',
          ...result,
          newBalance: EconomyEngine.getBalance(socket.id),
        });
        serverMetrics.totalBankOps++;
        audit('bank:deposit', socket.id, authenticatedPlayer!.id, { amount: data.amount });
      } catch (e) {
        emitError(socket, 'Erreur dépôt', 'BANK_ERROR');
      }
    });

    socket.on(EVENTS.C_BANK_WITHDRAW, (data: BankData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'bank')) return;

      if (!validateAmount(data.amount)) {
        emitError(socket, 'Montant invalide', 'INVALID_AMOUNT');
        return;
      }

      try {
        const result = EconomyEngine.transfer(
          'bank', socket.id, data.amount, 'withdraw',
          data.note || 'Retrait bancaire', 'bank'
        );
        socket.emit(EVENTS.S_BANK_RESULT, {
          action: 'withdraw',
          ...result,
          newBalance: EconomyEngine.getBalance(socket.id),
        });
        serverMetrics.totalBankOps++;
        audit('bank:withdraw', socket.id, authenticatedPlayer!.id, { amount: data.amount });
      } catch (e) {
        emitError(socket, 'Erreur retrait', 'BANK_ERROR');
      }
    });

    // Transfert P2P (nouveau en v2)
    socket.on(EVENTS.C_BANK_TRANSFER, (data: TransferData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'bank')) return;

      if (!validateAmount(data.amount)) {
        emitError(socket, 'Montant invalide', 'INVALID_AMOUNT');
        return;
      }
      if (data.targetId === socket.id) {
        emitError(socket, 'Auto-transfert interdit', 'SELF_TRANSFER');
        return;
      }

      const target = PlayerManager.get(data.targetId);
      if (!target) {
        emitError(socket, 'Joueur cible introuvable', 'TARGET_NOT_FOUND');
        return;
      }

      try {
        const result = EconomyEngine.transfer(
          socket.id, data.targetId, data.amount, 'player_transfer',
          data.note || `Transfert de ${authenticatedPlayer!.firstName}`, 'player'
        );
        socket.emit(EVENTS.S_BANK_RESULT, {
          action: 'transfer', ...result,
          newBalance: EconomyEngine.getBalance(socket.id),
          targetName: `${target.firstName} ${target.lastName}`,
        });
        notify(io, data.targetId, 'success',
          `💸 Reçu $${data.amount} de ${authenticatedPlayer!.firstName} ${authenticatedPlayer!.lastName}`,
          { amount: data.amount }
        );
        serverMetrics.totalBankOps++;
        audit('bank:transfer', socket.id, authenticatedPlayer!.id, { to: data.targetId, amount: data.amount });
      } catch (e) {
        emitError(socket, 'Erreur transfert', 'BANK_ERROR');
      }
    });

    socket.on(EVENTS.C_BANK_BALANCE, () => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'bank')) return;

      socket.emit(EVENTS.S_BANK_RESULT, {
        action: 'balance',
        balance: EconomyEngine.getBalance(socket.id),
        transactions: EconomyEngine.getPlayerTransactions?.(socket.id, 20) || [],
      });
    });

    // ════════════════════════════════════════════════════════════════════════
    // JOBS
    // ════════════════════════════════════════════════════════════════════════
    socket.on(EVENTS.C_JOB_JOIN, (data: JobData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'job')) return;

      if (!data.jobId || typeof data.jobId !== 'string') {
        emitError(socket, 'jobId invalide', 'INVALID_JOB');
        return;
      }

      const { firstName, lastName } = authenticatedPlayer!;
      const result = JobEngine.joinJob(socket.id, `${firstName} ${lastName}`, data.jobId);

      if (result.success && result.job) {
        PlayerManager.setJob(socket.id, result.job.id, result.job.name);
        socket.leave(`job:${authenticatedPlayer!.job?.id || ''}`);
        socket.join(`job:${result.job.id}`);
      }

      socket.emit(EVENTS.S_JOB_RESULT, { action: 'join', ...result });
      audit('job:join', socket.id, authenticatedPlayer!.id, { jobId: data.jobId });
    });

    socket.on(EVENTS.C_JOB_LEAVE, () => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'job')) return;

      const oldJobId = authenticatedPlayer!.job?.id;
      if (!oldJobId) {
        emitError(socket, 'Aucun job actif', 'NO_JOB');
        return;
      }

      JobEngine.setOffDuty(socket.id);
      socket.leave(`job:${oldJobId}`);
      PlayerManager.setJob(socket.id, '', '');

      socket.emit(EVENTS.S_JOB_RESULT, { action: 'leave', success: true });
      audit('job:leave', socket.id, authenticatedPlayer!.id, { jobId: oldJobId });
    });

    socket.on(EVENTS.C_JOB_DUTY, (data: DutyData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'job')) return;

      try {
        if (data.onDuty) {
          const result = JobEngine.setOnDuty(socket.id);
          socket.emit(EVENTS.S_JOB_RESULT, { action: 'duty', onDuty: true, ...result });

          if (result.success && result.equipment?.length) {
            for (const itemId of result.equipment!) {
              PlayerManager.addItem(socket.id, itemId, 1);
            }
            socket.emit(EVENTS.S_INV_UPDATE, { inventory: authenticatedPlayer!.inventory });
          }
        } else {
          JobEngine.setOffDuty(socket.id);
          socket.emit(EVENTS.S_JOB_RESULT, { action: 'duty', onDuty: false, success: true });
        }

        audit('job:duty', socket.id, authenticatedPlayer!.id, { onDuty: data.onDuty });
      } catch (e) {
        emitError(socket, 'Erreur duty', 'JOB_ERROR');
      }
    });

    // ════════════════════════════════════════════════════════════════════════
    // INVENTAIRE
    // ════════════════════════════════════════════════════════════════════════
    socket.on(EVENTS.C_INV_USE, (data: InvUseData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'inventory')) return;

      if (!data.itemId || typeof data.itemId !== 'string') {
        emitError(socket, 'itemId invalide', 'INVALID_ITEM');
        return;
      }

      const qty = Math.max(1, Math.min(data.quantity ?? 1, 100));
      const result = PlayerManager.useItem?.(socket.id, data.itemId, qty);

      if (!result?.success) {
        emitError(socket, result?.message || 'Item introuvable', 'ITEM_NOT_FOUND');
        return;
      }

      socket.emit(EVENTS.S_INV_UPDATE, {
        action: 'use',
        itemId: data.itemId,
        quantity: qty,
        inventory: authenticatedPlayer!.inventory,
      });
      audit('inventory:use', socket.id, authenticatedPlayer!.id, { itemId: data.itemId, qty });
    });

    socket.on(EVENTS.C_INV_DROP, (data: InvDropData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'inventory')) return;

      const qty = Math.max(1, Math.min(data.quantity ?? 1, 100));
      const result = PlayerManager.removeItem?.(socket.id, data.itemId, qty);

      if (!result?.success) {
        emitError(socket, 'Impossible de drop', 'DROP_FAILED');
        return;
      }

      socket.emit(EVENTS.S_INV_UPDATE, {
        action: 'drop',
        itemId: data.itemId,
        quantity: qty,
        inventory: authenticatedPlayer!.inventory,
      });

      // Notifier les proches qu'un item a été drop au sol
      socket.broadcast.emit('WORLD:ITEM_DROPPED', {
        itemId: data.itemId,
        position: authenticatedPlayer!.position,
        quantity: qty,
      });

      audit('inventory:drop', socket.id, authenticatedPlayer!.id, { itemId: data.itemId, qty });
    });

    socket.on(EVENTS.C_INV_GIVE, (data: InvGiveData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'inventory')) return;

      if (data.targetId === socket.id) {
        emitError(socket, 'Auto-give interdit', 'SELF_GIVE');
        return;
      }

      const target = PlayerManager.get(data.targetId);
      if (!target) {
        emitError(socket, 'Joueur cible introuvable', 'TARGET_NOT_FOUND');
        return;
      }

      const qty = Math.max(1, Math.min(data.quantity ?? 1, 100));
      const removeResult = PlayerManager.removeItem?.(socket.id, data.itemId, qty);

      if (!removeResult?.success) {
        emitError(socket, 'Item manquant', 'ITEM_NOT_FOUND');
        return;
      }

      PlayerManager.addItem(data.targetId, data.itemId, qty);

      socket.emit(EVENTS.S_INV_UPDATE, { action: 'give', inventory: authenticatedPlayer!.inventory });
      io.to(data.targetId).emit(EVENTS.S_INV_UPDATE, {
        action: 'received',
        itemId: data.itemId,
        quantity: qty,
        from: `${authenticatedPlayer!.firstName} ${authenticatedPlayer!.lastName}`,
      });
      notify(io, data.targetId, 'info',
        `🎁 ${authenticatedPlayer!.firstName} vous a donné ${qty}x ${data.itemId}`
      );

      audit('inventory:give', socket.id, authenticatedPlayer!.id, { to: data.targetId, itemId: data.itemId, qty });
    });

    // ════════════════════════════════════════════════════════════════════════
    // VÉHICULES
    // ════════════════════════════════════════════════════════════════════════
    socket.on(EVENTS.C_VEHICLE, (data: VehicleData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'default')) return;

      if (!data.vehicleId || !['enter', 'exit', 'lock', 'unlock'].includes(data.action)) {
        emitError(socket, 'Action véhicule invalide', 'INVALID_VEHICLE_ACTION');
        return;
      }

      // Placeholder: intégration WorldEngine/VehicleEngine
      socket.emit(EVENTS.S_VEHICLE_RESULT, {
        success: true,
        action: data.action,
        vehicleId: data.vehicleId,
        ts: Date.now(),
      });

      audit(`vehicle:${data.action}`, socket.id, authenticatedPlayer!.id, { vehicleId: data.vehicleId });
    });

    // ════════════════════════════════════════════════════════════════════════
    // MAISONS
    // ════════════════════════════════════════════════════════════════════════
    socket.on(EVENTS.C_HOUSE, (data: HouseData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'default')) return;

      if (!data.houseId || !['enter', 'exit', 'buy', 'sell'].includes(data.action)) {
        emitError(socket, 'Action maison invalide', 'INVALID_HOUSE_ACTION');
        return;
      }

      // Placeholder: intégration HouseEngine
      socket.emit(EVENTS.S_HOUSE_RESULT, {
        success: true,
        action: data.action,
        houseId: data.houseId,
        ts: Date.now(),
      });

      audit(`house:${data.action}`, socket.id, authenticatedPlayer!.id, { houseId: data.houseId });
    });

    // ════════════════════════════════════════════════════════════════════════
    // FACTIONS
    // ════════════════════════════════════════════════════════════════════════
    socket.on(EVENTS.C_FACTION, (data: FactionData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'default')) return;

      if (!data.factionId || !['join', 'leave', 'info'].includes(data.action)) {
        emitError(socket, 'Action faction invalide', 'INVALID_FACTION_ACTION');
        return;
      }

      // Placeholder: intégration FactionEngine
      socket.emit(EVENTS.S_FACTION_RESULT, {
        success: true,
        action: data.action,
        factionId: data.factionId,
        ts: Date.now(),
      });

      audit(`faction:${data.action}`, socket.id, authenticatedPlayer!.id, { factionId: data.factionId });
    });

    // ════════════════════════════════════════════════════════════════════════
    // ÉTAT DU MONDE
    // ════════════════════════════════════════════════════════════════════════
    socket.on(EVENTS.C_WORLD_STATE, () => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'default')) return;

      socket.emit(EVENTS.S_WORLD_STATE, {
        time: WorldEngine.getTime(),
        weather: WorldEngine.getWeather(),
        onlinePlayers: PlayerManager.getCount(),
        players: PlayerManager.getOnline().map(p => ({
          id: p.socketId,
          name: `${p.firstName} ${p.lastName}`,
          position: p.position,
          job: p.job,
        })),
        ts: Date.now(),
      });
    });

    // ════════════════════════════════════════════════════════════════════════
    // CHAT
    // ════════════════════════════════════════════════════════════════════════
    socket.on(EVENTS.C_CHAT, (data: ChatData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'chat')) return;

      // Validation
      if (!data.message || typeof data.message !== 'string') {
        emitError(socket, 'Message invalide', 'INVALID_MESSAGE');
        return;
      }

      const channels: ChatChannel[] = ['local', 'global', 'job', 'radio', 'faction', 'whisper'];
      if (!channels.includes(data.channel)) {
        emitError(socket, 'Canal invalide', 'INVALID_CHANNEL');
        return;
      }

      // ThirdEye anti-spam / toxicité
      const check = ThirdEye.analyze?.('chat', socket.id, data);
      if (check && !check.allowed) {
        emitError(socket, `Message bloqué: ${check.reason}`, 'CHAT_BLOCKED');
        audit('chat:blocked', socket.id, authenticatedPlayer!.id, { reason: check.reason });
        return;
      }

      const chatMsg = {
        from: `${authenticatedPlayer!.firstName} ${authenticatedPlayer!.lastName}`,
        fromId: socket.id,
        message: data.message.slice(0, CONFIG.maxMessageLength),
        channel: data.channel,
        job: authenticatedPlayer!.job?.id,
        timestamp: Date.now(),
      };

      serverMetrics.totalMessages++;

      switch (data.channel) {
        case 'global':
          io.emit(EVENTS.S_CHAT, chatMsg);
          break;

        case 'job': {
          const jobId = authenticatedPlayer!.job?.id;
          if (!jobId) { emitError(socket, 'Aucun job actif', 'NO_JOB'); return; }
          const jobmates = JobEngine.getOnDutyByJob?.(jobId) || [];
          for (const emp of jobmates) io.to(emp.playerId).emit(EVENTS.S_CHAT, chatMsg);
          break;
        }

        case 'faction': {
          const factionRoom = `faction:${authenticatedPlayer!.job?.id}`;
          io.to(factionRoom).emit(EVENTS.S_CHAT, chatMsg);
          break;
        }

        case 'radio':
          io.to(`radio:${authenticatedPlayer!.job?.id}`).emit(EVENTS.S_CHAT, chatMsg);
          break;

        case 'whisper': {
          // Ciblage par playerId dans le payload
          const targetId = (data as ChatData & { targetId?: string }).targetId;
          if (!targetId) { emitError(socket, 'Cible whisper manquante', 'NO_TARGET'); return; }
          io.to(targetId).emit(EVENTS.S_CHAT, { ...chatMsg, whisper: true });
          socket.emit(EVENTS.S_CHAT, { ...chatMsg, whisper: true });
          break;
        }

        case 'local':
        default:
          socket.broadcast.emit(EVENTS.S_CHAT, chatMsg);
          socket.emit(EVENTS.S_CHAT, chatMsg);
          break;
      }

      audit('chat', socket.id, authenticatedPlayer!.id, { channel: data.channel });
    });

    // ════════════════════════════════════════════════════════════════════════
    // INTERACTION
    // ════════════════════════════════════════════════════════════════════════
    socket.on(EVENTS.C_INTERACT, (data: InteractData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'interact')) return;

      if (!data.poiId || typeof data.poiId !== 'string') {
        socket.emit(EVENTS.S_INTERACT_RESULT, { success: false, error: 'poiId invalide' });
        return;
      }

      const poi = WorldEngine.getPOI?.(data.poiId);
      if (!poi) {
        socket.emit(EVENTS.S_INTERACT_RESULT, { success: false, error: 'POI introuvable' });
        return;
      }

      if (!poi.isOpen) {
        socket.emit(EVENTS.S_INTERACT_RESULT, { success: false, error: `${poi.name} est fermé` });
        return;
      }

      socket.emit(EVENTS.S_INTERACT_RESULT, {
        success: true,
        poi: { id: poi.id, name: poi.name, type: poi.type },
        action: data.action,
        ts: Date.now(),
      });

      audit('interact', socket.id, authenticatedPlayer!.id, { poiId: data.poiId, action: data.action });
    });

    // ════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ════════════════════════════════════════════════════════════════════════
    socket.on(EVENTS.C_ADMIN_CMD, (data: AdminCmdData) => {
      if (!requireAuth(socket, authenticatedPlayer, meta, 'admin')) return;

      if (authenticatedPlayer!.adminLevel < 1) {
        socket.emit(EVENTS.S_ADMIN_RESULT, { success: false, error: 'Permission refusée', code: 'FORBIDDEN' });
        audit('admin:denied', socket.id, authenticatedPlayer!.id, { command: data.command });
        return;
      }

      if (!data.command || typeof data.command !== 'string') {
        socket.emit(EVENTS.S_ADMIN_RESULT, { success: false, error: 'Commande invalide' });
        return;
      }

      log('info', `Admin cmd "${data.command}" par ${authenticatedPlayer!.firstName} (lvl ${authenticatedPlayer!.adminLevel})`);
      const result = handleAdminCommand(data.command, data.args || [], authenticatedPlayer!, io);
      socket.emit(EVENTS.S_ADMIN_RESULT, result);
      audit('admin:cmd', socket.id, authenticatedPlayer!.id, { command: data.command, args: data.args });
    });

    // ════════════════════════════════════════════════════════════════════════
    // DÉCONNEXION
    // ════════════════════════════════════════════════════════════════════════
    socket.on('disconnect', (reason) => {
      if (pingTimer) clearInterval(pingTimer);

      if (authenticatedPlayer) {
        try {
          JobEngine.setOffDuty(socket.id);
          PlayerManager.disconnect(socket.id);
          io.emit(EVENTS.S_PLAYER_LEAVE, {
            id: socket.id,
            name: `${authenticatedPlayer.firstName} ${authenticatedPlayer.lastName}`,
            ts: Date.now(),
          });
        } catch (e) {
          log('error', `Erreur disconnect: ${socket.id} — ${e}`);
        }
      }

      socketMeta.delete(socket.id);
      serverMetrics.currentConnections = Math.max(0, serverMetrics.currentConnections - 1);
      audit('disconnect', socket.id, authenticatedPlayer?.id, { reason });
      log('info', `Déconnecté: ${socket.id} (${reason})`);
    });

    // ── Erreurs non catchées ─────────────────────────────────────────────────
    socket.on('error', (err) => {
      log('error', `Socket error ${socket.id}: ${err.message}`);
      audit('socket:error', socket.id, authenticatedPlayer?.id, { error: err.message });
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMANDES ADMIN (enrichies)
// ══════════════════════════════════════════════════════════════════════════════

function handleAdminCommand(
  command: string,
  args: unknown[],
  admin: Player,
  io: IOServer
): EventResult {

  switch (command) {

    case 'give_money': {
      const [targetId, amount] = args as [string, number];
      if (!targetId || !validateAmount(amount)) return { success: false, error: 'Args invalides' };
      const target = PlayerManager.get(targetId);
      if (!target) return { success: false, error: 'Joueur introuvable' };
      const result = EconomyEngine.transfer('system', targetId, amount, 'admin_grant',
        `Don admin: ${admin.firstName}`, 'bank');
      notify(io, targetId, 'success', `💰 Admin vous a donné $${amount.toLocaleString()}`);
      return { success: result.success, action: 'give_money', targetId, amount };
    }

    case 'take_money': {
      const [targetId, amount] = args as [string, number];
      if (!targetId || !validateAmount(amount)) return { success: false, error: 'Args invalides' };
      const result = EconomyEngine.transfer(targetId, 'system', amount, 'admin_take',
        `Retrait admin: ${admin.firstName}`, 'bank');
      notify(io, targetId, 'warning', `⚠️ Admin a retiré $${amount.toLocaleString()}`);
      return { success: result.success, action: 'take_money', targetId, amount };
    }

    case 'set_weather': {
      const [type] = args as [Weather['type']];
      if (!type) return { success: false, error: 'Type météo manquant' };
      WorldEngine.setWeather?.({ type });
      io.emit('WORLD:WEATHER', { type });
      return { success: true, action: 'set_weather', type };
    }

    case 'set_time': {
      const [time] = args as [number];
      if (typeof time !== 'number') return { success: false, error: 'Heure invalide' };
      WorldEngine.setTime?.(time);
      io.emit('WORLD:TIME', { time });
      return { success: true, action: 'set_time', time };
    }

    case 'kick_player': {
      const [targetId, reason] = args as [string, string];
      if (!targetId) return { success: false, error: 'targetId manquant' };
      notify(io, targetId, 'error', `Kick: ${reason || 'Raison non spécifiée'}`);
      io.sockets.sockets.get(targetId)?.disconnect(true);
      return { success: true, action: 'kick', targetId, reason };
    }

    case 'ban_player': {
      const [targetId, reason, durationMin] = args as [string, string, number];
      if (!targetId) return { success: false, error: 'targetId manquant' };
      const meta = socketMeta.get(targetId);
      if (meta) meta.banned = true;
      notify(io, targetId, 'error', `Ban: ${reason || 'Raison non spécifiée'}`);
      io.sockets.sockets.get(targetId)?.disconnect(true);
      return { success: true, action: 'ban', targetId, reason, durationMin };
    }

    case 'teleport': {
      const [targetId, x, y, z] = args as [string, number, number, number];
      if (!targetId) return { success: false, error: 'targetId manquant' };
      io.to(targetId).emit(EVENTS.S_PLAYER_UPDATE, { position: { x, y, z } });
      return { success: true, action: 'teleport', targetId, position: { x, y, z } };
    }

    case 'broadcast': {
      const [message] = args as [string];
      if (!message) return { success: false, error: 'Message manquant' };
      io.emit(EVENTS.S_ADMIN_BROADCAST, {
        from: `${admin.firstName} ${admin.lastName}`,
        message,
        timestamp: Date.now(),
      });
      return { success: true, action: 'broadcast', message };
    }

    case 'get_stats': {
      return { success: true, action: 'get_stats', ...getServerStats() };
    }

    case 'get_audit': {
      const [limit = 50] = args as [number];
      return { success: true, action: 'get_audit', log: auditLog.slice(-Math.min(limit, 200)) };
    }

    case 'set_admin': {
      const [targetId, level] = args as [string, number];
      if (!targetId || typeof level !== 'number') return { success: false, error: 'Args invalides' };
      const target = PlayerManager.get(targetId);
      if (!target) return { success: false, error: 'Joueur introuvable' };
      (target as Player & { adminLevel: number }).adminLevel = Math.min(level, admin.adminLevel);
      notify(io, targetId, 'info', `Niveau admin mis à jour: ${level}`);
      return { success: true, action: 'set_admin', targetId, level };
    }

    default:
      return { success: false, error: `Commande inconnue: ${command}`, code: 'UNKNOWN_COMMAND' };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STATS SERVEUR
// ══════════════════════════════════════════════════════════════════════════════

function getServerStats(): EventResult {
  return {
    ...serverMetrics,
    uptimeMs: Date.now() - serverMetrics.startedAt,
    uptimeHuman: formatUptime(Date.now() - serverMetrics.startedAt),
    activeSockets: socketMeta.size,
    auditEntries: auditLog.length,
    onlinePlayers: PlayerManager.getCount?.() || 0,
    ts: Date.now(),
  };
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  return `${d}j ${h % 24}h ${m % 60}m ${s % 60}s`;
}

// ══════════════════════════════════════════════════════════════════════════════
// API PUBLIQUE (pour usage depuis d'autres modules)
// ══════════════════════════════════════════════════════════════════════════════

/** Envoyer une notification à un joueur depuis l'extérieur */
export function sendNotification(playerId: string, type: NotifType, message: string): void {
  if (ioGlobal) notify(ioGlobal, playerId, type, message);
}

/** Broadcast global depuis l'extérieur */
export function broadcastGlobal(event: string, data: unknown): void {
  ioGlobal?.emit(event, data);
}

/** Récupérer les métriques serveur */
export function getStats(): EventResult { return getServerStats(); }

/** Récupérer le log d'audit */
export function getAuditLog(limit = 100): AuditEntry[] { return auditLog.slice(-limit); }

export { EVENTS as SocketEvents };
