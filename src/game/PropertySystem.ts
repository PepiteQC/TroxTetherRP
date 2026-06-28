// EtherWorld RP — Port-Éther
// Système de propriétés — achat, vente, location, clés, verrouillage

import type { PropertyData, PropertyType, Vector3, PlayerState } from '../shared/types';
import { PROPERTY_TYPES, MAX_PROPERTIES_PER_PLAYER } from '../shared/constants';

export class PropertySystem {
  public properties: Map<string, PropertyData> = new Map();
  private nextId = 1;

  constructor() {
    this.initializeDemoProperties();
  }

  private initializeDemoProperties(): void {
    // Maisons du quartier résidentiel
    const housePositions = [
      { x: -180, z: -110 }, { x: -160, z: -110 }, { x: -140, z: -110 }, { x: -120, z: -110 },
      { x: -180, z: -60 }, { x: -160, z: -60 }, { x: -140, z: -60 }, { x: -120, z: -60 },
    ];

    housePositions.forEach((pos, i) => {
      this.createProperty({
        type: 'house',
        price: 150000 + i * 10000,
        rentPrice: 5000 + i * 500,
        address: `${12 + i * 2} Rue des Érables`,
        position: { x: pos.x, y: 0, z: pos.z },
        entryPoint: { position: { x: pos.x, y: 0, z: pos.z + 4 }, rotation: 0 },
        garagePoint: { x: pos.x + 6, y: 0, z: pos.z },
        buildZone: {
          min: { x: pos.x - 5, y: 0, z: pos.z - 5 },
          max: { x: pos.x + 5, y: 6, z: pos.z + 5 },
        },
      });
    });

    // Appartements
    const aptPositions = [
      { x: -160, z: -30 }, { x: -120, z: -60 },
    ];
    aptPositions.forEach((pos, i) => {
      this.createProperty({
        type: 'apartment',
        price: 80000 + i * 20000,
        rentPrice: 3000 + i * 1000,
        address: `Appartement ${i + 1}, Résidence du Parc`,
        position: { x: pos.x, y: 0, z: pos.z },
        entryPoint: { position: { x: pos.x, y: 0, z: pos.z + 5 }, rotation: 0 },
        garagePoint: null,
        buildZone: {
          min: { x: pos.x - 4, y: 0, z: pos.z - 4 },
          max: { x: pos.x + 4, y: 5, z: pos.z + 4 },
        },
      });
    });

    // Terrains constructibles
    for (let i = 0; i < 4; i++) {
      this.createProperty({
        type: 'land',
        price: 50000 + i * 15000,
        rentPrice: 0,
        address: `Terrain ${i + 1}, Zone Résidentielle`,
        position: { x: -90 + i * 15, y: 0, z: -130 },
        entryPoint: { position: { x: -90 + i * 15, y: 0, z: -125 }, rotation: 0 },
        garagePoint: null,
        buildZone: {
          min: { x: -93 + i * 15, y: 0, z: -133 },
          max: { x: -87 + i * 15, y: 6, z: -127 },
        },
      });
    }
  }

  private createProperty(data: {
    type: PropertyType;
    price: number;
    rentPrice: number;
    address: string;
    position: Vector3;
    entryPoint: { position: Vector3; rotation: number };
    garagePoint: Vector3 | null;
    buildZone: { min: Vector3; max: Vector3 };
  }): PropertyData {
    const prop: PropertyData = {
      id: `prop_${this.nextId++}`,
      type: data.type,
      ownerId: null,
      price: data.price,
      rentPrice: data.rentPrice,
      address: data.address,
      position: data.position,
      entryPoint: data.entryPoint,
      garagePoint: data.garagePoint,
      locked: true,
      sharedKeys: [],
      buildZone: data.buildZone,
    };
    this.properties.set(prop.id, prop);
    return prop;
  }

  /** Acheter une propriété */
  buyProperty(propertyId: string, playerId: string, playerCash: number): { success: boolean; error?: string; newCash?: number } {
    const prop = this.properties.get(propertyId);
    if (!prop) return { success: false, error: 'Propriété inexistante' };
    if (prop.ownerId) return { success: false, error: 'Déjà possédée' };
    if (playerCash < prop.price) return { success: false, error: 'Fonds insuffisants' };

    // Vérifier le nombre max de propriétés
    const playerProps = this.getPlayerProperties(playerId);
    if (playerProps.length >= MAX_PROPERTIES_PER_PLAYER) {
      return { success: false, error: 'Maximum de propriétés atteint' };
    }

    prop.ownerId = playerId;
    prop.locked = true;
    return { success: true, newCash: playerCash - prop.price };
  }

