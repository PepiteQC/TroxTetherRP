// EtherWorld RP — Port-Éther
// Types partagés entre client et serveur

import type { DISTRICTS, JOBS_LIST, VEHICLE_MODELS, PROPERTY_TYPES } from './constants';

// === UTILITAIRES ===
export type Vector3 = { x: number; y: number; z: number };
export type Vector2 = { x: number; z: number };

export type DistrictName = (typeof DISTRICTS)[number];
export type JobName = (typeof JOBS_LIST)[number];
export type VehicleModel = (typeof VEHICLE_MODELS)[number];
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

export interface EntryPoint {
  position: Vector3;
  rotation: number;
}

// === ROUTES ===
export interface RoadData {
  id: string;
  name: string;
  district: DistrictName;
  start: Vector3;
  end: Vector3;
  width: number;
  speedLimit: number;
  type: 'main' | 'secondary' | 'highway' | 'residential' | 'industrial';
  drivable: boolean;
  lanes: number;
  hasSidewalk: boolean;
  hasParking: boolean;
}

// === BÂTIMENTS ===
export interface BuildingData {
  id: string;
  name: string;
  type: string;
  district: DistrictName;
  position: Vector3;
  size: Vector3;
  rotation: number;
  interactable: boolean;
  collisionBox: BoundingBox;
  entryPoint?: EntryPoint;
  ownerId: string | null;
  locked: boolean;
  color?: number;
  roofColor?: number;
  floors?: number;
  hasGarage?: boolean;
}

// === JOUEUR ===
export interface PlayerState {
  id: string;
  name: string;
  job: JobName;
  jobRank: number;
  cash: number;
  bank: number;
  health: number;
  hunger: number;
  thirst: number;
  currentVehicleId: string | null;
  currentPropertyId: string | null;
  permissions: PlayerPermission[];
  position: Vector3;
  rotation: Vector3;
  isSprinting: boolean;
  isDriving: boolean;
  isBuilding: boolean;
  skinColor?: string;
  jacketColor?: string;
}

export type PlayerPermission = 'admin' | 'builder' | 'vip' | 'moderator';

// === VÉHICULES ===
export interface VehicleData {
  id: string;
  model: VehicleModel;
  ownerId: string | null;
  plate: string;
  fuel: number;
  health: number;
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  garageId: string | null;
  locked: boolean;
  engineOn: boolean;
  jobRequired: JobName | null;
  color: number;
}

// === PROPRIÉTÉS ===
export interface PropertyData {
  id: string;
  type: PropertyType;
  ownerId: string | null;
  price: number;
  rentPrice: number;
  address: string;
  position: Vector3;
  entryPoint: EntryPoint;
  garagePoint: Vector3 | null;
  locked: boolean;
  sharedKeys: string[];
  buildZone: BoundingBox;
  interiorType?: string;
}

// === PROPS (BUILDER) ===
export interface PropData {
  id: string;
  name: string;
  category: PropCategory;
  size: Vector3;
  color: number;
  price: number;
  description: string;
  collidable: boolean;
  snapToWall: boolean;
  allowedZones: string[];
}

export type PropCategory = 'meubles' | 'decor' | 'appareils' | 'exterieur' | 'construction' | 'business' | 'utilitaire';

export interface PlacedProp {
  id: string;
  propId: string;
  propertyId: string;
  position: Vector3;
  rotation: number;
  scale: Vector3;
  color: number;
  placedBy: string;
}

// === JOBS ===
export interface JobData {
  id: JobName;
  name: string;
  salary: number;
  ranks: string[];
  permissions: string[];
  spawnPoint: Vector3;
  vehicleAccess: VehicleModel[];
  actions: JobAction[];
  uniformColor?: number;
  description: string;
}

export interface JobAction {
  id: string;
  label: string;
  type: 'deliver' | 'repair' | 'patrol' | 'heal' | 'drive' | 'build' | 'sell' | 'manage';
  pay: number;
  cooldown: number;
}

// === INTERACTIONS ===
export interface InteractionDef {
  id: string;
  type: InteractionType;
  label: string;
  position: Vector3;
  radius: number;
  action: string;
  requiredPermission?: PlayerPermission;
  data?: Record<string, unknown>;
}

export type InteractionType =
  | 'door'
  | 'terminal-job'
  | 'terminal-vehicle'
  | 'shop-cashier'
  | 'garage'
  | 'property'
  | 'admin-panel'
  | 'info-panel'
  | 'vehicle-enter'
  | 'storage';

// === ADMIN ===
export interface AdminLogEntry {
  id: string;
  timestamp: number;
  adminId: string;
  action: string;
  targetId?: string;
  details: string;
}

// === RÉSEAU (WebSocket) ===
export interface Packet {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface MovementUpdate {
  playerId: string;
  position: Vector3;
  rotation: Vector3;
  isSprinting: boolean;
  isDriving: boolean;
}

export interface VehicleUpdate {
  vehicleId: string;
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  engineOn: boolean;
  fuel: number;
}

// === TRANSACTION ===
export interface TransactionLog {
  id: string;
  timestamp: number;
  fromId: string | null;
  toId: string | null;
  amount: number;
  type: 'cash' | 'bank' | 'salary' | 'purchase' | 'sale' | 'transfer' | 'admin';
  description: string;
}

// === MONDE ===
export interface WorldState {
  timeOfDay: number; // 0-24
  weather: 'clear' | 'cloudy' | 'rain' | 'fog' | 'storm';
  temperature: number;
  wind: number;
}