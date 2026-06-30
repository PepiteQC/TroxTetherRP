// server/realtime/RealtimeServer.js
// 🌐 WebSocket Gateway RP — Version 2.0.0 Ultra
// Port-Éther EtherWorld QC RP
import crypto from 'node:crypto';
import { Server } from 'socket.io';
import { logger } from '../shared/logger.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════
const VERSION = '2.0.0';

const CONFIG = {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      ...(process.env.CORS_ORIGINS?.split(',') || []),
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60_000,
  pingInterval: 25_000,
  maxConnections: 500,
  maxMessageLength: 512,
  maxChatRate: 5,           // messages / fenêtre
  chatRateWindow: 3_000,       // ms
  maxMoveRate: 30,          // updates / fenêtre
  moveRateWindow: 1_000,       // ms
  maxCommandRate: 10,          // cmds / fenêtre
  commandRateWindow: 5_000,       // ms
  worldTickInterval: 10_000,      // ms — cycle jour/nuit
  saveInterval: 60_000,      // ms — sauvegarde auto mémoire
  maxPositionDelta: 250,         // unités/tick — anti-teleport
  maxSpeed: 100,         // unités/s — anti-speedhack
  defaultCash: 2_500,
  defaultBank: 10_000,
  salaryMultiplier: 0.1,
  healthRegen: 25,
  vehicleMaxPerPlayer: 3,
  maxAuditEntries: 5_000,
  maxChatHistory: 200,
};

// ══════════════════════════════════════════════════════════════════════════════
// ÉTAT GLOBAL
// ══════════════════════════════════════════════════════════════════════════════
const socketMeta = new Map();   // socketId → { rateLimits, ip, connectedAt, ... }
const auditLog = [];
const chatHistory = [];
let ioInstance = null;

const metrics = {
  totalConnections: 0,
  currentConnections: 0,
  peakConnections: 0,
  totalEvents: 0,
  totalMessages: 0,
  totalTransactions: 0,
  totalCommands: 0,
  anticheatBlocks: 0,
  rateLimitBlocks: 0,
  startedAt: Date.now(),
};

// ══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════════

function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function distance3D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function sanitizeString(str, maxLen = 256) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen).replace(/[<>]/g, '');
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  return `${d}j ${h % 24}h ${m % 60}m ${s % 60}s`;
}

// ── Audit ────────────────────────────────────────────────────────────────────
function audit(event, socketId, playerId, data = null) {
  if (auditLog.length >= CONFIG.maxAuditEntries) {
    auditLog.splice(0, Math.floor(CONFIG.maxAuditEntries * 0.1));
  }
  auditLog.push({ event, socketId, playerId, data, ts: Date.now() });
}

// ── Notification helper ──────────────────────────────────────────────────────
function notify(socket, type, message, extra = {}) {
  socket.emit('notification', { type, message, ts: Date.now(), ...extra });
}

function notifyTo(io, targetSocketId, type, message, extra = {}) {
  io.to(targetSocketId).emit('notification', { type, message, ts: Date.now(), ...extra });
}

// ── Erreur helper ────────────────────────────────────────────────────────────
function sendError(socket, message, code = 'GENERIC_ERROR') {
  socket.emit('error:server', { message, code, ts: Date.now() });
}

// ══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER
// ══════════════════════════════════════════════════════════════════════════════

function initMeta(socketId, ip) {
  socketMeta.set(socketId, {
    ip,
    connectedAt: Date.now(),
    lastActivity: Date.now(),
    requestCount: 0,
    banned: false,
    rateLimits: new Map(),
    warnCount: 0,
  });
}

