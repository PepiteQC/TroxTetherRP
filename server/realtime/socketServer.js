import { Server } from 'socket.io';
import { logger } from '../shared/logger.js';
import crypto from 'crypto';

export function createRealtimeServer(httpServer, { kernel }) {
  const io = new Server(httpServer, {
    cors: { origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'], methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Connexion joueur ────────────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const ip = socket.handshake.address;
    logger.ok('Socket', `Connexion: ${socket.id} (${ip})`);

    socket.on('player:join', async (data) => {
      const playerId = data.playerId || 'player_' + crypto.randomBytes(4).toString('hex');
      const player = {
        id: playerId,
        socketId: socket.id,
        name: data.name || 'Joueur',
        job: data.job || 'unemployed',
        cash: data.cash || 2500,
        bank: data.bank || 10000,
        health: 100,
        armor: 0,
        position: { x: 0, y: 1, z: 0 },
        inventory: [{ id: 'phone', count: 1 }, { id: 'wallet', count: 1 }],
        joinedAt: Date.now(),
      };

      const players = kernel.memory.get('players') || new Map();
      players.set(playerId, player);
      kernel.memory.set('players', players);
      socket.data.playerId = playerId;

      await kernel.bus.emit('player.join', { playerId, name: player.name });

      socket.join('world');
      socket.emit('player:joined', { player, world: kernel.memory.get('worldState') });
      socket.to('world').emit('player:new', { player: { id: playerId, name: player.name, position: player.position } });

      // Envoyer les donnees du monde
      socket.emit('world:data', {
        players: Array.from(players.values()).map(p => ({ id: p.id, name: p.name, position: p.position, job: p.job })),
        jobs: kernel.memory.get('jobs'),
        factions: kernel.memory.get('factions'),
        state: kernel.memory.get('worldState'),
      });

      logger.ok('Socket', `Joueur "${player.name}" (${playerId}) rejoint le monde`);
    });

    // ── Mouvement joueur ──────────────────────────────────────────────────────
    socket.on('player:move', (data) => {
      const players = kernel.memory.get('players');
      const player = players?.get(socket.data.playerId);
      if (player) {
        player.position = data.position;
        socket.to('world').emit('player:moved', { playerId: socket.data.playerId, position: data.position, rotation: data.rotation });
      }
    });

    // ── Chat RP ───────────────────────────────────────────────────────────────
    socket.on('chat:send', (data) => {
      const players = kernel.memory.get('players');
      const player = players?.get(socket.data.playerId);
      if (!player) return;

      const msg = {
        id: 'msg_' + Date.now(),
        playerId: socket.data.playerId,
        playerName: player.name,
        message: String(data.message || '').substring(0, 256),
        channel: data.channel || 'local',
        ts: Date.now(),
      };

      if (msg.channel === 'local') {
        socket.to('world').emit('chat:message', msg);
        socket.emit('chat:message', msg);
      } else if (msg.channel === 'global') {
        io.emit('chat:message', msg);
      }
    });

    // ── Brain Intent depuis client ────────────────────────────────────────────
    socket.on('brain:intent', async (data) => {
      try {
        const result = await kernel.brain?.process({ intent: data.intent, context: { source: 'client', socketId: socket.id, playerId: socket.data.playerId } });
        socket.emit('brain:response', { success: true, result, requestId: data.requestId });
      } catch (err) {
        socket.emit('brain:response', { success: false, error: err.message, requestId: data.requestId });
      }
    });

    // ── Commandes RP ──────────────────────────────────────────────────────────
    socket.on('rp:command', async (data) => {
      const players = kernel.memory.get('players');
      const player = players?.get(socket.data.playerId);
      if (!player) return;

      const { cmd, args } = data;
      logger.info('RP', `${player.name} → /${cmd} ${JSON.stringify(args)}`);

      switch (cmd) {
        case 'me': io.to('world').emit('rp:emote', { playerName: player.name, text: args.text }); break;
        case 'pay': {
          const target = Array.from(players.values()).find(p => p.name === args.target);
          if (target && player.cash >= args.amount) {
            player.cash -= args.amount;
            target.cash += args.amount;
            socket.emit('player:update', { cash: player.cash });
            io.to(target.socketId).emit('player:update', { cash: target.cash });
            io.to('world').emit('chat:message', { playerName: 'System', message: `${player.name} a paye ${args.amount}$ a ${target.name}`, channel: 'system', ts: Date.now() });
          }
          break;
        }
        case 'work': {
          const salary = (kernel.memory.get('jobs') || []).find(j => j.id === player.job)?.salary || 0;
          const earned = Math.floor(salary * 0.1);
          player.cash += earned;
          socket.emit('player:update', { cash: player.cash });
          socket.emit('notification', { type: 'success', message: `Vous avez gagne ${earned}$ en travaillant!` });
          break;
        }
        case 'health': { player.health = Math.min(100, player.health + 25); socket.emit('player:update', { health: player.health }); break; }
        default: socket.emit('notification', { type: 'error', message: `Commande inconnue: /${cmd}` });
      }
    });

    // ── Immobilier ─────────────────────────────────────────────────────────────
    socket.on('property:buy', (data) => {
      const players = kernel.memory.get('players');
      const player = players?.get(socket.data.playerId);
      const properties = kernel.memory.get('properties') || new Map();
      if (!player || !data.propertyId || player.cash < data.price) {
        return socket.emit('notification', { type: 'error', message: 'Achat impossible' });
      }
      player.cash -= data.price;
      properties.set(data.propertyId, { id: data.propertyId, ownerId: socket.data.playerId, price: data.price, boughtAt: Date.now() });
      kernel.memory.set('properties', properties);
      socket.emit('player:update', { cash: player.cash });
      socket.emit('notification', { type: 'success', message: `Propriete achetee pour ${data.price}$!` });
    });

    // ── Vehicules ─────────────────────────────────────────────────────────────
    socket.on('vehicle:spawn', (data) => {
      const vehicle = { id: 'veh_' + Date.now(), model: data.model, ownerId: socket.data.playerId, position: data.position || { x: 5, y: 0, z: 5 }, spawnedAt: Date.now() };
      io.to('world').emit('vehicle:spawned', vehicle);
    });

    // ── World state sync ──────────────────────────────────────────────────────
    socket.on('world:ping', () => {
      socket.emit('world:pong', { ts: Date.now(), state: kernel.memory.get('worldState') });
    });

    // ── Deconnexion ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const players = kernel.memory.get('players');
      const playerId = socket.data.playerId;
      if (players && playerId) {
        const player = players.get(playerId);
        players.delete(playerId);
        await kernel.bus.emit('player.leave', { playerId, name: player?.name });
        socket.to('world').emit('player:left', { playerId });
        logger.warn('Socket', `Joueur ${player?.name} (${playerId}) deconnecte`);
      }
    });
  });

  // ── Cycle du monde (jour/nuit, meteo) ─────────────────────────────────────
  setInterval(() => {
    const state = kernel.memory.get('worldState') || { time: 720, weather: 'sunny', season: 'summer' };
    state.time = (state.time + 1) % 1440;
    kernel.memory.set('worldState', state);
    io.to('world').emit('world:tick', { time: state.time, weather: state.weather });
  }, 10000); // toutes les 10s

  logger.ok('Socket', 'WebSocket Gateway RP operationnel');
  return io;
}