  /** Louer un appartement */
  rentProperty(propertyId: string, playerId: string, playerCash: number): { success: boolean; error?: string; newCash?: number } {
    const prop = this.properties.get(propertyId);
    if (!prop) return { success: false, error: 'Propriété inexistante' };
    if (prop.type !== 'apartment') return { success: false, error: 'Non disponible à la location' };
    if (prop.ownerId) return { success: false, error: 'Déjà occupée' };
    if (playerCash < prop.rentPrice) return { success: false, error: 'Fonds insuffisants pour le loyer' };

    prop.ownerId = playerId;
    prop.locked = true;
    return { success: true, newCash: playerCash - prop.rentPrice };
  }

  /** Vendre une propriété */
  sellProperty(propertyId: string, playerId: string): { success: boolean; error?: string; refundAmount?: number } {
    const prop = this.properties.get(propertyId);
    if (!prop) return { success: false, error: 'Propriété inexistante' };
    if (prop.ownerId !== playerId) return { success: false, error: 'Vous n\'êtes pas le propriétaire' };

    const refundAmount = Math.floor(prop.price * 0.7);
    prop.ownerId = null;
    prop.sharedKeys = [];
    prop.locked = false;
    return { success: true, refundAmount };
  }

  /** Donner une clé */
  addKey(propertyId: string, ownerId: string, targetPlayerId: string): { success: boolean; error?: string } {
    const prop = this.properties.get(propertyId);
    if (!prop) return { success: false, error: 'Propriété inexistante' };
    if (prop.ownerId !== ownerId) return { success: false, error: 'Vous n\'êtes pas le propriétaire' };
    if (prop.sharedKeys.includes(targetPlayerId)) return { success: false, error: 'Possède déjà une clé' };

    prop.sharedKeys.push(targetPlayerId);
    return { success: true };
  }

  /** Retirer une clé */
  removeKey(propertyId: string, ownerId: string, targetPlayerId: string): { success: boolean; error?: string } {
    const prop = this.properties.get(propertyId);
    if (!prop) return { success: false, error: 'Propriété inexistante' };
    if (prop.ownerId !== ownerId) return { success: false, error: 'Vous n\'êtes pas le propriétaire' };

    prop.sharedKeys = prop.sharedKeys.filter((k) => k !== targetPlayerId);
    return { success: true };
  }

  /** Verrouiller/déverrouiller une porte */
  toggleLock(propertyId: string, playerId: string): { success: boolean; locked?: boolean; error?: string } {
    const prop = this.properties.get(propertyId);
    if (!prop) return { success: false, error: 'Propriété inexistante' };
    if (prop.ownerId !== playerId && !prop.sharedKeys.includes(playerId)) {
      return { success: false, error: 'Accès refusé' };
    }
    prop.locked = !prop.locked;
    return { success: true, locked: prop.locked };
  }

  /** Vérifier si un joueur a accès à une propriété */
  hasAccess(propertyId: string, playerId: string): boolean {
    const prop = this.properties.get(propertyId);
    if (!prop) return false;
    return prop.ownerId === playerId || prop.sharedKeys.includes(playerId);
  }

  /** Obtenir les propriétés d'un joueur */
  getPlayerProperties(playerId: string): PropertyData[] {
    return Array.from(this.properties.values()).filter((p) => p.ownerId === playerId);
  }

  /** Obtenir toutes les propriétés disponibles */
  getAvailableProperties(): PropertyData[] {
    return Array.from(this.properties.values()).filter((p) => !p.ownerId);
  }

  /** Obtenir une propriété par position */
  getPropertyAtPosition(position: Vector3): PropertyData | null {
    for (const [, prop] of this.properties) {
      const dx = position.x - prop.position.x;
      const dz = position.z - prop.position.z;
      if (Math.abs(dx) < 5 && Math.abs(dz) < 5) {
        return prop;
      }
    }
    return null;
  }
}