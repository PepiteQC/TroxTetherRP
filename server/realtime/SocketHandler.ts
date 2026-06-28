/**
 * SocketHandler — Gestionnaire WebSocket principal
 * Tous les événements temps réel du serveur RP
 * Port-Éther RP — Fichier: server/realtime/SocketHandler.ts
 */

import { Server as IOServer, Socket } from 'socket.io';
import PlayerManager from '../core/PlayerManager';
import EconomyEngine from '../rp/EconomyEngine';
import JobEngine from '../rp/JobEngine';
import WorldEngine from '../world/WorldEngine';
import ThirdEye from '../brain/ThirdEye';

// ─── Événements ───────────────────────────────────────────────────────────────
// Format: CATEGORIE:ACTION
// Client → Serveur: camelCase sans préfixe
// Serveur → Client: MAJUSCULE:ACTION

export const EVENTS = {
  // Auth
  C_AUTH:             'auth',
  S_AUTH_OK:          'AUTH:OK',
  S_AUTH_ERR:         'AUTH:ERROR',

  // Joueur
  C_POSITION:         'player:position',
  S_PLAYER_JOIN:      'PLAYER:JOINED',
  S_PLAYER_LEAVE:     'PLAYER:LEFT',
  S_PLAYER_MOVE:      'PLAYER:MOVED',
  S_PLAYER_UPDATE:    'PLAYER:UPDATE',

  // Économie
  C_BANK_DEPOSIT:     'bank:deposit',
  C_BANK_WITHDRAW:    'bank:withdraw',
  C_BANK_TRANSFER:    'bank:transfer',
  C_BANK_BALANCE:     'bank:balance',
  S_BANK_RESULT:      'BANK:RESULT',

  // Jobs
  C_JOB_JOIN:         'job:join',
  C_JOB_LEAVE:        'job:leave',
  C_JOB_DUTY:         'job:duty',
  S_JOB_RESULT:       'JOB:RESULT',
  S_SALARY_PAID:      'JOB:SALARY',

  // Monde
  C_WORLD_STATE:      'world:state',
  S_WORLD_STATE:      'WORLD:STATE',
  S_WORLD_TIME:       'WORLD:TIME',
  S_WORLD_WEATHER:    'WORLD:WEATHER',

  // Interaction
  C_INTERACT:         'interact',
  S_INTERACT_RESULT:  'INTERACT:RESULT',

  // Chat
  C_CHAT:             'chat',
  S_CHAT:             'CHAT:MESSAGE',

  // Inventaire
  C_INV_USE:          'inventory:use',
  C_INV_DROP:         'inventory:drop',
  C_INV_GIVE:         'inventory:give',
  S_INV_UPDATE:       'INVENTORY:UPDATE',

  // Admin
  C_ADMIN_CMD:        'admin:command',
  S_ADMIN_RESULT:     'ADMIN:RESULT',
  S_ADMIN_BROADCAST:  'ADMIN:BROADCAST',

  // Système
  S_PING:             'PING',
  S_ERROR:            'ERROR',
  S_NOTIFICATION:     'NOTIFICATION',
} as const;

// ─── SocketHandler ────────────────────────────────────────────────────────────

