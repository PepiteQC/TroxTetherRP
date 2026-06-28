/**
 * Ether-Level Core — Architecture Serveur Ultra-Optimisée
 * Concepts : Object Pooling, FSM (Machine d'état), Timed Snapshots pour rendu 3D
 * Fichier: server/core/PlayerManager.ts
 */

import { EventEmitter } from 'events';

// ─── 1. TYPES & CONSTANTES ────────────────────────────────────────────────────

export type UUID = string;
export type SteamID = string;
export interface Vector3 { x: number; y: number; z: number; }

// États RP stricts (Empêche les actions illogiques/duplications)
export enum PlayerState {
  UNINITIALIZED = 0,
  LOADING = 1,
  IDLE = 2,
  WALKING = 3,
  IN_VEHICLE = 4,
  CUFFED = 5,
  INVENTORY_OPEN = 6,
  DEAD = 7
}

// Format de snapshot pour l'interpolation du client (ex: Three.js)
export interface EntitySnapshot {
  timestamp: number;
  position: Vector3;
  heading: number;
  state: PlayerState;
}

// ─── 2. FINITE STATE MACHINE (Moteur de règles RP) ──────────────────────────

class RPStateMachine {
  private currentState: PlayerState = PlayerState.UNINITIALIZED;

  public get state() { return this.currentState; }

  // Matrice de transitions autorisées
  private allowedTransitions: Record<PlayerState, PlayerState[]> = {
    [PlayerState.UNINITIALIZED]: [PlayerState.LOADING],
    [PlayerState.LOADING]: [PlayerState.IDLE, PlayerState.DEAD],
    [PlayerState.IDLE]: [PlayerState.WALKING, PlayerState.IN_VEHICLE, PlayerState.INVENTORY_OPEN, PlayerState.CUFFED, PlayerState.DEAD],
    [PlayerState.WALKING]: [PlayerState.IDLE, PlayerState.DEAD],
    [PlayerState.IN_VEHICLE]: [PlayerState.IDLE, PlayerState.DEAD],
    [PlayerState.INVENTORY_OPEN]: [PlayerState.IDLE, PlayerState.DEAD],
    [PlayerState.CUFFED]: [PlayerState.IDLE, PlayerState.IN_VEHICLE], // Menotté, on peut l'asseoir dans un véhicule
    [PlayerState.DEAD]: [PlayerState.LOADING, PlayerState.IDLE] // Respawn
  };

  public transitionTo(newState: PlayerState): boolean {
    const allowed = this.allowedTransitions[this.currentState] || [];
    if (allowed.includes(newState)) {
      this.currentState = newState;
      return true;
    }
    console.warn(`[FSM] Transition bloquée : ${this.currentState} -> ${newState}`);
    return false;
  }

  public canInteract(): boolean {
    return this.currentState === PlayerState.IDLE || this.currentState === PlayerState.WALKING;
  }
}

// ─── 3. CLASSE ENTITÉ (Réutilisable en mémoire) ─────────────────────────────

export class Player extends EventEmitter {
  public socketId!: string; // Assigné via la pool
  public steamId!: SteamID;
  public isActive: boolean = false;

  public fsm = new RPStateMachine();
  
  // Données
  public position: Vector3 = { x: 0, y: 0, z: 0 };
  public heading: number = 0;
  public dimensionId: string = 'root'; // Référence vers ton Scene/Room Store
  
  public cash: number = 0;
  
  // Tampon de snapshots pour le réseau (interpolation client)
  private snapshotBuffer: EntitySnapshot[] = [];

  constructor() {
    super();
    // Instancié une seule fois par la Pool, recyclé ensuite
  }

  /**
   * Initialisation appelée par l'Object Pool au lieu de "new Player()"
   */
  public initialize(socketId: string, steamId: SteamID, dbData: any) {
    this.socketId = socketId;
    this.steamId = steamId;
    this.isActive = true;
    this.cash = dbData.cash || 0;
    
    this.position = dbData.position || { x: 0, y: 0, z: 0 };
    this.fsm.transitionTo(PlayerState.LOADING);
    
    // Une fois les assets chargés, on passe en IDLE
    setTimeout(() => this.fsm.transitionTo(PlayerState.IDLE), 100);
  }

