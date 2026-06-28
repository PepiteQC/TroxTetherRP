// EtherWorld RP — Port-Éther
// Constantes globales partagées entre client et serveur

export const GAME_NAME = 'EtherWorld RP';
export const CITY_NAME = 'Port-Éther';
export const VERSION = '0.1.0';

// === TAILLES ===
export const WORLD_SIZE = 800;
export const BLOCK_SIZE = 8;
export const ROAD_WIDTH = 12;
export const ROAD_SMALL = 8;
export const SIDEWALK_WIDTH = 2.5;
export const LANE_WIDTH = 3.5;
export const LANES_MAIN = 4;

// === JOUEUR ===
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_RADIUS = 0.5;
export const PLAYER_SPEED = 5;
export const PLAYER_SPRINT_MULT = 1.8;
export const PLAYER_JUMP_FORCE = 8;
export const PLAYER_GRAVITY = -25;
export const PLAYER_CAMERA_DISTANCE = 6;
export const PLAYER_CAMERA_SMOOTH = 0.08;

// === VÉHICULES ===
export const VEHICLE_FUEL_MAX = 100;
export const VEHICLE_SPEED_MAX = 80;
export const VEHICLE_ACCEL = 15;
export const VEHICLE_BRAKE = 20;
export const VEHICLE_FRICTION = 5;
export const VEHICLE_STEER_SPEED = 3;
export const VEHICLE_FUEL_CONSUMPTION = 0.02;

// === INTERACTION ===
export const INTERACTION_DISTANCE = 3;
export const INTERACTION_KEY = 'e';
export const INTERACTION_KEY_ALT = 'E';

// === ÉCONOMIE ===
export const STARTING_CASH = 5000;
export const STARTING_BANK = 0;
export const MAX_CASH = 1_000_000;
export const JOB_PAY_INTERVAL = 60000; // salaire chaque minute
export const TAX_RATE = 0.05;

// === PROPRIÉTÉS ===
export const PROPERTY_TYPES = ['house', 'apartment', 'land'] as const;
export const MAX_PROPERTIES_PER_PLAYER = 5;

// === COULEURS ===
export const COLORS = {
  asphalt: 0x333333,
  sidewalk: 0x999999,
  roadLineWhite: 0xffffff,
  roadLineYellow: 0xffdd00,
  crosswalk: 0xf0f0f0,
  grass: 0x5a8f4a,
  building: 0x8a8a8a,
  roof: 0x6a6a6a,
  window: 0x88ccff,
  door: 0x5a3a1a,
  treeTrunk: 0x4a2a0a,
  treeTop: 0x3a7a2a,
  streetLamp: 0xcccccc,
  streetLight: 0xffdd88,
  stopSign: 0xcc0000,
  signWhite: 0xffffee,
  water: 0x2a5a7a,
  admin: 0x00ff88,
  player: 0x88aaff,
  vehicle: 0x4488cc,
  propGhost: 0x44ffff,
  buildZone: 0x88ff88,
  parkingLine: 0xaaddff,
  concrete: 0x7a7a7a,
  metal: 0x6a7a8a,
  interior: 0xd4c4a4,
};

// === DISTRICTS ===
export const DISTRICTS = [
  'centre-ville',
  'commercial',
  'residentiel',
  'industriel',
  'services-publics',
] as const;

// === JOBS ===
export const JOBS_LIST = [
  'sans-emploi',
  'livreur',
  'mecanicien',
  'agent-municipal',
  'medecin',
  'chauffeur',
  'entrepreneur',
  'architecte',
  'employe-depanneur',
  'gestionnaire-boutique',
] as const;

// === VÉHICULES FICTIFS ===
export const VEHICLE_MODELS = [
  'Ether-Compact',
  'Forge-Pickup',
  'Nova-Sedan',
  'Atlas-Van',
  'Port-Ether-Taxi',
  'Municipal-Cruiser',
  'Utility-Truck',
] as const;

// === LANGUES ===
export const STREET_NAMES_FR: string[] = [
  'Rue Principale',
  'Avenue du Port',
  'Boulevard Ether',
  'Rue des Artisans',
  'Place du Marché',
  'Avenue Centrale',
  'Rue de l\'Horloge',
  'Chemin du Fleuve',
  'Allée des Saules',
  'Route Industrielle',
  'Rue des Faubourgs',
  'Avenue des Cèdres',
  'Boulevard Mont-Royal',
  'Rue Saint-Charles',
  'Promenade du Lac',
  'Impasse des Lilas',
  'Place de l\'Hôtel de Ville',
  'Rue de la Gare',
  'Avenir du Parc',
  'Route de la Zone',
];