export function setupSocketHandler(io: IOServer): void {
  console.log('🔌 [SOCKET] Gestionnaire WebSocket initialisé');

  // Diffusion des événements monde
  WorldEngine.on('world:time_changed', (time) => {
    io.emit(EVENTS.S_WORLD_TIME, time);
  });
  WorldEngine.on('world:weather_changed', (weather) => {
    io.emit(EVENTS.S_WORLD_WEATHER, weather);
  });

  // Diffusion des salaires
  JobEngine.on('salary:due', ({ playerId, jobId, amount }) => {
    EconomyEngine.paySalary(playerId, PlayerManager.get(playerId)?.name ?? '', jobId, amount);
    io.to(playerId).emit(EVENTS.S_SALARY_PAID, { jobId, amount });
    io.to(playerId).emit(EVENTS.S_NOTIFICATION, {
      type: 'success',
      message: `💰 Salaire reçu: $${amount}`,
    });
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔗 [SOCKET] Nouvelle connexion: ${socket.id}`);

    let authenticatedPlayer: ReturnType<typeof PlayerManager.get> = undefined;

    // ─── Authentification ───────────────────────────────────────────────────

    socket.on(EVENTS.C_AUTH, (data: { steamId?: string; name?: string; token?: string }) => {
      // Validation Third Eye
      const check = ThirdEye.analyze('auth', socket.id, data);
      if (!check.allowed) {
        socket.emit(EVENTS.S_AUTH_ERR, { message: check.reason });
        return;
      }

      const steamId = data.steamId ?? `steam_${socket.id.slice(0, 8)}`;
      const player = PlayerManager.connect(socket.id, steamId, { name: data.name });
      authenticatedPlayer = player;

      // Rejoindre la room personnelle
      socket.join(socket.id);

      // Envoyer l'état initial
      socket.emit(EVENTS.S_AUTH_OK, {
        player,
        world: {
          time: WorldEngine.getTime(),
          weather: WorldEngine.getWeather(),
          districts: WorldEngine.getAllDistricts(),
          pois: WorldEngine.getAllPOIs(),
        },
      });

      // Annoncer aux autres joueurs
      socket.broadcast.emit(EVENTS.S_PLAYER_JOIN, {
        id: player.id,
        name: `${player.firstName} ${player.lastName}`,
        position: player.position,
        job: player.job,
      });

      console.log(`✅ [SOCKET] Auth OK: ${player.firstName} ${player.lastName}`);
    });

    // ─── Position ───────────────────────────────────────────────────────────

    socket.on(EVENTS.C_POSITION, (data: { x: number; y: number; z: number; heading?: number }) => {
      if (!authenticatedPlayer) return;

      // Anti-cheat: vérifier la distance de déplacement (pas de téléportation)
      const prev = authenticatedPlayer.position;
      const dist = Math.hypot(data.x - prev.x, data.z - prev.z);
      if (dist > 200) {
        ThirdEye.report({
          type: 'position_hack',
          source: socket.id,
          details: `Téléportation: ${dist.toFixed(0)}m d'un coup`,
          severity: 3,
          timestamp: Date.now(),
        });
        socket.emit(EVENTS.S_ERROR, { message: 'Déplacement invalide détecté' });
        // Renvoyer à la dernière position valide
        socket.emit(EVENTS.S_PLAYER_UPDATE, { position: prev });
        return;
      }

      PlayerManager.updatePosition(socket.id, data);

      // Broadcast aux joueurs proches uniquement (optimisation)
      socket.broadcast.emit(EVENTS.S_PLAYER_MOVE, {
        id: socket.id,
        position: data,
        heading: data.heading ?? 0,
      });
    });

    // ─── Banque ─────────────────────────────────────────────────────────────

    socket.on(EVENTS.C_BANK_DEPOSIT, (data: { amount: number }) => {
      if (!authenticatedPlayer) return;
      const check = ThirdEye.analyze('bank_deposit', socket.id, data);
      if (!check.allowed) return;

      const result = EconomyEngine.transfer(
        socket.id, 'bank', data.amount, 'deposit',
        'Dépôt bancaire', 'bank'
      );
      socket.emit(EVENTS.S_BANK_RESULT, {
        action: 'deposit',
        ...result,
        newBalance: EconomyEngine.getBalance(socket.id),
      });
    });

    socket.on(EVENTS.C_BANK_WITHDRAW, (data: { amount: number }) => {
      if (!authenticatedPlayer) return;

      const result = EconomyEngine.transfer(
        'bank', socket.id, data.amount, 'withdraw',
        'Retrait bancaire', 'bank'
      );
      socket.emit(EVENTS.S_BANK_RESULT, {
        action: 'withdraw',
        ...result,
        newBalance: EconomyEngine.getBalance(socket.id),
      });
    });

    socket.on(EVENTS.C_BANK_BALANCE, () => {
      if (!authenticatedPlayer) return;
      socket.emit(EVENTS.S_BANK_RESULT, {
        action: 'balance',
        balance: EconomyEngine.getBalance(socket.id),
        transactions: EconomyEngine.getPlayerTransactions(socket.id, 10),
      });
    });

    // ─── Métiers ────────────────────────────────────────────────────────────

    socket.on(EVENTS.C_JOB_JOIN, (data: { jobId: string }) => {
      if (!authenticatedPlayer) return;
      const { firstName, lastName } = authenticatedPlayer;
      const result = JobEngine.joinJob(socket.id, `${firstName} ${lastName}`, data.jobId);

      if (result.success && result.job) {
        PlayerManager.setJob(socket.id, result.job.id, result.job.name);
      }

      socket.emit(EVENTS.S_JOB_RESULT, { action: 'join', ...result });
    });

    socket.on(EVENTS.C_JOB_DUTY, (data: { onDuty: boolean }) => {
      if (!authenticatedPlayer) return;

      const result = data.onDuty
        ? JobEngine.setOnDuty(socket.id)
        : { success: true, equipment: [] };

      if (!data.onDuty) JobEngine.setOffDuty(socket.id);

      socket.emit(EVENTS.S_JOB_RESULT, { action: 'duty', onDuty: data.onDuty, ...result });

      if (result.success && data.onDuty && result.equipment?.length) {
        for (const itemId of result.equipment!) {
          PlayerManager.addItem(socket.id, itemId, 1);
        }
        socket.emit(EVENTS.S_INV_UPDATE, { inventory: authenticatedPlayer.inventory });
      }
    });

    // ─── État du monde ─────────────────────────────────────────────────────

    socket.on(EVENTS.C_WORLD_STATE, () => {
      socket.emit(EVENTS.S_WORLD_STATE, {
        time: WorldEngine.getTime(),
        weather: WorldEngine.getWeather(),
        players: PlayerManager.getOnline().map(p => ({
          id: p.socketId,
          name: `${p.firstName} ${p.lastName}`,
          position: p.position,
          job: p.job,
        })),
        onlinePlayers: PlayerManager.getCount(),
      });
    });

    // ─── Chat ────────────────────────────────────────────────────────────────

    socket.on(EVENTS.C_CHAT, (data: { message: string; channel: 'local' | 'global' | 'job' | 'radio' }) => {
      if (!authenticatedPlayer) return;

      const check = ThirdEye.analyze('chat', socket.id, data);
      if (!check.allowed) {
        socket.emit(EVENTS.S_ERROR, { message: 'Message bloqué — ' + check.reason });
        return;
      }

      const chatMsg = {
        from: `${authenticatedPlayer.firstName} ${authenticatedPlayer.lastName}`,
        fromId: socket.id,
        message: data.message.slice(0, 255), // Max 255 chars
        channel: data.channel,
        timestamp: Date.now(),
        job: authenticatedPlayer.job.id,
      };

      if (data.channel === 'global') {
        io.emit(EVENTS.S_CHAT, chatMsg);
      } else if (data.channel === 'job') {
        // Envoyer seulement aux joueurs du même job
        const jobmates = JobEngine.getOnDutyByJob(authenticatedPlayer.job.id);
        for (const emp of jobmates) {
          io.to(emp.playerId).emit(EVENTS.S_CHAT, chatMsg);
        }
      } else {
        // Local: broadcast global (le client filtre par distance)
        socket.broadcast.emit(EVENTS.S_CHAT, chatMsg);
        socket.emit(EVENTS.S_CHAT, chatMsg);
      }
    });

    // ─── Interaction ────────────────────────────────────────────────────────

    socket.on(EVENTS.C_INTERACT, (data: { poiId: string; action: string; payload?: unknown }) => {
      if (!authenticatedPlayer) return;

      const poi = WorldEngine.getPOI(data.poiId);
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
      });
    });

    // ─── Commandes Admin ────────────────────────────────────────────────────

    socket.on(EVENTS.C_ADMIN_CMD, (data: { command: string; args: unknown[] }) => {
      if (!authenticatedPlayer) return;
      if (authenticatedPlayer.adminLevel < 1) {
        socket.emit(EVENTS.S_ADMIN_RESULT, { success: false, error: 'Permission refusée' });
        return;
      }

      const result = handleAdminCommand(data.command, data.args, authenticatedPlayer, io);
      socket.emit(EVENTS.S_ADMIN_RESULT, result);
    });

    // ─── Déconnexion ────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      if (authenticatedPlayer) {
        JobEngine.setOffDuty(socket.id);
        PlayerManager.disconnect(socket.id);
        io.emit(EVENTS.S_PLAYER_LEAVE, { id: socket.id });
      }
      console.log(`🔌 [SOCKET] Déconnecté: ${socket.id}`);
    });
  });
}