  /**
   * Nettoyage lors de la déconnexion (Évite les fuites de mémoire)
   */
  public reset() {
    this.isActive = false;
    this.socketId = '';
    this.steamId = '';
    this.cash = 0;
    this.snapshotBuffer.length = 0; // Vide le tableau sans réallouer la mémoire
    this.removeAllListeners();
  }

  // --- ACTIONS SÉCURISÉES PAR LA FSM ---

  public transferMoney(amount: number, targetPlayer: Player): boolean {
    // Impossible d'échanger si menotté, mort, ou si l'inventaire est ouvert ailleurs
    if (!this.fsm.canInteract() || !targetPlayer.fsm.canInteract()) return false;
    if (this.cash < amount || amount <= 0) return false;

    this.cash -= amount;
    targetPlayer.cash += amount;
    return true;
  }

  public recordSnapshot() {
    this.snapshotBuffer.push({
      timestamp: Date.now(),
      position: { ...this.position },
      heading: this.heading,
      state: this.fsm.state
    });

    // Garde uniquement les 3 derniers snapshots pour le client
    if (this.snapshotBuffer.length > 3) {
      this.snapshotBuffer.shift();
    }
  }

  public extractNetworkPayload() {
    return {
      id: this.socketId,
      snapshots: this.snapshotBuffer
    };
  }
}

// ─── 4. OBJECT POOL & GESTIONNAIRE GLOBAL ───────────────────────────────────

export class PlayerManager extends EventEmitter {
  private static instance: PlayerManager;
  
  // Indexation
  private activePlayers = new Map<string, Player>(); // socketId -> Player
  
  // Object Pool (Pré-allocation de 1000 joueurs au démarrage du serveur)
  private playerPool: Player[] = [];
  private readonly MAX_PLAYERS = 1000;

  private constructor() {
    super();
    this.preAllocateMemory();
    // Boucle de physique et snapshots (20 Ticks/sec)
    setInterval(() => this.tick(), 50); 
  }

  public static getInstance(): PlayerManager {
    if (!PlayerManager.instance) {
      PlayerManager.instance = new PlayerManager();
    }
    return PlayerManager.instance;
  }

  /**
   * Empêche Node.js de faire du Garbage Collection en plein jeu
   */
  private preAllocateMemory() {
    console.log(`[CORE] Pré-allocation mémoire pour ${this.MAX_PLAYERS} joueurs...`);
    for (let i = 0; i < this.MAX_PLAYERS; i++) {
      this.playerPool.push(new Player());
    }
  }

  private getPlayerFromPool(): Player | null {
    return this.playerPool.pop() || null; // Récupère une instance libre
  }

  private returnPlayerToPool(player: Player) {
    player.reset(); // Nettoie les données
    this.playerPool.push(player); // Remet l'instance à disposition
  }

  // --- CYCLE DE VIE ---

  public connectPlayer(socketId: string, steamId: SteamID, dbData: any): Player | null {
    const player = this.getPlayerFromPool();
    if (!player) {
      console.error(`[CORE] Impossible d'accepter ${steamId} : Serveur plein.`);
      return null;
    }

    player.initialize(socketId, steamId, dbData);
    this.activePlayers.set(socketId, player);
    
    return player;
  }

  public disconnectPlayer(socketId: string) {
    const player = this.activePlayers.get(socketId);
    if (!player) return;

    // TODO: Envoi direct au DB Manager via Prisma ici avant le reset

    this.activePlayers.delete(socketId);
    this.returnPlayerToPool(player); // Recyclage immédiat
  }

  public getBySocket(socketId: string): Player | undefined {
    return this.activePlayers.get(socketId);
  }

  // --- MOTEUR RÉSEAU ---

  private tick() {
    const now = Date.now();
    
    // 1. Enregistrement de l'état
    for (const player of this.activePlayers.values()) {
      player.recordSnapshot();
    }

    // 2. Traitement des Rooms / Scènes
    // Ici, le Scene Store (ex: gestionnaire de dimensions) interroge le PlayerManager
    // pour distribuer les packages contenant les 'EntitySnapshot' aux clients.
    // Le client interpolera les positions grâce aux timestamps, assurant un rendu
    // pixel-perfect des sprites ou modèles 3D.
  }
}

export default PlayerManager.getInstance();