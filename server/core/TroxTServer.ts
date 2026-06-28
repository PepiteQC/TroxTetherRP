// TroxTetherworld —
// Cœur du serveur de jeu — WebSocket, validation, autorité

import { Server as SocketIOServer, Socket } from 'socket.io';
import { JsonDatabase } from '../db/JsonDatabase';
import type { PlayerState, VehicleData, MovementUpdate, Vector3 } from '../../client/src/shared/types';
import { STARTING_CASH } from '../../client/src/shared/constants';

export class TroxTServer {
  private io: SocketIOServer;
  private db: JsonDatabase;
  private players: Map<string, PlayerState> = new Map();
  private vehicles: Map<string, VehicleData> = new Map();
  private authenticatedSockets: Map<string, string> = new Map(); // socketId -> playerId

  // Rate limiting
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly RATE_LIMIT = 30; // messages par seconde
  private readonly RATE_WINDOW = 1000;

  constructor(io: SocketIOServer, db: JsonDatabase) {
    this.io = io;
    this.db = db;
  }

  initialize(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Nouvelle connexion: ${socket.id}`);

      socket.on('authenticate', (data: { playerId: string; token?: string }) => {
        this.handleAuthenticate(socket, data);
      });

      socket.on('movement', (data: MovementUpdate) => {
        this.handleMovement(socket, data);
      });

      socket.on('vehicle:update', (data: { vehicleId: string; position: Vector3; rotation: Vector3 }) => {
        this.handleVehicleUpdate(socket, data);
      });

      socket.on('economy:transaction', (data: { type: string; amount: number }) => {
        this.handleEconomyTransaction(socket, data);
      });

      socket.on('prop:place', (data: { propId: string; position: Vector3; propertyId: string }) => {
        this.handlePropPlace(socket, data);
      });

      socket.on('prop:delete', (data: { propId: string }) => {
        this.handlePropDelete(socket, data);
      });

      socket.on('door:state', (data: { propertyId: string; locked: boolean }) => {
        this.handleDoorState(socket, data);
      });

      socket.on('admin:action', (data: { action: string; targetId?: string }) => {
        this.handleAdminAction(socket, data);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleAuthenticate(socket: Socket, data: { playerId: string; token?: string }): void {
    const { playerId } = data;

    // Charger ou créer le joueur
    let player = this.db.getPlayer(playerId);
    if (!player) {
      player = {
        id: playerId,
        name: `Citoyen_${playerId.slice(0, 4)}`,
        job: 'sans-emploi',
        jobRank: 1,
        cash: STARTING_CASH,
        bank: 0,
        health: 100,
        hunger: 100,
        thirst: 100,
        currentVehicleId: null,
        currentPropertyId: null,
        permissions: [],
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        isSprinting: false,
        isDriving: false,
        isBuilding: false,
      };
      this.db.savePlayer(player);
    }

    this.players.set(playerId, player);
    this.authenticatedSockets.set(socket.id, playerId);

    socket.emit('authenticated', { success: true, player });
    socket.broadcast.emit('player:joined', { playerId, player });

    // Envoyer l'état du monde
    socket.emit('world:state', {
      vehicles: Array.from(this.vehicles.values()),
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        job: p.job,
      })),
    });

    console.log(`✅ Joueur authentifié: ${player.name} (${playerId})`);
  }

  private handleMovement(socket: Socket, data: MovementUpdate): void {
    if (!this.checkRateLimit(socket)) return;

    const playerId = this.authenticatedSockets.get(socket.id);
    if (!playerId) return;

    const player = this.players.get(playerId);
    if (!player) return;

    // Validation serveur du mouvement
    const dx = data.position.x - player.position.x;
    const dz = data.position.z - player.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Vérifier que le joueur ne se téléporte pas abusivement
    const maxSpeed = data.isSprinting ? 9 : 5;
    if (dist > maxSpeed * 0.1) {
      // Mouvement suspect, on rejette
      socket.emit('movement:correction', { position: player.position });
      return;
    }

    player.position = data.position;
    player.rotation = data.rotation;
    player.isSprinting = data.isSprinting;

    socket.broadcast.emit('player:moved', {
      playerId,
      position: data.position,
      rotation: data.rotation,
      isSprinting: data.isSprinting,
    });
  }

  private handleVehicleUpdate(socket: Socket, data: { vehicleId: string; position: Vector3; rotation: Vector3 }): void {
    if (!this.checkRateLimit(socket)) return;

    const veh = this.vehicles.get(data.vehicleId);
    if (!veh) return;

    // Validation basique
    const dx = data.position.x - veh.position.x;
    const dz = data.position.z - veh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 5) {
      socket.emit('vehicle:correction', { vehicleId: data.vehicleId, position: veh.position });
      return;
    }

    veh.position = data.position;
    veh.rotation = data.rotation;

    socket.broadcast.emit('vehicle:updated', data);
  }

  private handleEconomyTransaction(socket: Socket, data: { type: string; amount: number }): void {
    const playerId = this.authenticatedSockets.get(socket.id);
    if (!playerId) return;

    const player = this.players.get(playerId);
    if (!player) return;

    // Validation serveur
    if (data.amount <= 0 || data.amount > 1000000) {
      socket.emit('economy:error', { message: 'Montant invalide' });
      return;
    }

    switch (data.type) {
      case 'purchase':
        if (player.cash < data.amount) {
          socket.emit('economy:error', { message: 'Fonds insuffisants' });
          return;
        }
        player.cash -= data.amount;
        break;
      case 'salary':
        player.cash += data.amount;
        break;
      default:
        socket.emit('economy:error', { message: 'Type de transaction invalide' });
        return;
    }

    this.db.savePlayer(player);
    socket.emit('economy:updated', { cash: player.cash, bank: player.bank });
  }

  private handlePropPlace(socket: Socket, data: { propId: string; position: Vector3; propertyId: string }): void {
    const playerId = this.authenticatedSockets.get(socket.id);
    if (!playerId) return;

    const player = this.players.get(playerId);
    if (!player) return;

    // Vérifier permissions
    if (!player.permissions.includes('admin') && !player.permissions.includes('builder')) {
      socket.emit('prop:error', { message: 'Permission refusée' });
      return;
    }

    // Validation distance
    const dist = Math.sqrt(
      data.position.x * data.position.x + data.position.z * data.position.z,
    );
    if (dist > 400) {
      socket.emit('prop:error', { message: 'Position hors limite' });
      return;
    }

    socket.broadcast.emit('prop:placed', data);
    socket.emit('prop:placed', { ...data, success: true });
  }

  private handlePropDelete(socket: Socket, data: { propId: string }): void {
    const playerId = this.authenticatedSockets.get(socket.id);
    if (!playerId) return;

    const player = this.players.get(playerId);
    if (!player || !player.permissions.includes('admin')) {
      socket.emit('prop:error', { message: 'Permission refusée' });
      return;
    }

    socket.broadcast.emit('prop:deleted', data);
  }

  private handleDoorState(socket: Socket, data: { propertyId: string; locked: boolean }): void {
    const playerId = this.authenticatedSockets.get(socket.id);
    if (!playerId) return;

    socket.broadcast.emit('door:state_changed', data);
  }

  private handleAdminAction(socket: Socket, data: { action: string; targetId?: string }): void {
    const playerId = this.authenticatedSockets.get(socket.id);
    if (!playerId) return;

    const player = this.players.get(playerId);
    if (!player || !player.permissions.includes('admin')) {
      socket.emit('admin:error', { message: 'Permission refusée' });
      return;
    }

    // Log de l'action admin
    console.log(`🔧 Admin action: ${data.action} par ${player.name}`);
    this.db.addLog({
      id: `log_${Date.now()}`,
      timestamp: Date.now(),
      adminId: playerId,
      action: data.action,
      targetId: data.targetId,
      details: `${player.name} a exécuté: ${data.action}`,
    });
  }

  private handleDisconnect(socket: Socket): void {
    const playerId = this.authenticatedSockets.get(socket.id);
    if (playerId) {
      const player = this.players.get(playerId);
      if (player) {
        this.db.savePlayer(player);
        console.log(`🔌 Déconnexion: ${player.name}`);
      }
      this.players.delete(playerId);
      this.authenticatedSockets.delete(socket.id);
      this.io.emit('player:left', { playerId });
    }
  }

  private checkRateLimit(socket: Socket): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(socket.id);

    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(socket.id, { count: 1, resetTime: now + this.RATE_WINDOW });
      return true;
    }

    limit.count++;
    if (limit.count > this.RATE_LIMIT) {
      socket.emit('rate_limit', { message: 'Trop de requêtes' });
      return false;
    }

    return true;
  }
}