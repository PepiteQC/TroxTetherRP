/**
 * Inventory — Système d'inventaire complet avec poids, catégories, stacking
 * Port-Éther RP — Fichier: src/entities/Inventory.entity.ts
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'events';

export type ItemCategory =
  | 'weapon' | 'ammo' | 'food' | 'drink' | 'drug' | 'medical'
  | 'tool' | 'valuable' | 'document' | 'key' | 'electronic'
  | 'clothing' | 'component' | 'material' | 'special';

export type ItemRarity = 'commun' | 'peu_commun' | 'rare' | 'epique' | 'legendaire';

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  weight: number;
  price: number;
  rarity: ItemRarity;
  stackable: boolean;
  maxStack: number;
  illegal: boolean;
  usable: boolean;
  edible?: { hunger: number; thirst: number; health: number };
  weapon?: { damage: number; ammoType: string; capacity: number };
  medical?: { heal: number; stress: number };
  metadata?: Record<string, any>;
}

export interface ItemInstance {
  uid: string;
  definitionId: string;
  quantity: number;
  durability: number;
  customName?: string;
  metadata?: Record<string, any>;
}

export const ITEM_REGISTRY: Record<string, ItemDefinition> = {
  // ── Nourriture ──
  'water': { id: 'water', name: 'Eau en bouteille', description: 'Une bouteille d\'eau fraîche', category: 'drink', weight: 0.5, price: 5, rarity: 'commun', stackable: true, maxStack: 12, illegal: false, usable: true, edible: { hunger: 0, thirst: 30, health: 0 } },
  'sandwich': { id: 'sandwich', name: 'Sandwich jambon-beurre', description: 'Un bon sandwich français', category: 'food', weight: 0.3, price: 8, rarity: 'commun', stackable: true, maxStack: 6, illegal: false, usable: true, edible: { hunger: 40, thirst: 0, health: 5 } },
  'coffee': { id: 'coffee', name: 'Café noir', description: 'Un café bien serré pour se réveiller', category: 'drink', weight: 0.3, price: 4, rarity: 'commun', stackable: true, maxStack: 6, illegal: false, usable: true, edible: { hunger: 0, thirst: 15, health: 2 } },
  'baguette': { id: 'baguette', name: 'Baguette tradition', description: 'Une baguette croustillante', category: 'food', weight: 0.4, price: 3, rarity: 'commun', stackable: true, maxStack: 10, illegal: false, usable: true, edible: { hunger: 35, thirst: 0, health: 0 } },
  'croissant': { id: 'croissant', name: 'Croissant au beurre', description: 'Un croissant doré et feuilleté', category: 'food', weight: 0.2, price: 5, rarity: 'commun', stackable: true, maxStack: 8, illegal: false, usable: true, edible: { hunger: 20, thirst: 0, health: 3 } },
  'energy_drink': { id: 'energy_drink', name: 'Boisson énergisante', description: 'Récupère l\'endurance rapidement', category: 'drink', weight: 0.4, price: 10, rarity: 'commun', stackable: true, maxStack: 6, illegal: false, usable: true, edible: { hunger: 0, thirst: 20, health: 0 } },
  'steak_frites': { id: 'steak_frites', name: 'Steak-frites', description: 'Un repas complet et généreux', category: 'food', weight: 0.7, price: 18, rarity: 'commun', stackable: false, maxStack: 1, illegal: false, usable: true, edible: { hunger: 80, thirst: 0, health: 15 } },

  // ── Médical ──
  'bandage': { id: 'bandage', name: 'Bandage', description: 'Panse les blessures légères', category: 'medical', weight: 0.2, price: 25, rarity: 'commun', stackable: true, maxStack: 10, illegal: false, usable: true, medical: { heal: 20, stress: 0 } },
  'medikit': { id: 'medikit', name: 'Trousse de soins', description: 'Soigne les blessures graves', category: 'medical', weight: 1.0, price: 150, rarity: 'peu_commun', stackable: false, maxStack: 1, illegal: false, usable: true, medical: { heal: 60, stress: 10 } },
  'painkiller': { id: 'painkiller', name: 'Antidouleur', description: 'Réduit le stress et la douleur', category: 'medical', weight: 0.1, price: 40, rarity: 'commun', stackable: true, maxStack: 10, illegal: false, usable: true, medical: { heal: 5, stress: 30 } },
  'morphine': { id: 'morphine', name: 'Morphine', description: 'Soulage instantanément mais très addictive', category: 'medical', weight: 0.2, price: 200, rarity: 'peu_commun', stackable: true, maxStack: 5, illegal: true, usable: true, medical: { heal: 40, stress: 50 } },
  'defibrillator': { id: 'defibrillator', name: 'Défibrillateur', description: 'Réanime les joueurs au sol', category: 'medical', weight: 3.0, price: 500, rarity: 'rare', stackable: false, maxStack: 1, illegal: false, usable: true, metadata: { reviveRange: 2, uses: 3 } },

  // ── Outils ──
  'lockpick': { id: 'lockpick', name: 'Crochet de serrure', description: 'Outil discret pour crocheter les serrures', category: 'tool', weight: 0.1, price: 200, rarity: 'peu_commun', stackable: true, maxStack: 5, illegal: true, usable: true, metadata: { breakChance: 0.2 } },
  'screwdriver': { id: 'screwdriver', name: 'Tournevis', description: 'Tournevis polyvalent', category: 'tool', weight: 0.2, price: 30, rarity: 'commun', stackable: false, maxStack: 1, illegal: false, usable: true },
  'hammer': { id: 'hammer', name: 'Marteau', description: 'Pour les travaux de construction', category: 'tool', weight: 1.5, price: 50, rarity: 'commun', stackable: false, maxStack: 1, illegal: false, usable: true, metadata: { damage: 15 } },
  'crowbar': { id: 'crowbar', name: 'Pied-de-biche', description: 'Outil polyvalent... ou arme improvisée', category: 'tool', weight: 2.0, price: 80, rarity: 'commun', stackable: false, maxStack: 1, illegal: false, usable: true, metadata: { damage: 25 } },
  'repairkit': { id: 'repairkit', name: 'Kit de réparation', description: 'Réparation basique de véhicule', category: 'tool', weight: 3.0, price: 300, rarity: 'peu_commun', stackable: false, maxStack: 1, illegal: false, usable: true, metadata: { repairAmount: 25 } },
  'phone': { id: 'phone', name: 'Téléphone portable', description: 'Smartphone standard avec accès au réseau', category: 'electronic', weight: 0.2, price: 200, rarity: 'commun', stackable: false, maxStack: 1, illegal: false, usable: false },
  'radio': { id: 'radio', name: 'Radio', description: 'Permet de communiquer sur les canaux radio', category: 'electronic', weight: 0.5, price: 150, rarity: 'commun', stackable: false, maxStack: 1, illegal: false, usable: false },
  'handcuffs': { id: 'handcuffs', name: 'Menottes', description: 'Menottes de police', category: 'tool', weight: 0.3, price: 100, rarity: 'peu_commun', stackable: false, maxStack: 1, illegal: false, usable: true, metadata: { jobRestriction: 'police' } },

  // ── Armes ──
  'pistol': { id: 'pistol', name: 'Pistolet 9mm', description: 'Arme de poing standard, fiable et discrète', category: 'weapon', weight: 1.0, price: 5000, rarity: 'peu_commun', stackable: false, maxStack: 1, illegal: true, usable: true, weapon: { damage: 25, ammoType: '9mm', capacity: 17 } },
  'revolver': { id: 'revolver', name: 'Revolver .44', description: 'Revolver puissant pour les amateurs de gros calibre', category: 'weapon', weight: 1.2, price: 7000, rarity: 'peu_commun', stackable: false, maxStack: 1, illegal: true, usable: true, weapon: { damage: 40, ammoType: '.44', capacity: 6 } },
  'rifle': { id: 'rifle', name: 'Fusil d\'assaut', description: 'Arme automatique redoutable', category: 'weapon', weight: 3.5, price: 18000, rarity: 'rare', stackable: false, maxStack: 1, illegal: true, usable: true, weapon: { damage: 35, ammoType: '556', capacity: 30 } },
  'shotgun': { id: 'shotgun', name: 'Fusil à pompe', description: 'Dévastateur à courte portée', category: 'weapon', weight: 3.2, price: 12000, rarity: 'rare', stackable: false, maxStack: 1, illegal: true, usable: true, weapon: { damage: 50, ammoType: '12gauge', capacity: 8 } },
  'knife': { id: 'knife', name: 'Couteau de combat', description: 'Arme blanche discrète et mortelle', category: 'weapon', weight: 0.3, price: 500, rarity: 'commun', stackable: false, maxStack: 1, illegal: true, usable: true, metadata: { damage: 20 } },
  'bat': { id: 'bat', name: 'Batte de baseball', description: 'Arme contondante classique', category: 'weapon', weight: 1.2, price: 100, rarity: 'commun', stackable: false, maxStack: 1, illegal: false, usable: true, metadata: { damage: 15 } },

  // ── Munitions ──
  'ammo_9mm': { id: 'ammo_9mm', name: 'Munitions 9mm', description: 'Boîte de 50 cartouches 9mm', category: 'ammo', weight: 0.5, price: 200, rarity: 'commun', stackable: true, maxStack: 10, illegal: true, usable: false },
  'ammo_44': { id: 'ammo_44', name: 'Munitions .44', description: 'Boîte de 24 cartouches .44 Magnum', category: 'ammo', weight: 0.6, price: 300, rarity: 'peu_commun', stackable: true, maxStack: 8, illegal: true, usable: false },
  'ammo_556': { id: 'ammo_556', name: 'Munitions 5.56', description: 'Boîte de 30 cartouches 5.56mm', category: 'ammo', weight: 0.7, price: 400, rarity: 'peu_commun', stackable: true, maxStack: 8, illegal: true, usable: false },
  'ammo_12': { id: 'ammo_12', name: 'Cartouches cal.12', description: 'Boîte de 20 cartouches de calibre 12', category: 'ammo', weight: 0.8, price: 350, rarity: 'peu_commun', stackable: true, maxStack: 8, illegal: true, usable: false },

  // ── Drogues ──
  'weed': { id: 'weed', name: 'Herbe (Weed)', description: 'Herbe locale de qualité variable', category: 'drug', weight: 0.05, price: 50, rarity: 'commun', stackable: true, maxStack: 20, illegal: true, usable: true, metadata: { stressReduction: 25, intoxication: 10, duration: 60000 } },
  'cocaine': { id: 'cocaine', name: 'Cocaïne', description: 'Poudre blanche, très addictive et chère', category: 'drug', weight: 0.02, price: 200, rarity: 'peu_commun', stackable: true, maxStack: 20, illegal: true, usable: true, metadata: { stressReduction: 50, intoxication: 30, duration: 30000 } },
  'lsd': { id: 'lsd', name: 'LSD', description: 'Acide, provoque des hallucinations intenses', category: 'drug', weight: 0.01, price: 150, rarity: 'rare', stackable: true, maxStack: 10, illegal: true, usable: true, metadata: { stressReduction: 60, intoxication: 40, duration: 120000, hallucinations: true } },

  // ── Objets de valeur ──
  'gold_watch': { id: 'gold_watch', name: 'Montre en or', description: 'Une montre de luxe au design élégant', category: 'valuable', weight: 0.1, price: 2500, rarity: 'rare', stackable: false, maxStack: 1, illegal: false, usable: false },
  'diamond_ring': { id: 'diamond_ring', name: 'Bague en diamant', description: 'Bague sertie d\'un diamant de 2 carats', category: 'valuable', weight: 0.05, price: 8000, rarity: 'epique', stackable: false, maxStack: 1, illegal: false, usable: false },
  'painting': { id: 'painting', name: 'Tableau de maître', description: 'Une toile signée d\'un artiste reconnu', category: 'valuable', weight: 2.0, price: 15000, rarity: 'legendaire', stackable: false, maxStack: 1, illegal: false, usable: false },
  'gold_bar': { id: 'gold_bar', name: 'Lingot d\'or', description: 'Lingot d\'or pur de 1kg', category: 'valuable', weight: 1.0, price: 60000, rarity: 'epique', stackable: true, maxStack: 5, illegal: false, usable: false },
  'silver_coin': { id: 'silver_coin', name: 'Pièce d\'argent', description: 'Ancienne pièce d\'argent de collection', category: 'valuable', weight: 0.03, price: 150, rarity: 'peu_commun', stackable: true, maxStack: 20, illegal: false, usable: false },
  'painkiller_pack': { id: 'painkiller_pack', name: 'Pack d\'antidouleurs', description: 'Boîte de 12 antidouleurs', category: 'medical', weight: 0.5, price: 250, rarity: 'commun', stackable: false, maxStack: 1, illegal: false, usable: false },
};

export class InventoryEntity extends EventEmitter {
  public maxSlots: number;
  public maxWeight: number;
  public items: ItemInstance[];
  public ownerId: string;

  constructor(ownerId: string, maxSlots: number = 20, maxWeight: number = 50) {
    super();
    this.ownerId = ownerId;
    this.maxSlots = maxSlots;
    this.maxWeight = maxWeight;
    this.items = [];
  }

  get currentWeight(): number {
    return this.items.reduce((sum, item) => {
      const def = ITEM_REGISTRY[item.definitionId];
      return sum + (def ? def.weight * item.quantity : 0);
    }, 0);
  }

  get usedSlots(): number {
    return this.items.length;
  }

  get remainingSlots(): number {
    return this.maxSlots - this.usedSlots;
  }

  get remainingWeight(): number {
    return this.maxWeight - this.currentWeight;
  }

  canAdd(definitionId: string, quantity: number = 1): { allowed: boolean; reason?: string } {
    const def = ITEM_REGISTRY[definitionId];
    if (!def) return { allowed: false, reason: 'Objet inconnu' };

    const itemWeight = def.weight * quantity;

    if (this.currentWeight + itemWeight > this.maxWeight) {
      return { allowed: false, reason: 'Poids maximum atteint' };
    }

    if (def.stackable) {
      const existing = this.items.find(i => i.definitionId === definitionId);
      if (existing) {
        if (existing.quantity + quantity > def.maxStack) {
          return { allowed: false, reason: 'Stack maximum atteint pour cet objet' };
        }
        return { allowed: true };
      }
    }

    if (this.usedSlots >= this.maxSlots) {
      return { allowed: false, reason: 'Plus de place dans l\'inventaire' };
    }

    return { allowed: true };
  }

  addItem(definitionId: string, quantity: number = 1, metadata?: Record<string, any>): boolean {
    const check = this.canAdd(definitionId, quantity);
    if (!check.allowed) {
      this.emit('inventory:full', { ownerId: this.ownerId, reason: check.reason });
      return false;
    }

    const def = ITEM_REGISTRY[definitionId];

    if (def.stackable) {
      const existing = this.items.find(i => i.definitionId === definitionId);
      if (existing) {
        existing.quantity += quantity;
        this.emit('inventory:item_added', { ownerId: this.ownerId, definitionId, quantity, total: existing.quantity });
        return true;
      }
    }

    const newItem: ItemInstance = {
      uid: randomUUID(),
      definitionId,
      quantity,
      durability: 100,
      metadata,
    };

    this.items.push(newItem);
    this.emit('inventory:item_added', { ownerId: this.ownerId, definitionId, quantity, uid: newItem.uid });
    return true;
  }

  removeItem(uid: string, quantity: number = 1): boolean {
    const index = this.items.findIndex(i => i.uid === uid);
    if (index === -1) return false;

    const item = this.items[index];
    if (item.quantity < quantity) return false;

    item.quantity -= quantity;

    if (item.quantity <= 0) {
      this.items.splice(index, 1);
    }

    this.emit('inventory:item_removed', { ownerId: this.ownerId, uid, definitionId: item.definitionId, quantity });
    return true;
  }

  removeByDefinition(definitionId: string, quantity: number = 1): boolean {
    const item = this.items.find(i => i.definitionId === definitionId);
    if (!item) return false;
    return this.removeItem(item.uid, quantity);
  }

  hasItem(definitionId: string, quantity: number = 1): boolean {
    const item = this.items.find(i => i.definitionId === definitionId);
    return item ? item.quantity >= quantity : false;
  }

  getItem(uid: string): ItemInstance | undefined {
    return this.items.find(i => i.uid === uid);
  }

  getItemsByCategory(category: ItemCategory): ItemInstance[] {
    return this.items.filter(i => ITEM_REGISTRY[i.definitionId]?.category === category);
  }

  getItemsByIllegal(illegal: boolean = true): ItemInstance[] {
    return this.items.filter(i => ITEM_REGISTRY[i.definitionId]?.illegal === illegal);
  }

  getTotalValue(): number {
    return this.items.reduce((sum, item) => {
      const def = ITEM_REGISTRY[item.definitionId];
      return sum + (def ? def.price * item.quantity : 0);
    }, 0);
  }

  transferTo(targetInventory: InventoryEntity, uid: string, quantity: number = 1): boolean {
    const item = this.getItem(uid);
    if (!item) return false;

    const def = ITEM_REGISTRY[item.definitionId];
    if (!def) return false;

    const check = targetInventory.canAdd(item.definitionId, quantity);
    if (!check.allowed) return false;

    this.removeItem(uid, quantity);
    targetInventory.addItem(item.definitionId, quantity, item.metadata);

    this.emit('inventory:item_transferred', {
      from: this.ownerId,
      to: targetInventory.ownerId,
      definitionId: item.definitionId,
      quantity,
    });

    return true;
  }

  search(query: string): ItemInstance[] {
    const q = query.toLowerCase();
    return this.items.filter(item => {
      const def = ITEM_REGISTRY[item.definitionId];
      if (!def) return false;
      return (
        def.name.toLowerCase().includes(q) ||