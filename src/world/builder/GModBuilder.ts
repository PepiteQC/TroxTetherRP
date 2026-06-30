import * as THREE from 'three';
import { EventEmitter } from '../core/EventEmitter';
import { BuilderState, PlacedProp, PropCategory, PropData } from '../shared/types';
import { MaterialsFactory } from '../world/MaterialsFactory';

export interface GModBuilderConfig {
  snapSize: number;
  enableCollision: boolean;
  enablePhysics: boolean;
  maxPropsPerProperty: number;
  ghostOpacity: number;
  enableUndoRedo: boolean;
  undoStackSize: number;
}

export interface PropPlacementEvent {
  type: 'placed' | 'removed' | 'moved' | 'rotated' | 'scaled';
  prop: PlacedProp;
  timestamp: number;
  userId: string;
}

export class GModBuilder extends EventEmitter {
  private scene: THREE.Scene;
  private config: GModBuilderConfig;

  // State
  private state: BuilderState = 'idle';
  private isActive = false;

  // Selection & Ghost
  private ghostMesh: THREE.Mesh | null = null;
  private selectedPropId: string | null = null;
  private currentProp: PropData | null = null;
  private currentRotation = 0;
  private currentScale = { x: 1, y: 1, z: 1 };

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Data
  private placedProps: Map<string, PlacedProp> = new Map();
  private propMeshes: Map<string, THREE.Mesh> = new Map();
  private catalog: Map<string, PropData> = new Map();

  // Performance
  private geometryCache: Map<string, THREE.BoxGeometry> = new Map();
  private materialCache: Map<number, THREE.MeshStandardMaterial> = new Map();

  // Undo/Redo
  private undoStack: PlacedProp[][] = [];
  private redoStack: PlacedProp[][] = [];

  // Physics (optional Rapier integration)
  private physicsWorld: any = null;
  private propColliders: Map<string, any> = new Map();

  constructor(scene: THREE.Scene, config: Partial<GModBuilderConfig> = {}) {
    super();
    this.scene = scene;
    this.config = {
      snapSize: 0.5,
      enableCollision: true,
      enablePhysics: false,
      maxPropsPerProperty: 500,
      ghostOpacity: 0.5,
      enableUndoRedo: true,
      undoStackSize: 50,
      ...config,
    };
    this.initializeCatalog();
  }

  // ═══════════════════════════════════════════════════════════════
  // CATALOG SYSTEM
  // ═══════════════════════════════════════════════════════════════