function checkRate(socketId, key, max, windowMs) {
  const meta = socketMeta.get(socketId);
  if (!meta || meta.banned) return false;

  const now = Date.now();
  const entry = meta.rateLimits.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count++;
  meta.rateLimits.set(key, entry);
  meta.lastActivity = now;
  meta.requestCount++;
  metrics.totalEvents++;

  if (entry.count > max) {
    metrics.rateLimitBlocks++;
    return false;
  }
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS MÉMOIRE KERNEL
// ══════════════════════════════════════════════════════════════════════════════

function getPlayers(kernel) { return kernel.memory.get('players') || new Map(); }
function getProperties(kernel) { return kernel.memory.get('properties') || new Map(); }
function getVehicles(kernel) { return kernel.memory.get('vehicles') || new Map(); }
function getWorldState(kernel) { return kernel.memory.get('worldState') || { time: 720, weather: 'sunny', season: 'summer', day: 1 }; }
function getJobs(kernel) { return kernel.memory.get('jobs') || []; }
function getFactions(kernel) { return kernel.memory.get('factions') || []; }
function getItems(kernel) { return kernel.memory.get('items') || []; }

function getPlayer(kernel, socketId) {
  return getPlayers(kernel).get(socketId);
}

function savePlayer(kernel, player) {
  const players = getPlayers(kernel);
  players.set(player.socketId, player);
  kernel.memory.set('players', players);
}

function buildPlayerPublic(player) {
  return {
    id: player.id,
    socketId: player.socketId,
    name: player.name,
    position: player.position,
    job: player.job,
    health: player.health,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ANTI-CHEAT
// ══════════════════════════════════════════════════════════════════════════════

function checkAntiCheat(socket, player, newPos) {
  if (!player?.position) return { ok: true };

  const dist = distance3D(player.position, newPos);

  if (dist > CONFIG.maxPositionDelta) {
    metrics.anticheatBlocks++;
    audit('anticheat:teleport', socket.id, player.id, { dist, from: player.position, to: newPos });
    logger.warn('AntiCheat', `Téléportation: ${player.name} — ${dist.toFixed(0)}u`);
    return { ok: false, reason: 'TELEPORT', dist };
  }

  return { ok: true, dist };
}

// ══════════════════════════════════════════════════════════════════════════════
// WORLD EVENTS (broadcast depuis kernel)
// ══════════════════════════════════════════════════════════════════════════════

function setupKernelEvents(io, kernel) {
  // Brain → broadcast résultats importants
  kernel.bus?.on?.('world.event', (event) => {
    io.to('world').emit('world:event', event);
  });

  kernel.bus?.on?.('player.banned', ({ playerId, socketId, reason }) => {
    const meta = socketMeta.get(socketId);
    if (meta) meta.banned = true;
    io.to(socketId).emit('error:server', { message: `Banni: ${reason}`, code: 'BANNED' });
    io.sockets.sockets.get(socketId)?.disconnect(true);
    logger.warn('Socket', `Ban: ${playerId} — ${reason}`);
  });

  kernel.bus?.on?.('notification.global', ({ type, message }) => {
    io.to('world').emit('notification', { type, message, ts: Date.now() });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════════

export function createRealtimeServer(httpServer, { kernel }) {

  const io = new Server(httpServer, {
    cors: CONFIG.cors,
    pingTimeout: CONFIG.pingTimeout,
    pingInterval: CONFIG.pingInterval,
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6, // 1MB max payload
  });

  ioInstance = io;
  setupKernelEvents(io, kernel);

  // ── Middleware global Socket.IO ──────────────────────────────────────────
  io.use((socket, next) => {
    // Limite globale de connexions
    if (metrics.currentConnections >= CONFIG.maxConnections) {
      return next(new Error('Serveur plein'));
    }

    // Init meta
    const ip = (socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || 'unknown').toString();
    initMeta(socket.id, ip);

    next();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CONNEXION
  // ══════════════════════════════════════════════════════════════════════════
  io.on('connection', async (socket) => {
    metrics.totalConnections++;
    metrics.currentConnections++;
    if (metrics.currentConnections > metrics.peakConnections) {
      metrics.peakConnections = metrics.currentConnections;
    }

    const meta = socketMeta.get(socket.id);
    logger.ok('Socket', `Connexion: ${socket.id} (${meta?.ip})`);

    // ════════════════════════════════════════════════════════════════════════
    // JOUEUR JOIN
    // ════════════════════════════════════════════════════════════════════════
    socket.on('player:join', async (data) => {
      if (!checkRate(socket.id, 'join', 3, 30_000)) {
        sendError(socket, 'Trop de tentatives', 'RATE_LIMITED');
        return;
      }

      const playerId = data?.playerId || uid('player');
      const name = sanitizeString(data?.name || 'Joueur', 32);

      const player = {
        id: playerId,
        socketId: socket.id,
        name,
        job: sanitizeString(data?.job || 'unemployed', 32),
        faction: null,
        cash: clamp(Number(data?.cash) || CONFIG.defaultCash, 0, 10_000_000),
        bank: clamp(Number(data?.bank) || CONFIG.defaultBank, 0, 100_000_000),
        health: 100,
        armor: 0,
        hunger: 100,
        thirst: 100,
        stamina: 100,
        wanted: 0,
        position: { x: 0, y: 1, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        inventory: [
          { id: 'phone', name: 'Téléphone', count: 1, weight: 0.2 },
          { id: 'wallet', name: 'Portefeuille', count: 1, weight: 0.1 },
        ],
        permissions: data?.permissions || ['player'],
        adminLevel: data?.adminLevel || 0,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        totalPlaytime: 0,
        stats: {
          kills: 0, deaths: 0, arrests: 0,
          moneyEarned: 0, distanceTraveled: 0,
        },
      };

      // Sauvegarder
      savePlayer(kernel, player);
      socket.data.playerId = socket.id;  // clé = socketId pour lookup O(1)

      // Rooms
      socket.join('world');
      if (player.job !== 'unemployed') socket.join(`job:${player.job}`);
      if (player.faction) socket.join(`faction:${player.faction}`);

      // Émettre au joueur
      socket.emit('player:joined', {
        player,
        world: getWorldState(kernel),
        players: [...getPlayers(kernel).values()].map(buildPlayerPublic),
        jobs: getJobs(kernel),
        factions: getFactions(kernel),
        items: getItems(kernel),
      });

      // Annoncer aux autres
      socket.to('world').emit('player:new', buildPlayerPublic(player));

      // Bus kernel
      await kernel.bus?.emit?.('player.join', { playerId, name, socketId: socket.id });

      audit('player:join', socket.id, playerId, { name });
      logger.ok('Socket', `"${name}" (${playerId}) rejoint EtherWorld`);
    });

    // ════════════════════════════════════════════════════════════════════════
    // MOUVEMENT
    // ════════════════════════════════════════════════════════════════════════
    socket.on('player:move', (data) => {
      if (!checkRate(socket.id, 'move', CONFIG.maxMoveRate, CONFIG.moveRateWindow)) return;

      const player = getPlayer(kernel, socket.id);
      if (!player) return;

      const newPos = data?.position;
      if (!newPos || typeof newPos.x !== 'number' || typeof newPos.y !== 'number' || typeof newPos.z !== 'number') return;
      if (!Number.isFinite(newPos.x) || !Number.isFinite(newPos.y) || !Number.isFinite(newPos.z)) return;

      // Anti-cheat
      const check = checkAntiCheat(socket, player, newPos);
      if (!check.ok) {
        // Renvoyer à la dernière position valide
        socket.emit('player:update', { position: player.position });
        sendError(socket, 'Déplacement invalide', 'ANTICHEAT');
        return;
      }

      // Mise à jour stats distance
      if (check.dist) {
        player.stats.distanceTraveled = (player.stats.distanceTraveled || 0) + check.dist;
      }

      player.position = newPos;
      if (data.rotation) player.rotation = data.rotation;
      player.lastSeen = Date.now();

      // Broadcast aux autres (seulement socketId + position pour économiser bandwidth)
      socket.to('world').emit('player:moved', {
        socketId: socket.id,
        position: newPos,
        rotation: data.rotation || player.rotation,
        anim: data.anim,
        ts: Date.now(),
      });
    });

    // ════════════════════════════════════════════════════════════════════════
    // CHAT RP
    // ════════════════════════════════════════════════════════════════════════
    socket.on('chat:send', (data) => {
      if (!checkRate(socket.id, 'chat', CONFIG.maxChatRate, CONFIG.chatRateWindow)) {
        sendError(socket, 'Spam détecté — ralentissez', 'RATE_LIMITED');
        return;
      }

      const player = getPlayer(kernel, socket.id);
      if (!player) return;

      const rawMessage = sanitizeString(String(data?.message || ''), CONFIG.maxMessageLength);
      if (!rawMessage) return;

      // Filtre mots interdits (basique)
      const blacklist = process.env.CHAT_BLACKLIST?.split(',') || [];
      if (blacklist.some(w => rawMessage.toLowerCase().includes(w.toLowerCase()))) {
        sendError(socket, 'Message filtré', 'CONTENT_FILTERED');
        audit('chat:filtered', socket.id, player.id, { message: rawMessage });
        return;
      }

      const msg = {
        id: uid('msg'),
        socketId: socket.id,
        playerId: player.id,
        playerName: player.name,
        message: rawMessage,
        channel: data?.channel || 'local',
        job: player.job,
        faction: player.faction,
        ts: Date.now(),
      };

      // Historique
      chatHistory.push(msg);
      if (chatHistory.length > CONFIG.maxChatHistory) chatHistory.shift();

      metrics.totalMessages++;

      switch (msg.channel) {
        case 'global':
          io.to('world').emit('chat:message', msg);
          break;
        case 'job':
          if (player.job !== 'unemployed') {
            io.to(`job:${player.job}`).emit('chat:message', msg);
          }
          break;
        case 'faction':
          if (player.faction) {
            io.to(`faction:${player.faction}`).emit('chat:message', msg);
          }
          break;
        case 'radio':
          io.to(`radio:${player.job}`).emit('chat:message', { ...msg, isRadio: true });
          break;
        case 'local':
        default:
          socket.to('world').emit('chat:message', msg);
          socket.emit('chat:message', msg);
          break;
      }

      audit('chat', socket.id, player.id, { channel: msg.channel });
    });

    // Historique chat
    socket.on('chat:history', (data) => {
      const limit = Math.min(data?.limit || 50, 100);
      const channel = data?.channel || null;
      const history = channel
        ? chatHistory.filter(m => m.channel === channel)
        : chatHistory;
      socket.emit('chat:history', history.slice(-limit));
    });

    // ════════════════════════════════════════════════════════════════════════
    // BRAIN INTENT
    // ════════════════════════════════════════════════════════════════════════
    socket.on('brain:intent', async (data) => {
      if (!checkRate(socket.id, 'brain', 5, 10_000)) {
        socket.emit('brain:response', {
          success: false,
          error: 'Rate limit Brain',
          requestId: data?.requestId,
        });
        return;
      }

      const player = getPlayer(kernel, socket.id);

      try {
        const result = await kernel.brain?.process({
          intent: sanitizeString(String(data?.intent || ''), 2000),
          context: {
            source: 'client',
            socketId: socket.id,
            playerId: player?.id,
            playerName: player?.name,
          },
        });
        socket.emit('brain:response', { success: true, result, requestId: data?.requestId });
        audit('brain:intent', socket.id, player?.id, { intent: data?.intent?.slice(0, 80) });
      } catch (err) {
        socket.emit('brain:response', {
          success: false,
          error: err.message,
          requestId: data?.requestId,
        });
      }
    });

    // ════════════════════════════════════════════════════════════════════════
    // COMMANDES RP
    // ════════════════════════════════════════════════════════════════════════
    socket.on('rp:command', async (data) => {
      if (!checkRate(socket.id, 'command', CONFIG.maxCommandRate, CONFIG.commandRateWindow)) {
        sendError(socket, 'Commandes trop rapides', 'RATE_LIMITED');
        return;
      }

      const player = getPlayer(kernel, socket.id);
      if (!player) return;

      const cmd = sanitizeString(String(data?.cmd || ''), 32).toLowerCase();
      const args = data?.args || {};
      const players = getPlayers(kernel);

      logger.info('RP', `${player.name} → /${cmd}`);
      metrics.totalCommands++;
      audit('rp:command', socket.id, player.id, { cmd, args });

      switch (cmd) {

        case 'me': {
          const text = sanitizeString(String(args.text || ''), 128);
          if (!text) break;
          io.to('world').emit('rp:emote', { playerName: player.name, socketId: socket.id, text, ts: Date.now() });
          break;
        }

        case 'pay': {
          const targetName = sanitizeString(String(args.target || ''), 32);
          const amount = Math.floor(Number(args.amount) || 0);
          const target = [...players.values()].find(p => p.name === targetName);

          if (!target) { notify(socket, 'error', 'Joueur introuvable'); break; }
          if (target.id === player.id) { notify(socket, 'error', 'Auto-paiement interdit'); break; }
          if (amount <= 0) { notify(socket, 'error', 'Montant invalide'); break; }
          if (player.cash < amount) { notify(socket, 'error', 'Fonds insuffisants'); break; }

          player.cash -= amount;
          target.cash += amount;
          player.stats.moneyEarned = (player.stats.moneyEarned || 0) - amount;

          socket.emit('player:update', { cash: player.cash });
          io.to(target.socketId).emit('player:update', { cash: target.cash });

          io.to('world').emit('chat:message', {
            id: uid('msg'),
            playerName: 'Système',
            message: `💵 ${player.name} a payé ${amount}$ à ${target.name}`,
            channel: 'system',
            ts: Date.now(),
          });

          notify(socket, 'success', `Vous avez envoyé ${amount}$ à ${target.name}`);
          notifyTo(io, target.socketId, 'success', `Vous avez reçu ${amount}$ de ${player.name}`);

          metrics.totalTransactions++;
          break;
        }

        case 'deposit': {
          const amount = Math.floor(Number(args.amount) || 0);
          if (amount <= 0 || player.cash < amount) {
            notify(socket, 'error', 'Dépôt invalide');
            break;
          }
          player.cash -= amount;
          player.bank += amount;
          socket.emit('player:update', { cash: player.cash, bank: player.bank });
          notify(socket, 'success', `💰 Dépôt de ${amount}$ effectué`);
          metrics.totalTransactions++;
          break;
        }

        case 'withdraw': {
          const amount = Math.floor(Number(args.amount) || 0);
          if (amount <= 0 || player.bank < amount) {
            notify(socket, 'error', 'Retrait invalide');
            break;
          }
          player.bank -= amount;
          player.cash += amount;
          socket.emit('player:update', { cash: player.cash, bank: player.bank });
          notify(socket, 'success', `🏦 Retrait de ${amount}$ effectué`);
          metrics.totalTransactions++;
          break;
        }

        case 'work': {
          const job = getJobs(kernel).find(j => j.id === player.job);
          const salary = job?.salary || 0;
          if (salary === 0) { notify(socket, 'error', 'Aucun emploi actif'); break; }

          const earned = Math.floor(salary * CONFIG.salaryMultiplier);
          player.cash += earned;
          player.stats.moneyEarned = (player.stats.moneyEarned || 0) + earned;

          socket.emit('player:update', { cash: player.cash });
          notify(socket, 'success', `💼 Vous avez gagné ${earned}$ en travaillant!`);

          io.to('world').emit('chat:message', {
            id: uid('msg'),
            playerName: 'Système',
            message: `${player.name} a travaillé en tant que ${job.name}`,
            channel: 'system',
            ts: Date.now(),
          });
          break;
        }

        case 'health': {
          const prev = player.health;
          player.health = clamp(player.health + CONFIG.healthRegen, 0, 100);
          const gained = player.health - prev;
          socket.emit('player:update', { health: player.health });
          notify(socket, gained > 0 ? 'success' : 'info',
            gained > 0 ? `❤️ +${gained} santé (${player.health}/100)` : 'Santé déjà pleine'
          );
          break;
        }

        case 'eat': {
          const amount = Math.min(Number(args.amount) || 25, 100);
          player.hunger = clamp((player.hunger || 0) + amount, 0, 100);
          socket.emit('player:update', { hunger: player.hunger });
          notify(socket, 'success', `🍔 Vous avez mangé (+${amount} faim)`);
          break;
        }

        case 'drink': {
          const amount = Math.min(Number(args.amount) || 25, 100);
          player.thirst = clamp((player.thirst || 0) + amount, 0, 100);
          socket.emit('player:update', { thirst: player.thirst });
          notify(socket, 'success', `💧 Vous avez bu (+${amount} soif)`);
          break;
        }

        case 'wanted': {
          // Ajouter/retirer niveau recherché (admin)
          if (!player.adminLevel) break;
          const targetName = sanitizeString(String(args.target || ''), 32);
          const level = clamp(Number(args.level) || 0, 0, 5);
          const target = [...players.values()].find(p => p.name === targetName);
          if (target) {
            target.wanted = level;
            io.to(target.socketId).emit('player:update', { wanted: target.wanted });
            notify(socket, 'info', `Niveau recherché de ${target.name} → ${level}`);
          }
          break;
        }

        case 'setjob': {
          if (!player.adminLevel) { notify(socket, 'error', 'Permission refusée'); break; }
          const targetName = sanitizeString(String(args.target || ''), 32);
          const jobId = sanitizeString(String(args.job || ''), 32);
          const target = [...players.values()].find(p => p.name === targetName);
          const job = getJobs(kernel).find(j => j.id === jobId);

          if (!target || !job) { notify(socket, 'error', 'Joueur ou job introuvable'); break; }

          const oldJobId = target.job;
          target.job = jobId;

          io.sockets.sockets.get(target.socketId)?.leave(`job:${oldJobId}`);
          io.sockets.sockets.get(target.socketId)?.join(`job:${jobId}`);
          io.to(target.socketId).emit('player:update', { job: jobId });
          notifyTo(io, target.socketId, 'info', `Nouveau job: ${job.name}`);
          notify(socket, 'success', `Job de ${target.name} → ${job.name}`);
          break;
        }

        case 'stats': {
          socket.emit('player:stats', {
            player: {
              name: player.name,
              job: player.job,
              cash: player.cash,
              bank: player.bank,
              health: player.health,
              armor: player.armor,
              hunger: player.hunger,
              thirst: player.thirst,
              wanted: player.wanted,
              playtime: Math.floor((Date.now() - player.joinedAt) / 1000),
              ...player.stats,
            },
          });
          break;
        }

        case 'players': {
          socket.emit('world:players', {
            count: players.size,
            players: [...players.values()].map(buildPlayerPublic),
          });
          break;
        }

        default:
          notify(socket, 'error', `Commande inconnue: /${cmd}`);
      }

      // Sauvegarder les changements
      savePlayer(kernel, player);
    });

    // ════════════════════════════════════════════════════════════════════════
    // IMMOBILIER
    // ════════════════════════════════════════════════════════════════════════
    socket.on('property:buy', (data) => {
      if (!checkRate(socket.id, 'property', 5, 30_000)) return;

      const player = getPlayer(kernel, socket.id);
      const properties = getProperties(kernel);
      if (!player) return sendError(socket, 'Non authentifié');

      const propertyId = sanitizeString(String(data?.propertyId || ''), 64);
      const price = Math.floor(Number(data?.price) || 0);

      if (!propertyId || price <= 0) {
        return notify(socket, 'error', 'Données propriété invalides');
      }
      if (properties.has(propertyId)) {
        const existing = properties.get(propertyId);
        if (existing.ownerId !== socket.id) {
          return notify(socket, 'error', 'Propriété déjà achetée');
        }
      }
      if (player.cash < price) {
        return notify(socket, 'error', `Fonds insuffisants (manque ${price - player.cash}$)`);
      }

      player.cash -= price;
      const property = {
        id: propertyId,
        ownerId: socket.id,
        ownerName: player.name,
        price,
        boughtAt: Date.now(),
        upgrades: [],
        locked: false,
      };

      properties.set(propertyId, property);
      kernel.memory.set('properties', properties);
      savePlayer(kernel, player);

      socket.emit('player:update', { cash: player.cash });
      socket.emit('property:bought', { property });
      notify(socket, 'success', `🏠 Propriété achetée pour ${price}$!`);

      // Annoncer au monde
      io.to('world').emit('property:sold', {
        propertyId,
        ownerName: player.name,
      });

      metrics.totalTransactions++;
      audit('property:buy', socket.id, player.id, { propertyId, price });
    });

    socket.on('property:sell', (data) => {
      if (!checkRate(socket.id, 'property', 5, 30_000)) return;

      const player = getPlayer(kernel, socket.id);
      const properties = getProperties(kernel);
      if (!player) return;

      const propertyId = sanitizeString(String(data?.propertyId || ''), 64);
      const property = properties.get(propertyId);

      if (!property) return notify(socket, 'error', 'Propriété introuvable');
      if (property.ownerId !== socket.id) return notify(socket, 'error', 'Vous n\'êtes pas propriétaire');

      const resale = Math.floor(property.price * 0.7); // 70% valeur
      player.cash += resale;
      properties.delete(propertyId);
      kernel.memory.set('properties', properties);
      savePlayer(kernel, player);

      socket.emit('player:update', { cash: player.cash });
      socket.emit('property:sold', { propertyId, resale });
      notify(socket, 'success', `🏠 Propriété vendue pour ${resale}$!`);
      audit('property:sell', socket.id, player.id, { propertyId, resale });
    });

    socket.on('property:list', () => {
      const properties = getProperties(kernel);
      const player = getPlayer(kernel, socket.id);
      if (!player) return;

      const myProperties = [...properties.values()]
        .filter(p => p.ownerId === socket.id);

      socket.emit('property:list', { properties: myProperties, count: myProperties.length });
    });

    // ════════════════════════════════════════════════════════════════════════
    // VÉHICULES
    // ════════════════════════════════════════════════════════════════════════
    socket.on('vehicle:spawn', (data) => {
      if (!checkRate(socket.id, 'vehicle', 3, 30_000)) return;

      const player = getPlayer(kernel, socket.id);
      if (!player) return;

      const vehicles = getVehicles(kernel);

      // Limite par joueur
      const playerVehicles = [...vehicles.values()].filter(v => v.ownerId === socket.id);
      if (playerVehicles.length >= CONFIG.vehicleMaxPerPlayer) {
        return notify(socket, 'error', `Maximum ${CONFIG.vehicleMaxPerPlayer} véhicules autorisés`);
      }

      const model = sanitizeString(String(data?.model || 'car'), 32);
      const vehicle = {
        id: uid('veh'),
        model,
        ownerId: socket.id,
        ownerName: player.name,
        position: data?.position || { x: player.position.x + 5, y: player.position.y, z: player.position.z },
        rotation: data?.rotation || { x: 0, y: 0, z: 0 },
        fuel: 100,
        health: 1000,
        locked: false,
        engineOn: false,
        spawnedAt: Date.now(),
      };

      vehicles.set(vehicle.id, vehicle);
      kernel.memory.set('vehicles', vehicles);

      io.to('world').emit('vehicle:spawned', vehicle);
      notify(socket, 'success', `🚗 ${model} spawné!`);
      audit('vehicle:spawn', socket.id, player.id, { vehicleId: vehicle.id, model });
    });

    socket.on('vehicle:despawn', (data) => {
      const player = getPlayer(kernel, socket.id);
      const vehicles = getVehicles(kernel);
      if (!player || !data?.vehicleId) return;

      const vehicle = vehicles.get(data.vehicleId);
      if (!vehicle || vehicle.ownerId !== socket.id) {
        return notify(socket, 'error', 'Véhicule introuvable ou non autorisé');
      }

      vehicles.delete(data.vehicleId);
      kernel.memory.set('vehicles', vehicles);
      io.to('world').emit('vehicle:despawned', { vehicleId: data.vehicleId });
      notify(socket, 'info', 'Véhicule supprimé');
    });

    socket.on('vehicle:lock', (data) => {
      const player = getPlayer(kernel, socket.id);
      const vehicles = getVehicles(kernel);
      if (!player || !data?.vehicleId) return;

      const vehicle = vehicles.get(data.vehicleId);
      if (!vehicle || vehicle.ownerId !== socket.id) return;

      vehicle.locked = !vehicle.locked;
      kernel.memory.set('vehicles', vehicles);
      io.to('world').emit('vehicle:updated', { vehicleId: data.vehicleId, locked: vehicle.locked });
      notify(socket, 'info', `Véhicule ${vehicle.locked ? '🔒 verrouillé' : '🔓 déverrouillé'}`);
    });

    // ════════════════════════════════════════════════════════════════════════
    // INVENTAIRE
    // ════════════════════════════════════════════════════════════════════════
    socket.on('inventory:use', (data) => {
      if (!checkRate(socket.id, 'inventory', 20, 10_000)) return;

      const player = getPlayer(kernel, socket.id);
      if (!player || !data?.itemId) return;

      const itemId = sanitizeString(String(data.itemId), 64);
      const qty = clamp(Number(data.quantity) || 1, 1, 100);
      const invItem = player.inventory.find(i => i.id === itemId);

      if (!invItem || invItem.count < qty) {
        return notify(socket, 'error', 'Item introuvable ou quantité insuffisante');
      }

      // Effets item
      const itemDef = getItems(kernel).find(i => i.id === itemId);
      if (itemDef?.effects) {
        for (const [stat, val] of Object.entries(itemDef.effects)) {
          if (stat in player) player[stat] = clamp(player[stat] + val, 0, 100);
        }
      }

      invItem.count -= qty;
      if (invItem.count <= 0) {
        player.inventory = player.inventory.filter(i => i.id !== itemId);
      }

      savePlayer(kernel, player);
      socket.emit('inventory:update', { inventory: player.inventory });
      socket.emit('player:update', {
        health: player.health,
        hunger: player.hunger,
        thirst: player.thirst,
        stamina: player.stamina,
      });
      notify(socket, 'success', `✅ Item utilisé: ${itemDef?.name || itemId}`);
      audit('inventory:use', socket.id, player.id, { itemId, qty });
    });

    socket.on('inventory:give', (data) => {
      if (!checkRate(socket.id, 'inventory', 10, 10_000)) return;

      const player = getPlayer(kernel, socket.id);
      const players = getPlayers(kernel);
      if (!player || !data?.itemId || !data?.targetId) return;

      if (data.targetId === socket.id) return notify(socket, 'error', 'Auto-give interdit');

      const target = players.get(data.targetId);
      if (!target) return notify(socket, 'error', 'Joueur cible introuvable');

      const itemId = sanitizeString(String(data.itemId), 64);
      const qty = clamp(Number(data.quantity) || 1, 1, 100);
      const invItem = player.inventory.find(i => i.id === itemId);

      if (!invItem || invItem.count < qty) return notify(socket, 'error', 'Item insuffisant');

      invItem.count -= qty;
      if (invItem.count <= 0) player.inventory = player.inventory.filter(i => i.id !== itemId);

      const targetItem = target.inventory.find(i => i.id === itemId);
      if (targetItem) targetItem.count += qty;
      else target.inventory.push({ id: itemId, count: qty });

      savePlayer(kernel, player);
      savePlayer(kernel, target);

      socket.emit('inventory:update', { inventory: player.inventory });
      io.to(target.socketId).emit('inventory:update', { inventory: target.inventory });
      notifyTo(io, target.socketId, 'info', `🎁 ${player.name} vous a donné ${qty}x ${itemId}`);
      notify(socket, 'success', `Item donné à ${target.name}`);
      audit('inventory:give', socket.id, player.id, { to: data.targetId, itemId, qty });
    });

    socket.on('inventory:list', () => {
      const player = getPlayer(kernel, socket.id);
      if (!player) return;
      socket.emit('inventory:update', { inventory: player.inventory });
    });

    // ════════════════════════════════════════════════════════════════════════
    // WORLD
    // ════════════════════════════════════════════════════════════════════════
    socket.on('world:ping', () => {
      socket.emit('world:pong', {
        ts: Date.now(),
        state: getWorldState(kernel),
        players: getPlayers(kernel).size,
      });
    });

    socket.on('world:state', () => {
      const player = getPlayer(kernel, socket.id);
      socket.emit('world:data', {
        state: getWorldState(kernel),
        players: [...getPlayers(kernel).values()].map(buildPlayerPublic),
        vehicles: [...getVehicles(kernel).values()],
        properties: [...getProperties(kernel).values()],
        jobs: getJobs(kernel),
        factions: getFactions(kernel),
        onlinePlayers: getPlayers(kernel).size,
        ts: Date.now(),
      });
    });

    // ════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ════════════════════════════════════════════════════════════════════════
    socket.on('admin:command', async (data) => {
      if (!checkRate(socket.id, 'admin', 20, 60_000)) return;

      const player = getPlayer(kernel, socket.id);
      if (!player || !player.adminLevel) {
        return sendError(socket, 'Permission refusée', 'FORBIDDEN');
      }

      const cmd = sanitizeString(String(data?.command || ''), 32).toLowerCase();
      const args = data?.args || [];

      logger.info('Admin', `"${cmd}" par ${player.name} (lvl ${player.adminLevel})`);
      audit('admin:cmd', socket.id, player.id, { cmd, args });

      const result = await handleAdminCommand(cmd, args, player, io, kernel);
      socket.emit('admin:result', result);
    });

    // ════════════════════════════════════════════════════════════════════════
    // DÉCONNEXION
    // ════════════════════════════════════════════════════════════════════════
    socket.on('disconnect', async (reason) => {
      const player = getPlayer(kernel, socket.id);
      const players = getPlayers(kernel);

      if (player) {
        // Sauvegarder le temps de jeu
        player.totalPlaytime = (player.totalPlaytime || 0) + (Date.now() - player.joinedAt);
        player.lastSeen = Date.now();

        players.delete(socket.id);
        kernel.memory.set('players', players);

        socket.to('world').emit('player:left', {
          socketId: socket.id,
          playerId: player.id,
          playerName: player.name,
          ts: Date.now(),
        });

        await kernel.bus?.emit?.('player.leave', { playerId: player.id, name: player.name });

        logger.warn('Socket', `"${player.name}" déconnecté (${reason})`);
        audit('disconnect', socket.id, player.id, { reason });
      }

      socketMeta.delete(socket.id);
      metrics.currentConnections = Math.max(0, metrics.currentConnections - 1);
    });

    socket.on('error', (err) => {
      logger.warn('Socket', `Erreur ${socket.id}: ${err.message}`);
      audit('socket:error', socket.id, null, { error: err.message });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // WORLD TICK — Cycle jour/nuit + météo
  // ══════════════════════════════════════════════════════════════════════════
  const WEATHER_CYCLE = ['sunny', 'cloudy', 'rainy', 'stormy', 'foggy', 'snowy'];
  let weatherIndex = 0;

  setInterval(() => {
    const state = getWorldState(kernel);
    const prevTime = state.time;

    state.time = (state.time + 1) % 1440;   // +1 min monde / 10s réel

    // Transition jour/nuit
    if (prevTime === 359) {  // 06:00 → aube
      state.period = 'dawn';
    } else if (prevTime === 719) {  // 12:00 → midi
      state.period = 'noon';
    } else if (prevTime === 1079) { // 18:00 → crépuscule
      state.period = 'dusk';
    } else if (prevTime === 1319) { // 22:00 → nuit
      state.period = 'night';
    }

    // Changement météo toutes les 2h monde (120 ticks)
    if (state.time % 120 === 0) {
      weatherIndex = (weatherIndex + 1) % WEATHER_CYCLE.length;
      state.weather = WEATHER_CYCLE[weatherIndex];
      io.to('world').emit('world:weather', { weather: state.weather, ts: Date.now() });
    }

    kernel.memory.set('worldState', state);
    io.to('world').emit('world:tick', {
      time: state.time,
      period: state.period,
      weather: state.weather,
      day: state.day,
      ts: Date.now(),
    });

    // Passer au jour suivant
    if (state.time === 0) {
      state.day = (state.day || 1) + 1;
      io.to('world').emit('world:newday', { day: state.day });
    }
  }, CONFIG.worldTickInterval);

  // ── Sauvegarde auto ────────────────────────────────────────────────────────
  setInterval(() => {
    const count = getPlayers(kernel).size;
    if (count > 0) {
      logger.info('Socket', `💾 Sauvegarde auto — ${count} joueurs`);
      kernel.bus?.emit?.('world.autosave', { ts: Date.now(), players: count });
    }
  }, CONFIG.saveInterval);

  // ── Métriques périodiques → admin_room ────────────────────────────────────
  setInterval(() => {
    io.to('admin_room').emit('server:metrics', getServerMetrics());
  }, 30_000);

  logger.ok('Socket', `WebSocket Gateway v${VERSION} opérationnel`);
  return io;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMANDES ADMIN
// ══════════════════════════════════════════════════════════════════════════════

async function handleAdminCommand(command, args, admin, io, kernel) {
  const players = getPlayers(kernel);

  switch (command) {

    case 'give_money': {
      const [targetName, amount] = args;
      const target = [...players.values()].find(p => p.name === targetName);
      if (!target || amount <= 0) return { success: false, error: 'Args invalides' };
      target.cash += Number(amount);
      io.to(target.socketId).emit('player:update', { cash: target.cash });
      notifyTo(io, target.socketId, 'success', `💰 Admin vous a donné ${amount}$`);
      return { success: true, action: 'give_money', targetName, amount };
    }

    case 'take_money': {
      const [targetName, amount] = args;
      const target = [...players.values()].find(p => p.name === targetName);
      if (!target) return { success: false, error: 'Joueur introuvable' };
      target.cash = Math.max(0, target.cash - Number(amount));
      io.to(target.socketId).emit('player:update', { cash: target.cash });
      return { success: true, action: 'take_money', targetName, amount };
    }

    case 'kick': {
      const [targetName, reason] = args;
      const target = [...players.values()].find(p => p.name === targetName);
      if (!target) return { success: false, error: 'Joueur introuvable' };
      notifyTo(io, target.socketId, 'error', `Kick: ${reason || 'Raison non spécifiée'}`);
      setTimeout(() => io.sockets.sockets.get(target.socketId)?.disconnect(true), 1000);
      return { success: true, action: 'kick', targetName, reason };
    }

    case 'ban': {
      const [targetName, reason] = args;
      const target = [...players.values()].find(p => p.name === targetName);
      if (!target) return { success: false, error: 'Joueur introuvable' };
      const meta = socketMeta.get(target.socketId);
      if (meta) meta.banned = true;
      notifyTo(io, target.socketId, 'error', `Banni: ${reason || 'Non spécifié'}`);
      setTimeout(() => io.sockets.sockets.get(target.socketId)?.disconnect(true), 1000);
      return { success: true, action: 'ban', targetName, reason };
    }

    case 'teleport': {
      const [targetName, x, y, z] = args;
      const target = [...players.values()].find(p => p.name === targetName);
      if (!target) return { success: false, error: 'Joueur introuvable' };
      target.position = { x: Number(x), y: Number(y), z: Number(z) };
      io.to(target.socketId).emit('player:update', { position: target.position });
      return { success: true, action: 'teleport', targetName, position: target.position };
    }

    case 'set_weather': {
      const [type] = args;
      const valid = ['sunny', 'cloudy', 'rainy', 'stormy', 'foggy', 'snowy'];
      if (!valid.includes(type)) return { success: false, error: 'Météo invalide' };
      const state = getWorldState(kernel);
      state.weather = type;
      kernel.memory.set('worldState', state);
      io.to('world').emit('world:weather', { weather: type, forced: true });
      return { success: true, action: 'set_weather', type };
    }

    case 'set_time': {
      const [time] = args;
      const t = clamp(Number(time) || 0, 0, 1439);
      const state = getWorldState(kernel);
      state.time = t;
      kernel.memory.set('worldState', state);
      io.to('world').emit('world:tick', { time: t, forced: true });
      return { success: true, action: 'set_time', time: t };
    }

    case 'broadcast': {
      const [message] = args;
      if (!message) return { success: false, error: 'Message manquant' };
      io.to('world').emit('chat:message', {
        id: uid('msg'),
        playerName: `[ADMIN] ${admin.name}`,
        message: sanitizeString(message, 512),
        channel: 'system',
        ts: Date.now(),
      });
      return { success: true, action: 'broadcast', message };
    }

    case 'stats': {
      return { success: true, action: 'stats', ...getServerMetrics() };
    }

    case 'audit': {
      const [limit = 50] = args;
      return { success: true, action: 'audit', log: auditLog.slice(-Math.min(limit, 200)) };
    }

    case 'players': {
      return {
        success: true,
        action: 'players',
        count: players.size,
        players: [...players.values()].map(buildPlayerPublic),
      };
    }

    default:
      return { success: false, error: `Commande inconnue: ${command}`, code: 'UNKNOWN_COMMAND' };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MÉTRIQUES
// ══════════════════════════════════════════════════════════════════════════════

function getServerMetrics() {
  return {
    ...metrics,
    uptimeMs: Date.now() - metrics.startedAt,
    uptimeHuman: formatUptime(Date.now() - metrics.startedAt),
    activeSockets: socketMeta.size,
    auditEntries: auditLog.length,
    chatHistory: chatHistory.length,
    version: VERSION,
    ts: Date.now(),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// API PUBLIQUE
// ══════════════════════════════════════════════════════════════════════════════

/** Broadcast global depuis l'extérieur */
export function broadcastToWorld(event, data) {
  ioInstance?.to('world').emit(event, data);
}

/** Notifier un joueur depuis l'extérieur */
export function notifyPlayer(socketId, type, message) {
  ioInstance?.to(socketId).emit('notification', { type, message, ts: Date.now() });
}

/** Obtenir les métriques serveur */
export function getMetrics() {
  return getServerMetrics();
}

/** Obtenir le log d'audit */
export function getAudit(limit = 100) {
  return auditLog.slice(-limit);
}

/** Obtenir l'historique chat */
export function getChatHistory(limit = 50) {
  return chatHistory.slice(-limit);