// ─── Commandes admin ─────────────────────────────────────────────────────────

function handleAdminCommand(
  command: string,
  args: unknown[],
  admin: NonNullable<ReturnType<typeof PlayerManager.get>>,
  io: IOServer
): Record<string, unknown> {
  switch (command) {
    case 'give_money': {
      const [targetId, amount] = args as [string, number];
      const success = EconomyEngine.transfer('system', targetId, amount, 'admin_grant',
        `Don admin: ${admin.firstName}`, 'bank');
      io.to(targetId).emit(EVENTS.S_NOTIFICATION, { type: 'success', message: `💰 Admin vous a donné $${amount}` });
      return { success: success.success, action: 'give_money', targetId, amount };
    }

    case 'set_weather': {
      const [type] = args as [Weather['type']];
      WorldEngine.setWeather({ type });
      return { success: true, action: 'set_weather', type };
    }

    case 'kick_player': {
      const [targetId, reason] = args as [string, string];
      io.to(targetId).emit(EVENTS.S_ERROR, { message: `Kick: ${reason}` });
      io.sockets.sockets.get(targetId)?.disconnect();
      return { success: true, action: 'kick', targetId, reason };
    }

    case 'broadcast': {
      const [message] = args as [string];
      io.emit(EVENTS.S_ADMIN_BROADCAST, {
        from: `${admin.firstName} ${admin.lastName}`,
        message,
        timestamp: Date.now(),
      });
      return { success: true, action: 'broadcast', message };
    }

    default:
      return { success: false, error: `Commande inconnue: ${command}` };
  }
}

// Fix import type pour Weather
type Weather = import('../world/WorldEngine').Weather;