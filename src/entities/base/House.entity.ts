/**
 * House — Entité maison complète avec intérieur, mobilier, sécurité, historiques
 * Port-Éther RP — Fichier: src/entities/House.entity.ts
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'node:crypto';

export type HouseType = 'appartement' | 'maison' | 'penthouse' | 'loft' | 'studio' | 'villa' | 'manoir' | 'commerce' | 'planque';
export type InteriorStyle = 'moderne' | 'classique' | 'industriel' | 'rustique' | 'luxe' | 'minimaliste' | 'gothique' | 'tropical';
export type FurnitureCategory = 'canape' | 'table' | 'chaise' | 'lit' | 'armoire' | 'etagere' | 'decoration' | 'electromenager' | 'eclairage' | 'rideau' | 'tapis' | 'plante';

export interface Furniture {
  id: string;
  name: string;
  category: FurnitureCategory;
  position: { x: number; y: number; z: number; rx: number; ry: number; rz: number };
  scale?: number;
  color?: string;
  interactable: boolean;
  storage?: { slots: number; items: any[] };
  price: number;
  customData?: Record<string, any>;
}

export interface HouseRoom {
  id: string;
  name: string;
  type: 'salon' | 'chambre' | 'cuisine' | 'salle_de_bain' | 'couloir' | 'garage' | 'cave' | 'grenier' | 'bureau' | 'salle_a_manger';
  floor: number;
  furniture: Furniture[];
  walls: { color: string; texture?: string };
  floorType: string;
  lights: boolean;
}

export interface HouseSecurity {
  alarm: boolean;
  alarmCode: string;
  cameras: number;
  doors: { id: string; name: string; locked: boolean; code?: string }[];
  safe: { exists: boolean; code: string; items: any[] };
  lastBreakIn?: number;
  breakInAttempts: number;
}

export interface HouseKeys {
  owner: string;
  copies: { playerId: string; name: string; issuedAt: number }[];
}

export interface HouseMortgage {
  lender: string;
  total: number;
  remaining: number;
  monthlyPayment: number;
  lastPayment: number;
  missedPayments: number;
  foreclosed: boolean;
}

const HOUSE_INTERIORS: Record<HouseType, { rooms: { type: HouseRoom['type']; name: string; floor: number }[]; basePrice: number; size: number }> = {
  studio: {
    rooms: [
      { type: 'salon', name: 'Pièce principale', floor: 0 },
      { type: 'cuisine', name: 'Coin cuisine', floor: 0 },
      { type: 'salle_de_bain', name: 'Salle de bain', floor: 0 },
    ],
    basePrice: 50000,
    size: 30,
  },
  appartement: {
    rooms: [
      { type: 'salon', name: 'Salon', floor: 0 },
      { type: 'cuisine', name: 'Cuisine', floor: 0 },
      { type: 'chambre', name: 'Chambre', floor: 0 },
      { type: 'salle_de_bain', name: 'Salle de bain', floor: 0 },
      { type: 'couloir', name: 'Couloir', floor: 0 },
    ],
    basePrice: 120000,
    size: 60,
  },
  maison: {
    rooms: [
      { type: 'salon', name: 'Salon', floor: 0 },
      { type: 'cuisine', name: 'Cuisine', floor: 0 },
      { type: 'salle_a_manger', name: 'Salle à manger', floor: 0 },
      { type: 'chambre', name: 'Chambre principale', floor: 1 },
      { type: 'chambre', name: 'Chambre 2', floor: 1 },
      { type: 'salle_de_bain', name: 'Salle de bain', floor: 0 },
      { type: 'salle_de_bain', name: 'Salle d\'eau', floor: 1 },
      { type: 'couloir', name: 'Couloir', floor: 0 },
      { type: 'couloir', name: 'Palier', floor: 1 },
    ],
    basePrice: 250000,
    size: 100,
  },
  penthouse: {
    rooms: [
      { type: 'salon', name: 'Grand salon panoramique', floor: 0 },
      { type: 'cuisine', name: 'Cuisine américaine', floor: 0 },
      { type: 'salle_a_manger', name: 'Salle à manger', floor: 0 },
      { type: 'chambre', name: 'Suite parentale', floor: 0 },
      { type: 'chambre', name: 'Chambre d\'amis', floor: 0 },
      { type: 'salle_de_bain', name: 'Salle de bain principale', floor: 0 },
      { type: 'bureau', name: 'Bureau', floor: 0 },
      { type: 'garage', name: 'Garage privé', floor: -1 },
    ],
    basePrice: 500000,
    size: 180,
  },
  villa: {
    rooms: [
      { type: 'salon', name: 'Grand salon', floor: 0 },
      { type: 'cuisine', name: 'Cuisine professionnelle', floor: 0 },
      { type: 'salle_a_manger', name: 'Salle à manger formelle', floor: 0 },
      { type: 'chambre', name: 'Suite parentale', floor: 1 },
      { type: 'chambre', name: 'Chambre 2', floor: 1 },
      { type: 'chambre', name: 'Chambre 3', floor: 1 },
      { type: 'chambre', name: 'Chambre 4', floor: 1 },
      { type: 'salle_de_bain', name: 'Salle de bain principale', floor: 0 },
      { type: 'salle_de_bain', name: 'Salle de bain 2', floor: 1 },
      { type: 'bureau', name: 'Bureau', floor: 0 },
      { type: 'cave', name: 'Cave à vin', floor: -1 },
      { type: 'garage', name: 'Garage 2 places', floor: 0 },
    ],
    basePrice: 800000,
    size: 300,
  },
  manoir: {
    rooms: [
      { type: 'salon', name: 'Grand salon d\'apparat', floor: 0 },
      { type: 'salon', name: 'Petit salon intimiste', floor: 0 },
      { type: 'cuisine', name: 'Cuisine', floor: 0 },
      { type: 'salle_a_manger', name: 'Salle à manger', floor: 0 },
      { type: 'chambre', name: 'Suite parentale', floor: 1 },
      { type: 'chambre', name: 'Chambre d\'honneur', floor: 1 },
      { type: 'chambre', name: '6 chambres', floor: 2 },
      { type: 'salle_de_bain', name: '5 salles de bain', floor: 0 },
      { type: 'bureau', name: 'Bibliothèque/bureau', floor: 0 },
      { type: 'cave', name: 'Cave historique', floor: -1 },
      { type: 'grenier', name: 'Grenier', floor: 3 },
    ],
    basePrice: 2000000,
    size: 600,
  },
  loft: {
    rooms: [
      { type: 'salon', name: 'Espace de vie', floor: 0 },
      { type: 'cuisine', name: 'Cuisine ouverte', floor: 0 },
      { type: 'chambre', name: 'Mezzanine chambre', floor: 1 },
      { type: 'salle_de_bain', name: 'Salle de bain', floor: 0 },
    ],
    basePrice: 180000,
    size: 80,
  },
  commerce: {
    rooms: [
      { type: 'salon', name: 'Vitrine/clientèle', floor: 0 },
      { type: 'cuisine', name: 'Arrière-boutique', floor: 0 },
      { type: 'cave', name: 'Réserve', floor: -1 },
      { type: 'salle_de_bain', name: 'WC', floor: 0 },
    ],
    basePrice: 300000,
    size: 100,
  },
  planque: {
    rooms: [
      { type: 'salon', name: 'Planque', floor: 0 },
      { type: 'cave', name: 'Cache secrète', floor: -1 },
    ],
    basePrice: 80000,
    size: 40,
  },
};

export class HouseEntity extends EventEmitter {
  public readonly id: string;
  public ownerId: string;
  public type: HouseType;
  public price: number;
  public mortgage?: HouseMortgage;
  public position: { x: number; y: number; z: number; entrance: { x: number; z: number } };
  public district: string;
  public interior: InteriorStyle;
  public rooms: HouseRoom[];
  public keys: HouseKeys;
  public security: HouseSecurity;
  public forSale: boolean;
  public createdAt: number;
  public lastVisited: number;
  public history: string[];
  public isHaunted: boolean;
  public propertyTax: number;
  public condition: { cleanliness: number; damage: number };

  constructor(ownerId: string, type: HouseType, district: string, position: { x: number; y: number; z: number }) {
    super();

    this.id = randomUUID();
    this.ownerId = ownerId;
    this.type = type;
    this.district = district;
    this.position = {
      ...position,
      entrance: { x: position.x + 2, z: position.z + 2 },
    };
    this.createdAt = Date.now();
    this.lastVisited = Date.now();
    this.history = [];
    this.isHaunted = Math.random() < 0.05; // 5% de chance d'être hantée
    this.propertyTax = 0;
    this.forSale = false;
    this.condition = { cleanliness: 100, damage: 0 };

    const interior = HOUSE_INTERIORS[type];
    this.price = interior.basePrice;
    this.propertyTax = Math.floor(interior.basePrice * 0.005);

    // Générer les pièces
    this.rooms = interior.rooms.map(r => ({
      id: randomUUID(),
      name: r.name,
      type: r.type,
      floor: r.floor,
      furniture: [],
      walls: { color: this.randomWallColor() },
      floorType: this.randomFloor(),
      lights: true,
    }));

    // Clés
    this.keys = {
      owner: ownerId,
      copies: [],
    };

    // Sécurité
    this.security = {
      alarm: false,
      alarmCode: '',
      cameras: 0,
      doors: this.rooms.map((r, i) => ({
        id: `door_${r.id.slice(0, 6)}`,
        name: `Porte ${r.name}`,
        locked: i === 0,
        code: i === 0 ? Math.random().toString(36).slice(2, 6).toUpperCase() : undefined,
      })),
      safe: { exists: Math.random() < 0.3, code: '', items: [] },
      breakInAttempts: 0,
    };

    // Meubles par défaut
    this.addDefaultFurniture();
  }

  private randomWallColor(): string {
    const colors = ['#F5F5F0', '#E8E0D8', '#D4C9B8', '#C4B8A8', '#E8D8C8', '#F0E8E0', '#D8D0C8', '#E0D8D0'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private randomFloor(): string {
    const floors = ['parquet', 'carrelage', 'moquette', 'beton_cire', 'pierre', 'vinyle', 'bois'];
    return floors[Math.floor(Math.random() * floors.length)];
  }

  private addDefaultFurniture(): void {
    for (const room of this.rooms) {
      const defaults: Furniture[] = [];

      switch (room.type) {
        case 'salon':
          defaults.push(
            { id: randomUUID(), name: 'Canapé', category: 'canape', position: { x: 2, y: 0, z: 3, rx: 0, ry: 0, rz: 0 }, interactable: true, price: 500 },
            { id: randomUUID(), name: 'Table basse', category: 'table', position: { x: 2, y: 0, z: 5, rx: 0, ry: 0, rz: 0 }, interactable: true, price: 200 },
            { id: randomUUID(), name: 'Lampe', category: 'eclairage', position: { x: 4, y: 0, z: 3, rx: 0, ry: 0, rz: 0 }, interactable: true, price: 80 },
          );
          break;
        case 'chambre':
          defaults.push(
            { id: randomUUID(), name: 'Lit', category: 'lit', position: { x: 2, y: 0, z: 3, rx: 0, ry: 0, rz: 0 }, interactable: true, price: 800 },
            { id: randomUUID(), name: 'Armoire', category: 'armoire', position: { x: 4, y: 0, z: 2, rx: 0, ry: 0, rz: 0 }, interactable: true, price: 400, storage: { slots: 10, items: [] } },
          );
          break;
        case 'cuisine':
          defaults.push(
            { id: randomUUID(), name: 'Table de cuisine', category: 'table', position: { x: 2, y: 0, z: 3, rx: 0, ry: 0, rz: 0 }, interactable: true, price: 300 },
            { id: randomUUID(), name: 'Chaise', category: 'chaise', position: { x: 2, y: 0, z: 4, rx: 0, ry: 0, rz: 0 }, interactable: true, price: 50 },
            { id: randomUUID(), name: 'Réfrigérateur', category: 'electromenager', position: { x: 4, y: 0, z: 2, rx: 0, ry: 0, rz: 0 }, interactable: true, price: 600 },
          );
          break;
        case 'salle_de_bain':
          defaults.push(
            { id: randomUUID(), name: 'Lavabo', category: 'electromenager', position: { x: 2, y: 0, z: 3, rx: 0, ry: 0, rz: 0 }, interactable: true, price: 200 },
          );
          break;
        case 'bureau':
          defaults.push(
            { id: randomUUID(), name: 'Bureau', category: 'table', position: { x: 2, y: 0, z: 3, rx: 0, ry: 0, rz: 0 }, interactable: true, price: 350 },
            { id: randomUUID(), name: 'Fauteuil', category: 'chaise', position: { x: 2, y: 0, z: 4, rx: 0, ry: 0, rz: 0 }, interactable: true, price: 250 },
            { id: randomUUID(), name: 'Étagère', category: 'etagere', position: { x: 4, y: 0, z: 2, rx: 0, ry: 0, rz: 0 }, interactable: true, price: 150, storage: { slots: 8, items: [] } },
          );
          break;
      }

      room.furniture.push(...defaults);
    }
  }

  addFurniture(roomId: string, furniture: Omit<Furniture, 'id'>): Furniture {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) throw new Error('Pièce introuvable');

    const newFurniture: Furniture = { ...furniture, id: randomUUID() };
    room.furniture.push(newFurniture);

    this.emit('house:furniture_added', { houseId: this.id, roomId, furniture: newFurniture });
    return newFurniture;
  }

  removeFurniture(furnitureId: string): boolean {
    for (const room of this.rooms) {
      const idx = room.furniture.findIndex(f => f.id === furnitureId);
      if (idx !== -1) {
        room.furniture.splice(idx, 1);
        this.emit('house:furniture_removed', { houseId: this.id, furnitureId });
        return true;
      }
    }
    return false;
  }

  giveKey(playerId: string, name: string): void {
    this.keys.copies.push({ playerId, name, issuedAt: Date.now() });
    this.emit('house:key_given', { houseId: this.id, playerId, name });
  }

  removeKey(playerId: string): void {
    this.keys.copies = this.keys.copies.filter(k => k.playerId !== playerId);
    this.emit('house:key_removed', { houseId: this.id, playerId });
  }

  lockDoor(doorId: string, code?: string): boolean {
    const door = this.security.doors.find(d => d.id === doorId);
    if (!door) return false;
    door.locked = !door.locked;
    if (code) door.code = code;
    this.emit('house:door_toggled', { houseId: this.id, doorId, locked: door.locked });
    return door.locked;
  }

  setAlarm(code: string, active: boolean): void {
    this.security.alarm = active;
    this.security.alarmCode = code;
    this.emit('house:alarm_changed', { houseId: this.id, active });
  }

  breakIn(): void {
    this.security.lastBreakIn = Date.now();
    this.security.breakInAttempts++;

    if (this.security.alarm) {
      this.emit('house:alarm_triggered', { houseId: this.id });
    }

    this.condition.damage += Math.floor(Math.random() * 20) + 5;
    this.history.push(`Effraction signalée le ${new Date().toLocaleDateString()}`);

    this.emit('house:break_in', { houseId: this.id });
  }

  setMortgage(total: number, monthlyPayment: number, lender: string = 'Banque Nationale de Port-Éther'): void {
    this.mortgage = {
      lender,
      total,
      remaining: total,
      monthlyPayment,
      lastPayment: Date.now(),
      missedPayments: 0,
      foreclosed: false,
    };
    this.emit('house:mortgage_set', { houseId: this.id, total, monthlyPayment });
  }

  payMortgage(): boolean {
    if (!this.mortgage) return false;
    if (this.mortgage.remaining <= 0) return false;

    this.mortgage.remaining -= this.mortgage.monthlyPayment;
    this.mortgage.lastPayment = Date.now();
    this.mortgage.missedPayments = 0;

    if (this.mortgage.remaining <= 0) {
      this.mortgage.remaining = 0;
      this.emit('house:mortgage_paid_off', { houseId: this.id });
    }

    this.emit('house:mortgage_payment', { houseId: this.id, remaining: this.mortgage.remaining });
    return true;
  }

  missMortgagePayment(): void {
    if (!this.mortgage) return;
    this.mortgage.missedPayments++;
    if (this.mortgage.missedPayments >= 3) {
      this.mortgage.foreclosed = true;
      this.emit('house:foreclosed', { houseId: this.id });
    }
  }

  clean(amount: number): void {
    this.condition.cleanliness = Math.min(100, this.condition.cleanliness + amount);
    this.emit('house:cleaned', { houseId: this.id, cleanliness: this.condition.cleanliness });
  }

  toggleLight(roomId: string): boolean {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return false;
    room.lights = !room.lights;
    this.emit('house:lights_toggled', { houseId: this.id, roomId, lights: room.lights });
    return room.lights;
  }

  setForSale(price: number): void {
    this.forSale = true;
    this.price = price;
    this.emit('house:put_for_sale', { houseId: this.id, price });
  }

  buy(newOwnerId: string): void {
    this.ownerId = newOwnerId;
    this.keys.owner = newOwnerId;
    this.forSale = false;
    this.history.push(`Acheté par ${newOwnerId} le ${new Date().toLocaleDateString()}`);
    this.emit('house:sold', { houseId: this.id, newOwnerId });
  }

  getTotalFurnitureValue(): number {
    let total = 0;
    for (const room of this.rooms) {
      for (const f of room.furniture) {
        total += f.price;
      }
    }
    return total;
  }

  toJSON(): HouseData {
    return {
      id: this.id,
      ownerId: this.ownerId,
      type: this.type,
      price: this.price,
      mortgage: this.mortgage,
      position: this.position,
      district: this.district,
      interior: this.interior,
      rooms: this.rooms,
      keys: this.keys,
      security: this.security,
      forSale: this.forSale,
      createdAt: this.createdAt,
      lastVisited: this.lastVisited,
      history: this.history,
      isHaunted: this.isHaunted,
      propertyTax: this.propertyTax,
      condition: this.condition,
      totalFurnitureValue: this.getTotalFurnitureValue(),
    };
  }

  static getAvailableTypes() { return Object.keys(HOUSE_INTERIORS); }
  static getTypeInfo(type: HouseType) { return HOUSE_INTERIORS[type]; }
}

export interface HouseData {
  id: string;
  ownerId: string;
  type: HouseType;
  price: number;
  mortgage?: HouseMortgage;
  position: { x: number; y: number; z: number; entrance: { x: number; z: number } };
  district: string;
  interior: InteriorStyle;
  rooms: HouseRoom[];
  keys: HouseKeys;
  security: HouseSecurity;
  forSale: boolean;
  createdAt: number;
  lastVisited: number;
  history: string[];
  isHaunted: boolean;
  propertyTax: number;
  condition: { cleanliness: number; damage: number };
  totalFurnitureValue: number;
}

export default HouseEntity;