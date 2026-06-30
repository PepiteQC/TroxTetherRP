import * as THREE from 'three';
import { CatalogItem, PlacedProp } from '../types';

export const GMOD_CATALOG: CatalogItem[] = [
  { id: 'couch_nova', name: 'Canapé Luxury Nova', category: 'furniture', size: [2.2, 0.9, 0.9], color: '#1e293b', description: 'Canapé rétro en tissu confortable, parfait pour le salon.', icon: 'Armchair', price: 850 },
  { id: 'coffee_table', name: 'Table Basse Moderne', category: 'furniture', size: [1.3, 0.45, 0.75], color: '#78350f', description: 'Table en pin rustique, solide et polie.', icon: 'Table', price: 300 },
  { id: 'wooden_chair', name: 'Chaise de Salon', category: 'furniture', size: [0.55, 0.95, 0.55], color: '#b45309', description: 'Chaise en chêne massif confortable.', icon: 'Chair', price: 120 },
  { id: 'lcd_tv', name: 'Téléviseur OLED 65"', category: 'appliances', size: [1.4, 0.85, 0.15], color: '#090d16', description: 'Écran plat ultra-fin. Se snap parfaitement au mur.', icon: 'Tv', price: 1200 },
  { id: 'standing_lamp', name: 'Lampadaire Halogène', category: 'decor', size: [0.4, 1.8, 0.4], color: '#fbbf24', description: 'Source lumineuse d\'appoint pour vos soirées RP.', icon: 'Lightbulb', price: 180 },
  { id: 'fridge_chrome', name: 'Frigo Américain Chrome', category: 'appliances', size: [0.95, 1.9, 0.85], color: '#94a3b8', description: 'Grand réfrigérateur double porte avec distributeur d\'eau.', icon: 'Refrigerator', price: 1500 },
  { id: 'double_bed', name: 'Lit Double Cozy', category: 'furniture', size: [1.8, 0.7, 2.0], color: '#93c5fd', description: 'Matelas orthopédique de luxe pour des nuits complètes.', icon: 'Bed', price: 950 },
  { id: 'potted_plant', name: 'Plante Verte d\'Intérieur', category: 'decor', size: [0.6, 0.8, 0.6], color: '#15803d', description: 'Ficus en pot verni blanc pour égayer vos pièces.', icon: 'Flower', price: 75 },
  { id: 'wooden_fence', name: 'Clôture de Jardin Bois', category: 'outdoor', size: [2.0, 1.1, 0.15], color: '#7c2d12', description: 'Idéal pour délimiter votre propriété à l\'extérieur.', icon: 'Fence', price: 50 },
  { id: 'cardboard_box', name: 'Caisse en Carton de Déménagement', category: 'decor', size: [0.6, 0.6, 0.6], color: '#d97706', description: 'Caisse de stockage GMod classique pour le jeu physique.', icon: 'Package', price: 15 },
  { id: 'office_desk', name: 'Bureau d\'Angle TroxT', category: 'furniture', size: [1.6, 0.75, 1.2], color: '#312e81', description: 'Bureau de travail professionnel en bois laqué sombre.', icon: 'Briefcase', price: 420 },
  { id: 'luxury_fireplace', name: 'Cheminée Suspendue Design', category: 'decor', size: [1.0, 3.2, 1.0], color: '#18181b', description: 'Cheminée contemporaine suspendue au plafond, émettant une lumière chaleureuse.', icon: 'Flame', price: 2100 },
  { id: 'marble_island', name: 'Îlot Central Cuisine', category: 'furniture', size: [2.0, 0.95, 1.0], color: '#f8fafc', description: 'Îlot moderne de cuisine en quartz blanc avec détails dorés.', icon: 'Grid', price: 1800 },
  { id: 'designer_chair', name: 'Fauteuil Velours Chic', category: 'furniture', size: [0.85, 0.8, 0.85], color: '#7f1d1d', description: 'Fauteuil pivotant confortable en velours de designer.', icon: 'Armchair', price: 650 },
  { id: 'pendant_led', name: 'Suspension Lustre LED', category: 'decor', size: [0.8, 1.6, 0.8], color: '#ca8a04', description: 'Lustre suspendu à câbles dorés avec éclairage zénithal.', icon: 'Sun', price: 450 },
  { id: 'potted_palm', name: 'Plante Palme d\'Arec XXL', category: 'decor', size: [1.1, 2.3, 1.1], color: '#166534', description: 'Grand palmier pour structurer le salon avec un look végétal haut de gamme.', icon: 'Leaf', price: 190 },
  { id: 'pool_chair', name: 'Transat Bain de Soleil', category: 'outdoor', size: [0.75, 0.45, 2.0], color: '#0284c7', description: 'Bain de soleil moderne idéal pour se reposer au bord de la piscine.', icon: 'Compass', price: 280 },
  { id: 'pool_ladder', name: 'Échelle Inox Piscine', category: 'outdoor', size: [0.6, 1.5, 0.6], color: '#cbd5e1', description: 'Échelle chromée élégante pour descendre facilement dans l\'eau.', icon: 'Layers', price: 180 },
  { id: 'fitting_room', name: "Cabine d'Essayage VIP", category: 'furniture', size: [1.4, 3.0, 2.0], color: '#d4c8b0', description: 'Cabine d\'essayage haut de gamme avec miroir, banc en chêne et rideau de velours sombre.', icon: 'Layers', price: 950 },
  { id: 'caisse_ether', name: "Comptoir Caisse Éther", category: 'furniture', size: [2.85, 2.1, 0.95], color: '#0e1520', description: 'Comptoir-caisse en quartz poli avec nervures dorées, terminal OLED, lecteur de cartes de crédit et cloison vitrée.', icon: 'CheckSquare', price: 1500 },
  { id: 'mannequin_v', name: "Mannequin de Vitrine", category: 'decor', size: [0.4, 1.8, 0.4], color: '#d4c8b0', description: 'Mannequin d\'exposition habillé avec une élégante tenue de créateur.', icon: 'User', price: 400 },
  { id: 'neon_ether', name: "Enseigne Néon Éther", category: 'decor', size: [3.2, 0.5, 0.1], color: '#a78bfa', description: 'Enseigne lumineuse pulsante émettant un éclat violet intense.', icon: 'Tv', price: 600 },
  { id: 'glass_panel', name: "Cloison Vitrée Luxury", category: 'outdoor', size: [1.0, 3.0, 0.1], color: '#ffffff', description: 'Grand panneau de verre trempé à profilé métallique noir pour cloisons lumineuses.', icon: 'Grid', price: 200 },
  { id: 'clothing_rack', name: "Portant de Vêtements Luxe", category: 'furniture', size: [2.2, 1.8, 0.6], color: '#cbd5e1', description: 'Tringle métallique chromée garnie de plusieurs cintres et de magnifiques vêtements suspendus.', icon: 'Layers', price: 750 },
  { id: 'display_table', name: "Table de Présentation Teck", category: 'furniture', size: [1.6, 0.9, 0.9], color: '#3d2810', description: 'Table basse en teck massif garnie de plusieurs piles de vêtements de marque pliés.', icon: 'Table', price: 500 },
  { id: 'wall_shelf', name: "Étagère Murale Ébène", category: 'decor', size: [2.0, 0.4, 0.38], color: '#2a1a08', description: 'Étagère de rangement flottante en bois d\'ébène avec supports dorés et boîtes à chaussures.', icon: 'Folder', price: 350 },
];