  private initializeCatalog(): void {
    const categories: { name: PropCategory; label: string; icon: string }[] = [
      { name: 'meubles', label: 'Meubles', icon: '🪑' },
      { name: 'decor', label: 'Décor', icon: '🎨' },
      { name: 'appareils', label: 'Appareils', icon: '📺' },
      { name: 'exterieur', label: 'Extérieur', icon: '🌳' },
      { name: 'construction', label: 'Construction', icon: '🏗️' },
      { name: 'business', label: 'Business', icon: '💼' },
      { name: 'utilitaire', label: 'Utilitaire', icon: '🔧' },
      { name: 'lighting', label: 'Éclairage', icon: '💡' },
      { name: 'special', label: 'Spécial', icon: '⭐' },
    ];

    const props: PropData[] = [
      // ═══ MEUBLES ═══
      { id: 'table_wood', name: 'Table en bois', category: 'meubles', size: { x: 1.5, y: 0.8, z: 0.8 }, color: 0x8a6a4a, price: 150, description: 'Table en bois massif', collidable: true, snapToWall: false, allowedZones: ['interior'], tags: ['wood', 'dining'] },
      { id: 'chair', name: 'Chaise', category: 'meubles', size: { x: 0.5, y: 0.9, z: 0.5 }, color: 0x6a4a2a, price: 80, description: 'Chaise confortable', collidable: true, snapToWall: false, allowedZones: ['interior'], tags: ['wood', 'seating'] },
      { id: 'sofa', name: 'Canapé', category: 'meubles', size: { x: 2.0, y: 0.8, z: 0.7 }, color: 0x445566, price: 350, description: 'Canapé 3 places', collidable: true, snapToWall: true, allowedZones: ['interior'], tags: ['fabric', 'seating'] },
      { id: 'bed', name: 'Lit', category: 'meubles', size: { x: 1.8, y: 0.5, z: 2.0 }, color: 0xeeddcc, price: 400, description: 'Lit double', collidable: true, snapToWall: true, allowedZones: ['interior'], tags: ['bedroom'] },
      { id: 'bookshelf', name: 'Bibliothèque', category: 'meubles', size: { x: 0.8, y: 2.0, z: 0.4 }, color: 0x6a4a2a, price: 200, description: 'Bibliothèque 5 étagères', collidable: true, snapToWall: true, allowedZones: ['interior'], tags: ['wood', 'storage'] },
      { id: 'desk', name: 'Bureau', category: 'meubles', size: { x: 1.2, y: 0.75, z: 0.6 }, color: 0x5a3a1a, price: 180, description: 'Bureau avec tiroirs', collidable: true, snapToWall: true, allowedZones: ['interior'], tags: ['wood', 'office'] },
      { id: 'wardrobe', name: 'Armoire', category: 'meubles', size: { x: 1.0, y: 2.2, z: 0.6 }, color: 0x7a5a3a, price: 300, description: 'Grande armoire', collidable: true, snapToWall: true, allowedZones: ['interior'], tags: ['wood', 'storage'] },
      { id: 'table_basse', name: 'Table basse', category: 'meubles', size: { x: 1.0, y: 0.4, z: 0.6 }, color: 0x6a5a4a, price: 120, description: 'Table basse en verre', collidable: true, snapToWall: false, allowedZones: ['interior'], tags: ['glass', 'living'] },
      { id: 'nightstand', name: 'Table de nuit', category: 'meubles', size: { x: 0.5, y: 0.6, z: 0.4 }, color: 0x7a6a5a, price: 90, description: 'Table de nuit', collidable: true, snapToWall: true, allowedZones: ['interior'], tags: ['bedroom'] },
      { id: 'dresser', name: 'Commode', category: 'meubles', size: { x: 1.2, y: 0.9, z: 0.5 }, color: 0x6a5a4a, price: 220, description: 'Commode 6 tiroirs', collidable: true, snapToWall: true, allowedZones: ['interior'], tags: ['bedroom', 'storage'] },

      // ═══ DÉCOR ═══
      { id: 'plant_pot', name: 'Plante en pot', category: 'decor', size: { x: 0.4, y: 1.0, z: 0.4 }, color: 0x3a7a2a, price: 60, description: 'Plante verte décorative', collidable: true, snapToWall: false, allowedZones: ['interior', 'exterior'], tags: ['plant', 'nature'] },
      { id: 'rug', name: 'Tapis', category: 'decor', size: { x: 1.5, y: 0.05, z: 1.0 }, color: 0x884422, price: 90, description: 'Tapis épais', collidable: false, snapToWall: false, allowedZones: ['interior'], tags: ['fabric', 'floor'] },
      { id: 'painting', name: 'Tableau', category: 'decor', size: { x: 0.6, y: 0.4, z: 0.05 }, color: 0xccaa88, price: 110, description: 'Tableau décoratif', collidable: false, snapToWall: true, allowedZones: ['interior'], tags: ['wall', 'art'] },
      { id: 'lamp_floor', name: 'Lampadaire', category: 'decor', size: { x: 0.3, y: 1.8, z: 0.3 }, color: 0xddccaa, price: 130, description: 'Lampadaire d\'intérieur', collidable: true, snapToWall: false, allowedZones: ['interior'], tags: ['lighting'] },
      { id: 'clock_wall', name: 'Horloge murale', category: 'decor', size: { x: 0.3, y: 0.3, z: 0.05 }, color: 0x886644, price: 70, description: 'Horloge murale', collidable: false, snapToWall: true, allowedZones: ['interior'], tags: ['wall'] },
      { id: 'vase', name: 'Vase décoratif', category: 'decor', size: { x: 0.2, y: 0.4, z: 0.2 }, color: 0x44aacc, price: 50, description: 'Vase en céramique', collidable: true, snapToWall: false, allowedZones: ['interior'], tags: ['ceramic'] },
      { id: 'mirror', name: 'Miroir', category: 'decor', size: { x: 0.8, y: 1.2, z: 0.05 }, color: 0xaaccff, price: 140, description: 'Miroir décoratif', collidable: false, snapToWall: true, allowedZones: ['interior'], tags: ['wall', 'glass'] },
      { id: 'sculpture', name: 'Sculpture', category: 'decor', size: { x: 0.4, y: 1.2, z: 0.4 }, color: 0xcccccc, price: 250, description: 'Sculpture artistique', collidable: true, snapToWall: false, allowedZones: ['interior', 'exterior'], tags: ['art'] },

      // ═══ APPAREILS ═══
      { id: 'fridge', name: 'Réfrigérateur', category: 'appareils', size: { x: 0.7, y: 1.8, z: 0.6 }, color: 0xeeeeee, price: 500, description: 'Réfrigérateur moderne', collidable: true, snapToWall: true, allowedZones: ['interior'], tags: ['kitchen', 'appliance'] },
      { id: 'oven', name: 'Four', category: 'appareils', size: { x: 0.6, y: 0.8, z: 0.6 }, color: 0xcccccc, price: 350, description: 'Four électrique', collidable: true, snapToWall: true, allowedZones: ['interior'], tags: ['kitchen', 'appliance'] },
      { id: 'tv', name: 'Télévision', category: 'appareils', size: { x: 1.2, y: 0.7, z: 0.08 }, color: 0x111111, price: 600, description: 'TV écran plat 55"', collidable: false, snapToWall: true, allowedZones: ['interior'], tags: ['electronics', 'entertainment'] },
      { id: 'washing_machine', name: 'Machine à laver', category: 'appareils', size: { x: 0.6, y: 0.85, z: 0.6 }, color: 0xffffff, price: 400, description: 'Lave-linge', collidable: true, snapToWall: true, allowedZones: ['interior'], tags: ['laundry', 'appliance'] },
      { id: 'computer', name: 'Ordinateur', category: 'appareils', size: { x: 0.4, y: 0.4, z: 0.4 }, color: 0x222233, price: 800, description: 'Poste de travail', collidable: true, snapToWall: false, allowedZones: ['interior', 'business'], tags: ['electronics', 'office'] },
      { id: 'microwave', name: 'Micro-ondes', category: 'appareils', size: { x: 0.5, y: 0.3, z: 0.4 }, color: 0xdddddd, price: 150, description: 'Four micro-ondes', collidable: true, snapToWall: false, allowedZones: ['interior'], tags: ['kitchen', 'appliance'] },
      { id: 'dishwasher', name: 'Lave-vaisselle', category: 'appareils', size: { x: 0.6, y: 0.85, z: 0.6 }, color: 0xcccccc, price: 450, description: 'Lave-vaisselle intégré', collidable: true, snapToWall: true, allowedZones: ['interior'], tags: ['kitchen', 'appliance'] },

      // ═══ EXTÉRIEUR ═══
      { id: 'garden_table', name: 'Table de jardin', category: 'exterieur', size: { x: 1.2, y: 0.7, z: 0.7 }, color: 0x8a7a5a, price: 120, description: 'Table de jardin pliante', collidable: true, snapToWall: false, allowedZones: ['exterior', 'land'], tags: ['outdoor', 'seating'] },
      { id: 'bbq', name: 'Barbecue', category: 'exterieur', size: { x: 0.8, y: 0.9, z: 0.5 }, color: 0x555555, price: 200, description: 'Barbecue charbon', collidable: true, snapToWall: false, allowedZones: ['exterior', 'land'], tags: ['outdoor', 'cooking'] },
      { id: 'fence_section', name: 'Section clôture', category: 'exterieur', size: { x: 2.0, y: 1.0, z: 0.1 }, color: 0x6a5a4a, price: 80, description: 'Panneau de clôture bois', collidable: true, snapToWall: false, allowedZones: ['exterior', 'land'], tags: ['fence'] },
      { id: 'flower_bed', name: 'Parterre de fleurs', category: 'exterieur', size: { x: 1.0, y: 0.3, z: 0.5 }, color: 0xdd4488, price: 60, description: 'Parterre fleuri', collidable: false, snapToWall: false, allowedZones: ['exterior', 'land'], tags: ['plant', 'garden'] },
      { id: 'bench_outdoor', name: 'Banc extérieur', category: 'exterieur', size: { x: 1.5, y: 0.5, z: 0.5 }, color: 0x5a4a3a, price: 150, description: 'Banc en bois', collidable: true, snapToWall: false, allowedZones: ['exterior', 'land'], tags: ['seating', 'outdoor'] },
      { id: 'garden_light', name: 'Lumière de jardin', category: 'exterieur', size: { x: 0.15, y: 0.6, z: 0.15 }, color: 0xddaa44, price: 45, description: 'Borne lumineuse solaire', collidable: true, snapToWall: false, allowedZones: ['exterior', 'land'], tags: ['lighting', 'outdoor'] },
      { id: 'tree_small', name: 'Arbre petit', category: 'exterieur', size: { x: 1.5, y: 3.0, z: 1.5 }, color: 0x228822, price: 180, description: 'Arbre décoratif', collidable: true, snapToWall: false, allowedZones: ['exterior', 'land'], tags: ['plant', 'nature'] },
      { id: 'fountain', name: 'Fontaine', category: 'exterieur', size: { x: 1.5, y: 1.5, z: 1.5 }, color: 0x88aacc, price: 500, description: 'Fontaine décorative', collidable: true, snapToWall: false, allowedZones: ['exterior', 'land'], tags: ['water', 'decor'] },

      // ═══ CONSTRUCTION ═══
      { id: 'wall_section', name: 'Mur (section)', category: 'construction', size: { x: 2.0, y: 2.8, z: 0.2 }, color: 0xcccccc, price: 250, description: 'Section de mur intérieur', collidable: true, snapToWall: false, allowedZones: ['interior', 'land', 'construction'], tags: ['structure'] },
      { id: 'floor_tile', name: 'Dalle de sol', category: 'construction', size: { x: 1.0, y: 0.05, z: 1.0 }, color: 0xbbaa99, price: 40, description: 'Dalle de sol carrelage', collidable: false, snapToWall: false, allowedZones: ['interior', 'land'], tags: ['floor'] },
      { id: 'pillar', name: 'Pilier', category: 'construction', size: { x: 0.3, y: 2.8, z: 0.3 }, color: 0x999999, price: 120, description: 'Pilier de soutien', collidable: true, snapToWall: false, allowedZones: ['interior', 'land', 'construction'], tags: ['structure'] },
      { id: 'stair', name: 'Escalier', category: 'construction', size: { x: 1.0, y: 0.3, z: 1.2 }, color: 0x8a7a6a, price: 200, description: 'Bloc d\'escalier', collidable: true, snapToWall: false, allowedZones: ['interior', 'land'], tags: ['structure'] },
      { id: 'roof_section', name: 'Section toit', category: 'construction', size: { x: 2.0, y: 0.1, z: 2.0 }, color: 0x6a5a4a, price: 180, description: 'Panneau de toiture', collidable: false, snapToWall: false, allowedZones: ['land', 'construction'], tags: ['roof'] },
      { id: 'door_frame', name: 'Cadre de porte', category: 'construction', size: { x: 0.9, y: 2.2, z: 0.1 }, color: 0x6a4a2a, price: 150, description: 'Cadre avec porte intérieure', collidable: true, snapToWall: false, allowedZones: ['interior', 'construction'], tags: ['door'] },
      { id: 'window_frame', name: 'Cadre de fenêtre', category: 'construction', size: { x: 1.2, y: 1.5, z: 0.1 }, color: 0x888888, price: 130, description: 'Fenêtre double vitrage', collidable: false, snapToWall: true, allowedZones: ['interior', 'construction'], tags: ['window'] },
      { id: 'beam', name: 'Poutre', category: 'construction', size: { x: 3.0, y: 0.3, z: 0.3 }, color: 0x6a4a2a, price: 180, description: 'Poutre en bois', collidable: true, snapToWall: false, allowedZones: ['interior', 'construction'], tags: ['structure'] },

      // ═══ BUSINESS ═══
      { id: 'cash_register', name: 'Caisse enregistreuse', category: 'business', size: { x: 0.4, y: 0.3, z: 0.3 }, color: 0x444444, price: 300, description: 'Point de vente', collidable: true, snapToWall: false, allowedZones: ['business', 'interior'], tags: ['retail'] },
      { id: 'shelf_display', name: 'Présentoir', category: 'business', size: { x: 1.5, y: 1.8, z: 0.4 }, color: 0xccbbaa, price: 250, description: 'Présentoir de marchandises', collidable: true, snapToWall: true, allowedZones: ['business', 'interior'], tags: ['retail', 'storage'] },
      { id: 'counter', name: 'Comptoir', category: 'business', size: { x: 2.0, y: 1.0, z: 0.6 }, color: 0x8a7a6a, price: 400, description: 'Comptoir d\'accueil', collidable: true, snapToWall: true, allowedZones: ['business', 'interior'], tags: ['retail'] },
      { id: 'sign_business', name: 'Enseigne', category: 'business', size: { x: 1.5, y: 0.5, z: 0.05 }, color: 0xffee00, price: 200, description: 'Enseigne lumineuse', collidable: false, snapToWall: true, allowedZones: ['business', 'exterior'], tags: ['signage'] },
      { id: 'display_rack', name: 'Portant vêtements', category: 'business', size: { x: 1.0, y: 1.5, z: 0.6 }, color: 0x888888, price: 180, description: 'Portant de présentation', collidable: true, snapToWall: false, allowedZones: ['business', 'interior'], tags: ['retail'] },
      { id: 'atm', name: 'Distributeur ATM', category: 'business', size: { x: 0.5, y: 1.8, z: 0.5 }, color: 0x4466aa, price: 2000, description: 'Distributeur automatique', collidable: true, snapToWall: true, allowedZones: ['business', 'exterior'], tags: ['finance'] },
      { id: 'security_camera', name: 'Caméra sécurité', category: 'business', size: { x: 0.2, y: 0.2, z: 0.3 }, color: 0x222222, price: 250, description: 'Caméra de surveillance', collidable: false, snapToWall: true, allowedZones: ['business', 'interior', 'exterior'], tags: ['security'] },

      // ═══ UTILITAIRE ═══
      { id: 'barrel', name: 'Baril', category: 'utilitaire', size: { x: 0.5, y: 0.8, z: 0.5 }, color: 0x445566, price: 30, description: 'Baril de stockage', collidable: true, snapToWall: false, allowedZones: ['exterior', 'industrial', 'land'], tags: ['storage'] },
      { id: 'pallet', name: 'Palette', category: 'utilitaire', size: { x: 1.0, y: 0.15, z: 1.0 }, color: 0x6a5a3a, price: 25, description: 'Palette de manutention', collidable: true, snapToWall: false, allowedZones: ['industrial', 'exterior'], tags: ['storage'] },
      { id: 'crate', name: 'Caisse', category: 'utilitaire', size: { x: 0.6, y: 0.5, z: 0.6 }, color: 0x7a6a4a, price: 20, description: 'Caisse en bois', collidable: true, snapToWall: false, allowedZones: ['industrial', 'exterior', 'land'], tags: ['storage'] },
      { id: 'toolbox', name: 'Caisse à outils', category: 'utilitaire', size: { x: 0.4, y: 0.3, z: 0.3 }, color: 0xcc4422, price: 60, description: 'Caisse à outils professionnelle', collidable: true, snapToWall: false, allowedZones: ['industrial', 'interior', 'garage'], tags: ['tools'] },
      { id: 'workbench', name: 'Établi', category: 'utilitaire', size: { x: 1.5, y: 0.9, z: 0.7 }, color: 0x5a4a3a, price: 200, description: 'Établi de travail', collidable: true, snapToWall: true, allowedZones: ['industrial', 'garage', 'interior'], tags: ['tools', 'workshop'] },
      { id: 'oil_drum', name: 'Fût d\'huile', category: 'utilitaire', size: { x: 0.4, y: 0.7, z: 0.4 }, color: 0x334466, price: 50, description: 'Fût d\'huile moteur', collidable: true, snapToWall: false, allowedZones: ['industrial', 'garage'], tags: ['automotive'] },
      { id: 'ladder', name: 'Échelle', category: 'utilitaire', size: { x: 0.4, y: 2.5, z: 0.3 }, color: 0x888888, price: 80, description: 'Échelle aluminium', collidable: true, snapToWall: false, allowedZones: ['industrial', 'interior', 'garage'], tags: ['tools'] },
      { id: 'fire_extinguisher', name: 'Extincteur', category: 'utilitaire', size: { x: 0.2, y: 0.5, z: 0.2 }, color: 0xcc2222, price: 70, description: 'Extincteur incendie', collidable: true, snapToWall: true, allowedZones: ['interior', 'business', 'industrial'], tags: ['safety'] },

      // ═══ ÉCLAIRAGE ═══
      { id: 'ceiling_light', name: 'Plafonnier', category: 'lighting', size: { x: 0.4, y: 0.1, z: 0.4 }, color: 0xffffcc, price: 80, description: 'Lumière plafond LED', collidable: false, snapToWall: false, allowedZones: ['interior'], tags: ['lighting', 'ceiling'], emissive: true },
      { id: 'spotlight', name: 'Spot', category: 'lighting', size: { x: 0.2, y: 0.3, z: 0.2 }, color: 0xffffff, price: 120, description: 'Spot orientable', collidable: true, snapToWall: true, allowedZones: ['interior', 'exterior'], tags: ['lighting'] },
      { id: 'chandelier', name: 'Lustre', category: 'lighting', size: { x: 0.8, y: 1.0, z: 0.8 }, color: 0xffdd88, price: 450, description: 'Lustre cristal', collidable: true, snapToWall: false, allowedZones: ['interior'], tags: ['lighting', 'luxury'] },
      { id: 'neon_sign', name: 'Néon', category: 'lighting', size: { x: 1.0, y: 0.3, z: 0.1 }, color: 0xff00ff, price: 200, description: 'Enseigne néon', collidable: false, snapToWall: true, allowedZones: ['interior', 'business'], tags: ['lighting', 'signage'], emissive: true },

      // ═══ SPÉCIAL ═══
      { id: 'portal', name: 'Portail', category: 'special', size: { x: 1.5, y: 2.5, z: 0.1 }, color: 0x00ffff, price: 5000, description: 'Portail de téléportation', collidable: false, snapToWall: true, allowedZones: ['interior', 'exterior'], tags: ['special', 'magic'], emissive: true },
      { id: 'hologram', name: 'Hologramme', category: 'special', size: { x: 1.0, y: 1.5, z: 0.1 }, color: 0x00aaff, price: 3000, description: 'Projection holographique', collidable: false, snapToWall: true, allowedZones: ['business', 'interior'], tags: ['special', 'tech'], emissive: true },
      { id: 'teleporter', name: 'Téléporteur', category: 'special', size: { x: 1.2, y: 2.0, z: 1.2 }, color: 0xaa00ff, price: 10000, description: 'Station de téléportation', collidable: true, snapToWall: false, allowedZones: ['interior', 'business'], tags: ['special', 'tech'], emissive: true },
    ];

    for (const prop of props) {
      this.catalog.set(prop.id, prop);
    }

    this.emit('catalog:initialized', { count: this.catalog.size });
  }

