private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  public readonly catalog: PropData[] = [];
  public onPropsChanged: (() => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeCatalog();
  }

  private initializeCatalog(): void {
    const categories: { name: PropCategory; label: string }[] = [
      { name: 'meubles', label: 'Meubles' },
      { name: 'decor', label: 'Décor' },
      { name: 'appareils', label: 'Appareils' },
      { name: 'exterieur', label: 'Extérieur' },
      { name: 'construction', label: 'Construction' },
      { name: 'business', label: 'Business' },
      { name: 'utilitaire', label: 'Utilitaire' },
    ];

    const props: PropData[] = [
      // Meubles
      { id: 'table_wood', name: 'Table en bois', category: 'meubles', size: { x: 1.5, y: 0.8, z: 0.8 }, color: 0x8a6a4a, price: 150, description: 'Table en bois massif', collidable: true, snapToWall: false, allowedZones: ['interior'] },
      { id: 'chair', name: 'Chaise', category: 'meubles', size: { x: 0.5, y: 0.9, z: 0.5 }, color: 0x6a4a2a, price: 80, description: 'Chaise confortable', collidable: true, snapToWall: false, allowedZones: ['interior'] },
      { id: 'sofa', name: 'Canapé', category: 'meubles', size: { x: 2.0, y: 0.8, z: 0.7 }, color: 0x445566, price: 350, description: 'Canapé 3 places', collidable: true, snapToWall: true, allowedZones: ['interior'] },
      { id: 'bed', name: 'Lit', category: 'meubles', size: { x: 1.8, y: 0.5, z: 2.0 }, color: 0xeeddcc, price: 400, description: 'Lit double', collidable: true, snapToWall: true, allowedZones: ['interior'] },
      { id: 'bookshelf', name: 'Bibliothèque', category: 'meubles', size: { x: 0.8, y: 2.0, z: 0.4 }, color: 0x6a4a2a, price: 200, description: 'Bibliothèque 5 étagères', collidable: true, snapToWall: true, allowedZones: ['interior'] },
      { id: 'desk', name: 'Bureau', category: 'meubles', size: { x: 1.2, y: 0.75, z: 0.6 }, color: 0x5a3a1a, price: 180, description: 'Bureau avec tiroirs', collidable: true, snapToWall: true, allowedZones: ['interior'] },
      { id: 'wardrobe', name: 'Armoire', category: 'meubles', size: { x: 1.0, y: 2.2, z: 0.6 }, color: 0x7a5a3a, price: 300, description: 'Grande armoire', collidable: true, snapToWall: true, allowedZones: ['interior'] },
      { id: 'table_basse', name: 'Table basse', category: 'meubles', size: { x: 1.0, y: 0.4, z: 0.6 }, color: 0x6a5a4a, price: 120, description: 'Table basse en verre', collidable: true, snapToWall: false, allowedZones: ['interior'] },

      // Décor
      { id: 'plant_pot', name: 'Plante en pot', category: 'decor', size: { x: 0.4, y: 1.0, z: 0.4 }, color: 0x3a7a2a, price: 60, description: 'Plante verte décorative', collidable: true, snapToWall: false, allowedZones: ['interior', 'exterior'] },
      { id: 'rug', name: 'Tapis', category: 'decor', size: { x: 1.5, y: 0.05, z: 1.0 }, color: 0x884422, price: 90, description: 'Tapis épais', collidable: false, snapToWall: false, allowedZones: ['interior'] },
      { id: 'painting', name: 'Tableau', category: 'decor', size: { x: 0.6, y: 0.4, z: 0.05 }, color: 0xccaa88, price: 110, description: 'Tableau décoratif', collidable: false, snapToWall: true, allowedZones: ['interior'] },
      { id: 'lamp_floor', name: 'Lampadaire', category: 'decor', size: { x: 0.3, y: 1.8, z: 0.3 }, color: 0xddccaa, price: 130, description: 'Lampadaire d\'intérieur', collidable: true, snapToWall: false, allowedZones: ['interior'] },
      { id: 'clock_wall', name: 'Horloge murale', category: 'decor', size: { x: 0.3, y: 0.3, z: 0.05 }, color: 0x886644, price: 70, description: 'Horloge murale', collidable: false, snapToWall: true, allowedZones: ['interior'] },
      { id: 'vase', name: 'Vase décoratif', category: 'decor', size: { x: 0.2, y: 0.4, z: 0.2 }, color: 0x44aacc, price: 50, description: 'Vase en céramique', collidable: true, snapToWall: false, allowedZones: ['interior'] },

      // Appareils
      { id: 'fridge', name: 'Réfrigérateur', category: 'appareils', size: { x: 0.7, y: 1.8, z: 0.6 }, color: 0xeeeeee, price: 500, description: 'Réfrigérateur moderne', collidable: true, snapToWall: true, allowedZones: ['interior'] },
      { id: 'oven', name: 'Four', category: 'appareils', size: { x: 0.6, y: 0.8, z: 0.6 }, color: 0xcccccc, price: 350, description: 'Four électrique', collidable: true, snapToWall: true, allowedZones: ['interior'] },
      { id: 'tv', name: 'Télévision', category: 'appareils', size: { x: 1.2, y: 0.7, z: 0.08 }, color: 0x111111, price: 600, description: 'TV écran plat 55"', collidable: false, snapToWall: true, allowedZones: ['interior'] },
      { id: 'washing_machine', name: 'Machine à laver', category: 'appareils', size: { x: 0.6, y: 0.85, z: 0.6 }, color: 0xffffff, price: 400, description: 'Lave-linge', collidable: true, snapToWall: true, allowedZones: ['interior'] },
      { id: 'computer', name: 'Ordinateur', category: 'appareils', size: { x: 0.4, y: 0.4, z: 0.4 }, color: 0x222233, price: 800, description: 'Poste de travail', collidable: true, snapToWall: false, allowedZones: ['interior', 'business'] },

      // Extérieur
      { id: 'garden_table', name: 'Table de jardin', category: 'exterieur', size: { x: 1.2, y: 0.7, z: 0.7 }, color: 0x8a7a5a, price: 120, description: 'Table de jardin pliante', collidable: true, snapToWall: false, allowedZones: ['exterior', 'land'] },
      { id: 'bbq', name: 'Barbecue', category: 'exterieur', size: { x: 0.8, y: 0.9, z: 0.5 }, color: 0x555555, price: 200, description: 'Barbecue charbon', collidable: true, snapToWall: false, allowedZones: ['exterior', 'land'] },
      { id: 'fence_section', name: 'Section clôture', category: 'exterieur', size: { x: 2.0, y: 1.0, z: 0.1 }, color: 0x6a5a4a, price: 80, description: 'Panneau de clôture bois', collidable: true, snapToWall: false, allowedZones: ['exterior', 'land'] },
      { id: 'flower_bed', name: 'Parterre de fleurs', category: 'exterieur', size: { x: 1.0, y: 0.3, z: 0.5 }, color: 0xdd4488, price: 60, description: 'Parterre fleuri', collidable: false, snapToWall: false, allowedZones: ['exterior', 'land'] },
      { id: 'bench_outdoor', name: 'Banc extérieur', category: 'exterieur', size: { x: 1.5, y: 0.5, z: 0.5 }, color: 0x5a4a3a, price: 150, description: 'Banc en bois', collidable: true, snapToWall: false, allowedZones: ['exterior', 'land'] },
      { id: 'garden_light', name: 'Lumière de jardin', category: 'exterieur', size: { x: 0.15, y: 0.6, z: 0.15 }, color: 0xddaa44, price: 45, description: 'Borne lumineuse solaire', collidable: true, snapToWall: false, allowedZones: ['exterior', 'land'] },

      // Construction
      { id: 'wall_section', name: 'Mur (section)', category: 'construction', size: { x: 2.0, y: 2.8, z: 0.2 }, color: 0xcccccc, price: 250, description: 'Section de mur intérieur', collidable: true, snapToWall: false, allowedZones: ['interior', 'land', 'construction'] },
      { id: 'floor_tile', name: 'Dalle de sol', category: 'construction', size: { x: 1.0, y: 0.05, z: 1.0 }, color: 0xbbaa99, price: 40, description: 'Dalle de sol carrelage', collidable: false, snapToWall: false, allowedZones: ['interior', 'land'] },
      { id: 'pillar', name: 'Pilier', category: 'construction', size: { x: 0.3, y: 2.8, z: 0.3 }, color: 0x999999, price: 120, description: 'Pilier de soutien', collidable: true, snapToWall: false, allowedZones: ['interior', 'land', 'construction'] },
      { id: 'stair', name: 'Escalier', category: 'construction', size: { x: 1.0, y: 0.3, z: 1.2 }, color: 0x8a7a6a, price: 200, description: 'Bloc d\'escalier', collidable: true, snapToWall: false, allowedZones: ['interior', 'land'] },
      { id: 'roof_section', name: 'Section toit', category: 'construction', size: { x: 2.0, y: 0.1, z: 2.0 }, color: 0x6a5a4a, price: 180, description: 'Panneau de toiture', collidable: false, snapToWall: false, allowedZones: ['land', 'construction'] },
      { id: 'door_frame', name: 'Cadre de porte', category: 'construction', size: { x: 0.9, y: 2.2, z: 0.1 }, color: 0x6a4a2a, price: 150, description: 'Cadre avec porte intérieure', collidable: true, snapToWall: false, allowedZones: ['interior', 'construction'] },

      // Business
      { id: 'cash_register', name: 'Caisse enregistreuse', category: 'business', size: { x: 0.4, y: 0.3, z: 0.3 }, color: 0x444444, price: 300, description: 'Point de vente', collidable: true, snapToWall: false, allowedZones: ['business', 'interior'] },
      { id: 'shelf_display', name: 'Présentoir', category: 'business', size: { x: 1.5, y: 1.8, z: 0.4 }, color: 0xccbbaa, price: 250, description: 'Présentoir de marchandises', collidable: true, snapToWall: true, allowedZones: ['business', 'interior'] },
      { id: 'counter', name: 'Comptoir', category: 'business', size: { x: 2.0, y: 1.0, z: 0.6 }, color: 0x8a7a6a, price: 400, description: 'Comptoir d\'accueil', collidable: true, snapToWall: true, allowedZones: ['business', 'interior'] },
      { id: 'sign_business', name: 'Enseigne', category: 'business', size: { x: 1.5, y: 0.5, z: 0.05 }, color: 0xffee00, price: 200, description: 'Enseigne lumineuse', collidable: false, snapToWall: true, allowedZones: ['business', 'exterior'] },
      { id: 'display_rack', name: 'Portant vêtements', category: 'business', size: { x: 1.0, y: 1.5, z: 0.6 }, color: 0x888888, price: 180, description: 'Portant de présentation', collidable: true, snapToWall: false, allowedZones: ['business', 'interior'] },

      // Utilitaire
      { id: 'barrel', name: 'Baril', category: 'utilitaire', size: { x: 0.5, y: 0.8, z: 0.5 }, color: 0x445566, price: 30, description: 'Baril de stockage', collidable: true, snapToWall: false, allowedZones: ['exterior', 'industrial', 'land'] },
      { id: 'pallet', name: 'Palette', category: 'utilitaire', size: { x: 1.0, y: 0.15, z: 1.0 }, color: 0x6a5a3a, price: 25, description: 'Palette de manutention', collidable: true, snapToWall: false, allowedZones: ['industrial', 'exterior'] },
      { id: 'crate', name: 'Caisse', category: 'utilitaire', size: { x: 0.6, y: 0.5, z: 0.6 }, color: 0x7a6a4a, price: 20, description: 'Caisse en bois', collidable: true, snapToWall: false, allowedZones: ['industrial', 'exterior', 'land'] },
      { id: 'toolbox', name: 'Caisse à outils', category: 'utilitaire', size: { x: 0.4, y: 0.3, z: 0.3 }, color: 0xcc4422, price: 60, description: 'Caisse à outils professionnelle', collidable: true, snapToWall: false, allowedZones: ['industrial', 'interior', 'garage'] },
      { id: 'workbench', name: 'Établi', category: 'utilitaire', size: { x: 1.5, y: 0.9, z: 0.7 }, color: 0x5a4a3a, price: 200, description: 'Établi de travail', collidable: true, snapToWall: true, allowedZones: ['industrial', 'garage', 'interior'] },
      { id: 'oil_drum', name: 'Fût d\'huile', category: 'utilitaire', size: { x: 0.4, y: 0.7, z: 0.4 }, color: 0x334466, price: 50, description: 'Fût d\'huile moteur', collidable: true, snapToWall: false, allowedZones: ['industrial', 'garage'] },
    ];

    this.catalog.push(...props);
  }

  /** Active le mode builder */
  activate(): void {
    this.isActive = true;
  }

  /** Désactive le mode builder */
  deactivate(): void {
    this.isActive = false;
    this.removeGhost();
    this.currentProp = null;
    this.selectedPropId = null;
  }

  /** Sélectionne un prop du catalogue */
  selectProp(propId: string): void {
    const prop = this.catalog.find((p) => p.id === propId);
    if (!prop) return;
    this.currentProp = prop;
    this.currentRotation = 0;
    this.selectedPropId = null;
  }

  /** Désélectionne le prop actif */
  deselectProp(): void {
    this.currentProp = null;
    this.removeGhost();
  }

  /** Met à jour le ghost (prévisualisation) */
  updateGhost(camera: THREE.PerspectiveCamera): void {
    if (!this.currentProp || !this.isActive) {
      this.removeGhost();
      return;
    }

    this.removeGhost();

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const intersectPoint = new THREE.Vector3();
    const ray = this.raycaster.ray;
    const hitGround = ray.intersectPlane(this.groundPlane, intersectPoint);

    if (hitGround) {
      const snap = this.snapSize;
      const snappedX = Math.round(intersectPoint.x / snap) * snap;
      const snappedZ = Math.round(intersectPoint.z / snap) * snap;

      const geo = new THREE.BoxGeometry(
        this.currentProp.size.x,
        this.currentProp.size.y,
        this.currentProp.size.z,
      );
      const mat = MaterialsFactory.getPropGhost();
      this.ghostMesh = new THREE.Mesh(geo, mat);
      this.ghostMesh.position.set(snappedX, this.currentProp.size.y / 2, snappedZ);
      this.ghostMesh.rotation.y = this.currentRotation;
      this.ghostMesh.name = 'ghost_preview';
      this.scene.add(this.ghostMesh);
    }
  }

  /** Place le prop courant */
  placeProp(propertyId: string, playerId: string): PlacedProp | null {
    if (!this.currentProp || !this.ghostMesh) return null;

    const pos = this.ghostMesh.position;
    const placed: PlacedProp = {
      id: `placed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      propId: this.currentProp.id,
      propertyId,
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotation: this.currentRotation,
      scale: { x: 1, y: 1, z: 1 },
      color: this.currentProp.color,
      placedBy: playerId,
    };

    this.placedProps.set(placed.id, placed);
    this.addPlacedMesh(placed);

    if (this.onPropsChanged) this.onPropsChanged();
    return placed;
  }

  /** Ajoute le mesh d'un prop placé dans la scène */
  private addPlacedMesh(prop: PlacedProp): void {
    const catalogProp = this.catalog.find((p) => p.id === prop.propId);
    if (!catalogProp) return;

    const mat = new THREE.MeshStandardMaterial({
      color: prop.color,
      roughness: 0.7,
      metalness: 0.2,
    });
    const geo = new THREE.BoxGeometry(
      catalogProp.size.x * prop.scale.x,
      catalogProp.size.y * prop.scale.y,
      catalogProp.size.z * prop.scale.z,
    );
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(prop.position.x, prop.position.y, prop.position.z);
    mesh.rotation.y = prop.rotation;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.placedPropId = prop.id;
    mesh.name = `placed_prop_${prop.id}`;
    this.scene.add(mesh);
  }

  /** Supprime un prop placé */
  removeProp(propId: string): boolean {
    if (!this.placedProps.has(propId)) return false;
    this.placedProps.delete(propId);

    // Supprimer le mesh correspondant
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj.userData.placedPropId === propId) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach((obj) => {
      this.scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    if (this.onPropsChanged) this.onPropsChanged();
    return true;
  }

  /** Supprime le ghost */
  removeGhost(): void {
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh.geometry.dispose();
      (this.ghostMesh.material as THREE.Material).dispose();
      this.ghostMesh = null;
    }
  }

  /** Fait pivoter le prop courant */
  rotate(angle: number = Math.PI / 4): void {
    this.currentRotation += angle;
    if (this.ghostMesh) {
      this.ghostMesh.rotation.y = this.currentRotation;
    }
  }

  /** Réinitialise tous les props d'une propriété */
  resetPropertyProps(propertyId: string): void {
    const toRemove: string[] = [];
    for (const [id, prop] of this.placedProps) {
      if (prop.propertyId === propertyId) {
        toRemove.push(id);
      }
    }
    toRemove.forEach((id) => this.removeProp(id));
  }

  /** Sélectionne un prop existant */
  selectPlacedProp(propId: string): void {
    this.selectedPropId = propId;
  }

  /** Change la taille du snap */
  setSnapSize(size: number): void {
    this.snapSize = size;
  }

  /** Récupère les props d'une propriété */
  getPropertyProps(propertyId: string): PlacedProp[] {
    return Array.from(this.placedProps.values()).filter(
      (p) => p.propertyId === propertyId,
    );
  }

  /** Sauvegarde les props pour export */
  exportProps(): PlacedProp[] {
    return Array.from(this.placedProps.values());
  }

  /** Importe des props sauvegardés */
  importProps(props: PlacedProp[]): void {
    for (const prop of props) {
      if (!this.placedProps.has(prop.id)) {
        this.placedProps.set(prop.id, prop);
        this.addPlacedMesh(prop);
      }
    }
  }
}