// Self-executing initialization to load custom generated items from local storage
try {
  const existing = typeof window !== 'undefined' ? window.localStorage.getItem('etherworld_custom_catalog') : null;
  if (existing) {
    const list = JSON.parse(existing);
    if (Array.isArray(list)) {
      list.forEach(item => {
        if (!GMOD_CATALOG.some(x => x.id === item.id)) {
          GMOD_CATALOG.push(item);
        }
      });
    }
  }
} catch (e) {
  console.warn('Could not load custom catalog from storage:', e);
}

export function addCustomCatalogItem(item: CatalogItem) {
  if (GMOD_CATALOG.some(x => x.id === item.id)) return;
  GMOD_CATALOG.push(item);
  try {
    const existing = localStorage.getItem('etherworld_custom_catalog');
    const list = existing ? JSON.parse(existing) : [];
    list.push(item);
    localStorage.setItem('etherworld_custom_catalog', JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save custom item:', e);
  }
}

export class GModBuilder {
  private raycaster = new THREE.Raycaster();
  private ghostMesh: THREE.Group | null = null;
  private spawnedPropsMap = new Map<string, THREE.Group>(); // uuid -> Group
  public placedProps: PlacedProp[] = [];
  public selectedPropUuid: string | null = null;
  private selectedHighlightMesh: THREE.BoxHelper | null = null;

  constructor(private scene: THREE.Scene) {
    this.loadFromStorage();
  }

  // ─── GET ITEM FROM CATALOG ───────────────────────────────────────
  public getItemById(id: string): CatalogItem | undefined {
    return GMOD_CATALOG.find(item => item.id === id);
  }

  // ─── GHOST SYSTEM FOR PREVIEW PLACEMENT ───────────────────────────
  public updateGhostPreview(
    activeItemId: string | null,
    rayOrigin: THREE.Vector3,
    rayDirection: THREE.Vector3,
    gridSnapSize: number,
    rotationY: number, // current player rotation + manually rotated offset
    groundMeshes: THREE.Object3D[]
  ) {
    // If no item is selected, clean up ghost and return
    if (!activeItemId) {
      this.clearGhost();
      return;
    }

    const item = this.getItemById(activeItemId);
    if (!item) return;

    // Create ghost if not exists or if item changed
    if (!this.ghostMesh || this.ghostMesh.userData.itemId !== activeItemId) {
      this.clearGhost();
      this.createGhostMesh(item);
    }

    // Perform raycast
    this.raycaster.set(rayOrigin, rayDirection);
    const intersects = this.raycaster.intersectObjects(groundMeshes, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const point = hit.point;
      const normal = hit.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
      normal.applyQuaternion(hit.object.quaternion);

      // Snap coordinates based on gridSnapSize
      let snapX = point.x;
      let snapZ = point.z;
      let snapY = point.y;

      if (gridSnapSize > 0) {
        snapX = Math.round(point.x / gridSnapSize) * gridSnapSize;
        snapZ = Math.round(point.z / gridSnapSize) * gridSnapSize;
      }

      this.ghostMesh!.position.set(snapX, snapY, snapZ);
      this.ghostMesh!.visible = true;

      // Rotate ghost. If hitting a wall (horizontal normal), orient towards wall normal
      if (Math.abs(normal.y) < 0.15) {
        // Wall alignment
        const angle = Math.atan2(normal.x, normal.z);
        this.ghostMesh!.rotation.set(0, angle, 0);
        // Push slightly outwards from the wall face to avoid Z-fighting/overlapping
        const offset = normal.clone().multiplyScalar(0.06);
        this.ghostMesh!.position.add(offset);
      } else {
        // Floor alignment: keep manual/player rot
        this.ghostMesh!.rotation.set(0, rotationY, 0);
        // Align base of object exactly to floor
        this.ghostMesh!.position.y += 0.01;
      }
    } else {
      this.ghostMesh!.visible = false;
    }
  }

  private createGhostMesh(item: CatalogItem) {
    this.ghostMesh = new THREE.Group();
    this.ghostMesh.userData = { itemId: item.id };

    // Draw main transparent box bounding
    const geo = new THREE.BoxGeometry(item.size[0], item.size[1], item.size[2]);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.45,
      wireframe: false,
    });
    const mainBox = new THREE.Mesh(geo, mat);
    // Offset Y so pivot is at the absolute bottom of the furniture
    mainBox.position.y = item.size[1] / 2;
    this.ghostMesh.add(mainBox);

    // Add glowing wireframe edges
    const wireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x60a5fa, linewidth: 2 })
    );
    wireframe.position.y = item.size[1] / 2;
    this.ghostMesh.add(wireframe);

    this.scene.add(this.ghostMesh);
  }

  public clearGhost() {
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh = null;
    }
  }

  // ─── SPAWN ACTUAL PHYSICS OBJECT ────────────────────────────────
  public spawnItemAtGhost(activeItemId: string): PlacedProp | null {
    if (!this.ghostMesh || !this.ghostMesh.visible) return null;

    const item = this.getItemById(activeItemId);
    if (!item) return null;

    const uuid = 'prop_' + Math.random().toString(36).substr(2, 9);
    const position = { x: this.ghostMesh.position.x, y: this.ghostMesh.position.y, z: this.ghostMesh.position.z };
    const rotation = { x: this.ghostMesh.rotation.x, y: this.ghostMesh.rotation.y, z: this.ghostMesh.rotation.z };

    const propData: PlacedProp = { uuid, itemId: activeItemId, position, rotation };
    this.placedProps.push(propData);

    this.instantiatePropMesh(propData);
    this.saveToStorage();

    return propData;
  }

  public instantiatePropMesh(prop: PlacedProp) {
    const item = this.getItemById(prop.itemId);
    if (!item) return;

    const propGroup = new THREE.Group();
    propGroup.position.set(prop.position.x, prop.position.y, prop.position.z);
    propGroup.rotation.set(prop.rotation.x, prop.rotation.y, prop.rotation.z);
    propGroup.name = prop.uuid;
    propGroup.userData = { uuid: prop.uuid, itemId: prop.itemId };

    // Main styled mesh representation
    const geo = new THREE.BoxGeometry(item.size[0], item.size[1], item.size[2]);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(item.color),
      roughness: 0.65,
      metalness: item.category === 'appliances' ? 0.7 : 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = item.size[1] / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    propGroup.add(mesh);

    // Decorate specific meshes to make them look professional and detailed
    if (item.id === 'lcd_tv') {
      // Draw screen glass plane
      const screenGeo = new THREE.PlaneGeometry(item.size[0] - 0.05, item.size[1] - 0.05);
      const screenMat = new THREE.MeshStandardMaterial({ color: 0x010204, roughness: 0.15, metalness: 0.9 });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, item.size[1] / 2, item.size[2] / 2 + 0.01);
      propGroup.add(screen);
    } else if (item.id === 'standing_lamp') {
      // Add point light at bulb height
      const lampLight = new THREE.PointLight(0xffdf9e, 2.5, 8);
      lampLight.position.y = 1.6;
      lampLight.castShadow = false; // Disabled to avoid exceeding MAX_TEXTURE_IMAGE_UNITS
      propGroup.add(lampLight);

      // Emissive bulb shade
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 0.3, 8),
        new THREE.MeshBasicMaterial({ color: 0xfff0c4 })
      );
      shade.position.y = 1.6;
      propGroup.add(shade);
    } else if (item.id === 'double_bed') {
      // Add warm pillows
      const pilGeo = new THREE.BoxGeometry(0.7, 0.15, 0.5);
      const pilMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
      
      const pil1 = new THREE.Mesh(pilGeo, pilMat);
      pil1.position.set(-0.4, 0.75, -0.7);
      propGroup.add(pil1);

      const pil2 = new THREE.Mesh(pilGeo, pilMat);
      pil2.position.set(0.4, 0.75, -0.7);
      propGroup.add(pil2);
    } else if (item.id === 'couch_nova') {
      // Armrests
      const armMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.9), armMat);
      armL.position.set(-1.0, 0.4, 0);
      propGroup.add(armL);

      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.9), armMat);
      armR.position.set(1.0, 0.4, 0);
      propGroup.add(armR);
    } else if (item.id === 'luxury_fireplace') {
      // Hanging pipe chimney
      const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8);
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5, metalness: 0.8 });
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.position.set(0, 2.1, 0);
      pipe.castShadow = true;
      propGroup.add(pipe);

      // Low ember pot base
      const potGeo = new THREE.CylinderGeometry(0.45, 0.35, 0.6, 12);
      const pot = new THREE.Mesh(potGeo, pipeMat);
      pot.position.set(0, 0.3, 0);
      pot.castShadow = true;
      propGroup.add(pot);

      // Glowing Fire Embers
      const fireGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 }); // Orange flame
      const fire = new THREE.Mesh(fireGeo, fireMat);
      fire.position.set(0, 0.65, 0);
      propGroup.add(fire);

      // Real Fire point light
      const fireLight = new THREE.PointLight(0xf97316, 4.0, 10);
      fireLight.position.set(0, 0.7, 0);
      fireLight.castShadow = false; // Disabled to avoid exceeding MAX_TEXTURE_IMAGE_UNITS
      propGroup.add(fireLight);
    } else if (item.id === 'marble_island') {
      // Elegant gold trim border at the bottom
      const baseGeo = new THREE.BoxGeometry(1.9, 0.08, 0.9);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.9 }); // Brushed gold
      const goldBase = new THREE.Mesh(baseGeo, baseMat);
      goldBase.position.set(0, 0.04, 0);
      propGroup.add(goldBase);

      // Add 2 integrated bar stools at the back edge of the island (Z offset)
      const stoolGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.65, 8);
      const stoolMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const woodSeatGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8);
      const woodSeatMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.4 });

      for (let i = -0.5; i <= 0.5; i += 1.0) {
        const stoolLegs = new THREE.Mesh(stoolGeo, stoolMat);
        stoolLegs.position.set(i, 0.325, 0.5);
        propGroup.add(stoolLegs);

        const seat = new THREE.Mesh(woodSeatGeo, woodSeatMat);
        seat.position.set(i, 0.675, 0.5);
        propGroup.add(seat);
      }
    } else if (item.id === 'designer_chair') {
      // Sculpted velvet backrest wrapping around
      const backGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.5, 12, 1, true, -Math.PI / 2, Math.PI);
      const backMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.9 });
      const back = new THREE.Mesh(backGeo, backMat);
      back.position.set(0, 0.55, 0);
      back.rotation.y = Math.PI / 2;
      propGroup.add(back);

      // Gold base pedestal
      const pedGeo = new THREE.CylinderGeometry(0.06, 0.26, 0.3, 10);
      const pedMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.9 });
      const pedestal = new THREE.Mesh(pedGeo, pedMat);
      pedestal.position.set(0, 0.15, 0);
      propGroup.add(pedestal);
    } else if (item.id === 'pendant_led') {
      // Golden hanging cables
      const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4);
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.9 });
      
      const cableL = new THREE.Mesh(cableGeo, goldMat);
      cableL.position.set(-0.25, 1.0, 0);
      propGroup.add(cableL);

      const cableR = new THREE.Mesh(cableGeo, goldMat);
      cableR.position.set(0.25, 1.0, 0);
      propGroup.add(cableR);

      // LED Light Halo ring at bottom
      const ringGeo = new THREE.BoxGeometry(0.7, 0.08, 0.4);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff9e6 });
      const ring = new THREE.Mesh(ringGeo, lightMat);
      ring.position.set(0, 0.36, 0);
      propGroup.add(ring);

      // Real light emission
      const ringLight = new THREE.PointLight(0xfff5db, 3.8, 12);
      ringLight.position.set(0, 0.3, 0);
      ringLight.castShadow = false; // Disabled to avoid exceeding MAX_TEXTURE_IMAGE_UNITS
      propGroup.add(ringLight);
    } else if (item.id === 'potted_palm') {
      // Stylish geometric ceramic planter pot
      const potGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.55, 8);
      const potMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }); // White Gloss Stucco
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.set(0, 0.275, 0);
      pot.castShadow = true;
      propGroup.add(pot);

      // Wooden trunk
      const trunkGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.5, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.85 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(0, 1.1, 0);
      propGroup.add(trunk);

      // 6 Lush green leaves spreading star pattern
      const leafGeo = new THREE.BoxGeometry(0.8, 0.02, 0.25);
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        const angle = (i * Math.PI) / 3;
        leaf.position.set(Math.cos(angle) * 0.35, 1.8, Math.sin(angle) * 0.35);
        leaf.rotation.y = -angle;
        leaf.rotation.z = 0.35; // tilt downwards
        propGroup.add(leaf);
      }
    } else if (item.id === 'pool_chair') {
      // White and turquoise design padding stripes
      const padGeo = new THREE.BoxGeometry(0.66, 0.08, 0.5);
      const padMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 }); // Turquoise Accent
      
      const pad1 = new THREE.Mesh(padGeo, padMat);
      pad1.position.set(0, 0.25, 0.3);
      propGroup.add(pad1);

      // Tilted pillow head area
      const pillowGeo = new THREE.BoxGeometry(0.66, 0.14, 0.35);
      const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
      const pillow = new THREE.Mesh(pillowGeo, pillowMat);
      pillow.position.set(0, 0.35, -0.75);
      pillow.rotation.x = -0.3; // cozy incline
      propGroup.add(pillow);
    } else if (item.id === 'pool_ladder') {
      // 2 Stainless Steel curved pipes representing handrails
      const tubeGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
      const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
      
      const railL = new THREE.Mesh(tubeGeo, steelMat);
      railL.position.set(-0.25, 0.6, 0.2);
      propGroup.add(railL);

      const railR = new THREE.Mesh(tubeGeo, steelMat);
      railR.position.set(0.25, 0.6, 0.2);
      propGroup.add(railR);

      // Curved handles at the top
      const curveGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 16, Math.PI);
      
      const curveL = new THREE.Mesh(curveGeo, steelMat);
      curveL.position.set(-0.25, 1.2, 0);
      curveL.rotation.y = Math.PI / 2;
      propGroup.add(curveL);

      const curveR = new THREE.Mesh(curveGeo, steelMat);
      curveR.position.set(0.25, 1.2, 0);
      curveR.rotation.y = Math.PI / 2;
      propGroup.add(curveR);
    } else if (item.id === 'fitting_room') {
      const wallM = { color: 0xe6dfd5, roughness: 0.7, metalness: 0.02 };
      
      // Rear wall
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.0, 0.12), new THREE.MeshStandardMaterial(wallM));
      backWall.position.set(0, 1.5, -0.95);
      backWall.castShadow = true;
      backWall.receiveShadow = true;
      propGroup.add(backWall);

      // Lateral walls
      [-0.64, 0.64].forEach((x) => {
        const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.0, 2.0), new THREE.MeshStandardMaterial(wallM));
        sideWall.position.set(x, 1.5, 0);
        sideWall.castShadow = true;
        sideWall.receiveShadow = true;
        propGroup.add(sideWall);
      });

      // Curtain rod
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.42, 10), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.92, roughness: 0.1 }));
      rod.position.set(0, 2.55, 0.88);
      rod.rotation.z = Math.PI / 2;
      rod.castShadow = true;
      propGroup.add(rod);

      // Velvet Curtain
      const curtain = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.04), new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 0.95, side: THREE.DoubleSide }));
      curtain.position.set(0, 1.7, 0.88);
      curtain.castShadow = true;
      propGroup.add(curtain);

      // Mirror
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.04), new THREE.MeshStandardMaterial({ color: 0xc0c8d8, metalness: 0.85, roughness: 0.05 }));
      mirror.position.set(0, 1.3, -0.88);
      propGroup.add(mirror);

      // Gold hanger hook
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 }));
      hook.position.set(0.55, 1.8, -0.88);
      hook.rotation.x = Math.PI / 2;
      hook.castShadow = true;
      propGroup.add(hook);

      // Oak wood bench
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.36), new THREE.MeshStandardMaterial({ color: 0x3d2810, roughness: 0.6 }));
      bench.position.set(0, 0.22, -0.7);
      bench.castShadow = true;
      bench.receiveShadow = true;
      propGroup.add(bench);

      // Bench feet
      [
        [-0.45, 0.16],
        [0.45, 0.16],
        [-0.45, -0.16],
        [0.45, -0.16],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 8), new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.7 }));
        leg.position.set(lx, 0.16, -0.7 + lz);
        leg.castShadow = true;
        propGroup.add(leg);
      });
    } else if (item.id === 'caisse_ether') {
      // Counter body
      const counter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.05, 0.9), new THREE.MeshStandardMaterial({ color: 0x0e1520, roughness: 0.25, metalness: 0.6 }));
      counter.position.set(0, 0.52, 0);
      counter.castShadow = true;
      counter.receiveShadow = true;
      propGroup.add(counter);

      // Marble Top
      const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.07, 0.95), new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.12, metalness: 0.18 }));
      counterTop.position.set(0, 1.08, 0);
      counterTop.castShadow = true;
      counterTop.receiveShadow = true;
      propGroup.add(counterTop);

      // Gold vertical grooves
      [-1.1, -0.55, 0, 0.55, 1.1].forEach((rx) => {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.04), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.12 }));
        trim.position.set(rx, 0.5, -0.44);
        trim.castShadow = true;
        propGroup.add(trim);
      });

      // POS register unit
      const terminal = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.28), new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.15, metalness: 0.7 }));
      terminal.position.set(0.6, 1.25, 0.1);
      terminal.castShadow = true;
      propGroup.add(terminal);

      // Screen plane with blue self-emission
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.02), new THREE.MeshStandardMaterial({ color: 0x1a3a6b, emissive: 0x1a3a6b, emissiveIntensity: 0.6, roughness: 0.1 }));
      screen.position.set(0.6, 1.32, 0.25);
      propGroup.add(screen);

      // Card reader
      const reader = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.2), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.6 }));
      reader.position.set(-0.2, 1.18, 0.2);
      reader.castShadow = true;
      propGroup.add(reader);

      // Bags display
      const bags = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.1), new THREE.MeshStandardMaterial({ color: 0xbf5b00, roughness: 0.8 }));
      bags.position.set(-0.9, 1.2, 0.12);
      bags.castShadow = true;
      propGroup.add(bags);

      // Protective glass panel back
      const glass = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.7, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.02, metalness: 0.1 }));
      glass.position.set(0, 1.43, 0.44);
      propGroup.add(glass);
    } else if (item.id === 'mannequin_v') {
      // Base stand
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.85, roughness: 0.15 }));
      base.position.set(0, 0.02, 0);
      base.castShadow = true;
      propGroup.add(base);

      // Chrome vertical rod
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.88, roughness: 0.12 }));
      rod.position.set(0, 0.74, 0);
      rod.castShadow = true;
      propGroup.add(rod);

      // Torso core
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.55, 0.22), new THREE.MeshStandardMaterial({ color: 0xd4c8b0, roughness: 0.7 }));
      torso.position.set(0, 1.3, 0);
      torso.castShadow = true;
      propGroup.add(torso);

      // Outfit overlay
      const outfit = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.52, 0.18), new THREE.MeshStandardMaterial({ color: 0x1a3a6b, roughness: 0.8 }));
      outfit.position.set(0, 1.3, 0.01);
      outfit.castShadow = true;
      propGroup.add(outfit);

      // Shoulders
      [-0.24, 0.24].forEach((sx) => {
        const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), new THREE.MeshStandardMaterial({ color: 0xd4c8b0, roughness: 0.7 }));
        shoulder.position.set(sx, 1.56, 0);
        shoulder.castShadow = true;
        propGroup.add(shoulder);
      });

      // Neck joint
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0xd4c8b0, roughness: 0.7 }));
      neck.position.set(0, 1.62, 0);
      neck.castShadow = true;
      propGroup.add(neck);

      // Head sphere
      const dummyHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), new THREE.MeshStandardMaterial({ color: 0xd4c8b0, roughness: 0.65 }));
      dummyHead.position.set(0, 1.78, 0);
      dummyHead.castShadow = true;
      propGroup.add(dummyHead);

      // Hip base
      const hips = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.2), new THREE.MeshStandardMaterial({ color: 0x1a3a6b, roughness: 0.85 }));
      hips.position.set(0, 0.98, 0);
      hips.castShadow = true;
      propGroup.add(hips);
    } else if (item.id === 'neon_ether') {
      // Neon backing
      const backing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 0.06), new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0xa78bfa, emissiveIntensity: 0.8, roughness: 0.3 }));
      backing.position.set(0, 0.25, -0.02);
      propGroup.add(backing);

      // Real point light glow
      const light = new THREE.PointLight(0xa78bfa, 3.0, 10);
      light.position.set(0, 0.25, 0.1);
      propGroup.add(light);
    } else if (item.id === 'glass_panel') {
      const panelSize = [1.0, 3.0, 0.06];
      // Glass sheet
      const glass = new THREE.Mesh(new THREE.BoxGeometry(panelSize[0], panelSize[1], panelSize[2]), new THREE.MeshStandardMaterial({ color: 0x8ecae6, transparent: true, opacity: 0.18, roughness: 0.02, metalness: 0.1 }));
      glass.position.y = panelSize[1] / 2;
      glass.castShadow = true;
      propGroup.add(glass);

      // Metallic top & bottom trims
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(panelSize[0] + 0.05, 0.06, panelSize[2] + 0.04), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.88, roughness: 0.18 }));
      frameTop.position.set(0, panelSize[1], 0);
      propGroup.add(frameTop);

      const frameBot = new THREE.Mesh(new THREE.BoxGeometry(panelSize[0] + 0.05, 0.06, panelSize[2] + 0.04), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.88, roughness: 0.18 }));
      frameBot.position.set(0, 0, 0);
      propGroup.add(frameBot);

      // Sides frames
      const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, panelSize[1], panelSize[2] + 0.04), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.88, roughness: 0.18 }));
      frameLeft.position.set(-panelSize[0] / 2, panelSize[1] / 2, 0);
      propGroup.add(frameLeft);

      const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, panelSize[1], panelSize[2] + 0.04), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.88, roughness: 0.18 }));
      frameRight.position.set(panelSize[0] / 2, panelSize[1] / 2, 0);
      propGroup.add(frameRight);
    } else if (item.id === 'clothing_rack') {
      const length = 2.2;
      const half = length / 2;
      // Vertical chrome poles
      [-half + 0.04, half - 0.04].forEach((x) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 10), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.88, roughness: 0.15 }));
        pole.position.set(x, 0.85, 0);
        pole.castShadow = true;
        propGroup.add(pole);
      });

      // Ground wheels base
      [
        [-half + 0.04, -0.04, -0.3],
        [-half + 0.04, -0.04, 0.3],
        [half - 0.04, -0.04, -0.3],
        [half - 0.04, -0.04, 0.3],
      ].forEach((fp) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.85, roughness: 0.2 }));
        leg.position.set(fp[0], 0.04, fp[2]);
        leg.rotation.x = Math.PI / 2;
        leg.castShadow = true;
        propGroup.add(leg);
      });

      // Horizontal hanger bar
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, length, 10), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.88, roughness: 0.12 }));
      bar.position.set(0, 1.7, 0);
      bar.rotation.z = Math.PI / 2;
      bar.castShadow = true;
      propGroup.add(bar);

      // Dynamic boutique hanging shirts
      const clothesColors = [0x93c5fd, 0xfca5a5, 0x86efac, 0xfde047, 0xd8b4fe, 0xf7fee7];
      for (let i = 0; i < 6; i++) {
        const cx = -half + 0.35 + i * 0.3;
        const clothesColor = clothesColors[i % clothesColors.length];

        // Wire hanger
        const hanger = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 20, Math.PI), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.1 }));
        hanger.position.set(cx, 1.48, 0);
        hanger.castShadow = true;
        propGroup.add(hanger);

        const hangerHook = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.95, roughness: 0.05 }));
        hangerHook.position.set(cx, 1.62, 0);
        hangerHook.castShadow = true;
        propGroup.add(hangerHook);

        // Hanging garment
        const garment = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.12), new THREE.MeshStandardMaterial({ color: clothesColor, roughness: 0.85 }));
        garment.position.set(cx, 1.0, 0);
        garment.castShadow = true;
        propGroup.add(garment);
      }
    } else if (item.id === 'display_table') {
      // Wood tabletop
      const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.9), new THREE.MeshStandardMaterial({ color: 0x3d2810, roughness: 0.45, metalness: 0.05 }));
      tableTop.position.set(0, 0.72, 0);
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      propGroup.add(tableTop);

      // Heavy wood legs
      [
        [-0.72, 0.36, -0.38],
        [0.72, 0.36, -0.38],
        [-0.72, 0.36, 0.38],
        [0.72, 0.36, 0.38],
      ].forEach((lp) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 8), new THREE.MeshStandardMaterial({ color: 0x221105, roughness: 0.5 }));
        leg.position.set(lp[0], lp[1], lp[2]);
        leg.castShadow = true;
        propGroup.add(leg);
      });

      // Neatly folded clothes stacks
      const clothesColors = [0x93c5fd, 0xfca5a5, 0x86efac, 0xfde047, 0xd8b4fe, 0xf7fee7];
      for (let i = 0; i < 4; i++) {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const px = (col - 0.5) * 0.7;
        const pz = (row - 0.5) * 0.45;
        const py = 0.75;

        const clothesColor = clothesColors[i % clothesColors.length];

        for (let s = 0; s < 3; s++) {
          const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.32), new THREE.MeshStandardMaterial({ color: clothesColor, roughness: 0.9 }));
          shirt.position.set(px, py + s * 0.055, pz);
          shirt.castShadow = true;
          propGroup.add(shirt);
        }
      }
    } else if (item.id === 'wall_shelf') {
      const shelfWidth = 2.0;
      // Main shelf plank
      const plank = new THREE.Mesh(new THREE.BoxGeometry(shelfWidth, 0.05, 0.38), new THREE.MeshStandardMaterial({ color: 0x2a1a08, roughness: 0.5 }));
      plank.position.y = 0.15;
      plank.castShadow = true;
      plank.receiveShadow = true;
      propGroup.add(plank);

      // Gold support brackets
      [-shelfWidth / 2 + 0.2, shelfWidth / 2 - 0.2].forEach((bx) => {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.3), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.88, roughness: 0.15 }));
        bracket.position.set(bx, 0.06, -0.04);
        bracket.castShadow = true;
        propGroup.add(bracket);
      });

      // Storage boxes on top
      const boxColors = [0x0f172a, 0xffffff, 0xb91c1c, 0xf59e0b];
      for (let i = 0; i < 4; i++) {
        const bx = -shelfWidth / 2 + 0.32 + i * 0.45;
        const boxColor = boxColors[i % boxColors.length];

        const shoeBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.28), new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.8 }));
        shoeBox.position.set(bx, 0.275, 0);
        shoeBox.castShadow = true;
        propGroup.add(shoeBox);
      }
    }

    this.scene.add(propGroup);
    this.spawnedPropsMap.set(prop.uuid, propGroup);
  }

  // ─── GMOD BUILD MODE: SELECTION / HOVERING OBJECTS ───────────────
  public performSelectionHover(rayOrigin: THREE.Vector3, rayDirection: THREE.Vector3) {
    this.raycaster.set(rayOrigin, rayDirection);
    
    // Search placed props in scene
    const meshesToIntersect: THREE.Object3D[] = [];
    this.spawnedPropsMap.forEach(group => {
      // add direct child mesh
      group.children.forEach(child => meshesToIntersect.push(child));
    });

    const intersects = this.raycaster.intersectObjects(meshesToIntersect, true);

    if (intersects.length > 0) {
      let hitObj: THREE.Object3D | null = intersects[0].object;
      // Climbs up to find the group containing the uuid
      while (hitObj && !this.spawnedPropsMap.has(hitObj.name)) {
        hitObj = hitObj.parent;
      }

      if (hitObj && hitObj.name) {
        const uuid = hitObj.name;
        if (this.selectedPropUuid !== uuid) {
          this.selectedPropUuid = uuid;
          this.drawHighlight(hitObj);
        }
        return;
      }
    }

    // Clears if raycast hits nothing
    this.clearSelection();
  }

  private drawHighlight(obj: THREE.Object3D) {
    this.removeHighlightMesh();
    // Glowing orange/yellow helper around the placed object (Classic GMod look)
    this.selectedHighlightMesh = new THREE.BoxHelper(obj, 0xf97316);
    this.scene.add(this.selectedHighlightMesh);
  }

  public removeHighlightMesh() {
    if (this.selectedHighlightMesh) {
      this.scene.remove(this.selectedHighlightMesh);
      this.selectedHighlightMesh = null;
    }
  }

  public clearSelection() {
    this.selectedPropUuid = null;
    this.removeHighlightMesh();
  }

  // ─── GMOD ERASE: REMOVE A SPAWNED PROP ───────────────────────────
  public removeSelectedProp(): boolean {
    if (!this.selectedPropUuid) return false;

    const group = this.spawnedPropsMap.get(this.selectedPropUuid);
    if (group) {
      this.scene.remove(group);
      this.spawnedPropsMap.delete(this.selectedPropUuid);
      
      // Filter array
      this.placedProps = this.placedProps.filter(p => p.uuid !== this.selectedPropUuid);
      this.clearSelection();
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // ─── PERSISTENCE LAYERS (LOCAL STORAGE) ──────────────────────────
  public saveToStorage() {
    try {
      localStorage.setItem('etherworld_city_props', JSON.stringify(this.placedProps));
    } catch (e) {
      console.warn('Could not save props to storage:', e);
    }
  }

  public loadFromStorage() {
    try {
      const data = localStorage.getItem('etherworld_city_props');
      if (data) {
        this.placedProps = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Could not load props from storage:', e);
    }
  }

  public instantiateAllStoredProps() {
    this.placedProps.forEach(prop => {
      this.instantiatePropMesh(prop);
    });
  }

  // Returns physical boundaries of spawned props to register for character collisions
  public getPropCollisionBoxes(): THREE.Box3[] {
    const boxes: THREE.Box3[] = [];
    this.spawnedPropsMap.forEach(group => {
      const colBox = new THREE.Box3().setFromObject(group);
      boxes.push(colBox);
    });
    return boxes;
  }
}
