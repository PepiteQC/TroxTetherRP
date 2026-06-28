/**
 * Vehicle — Entité véhicule complète
 * Port-Éther RP — Fichier: src/entities/Vehicle.entity.ts
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'events';

export type VehicleClass = 'A' | 'B' | 'C' | 'D' | 'S' | 'moto' | 'poids_lourd' | 'bateau' | 'helico';
export type FuelType = 'essence' | 'diesel' | 'electrique' | 'hybride';
export type VehicleState = 'parked' | 'driven' | 'damaged' | 'destroyed' | 'impounded' | 'stolen' | 'confiscated';
export type ModType = 'moteur' | 'freins' | 'suspension' | 'transmission' | 'echappement' | 'pneus' | 'carrosserie' | 'vitres' | 'audio' | 'neon' | 'peinture' | 'blindage';

export interface VehicleMod {
  id: string;
  type: ModType;
  name: string;
  level: number;
  price: number;
  stats: Partial<Record<string, number>>;
}

export interface VehicleStats {
  speed: number;
  handling: number;
  braking: number;
  acceleration: number;
  fuelConsumption: number;
  durability: number;
  armor: number;
}

export interface VehicleDamage {
  engine: number;
  body: number;
  windows: number;
  tires: number;
  lights: number;
  fuelTank: number;
  doors: number;
}

export interface VehicleFuel {
  type: FuelType;
  current: number;
  capacity: number;
}

export interface VehicleOwner {
  playerId: string;
  purchaseDate: number;
  price: number;
  insuranceExpiry: number;
  registrationExpiry: number;
  isInsured: boolean;
  isRegistered: boolean;
  isReportedStolen: boolean;
  stolenDate?: number;
}

const VEHICLE_CATALOG: Record<string, { name: string; class: VehicleClass; baseStats: VehicleStats; fuelType: FuelType; fuelCapacity: number; price: number; description: string }> = {
  'peugeot_308':       { name: 'Peugeot 308',       class: 'C', baseStats: { speed: 65, handling: 70, braking: 60, acceleration: 55, fuelConsumption: 7, durability: 70, armor: 10 }, fuelType: 'diesel', fuelCapacity: 52, price: 25000, description: 'Berline française fiable et économique' },
  'renault_clio':      { name: 'Renault Clio',       class: 'B', baseStats: { speed: 55, handling: 75, braking: 65, acceleration: 50, fuelConsumption: 5, durability: 65, armor: 8 }, fuelType: 'essence', fuelCapacity: 42, price: 18000, description: 'Citadine agile, parfaite pour la ville' },
  'citroen_c3':        { name: 'Citroën C3',         class: 'B', baseStats: { speed: 50, handling: 72, braking: 62, acceleration: 48, fuelConsumption: 5, durability: 62, armor: 8 }, fuelType: 'essence', fuelCapacity: 40, price: 16000, description: 'Confortable et originale' },
  'bmw_serie3':        { name: 'BMW Série 3',        class: 'C', baseStats: { speed: 78, handling: 80, braking: 75, acceleration: 70, fuelConsumption: 8, durability: 80, armor: 12 }, fuelType: 'diesel', fuelCapacity: 60, price: 45000, description: 'Berline allemande premium' },
  'mercedes_classe_c': { name: 'Mercedes Classe C',  class: 'C', baseStats: { speed: 75, handling: 82, braking: 78, acceleration: 68, fuelConsumption: 8, durability: 82, armor: 12 }, fuelType: 'diesel', fuelCapacity: 62, price: 48000, description: 'Luxe et élégance allemande' },
  'audi_a4':           { name: 'Audi A4',            class: 'C', baseStats: { speed: 76, handling: 79, braking: 74, acceleration: 69, fuelConsumption: 8, durability: 78, armor: 12 }, fuelType: 'diesel', fuelCapacity: 58, price: 44000, description: 'Technologie et performance' },
  'porsche_911':       { name: 'Porsche 911',        class: 'S', baseStats: { speed: 95, handling: 92, braking: 90, acceleration: 93, fuelConsumption: 14, durability: 75, armor: 15 }, fuelType: 'essence', fuelCapacity: 70, price: 120000, description: 'Sportive légendaire allemande' },
  'ferrari_f8':        { name: 'Ferrari F8 Tributo', class: 'S', baseStats: { speed: 98, handling: 90, braking: 88, acceleration: 96, fuelConsumption: 16, durability: 70, armor: 14 }, fuelType: 'essence', fuelCapacity: 72, price: 180000, description: 'Supercar italienne d\'exception' },
  'lamborghini_urus':  { name: 'Lamborghini Urus',   class: 'S', baseStats: { speed: 85, handling: 78, braking: 80, acceleration: 88, fuelConsumption: 18, durability: 85, armor: 20 }, fuelType: 'essence', fuelCapacity: 80, price: 160000, description: 'SUV sportif italien surpuissant' },
  'dacia_sandero':     { name: 'Dacia Sandero',      class: 'A', baseStats: { speed: 42, handling: 55, braking: 50, acceleration: 38, fuelConsumption: 4, durability: 90, armor: 6 }, fuelType: 'essence', fuelCapacity: 38, price: 8000, description: 'La voiture la plus économique de Port-Éther' },
  'ford_transit':      { name: 'Ford Transit',       class: 'D', baseStats: { speed: 45, handling: 40, braking: 42, acceleration: 35, fuelConsumption: 10, durability: 88, armor: 18 }, fuelType: 'diesel', fuelCapacity: 70, price: 28000, description: 'Utilitaire polyvalent pour le transport' },
  'renault_master':    { name: 'Renault Master',     class: 'D', baseStats: { speed: 43, handling: 38, braking: 40, acceleration: 33, fuelConsumption: 11, durability: 85, armor: 18 }, fuelType: 'diesel', fuelCapacity: 75, price: 26000, description: 'Fourgon spacieux pour les artisans' },
  'yamaha_mt07':       { name: 'Yamaha MT-07',       class: 'moto', baseStats: { speed: 72, handling: 90, braking: 65, acceleration: 78, fuelConsumption: 4, durability: 55, armor: 3 }, fuelType: 'essence', fuelCapacity: 14, price: 9000, description: 'Moto agile et nerveuse' },
  'honda_cbr':         { name: 'Honda CBR 600',      class: 'moto', baseStats: { speed: 85, handling: 88, braking: 68, acceleration: 82, fuelConsumption: 5, durability: 50, armor: 3 }, fuelType: 'essence', fuelCapacity: 18, price: 12000, description: 'Sportive japonaise pour les mordus de vitesse' },
  'harley_davidson':   { name: 'Harley Davidson',    class: 'moto', baseStats: { speed: 60, handling: 65, braking: 55, acceleration: 58, fuelConsumption: 6, durability: 70, armor: 4 }, fuelType: 'essence', fuelCapacity: 20, price: 15000, description: 'Moto américaine culte, symbole de liberté' },
  'bmw_m5':            { name: 'BMW M5',             class: 'S', baseStats: { speed: 90, handling: 85, braking: 82, acceleration: 88, fuelConsumption: 15, durability: 78, armor: 16 }, fuelType: 'essence', fuelCapacity: 68, price: 95000, description: 'Berline sportive ultra-performante' },
  'tesla_model3':      { name: 'Tesla Model 3',      class: 'C', baseStats: { speed: 82, handling: 80, braking: 78, acceleration: 85, fuelConsumption: 0, durability: 75, armor: 14 }, fuelType: 'electrique', fuelCapacity: 60, price: 55000, description: 'Berline électrique silencieuse et rapide' },
  'vw_golf':           { name: 'Volkswagen Golf',    class: 'C', baseStats: { speed: 68, handling: 74, braking: 70, acceleration: 62, fuelConsumption: 6, durability: 76, armor: 10 }, fuelType: 'diesel', fuelCapacity: 50, price: 22000, description: 'La compacte allemande de référence' },
  'range_rover':       { name: 'Range Rover',        class: 'D', baseStats: { speed: 70, handling: 65, braking: 68, acceleration: 65, fuelConsumption: 12, durability: 85, armor: 25 }, fuelType: 'diesel', fuelCapacity: 85, price: 70000, description: 'SUV luxueux taillé pour tous les terrains' },
  'peugeot_206':       { name: 'Peugeot 206',        class: 'A', baseStats: { speed: 48, handling: 68, braking: 58, acceleration: 45, fuelConsumption: 5, durability: 60, armor: 6 }, fuelType: 'essence', fuelCapacity: 35, price: 5000, description: 'Petite citadine économique, idéale pour débuter' },
};

export class VehicleEntity extends EventEmitter {
  public readonly id: string;
  public model: string;
  public plate: string;
  public color: string;
  public owner: VehicleOwner;
  public stats: VehicleStats;
  public damage: VehicleDamage;
  public fuel: VehicleFuel;
  public mods: VehicleMod[];
  public state: VehicleState;
  public position: { x: number; y: number; z: number; heading: number };
  public trunk: VehicleStorage;
  public createdAt: number;
  public lastDrivenAt: number;
  public totalDistance: number;

  constructor(ownerId: string, model: string, color: string = '#ffffff') {
    super();
    
    this.id = randomUUID();
    this.model = model;
    this.plate = this.generatePlate();
    this.color = color;
    this.createdAt = Date.now();
    this.lastDrivenAt = Date.now();
    this.totalDistance = 0;
    
    const catalog = VEHICLE_CATALOG[model];
    if (!catalog) throw new Error(`Modèle inconnu: ${model}`);
    
    this.stats = { ...catalog.baseStats };
    this.fuel = {
      type: catalog.fuelType,
      current: catalog.fuelCapacity,
      capacity: catalog.fuelCapacity,
    };
    
    this.owner = {
      playerId: ownerId,
      purchaseDate: Date.now(),
      price: catalog.price,
      insuranceExpiry: Date.now() + 30 * 86400000,
      registrationExpiry: Date.now() + 365 * 86400000,
      isInsured: false,
      isRegistered: true,
      isReportedStolen: false,
    };
    
    this.damage = {
      engine: 0,
      body: 0,
      windows: 0,
      tires: 0,
      lights: 0,
      fuelTank: 0,
      doors: 0,
    };
    
    this.mods = [];
    this.state = 'parked';
    this.position = { x: 0, y: 0, z: 0, heading: 0 };
    this.trunk = { slots: 20, items: [], weight: 0, maxWeight: 50 };
  }

  private generatePlate(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    let plate = '';
    for (let i = 0; i < 3; i++) plate += letters[Math.floor(Math.random() * letters.length)];
    plate += ' ';
    for (let i = 0; i < 3; i++) plate += nums[Math.floor(Math.random() * nums.length)];
    return plate;
  }

  startEngine(): boolean {
    if (this.damage.engine > 80) {
      this.emit('vehicle:engine_fail', { id: this.id, reason: 'Moteur détruit' });
      return false;
    }
    if (this.fuel.current <= 0) {
      this.emit('vehicle:engine_fail', { id: this.id, reason: 'Plus de carburant' });
      return false;
    }
    this.state = 'driven';
    this.emit('vehicle:engine_start', { id: this.id });
    return true;
  }

  stopEngine(): void {
    this.state = 'parked';
    this.emit('vehicle:engine_stop', { id: this.id });
  }

  drive(distance: number): void {
    if (this.state !== 'driven') return;
    this.totalDistance += distance;
    const consumption = (this.stats.fuelConsumption * distance) / 1000;
    this.fuel.current = Math.max(0, this.fuel.current - consumption);
    this.lastDrivenAt = Date.now();

    if (this.fuel.current <= 0) {
      this.state = 'parked';
      this.emit('vehicle:out_of_fuel', { id: this.id });
    }
  }

  refuel(amount: number): void {
    const before = this.fuel.current;
    this.fuel.current = Math.min(this.fuel.capacity, this.fuel.current + amount);
    const added = this.fuel.current - before;
    this.emit('vehicle:refueled', { id: this.id, added, total: this.fuel.current });
  }

  damageVehicle(amount: number, part: keyof VehicleDamage): void {
    if (this.state === 'destroyed') return;
    
    this.damage[part] = Math.min(100, this.damage[part] + amount);
    
    if (this.damage.body > 90 && this.damage.engine > 90) {
      this.state = 'destroyed';
      this.emit('vehicle:destroyed', { id: this.id, damage: this.damage });
    }
    
    this.emit('vehicle:damaged', { id: this.id, part, amount, total: this.damage[part] });
  }

  repair(amount: number): void {
    for (const key of Object.keys(this.damage) as (keyof VehicleDamage)[]) {
      this.damage[key] = Math.max(0, this.damage[key] - amount);
    }
    if (this.state === 'destroyed' && this.damage.body < 50 && this.damage.engine < 50) {
      this.state = 'parked';
    }
    this.emit('vehicle:repaired', { id: this.id, damage: this.damage });
  }

  installMod(mod: Omit<VehicleMod, 'id'>): void {
    const newMod: VehicleMod = { ...mod, id: randomUUID() };
    this.mods.push(newMod);
    
    // Appliquer les stats du mod
    for (const [key, val] of Object.entries(mod.stats)) {
      if (key in this.stats) {
        (this.stats as any)[key] += val;
      }
    }
    
    this.emit('vehicle:mod_installed', { id: this.id, mod: newMod });
  }

  reportStolen(): void {
    this.owner.isReportedStolen = true;
    this.owner.stolenDate = Date.now();
    this.state = 'stolen';
    this.emit('vehicle:reported_stolen', { id: this.id, plate: this.plate });
  }

  impound(): void {
    this.state = 'impounded';
    this.emit('vehicle:impounded', { id: this.id, plate: this.plate });
  }

  release(): void {
    this.state = 'parked';
    this.emit('vehicle:released', { id: this.id });
  }

  toJSON(): VehicleData {
    return {
      id: this.id,
      model: this.model,
      plate: this.plate,
      color: this.color,
      owner: this.owner,
      stats: this.stats,
      damage: this.damage,
      fuel: this.fuel,
      mods: this.mods,
      state: this.state,
      position: this.position,
      trunk: this.trunk,
      createdAt: this.createdAt,
      lastDrivenAt: this.lastDrivenAt,
      totalDistance: this.totalDistance,
    };
  }

  getCatalog() { return VEHICLE_CATALOG; }
  getModelName() { return VEHICLE_CATALOG[this.model]?.name || this.model; }
  getModelPrice() { return VEHICLE_CATALOG[this.model]?.price || 0; }
}

export interface VehicleData {
  id: string;
  model: string;
  plate: string;
  color: string;
  owner: VehicleOwner;
  stats: VehicleStats;
  damage: VehicleDamage;
  fuel: VehicleFuel;
  mods: VehicleMod[];
  state: VehicleState;
  position: { x: number; y: number; z: number; heading: number };
  trunk: VehicleStorage;
  createdAt: number;
  lastDrivenAt: number;
  totalDistance: number;
}

interface VehicleStorage {
  slots: number;
  items: any[];
  weight: number;
  maxWeight: number;
}

export default VehicleEntity;