  getCatalog(): PropData[] {
    return Array.from(this.catalog.values());
  }

  getCatalogByCategory(category: PropCategory): PropData[] {
    return Array.from(this.catalog.values()).filter(p => p.category === category);
  }

  getPropById(id: string): PropData | undefined {
    return this.catalog.get(id);
  }

  searchCatalog(query: string): PropData[] {
    const q = query.toLowerCase();
    return Array.from(this.catalog.values()).filter(
      p => p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  getState(): BuilderState {
    return this.state;
  }

  setState(state: BuilderState): void {
    this.state = state;
    this.emit('state:changed', { state });
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.setState('active');
    this.emit('builder:activated');
  }

  deactivate(): void {
    this.isActive = false;
    this.removeGhost();
    this.currentProp = null;
    this.selectedPropId = null;
    this.setState('idle');
    this.emit('builder:deactivated');
  }

  // ═══════════════════════════════════════════════════════════════
  // SELECTION & GHOST
  // ═══════════════════════════════════════════════════════════════

  selectProp(propId: string): boolean {
    const prop = this.catalog.get(propId);
    if (!prop) {
      this.emit('error', { message: `Prop ${propId} not found in catalog` });
      return false;
    }
    this.currentProp = prop;
    this.currentRotation = 0;
    this.currentScale = { x: 1, y: 1, z: 1 };
    this.selectedPropId = null;
    this.setState('placing');
    this.emit('prop:selected', { propId, prop });
    return true;
  }

  deselectProp(): void {
    this.currentProp = null;
    this.removeGhost();
    this.setState('active');
    this.emit('prop:deselected');
  }

  selectPlacedProp(propId: string): boolean {
    if (!this.placedProps.has(propId)) return false;
    this.selectedPropId = propId;
    this.highlightProp(propId);
    this.setState('selected');
    this.emit('prop:placed_selected', { propId });
    return true;
  }

  deselectPlacedProp(): void {
    this.selectedPropId = null;
    this.clearHighlight();
    this.setState('active');
    this.emit('prop:placed_deselected');
  }

  updateGhost(camera: THREE.PerspectiveCamera, mousePosition: THREE.Vector2): void {
    if (!this.currentProp || !this.isActive) {
      this.removeGhost();
      return;
    }

    this.removeGhost();
    this.mouse.copy(mousePosition);
    this.raycaster.setFromCamera(this.mouse, camera);

    const intersectPoint = new THREE.Vector3();
    const ray = this.raycaster.ray;
    const hitGround = ray.intersectPlane(this.groundPlane, intersectPoint);

    if (hitGround) {
      const snap = this.config.snapSize;
      const snappedX = Math.round(intersectPoint.x / snap) * snap;
      const snappedZ = Math.round(intersectPoint.z / snap) * snap;

      const geo = this.getCachedGeometry(this.currentProp);
      const mat = MaterialsFactory.getPropGhost(this.config.ghostOpacity);

      this.ghostMesh = new THREE.Mesh(geo, mat);
      this.ghostMesh.position.set(
        snappedX,
        this.currentProp.size.y / 2,
        snappedZ
      );
      this.ghostMesh.rotation.y = this.currentRotation;
      this.ghostMesh.scale.set(
        this.currentScale.x,
        this.currentScale.y,
        this.currentScale.z
      );
      this.ghostMesh.name = 'ghost_preview';

      // Validation visuelle (rouge si collision)
      const isValid = this.validatePlacement(snappedX, this.currentProp.size.y / 2, snappedZ);
      if (!isValid) {
        (this.ghostMesh.material as THREE.MeshStandardMaterial).color.setHex(0xff4444);
        (this.ghostMesh.material as THREE.MeshStandardMaterial).opacity = 0.7;
      }

      this.scene.add(this.ghostMesh);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PLACEMENT
  // ═══════════════════════════════════════════════════════════════

  validatePlacement(x: number, y: number, z: number): boolean {
    if (!this.config.enableCollision) return true;

    for (const [id, prop] of this.placedProps) {
      const dx = Math.abs(prop.position.x - x);
      const dz = Math.abs(prop.position.z - z);
      const minDist = 0.5;

      if (dx < minDist && dz < minDist) {
        return false;
      }
    }
    return true;
  }

  placeProp(propertyId: string, playerId: string): PlacedProp | null {
    if (!this.currentProp || !this.ghostMesh) {
      this.emit('error', { message: 'No prop selected or ghost missing' });
      return null;
    }

    // Check max props limit
    const currentCount = this.getPropertyProps(propertyId).length;
    if (currentCount >= this.config.maxPropsPerProperty) {
      this.emit('error', { message: `Max props limit reached (${this.config.maxPropsPerProperty})` });
      return null;
    }

    // Validate placement
    const pos = this.ghostMesh.position;
    if (!this.validatePlacement(pos.x, pos.y, pos.z)) {
      this.emit('error', { message: 'Invalid placement - collision detected' });
      return null;
    }

    // Save state for undo
    this.saveUndoState();

    const placed: PlacedProp = {
      id: `placed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      propId: this.currentProp.id,
      propertyId,
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotation: this.currentRotation,
      scale: { ...this.currentScale },
      color: this.currentProp.color,
      placedBy: playerId,
      placedAt: Date.now(),
      metadata: {
        zone: this.detectZone(pos),
        snapMode: 'grid',
      },
    };

    this.placedProps.set(placed.id, placed);
    this.addPlacedMesh(placed);

    this.emit('prop:placed', { prop: placed });
    this.emit('props:changed', { count: this.placedProps.size });

    return placed;
  }

  private detectZone(position: THREE.Vector3): string {
    // Simple zone detection based on position
    if (position.y > 5) return 'upper';
    if (position.y < 0) return 'lower';
    return 'ground';
  }

  private addPlacedMesh(prop: PlacedProp): void {
    const catalogProp = this.catalog.get(prop.propId);
    if (!catalogProp) return;

    const mat = this.getCachedMaterial(prop.color);
    const geo = this.getCachedGeometry(catalogProp, prop.scale);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(prop.position.x, prop.position.y, prop.position.z);
    mesh.rotation.y = prop.rotation;
    mesh.scale.set(prop.scale.x, prop.scale.y, prop.scale.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.placedPropId = prop.id;
    mesh.name = `placed_prop_${prop.id}`;

    this.scene.add(mesh);
    this.propMeshes.set(prop.id, mesh);
  }

  // ═══════════════════════════════════════════════════════════════
  // TRANSFORM OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  rotate(angle: number = Math.PI / 4): void {
    this.currentRotation = (this.currentRotation + angle) % (Math.PI * 2);
    if (this.ghostMesh) {
      this.ghostMesh.rotation.y = this.currentRotation;
    }
    this.emit('prop:rotated', { rotation: this.currentRotation });
  }

  scale(factor: number, axis?: 'x' | 'y' | 'z'): void {
    if (axis) {
      this.currentScale[axis] *= factor;
      this.currentScale[axis] = Math.max(0.1, Math.min(5, this.currentScale[axis]));
    } else {
      this.currentScale.x *= factor;
      this.currentScale.y *= factor;
      this.currentScale.z *= factor;
    }
    if (this.ghostMesh) {
      this.ghostMesh.scale.set(this.currentScale.x, this.currentScale.y, this.currentScale.z);
    }
    this.emit('prop:scaled', { scale: { ...this.currentScale } });
  }

  moveProp(propId: string, delta: THREE.Vector3): boolean {
    const prop = this.placedProps.get(propId);
    const mesh = this.propMeshes.get(propId);
    if (!prop || !mesh) return false;

    this.saveUndoState();

    prop.position.x += delta.x;
    prop.position.y += delta.y;
    prop.position.z += delta.z;

    mesh.position.add(delta);

    this.emit('prop:moved', { propId, position: { ...prop.position } });
    return true;
  }

  removeProp(propId: string): boolean {
    if (!this.placedProps.has(propId)) {
      this.emit('error', { message: `Prop ${propId} not found` });
      return false;
    }

    this.saveUndoState();

    const mesh = this.propMeshes.get(propId);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
      this.propMeshes.delete(propId);
    }

    this.placedProps.delete(propId);

    this.emit('prop:removed', { propId });
    this.emit('props:changed', { count: this.placedProps.size });

    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // UNDO / REDO SYSTEM
  // ═══════════════════════════════════════════════════════════════

  private saveUndoState(): void {
    if (!this.config.enableUndoRedo) return;

    const state = Array.from(this.placedProps.values());
    this.undoStack.push(JSON.parse(JSON.stringify(state)));

    if (this.undoStack.length > this.config.undoStackSize) {
      this.undoStack.shift();
    }

    this.redoStack = [];
    this.emit('undo:changed', { canUndo: this.undoStack.length > 0, canRedo: false });
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;

    this.redoStack.push(Array.from(this.placedProps.values()));
    const previousState = this.undoStack.pop()!;

    this.clearAllProps();
    for (const prop of previousState) {
      this.placedProps.set(prop.id, prop);
      this.addPlacedMesh(prop);
    }

    this.emit('undo:performed');
    this.emit('undo:changed', {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0
    });

    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;

    this.undoStack.push(Array.from(this.placedProps.values()));
    const nextState = this.redoStack.pop()!;

    this.clearAllProps();
    for (const prop of nextState) {
      this.placedProps.set(prop.id, prop);
      this.addPlacedMesh(prop);
    }

    this.emit('redo:performed');
    this.emit('undo:changed', {
      canUndo: true,
      canRedo: this.redoStack.length > 0
    });

    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  exportProps(propertyId?: string): PlacedProp[] {
    const props = Array.from(this.placedProps.values());
    return propertyId
      ? props.filter(p => p.propertyId === propertyId)
      : props;
  }

  importProps(props: PlacedProp[], merge: boolean = false): void {
    if (!merge) {
      this.clearAllProps();
    }

    for (const prop of props) {
      if (!this.placedProps.has(prop.id)) {
        this.placedProps.set(prop.id, prop);
        this.addPlacedMesh(prop);
      }
    }

    this.emit('props:imported', { count: props.length });
    this.emit('props:changed', { count: this.placedProps.size });
  }

  async saveToServer(propertyId: string, apiEndpoint: string): Promise<boolean> {
    const props = this.exportProps(propertyId);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, props }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this.emit('props:saved', { propertyId, count: props.length });
      return true;
    } catch (error) {
      this.emit('error', { message: 'Failed to save props', error });
      return false;
    }
  }

  async loadFromServer(propertyId: string, apiEndpoint: string): Promise<boolean> {
    try {
      const response = await fetch(`${apiEndpoint}?propertyId=${propertyId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      this.importProps(data.props, false);

      this.emit('props:loaded', { propertyId, count: data.props.length });
      return true;
    } catch (error) {
      this.emit('error', { message: 'Failed to load props', error });
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════

  private getCachedGeometry(prop: PropData, scale?: { x: number; y: number; z: number }): THREE.BoxGeometry {
    const key = `${prop.id}_${scale?.x || 1}_${scale?.y || 1}_${scale?.z || 1}`;

    if (!this.geometryCache.has(key)) {
      const geo = new THREE.BoxGeometry(
        prop.size.x * (scale?.x || 1),
        prop.size.y * (scale?.y || 1),
        prop.size.z * (scale?.z || 1)
      );
      this.geometryCache.set(key, geo);
    }

    return this.geometryCache.get(key)!;
  }

  private getCachedMaterial(color: number): THREE.MeshStandardMaterial {
    if (!this.materialCache.has(color)) {
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.2,
      });
      this.materialCache.set(color, mat);
    }
    return this.materialCache.get(color)!;
  }

  private highlightProp(propId: string): void {
    const mesh = this.propMeshes.get(propId);
    if (mesh) {
      (mesh.material as THREE.MeshStandardMaterial).emissive?.setHex(0x00d4ff);
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
    }
  }

  private clearHighlight(): void {
    for (const mesh of this.propMeshes.values()) {
      (mesh.material as THREE.MeshStandardMaterial).emissive?.setHex(0x000000);
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
    }
  }

  private removeGhost(): void {
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh.geometry.dispose();
      (this.ghostMesh.material as THREE.Material).dispose();
      this.ghostMesh = null;
    }
  }

  private clearAllProps(): void {
    for (const mesh of this.propMeshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    this.propMeshes.clear();
    this.placedProps.clear();
  }

  getPropertyProps(propertyId: string): PlacedProp[] {
    return Array.from(this.placedProps.values()).filter(p => p.propertyId === propertyId);
  }

  getSelectedProp(): PlacedProp | null {
    if (!this.selectedPropId) return null;
    return this.placedProps.get(this.selectedPropId) || null;
  }

  setSnapSize(size: number): void {
    this.config.snapSize = size;
    this.emit('config:changed', { snapSize: size });
  }

  getSnapSize(): number {
    return this.config.snapSize;
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════

  dispose(): void {
    this.deactivate();
    this.clearAllProps();

    for (const geo of this.geometryCache.values()) {
      geo.dispose();
    }
    this.geometryCache.clear();

    for (const mat of this.materialCache.values()) {
      mat.dispose();
    }
    this.materialCache.clear();

    this.removeAllListeners();
  }

  resetPropertyProps(propertyId: string): void {
    const toRemove: string[] = [];
    for (const [id, prop] of this.placedProps) {
      if (prop.propertyId === propertyId) {
        toRemove.push(id);
      }
    }
    toRemove.forEach(id => this.removeProp(id));
    this.emit('property:reset', { propertyId });
  }
}

export default GModBuilder;