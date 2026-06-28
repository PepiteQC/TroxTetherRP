// EtherWorld RP — Port-Éther
// Client réseau WebSocket — connexion, envoi, réception

import { io, Socket } from 'socket.io-client';
import type { PlayerState, MovementUpdate, Vector3 } from '../shared/types';

export class NetworkClient {
  public socket: Socket | null = null;
  public isConnected = false;
  public playerId: string = `player_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  public onPlayerJoined: ((data: { playerId: string }) => void) | null = null;
  public onPlayerLeft: ((data: { playerId: string }) => void) | null = null;
  public onPlayerMoved: ((data: MovementUpdate) => void) | null = null;
  public onVehicleUpdated: ((data: { vehicleId: string; position: Vector3 }) => void) | null = null;
  public onEconomyUpdate: ((data: { cash: number; bank: number }) => void) | null = null;
  public onPropPlaced: ((data: { propId: string; position: Vector3 }) => void) | null = null;

  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
  }

  connect(): void {
    this.socket = io(this.serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connecté au serveur');
      this.isConnected = true;

      // S'authentifier
      this.socket?.emit('authenticate', { playerId: this.playerId });
    });

    this.socket.on('authenticated', (data: { success: boolean; player: PlayerState }) => {
      if (data.success) {
        console.log('✅ Authentifié:', data.player.name);
      }
    });

    this.socket.on('player:joined', (data: { playerId: string }) => {
      this.onPlayerJoined?.(data);
    });

    this.socket.on('player:left', (data: { playerId: string }) => {
      this.onPlayerLeft?.(data);
    });

    this.socket.on('player:moved', (data: MovementUpdate) => {
      this.onPlayerMoved?.(data);
    });

    this.socket.on('vehicle:updated', (data: { vehicleId: string; position: Vector3 }) => {
      this.onVehicleUpdated?.(data);
    });

    this.socket.on('economy:updated', (data: { cash: number; bank: number }) => {
      this.onEconomyUpdate?.(data);
    });

    this.socket.on('prop:placed', (data: { propId: string; position: Vector3 }) => {
      this.onPropPlaced?.(data);
    });

    this.socket.on('movement:correction', (data: { position: Vector3 }) => {
      console.warn('⚠️ Correction de mouvement reçue');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Déconnecté du serveur');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Erreur de connexion:', err.message);
    });
  }

  sendMovement(position: Vector3, rotation: Vector3, isSprinting: boolean): void {
    if (!this.socket?.connected) return;
    this.socket.emit('movement', { playerId: this.playerId, position, rotation, isSprinting, isDriving: false });
  }

  sendVehicleUpdate(vehicleId: string, position: Vector3, rotation: Vector3): void {
    if (!this.socket?.connected) return;
    this.socket.emit('vehicle:update', { vehicleId, position, rotation });
  }

  sendPropPlace(propId: string, position: Vector3, propertyId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('prop:place', { propId, position, propertyId });
  }

  sendPropDelete(propId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('prop:delete', { propId });
  }

  sendDoorState(propertyId: string, locked: boolean): void {
    if (!this.socket?.connected) return;
    this.socket.emit('door:state', { propertyId, locked });
  }

  sendEconomyTransaction(type: string, amount: number): void {
    if (!this.socket?.connected) return;
    this.socket.emit('economy:transaction', { type, amount });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.isConnected = false;
  }
}