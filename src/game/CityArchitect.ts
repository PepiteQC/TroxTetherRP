import * as THREE from 'three';

export interface UrbanInteractiveElement {
  id: string;
  type: 'door' | 'light_switch';
  mesh: THREE.Object3D;
  parentGroup: THREE.Group;
  userData: any;
}

export class CityArchitect {
  private textures: Record<string, THREE.CanvasTexture> = {};
  private materials: Record<string, THREE.Material> = {};
  public streetlights: THREE.Group[] = [];
  public houseGroups: THREE.Group[] = [];
  public interactables: UrbanInteractiveElement[] = [];
  public collisionBoxes: THREE.Box3[] = [];
  public baseColliders: THREE.Box3[] = [];
  public boutiqueClothes: any[] = [];
  
  // Quebec Portneuf Scenery Animations & Pos
  public windmillSails: THREE.Group | null = null;
  public lighthouseBeam: THREE.Group | null = null;
  public cantineWorldPos: THREE.Vector3 = new THREE.Vector3(-10, 0.5, -15);

  constructor(private scene: THREE.Scene) {
    this.generateProceduralTextures();
    this.createMaterials();
  }

  // ─── GENERATE HD PROCEDURAL TEXTURES VIA CANVAS ──────────────────
  private generateProceduralTextures() {
    const createTexture = (size: number, drawFn: (ctx: CanvasRenderingContext2D, s: number) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawFn(ctx, size);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      return tex;
    };

    // Asphalt texture: Dark grainy background with cracks and road wear
    this.textures.asphalt = createTexture(1024, (ctx, s) => {
      ctx.fillStyle = '#1e2124';
      ctx.fillRect(0, 0, s, s);
      
      // Noise grain
      for (let i = 0; i < 60000; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const intensity = Math.random() * 15;
        ctx.fillStyle = `rgba(${intensity}, ${intensity}, ${intensity + 5}, 0.12)`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      // Asphalt cracks (GTA V style)
      ctx.strokeStyle = 'rgba(10, 10, 10, 0.4)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        let x = Math.random() * s;
        let y = Math.random() * s;
        ctx.moveTo(x, y);
        const steps = 10 + Math.random() * 10;
        for (let j = 0; j < steps; j++) {
          x += (Math.random() - 0.5) * 35;
          y += (Math.random() - 0.5) * 35;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    });

    // Concrete Sidewalk texture: Grey panels with tile joint lines
    this.textures.concrete = createTexture(512, (ctx, s) => {
      ctx.fillStyle = '#a0aab5';
      ctx.fillRect(0, 0, s, s);

      // Panel borders
      ctx.strokeStyle = 'rgba(50, 55, 65, 0.35)';
      ctx.lineWidth = 5;
      ctx.strokeRect(0, 0, s, s);
      ctx.beginPath();
      ctx.moveTo(s / 2, 0);
      ctx.lineTo(s / 2, s);
      ctx.stroke();

      // Granite specks and noise
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const colorVal = 180 + Math.random() * 50;
        ctx.fillStyle = `rgba(${colorVal}, ${colorVal}, ${colorVal}, 0.15)`;
        ctx.fillRect(x, y, 2, 2);
      }
    });

    // Wood Floor texture: Warm floorboards with elegant woodgrain lines
    this.textures.wood = createTexture(512, (ctx, s) => {
      ctx.fillStyle = '#614126';
      ctx.fillRect(0, 0, s, s);

      // Planks
      const plankHeight = s / 8;
      ctx.strokeStyle = '#422a16';
      ctx.lineWidth = 3;
      for (let i = 0; i <= 8; i++) {
        const y = i * plankHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();

        // Vertical plank joints (staggered)
        if (i < 8) {
          const shift = (i % 2) * (s / 4);
          for (let j = 1; j <= 4; j++) {
            const x = (j * (s / 3) + shift) % s;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + plankHeight);
            ctx.stroke();
          }
        }
      }

      // Add wood grain curls
      ctx.strokeStyle = 'rgba(40, 20, 5, 0.1)';
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 12; k++) {
        const y = Math.random() * s;
        ctx.beginPath();
        ctx.arc(s / 2, y, 60 + Math.random() * 100, 0, Math.PI * 0.4);
        ctx.stroke();
      }
    });

    // Elegant Ceramic Tile texture (for modern lofts/bathrooms)
    this.textures.tile = createTexture(256, (ctx, s) => {
      ctx.fillStyle = '#e5ecef';
      ctx.fillRect(0, 0, s, s);

      ctx.strokeStyle = '#9caeb8';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, s, s);

      // Highlights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(5, 5, s - 10, 10);
      ctx.fillRect(5, 5, 10, s - 10);
    });

    // Stucco texture for exterior walls
    this.textures.stucco = createTexture(512, (ctx, s) => {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, s, s);

      for (let i = 0; i < 30000; i++) {
        const x = Math.random() * s;
        const y = Math.random() * s;
        const bright = Math.random() > 0.5 ? 255 : 180;
        ctx.fillStyle = `rgba(${bright}, ${bright}, ${bright}, 0.18)`;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }

  // ─── DEFINE MATERIALS WITH PROPER VALUES ─────────────────────────
  private createMaterials() {
    this.textures.asphalt.repeat.set(10, 10);
    this.materials.asphalt = new THREE.MeshStandardMaterial({
      map: this.textures.asphalt,
      roughness: 0.9,
      metalness: 0.1,
    });

    this.textures.concrete.repeat.set(5, 5);
    this.materials.sidewalk = new THREE.MeshStandardMaterial({
      map: this.textures.concrete,
      roughness: 0.82,
      metalness: 0.05,
    });

    this.textures.wood.repeat.set(4, 4);
    this.materials.woodFloor = new THREE.MeshStandardMaterial({
      map: this.textures.wood,
      roughness: 0.5,
      metalness: 0.1,
    });

    this.textures.tile.repeat.set(4, 4);
    this.materials.tileFloor = new THREE.MeshStandardMaterial({
      map: this.textures.tile,
      roughness: 0.25,
      metalness: 0.2,
    });

    this.textures.stucco.repeat.set(2, 2);
    this.materials.stuccoWall = new THREE.MeshStandardMaterial({
      map: this.textures.stucco,
      roughness: 0.85,
    });

    this.materials.curb = new THREE.MeshStandardMaterial({
      color: 0x7a8690,
      roughness: 0.7,
    });

    this.materials.glass = new THREE.MeshPhysicalMaterial({
      color: 0xe2f1f8,
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });

    this.materials.doorFrame = new THREE.MeshStandardMaterial({
      color: 0x3d2b1f,
      roughness: 0.75,
    });

    this.materials.grassField = new THREE.MeshStandardMaterial({
      color: 0x2e4a21,
      roughness: 0.95,
      metalness: 0.0,
    });
  }

  // ─── BUILD THE STREET NETWORK (2 RUES PERPENDICULAIRES) ──────────
  public buildStreetNetwork() {
    // 1. Grass ground plane (X:-200 to 200, Z:-200 to 200)
    const grassGeo = new THREE.PlaneGeometry(350, 350);
    const grass = new THREE.Mesh(grassGeo, this.materials.grassField);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    grass.name = "grass_ground";
    this.scene.add(grass);

    // 2. Main Avenue (Avenue des Alliés) -> X axis, width 14m
    const roadWidth = 14;
    const road1Geo = new THREE.PlaneGeometry(350, roadWidth);
    const road1 = new THREE.Mesh(road1Geo, this.materials.asphalt);
    road1.rotation.x = -Math.PI / 2;
    road1.position.set(0, 0.01, 0); // slightly above grass to prevent z-fighting
    road1.receiveShadow = true;
    road1.name = "Avenue des Alliés";
    this.scene.add(road1);

    // 3. Side Street (Rue de la République) -> Z axis, width 12m
    const roadWidth2 = 12;
    const road2Geo = new THREE.PlaneGeometry(roadWidth2, 350);
    const road2 = new THREE.Mesh(road2Geo, this.materials.asphalt);
    road2.rotation.x = -Math.PI / 2;
    road2.position.set(0, 0.012, 0); // slightly above road1 to merge
    road2.receiveShadow = true;
    road2.name = "Rue de la République";
    this.scene.add(road2);

    // 4. Ground markings (GTA dashed yellow line + solid white borders)
    this.buildRoadMarkings(roadWidth, roadWidth2);

    // 5. Build Sidewalks & Curbs
    this.buildSidewalks(roadWidth, roadWidth2);

    // 6. Build Quebec Highway 138 Signs & Landscaping
    this.buildQuebecHighwaySigns();
  }

  private buildRoadMarkings(w1: number, w2: number) {
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    // Road 1 (Avenue des Alliés) Yellow Center dashes
    const dashGeo = new THREE.PlaneGeometry(5, 0.2);
    for (let x = -170; x < 170; x += 12) {
      if (Math.abs(x) < w2 / 2 + 2) continue; // skip intersection
      const dash = new THREE.Mesh(dashGeo, yellowMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.02, 0);
      this.scene.add(dash);
    }

    // Road 1 White side borders
    const whiteLine1Geo = new THREE.PlaneGeometry(350, 0.15);
    const border1Top = new THREE.Mesh(whiteLine1Geo, whiteMat);
    border1Top.rotation.x = -Math.PI / 2;
    border1Top.position.set(0, 0.02, w1 / 2 - 0.2);
    this.scene.add(border1Top);

    const border1Bot = new THREE.Mesh(whiteLine1Geo, whiteMat);
    border1Bot.rotation.x = -Math.PI / 2;
    border1Bot.position.set(0, 0.02, -w1 / 2 + 0.2);
    this.scene.add(border1Bot);

    // Road 2 (Rue de la République) Yellow Center dashes
    const dashVGeo = new THREE.PlaneGeometry(0.2, 5);
    for (let z = -170; z < 170; z += 12) {
      if (Math.abs(z) < w1 / 2 + 2) continue; // skip intersection
      const dash = new THREE.Mesh(dashVGeo, yellowMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.021, z);
      this.scene.add(dash);
    }
  }

  private buildSidewalks(w1: number, w2: number) {
    const swWidth = 3.5;
    const swHeight = 0.25;

    // We build sidewalk rectangular quadrants around the intersection
    // Quadrant top-right: X > w2/2, Z > w1/2
    this.createSidewalkBlock(w2 / 2 + 80, swHeight / 2, w1 / 2 + swWidth / 2, 160, swHeight, swWidth);
    this.createSidewalkBlock(w2 / 2 + swWidth / 2, swHeight / 2, w1 / 2 + 80, swWidth, swHeight, 160);

    // Quadrant top-left: X < -w2/2, Z > w1/2
    this.createSidewalkBlock(-(w2 / 2 + 80), swHeight / 2, w1 / 2 + swWidth / 2, 160, swHeight, swWidth);
    this.createSidewalkBlock(-(w2 / 2 + swWidth / 2), swHeight / 2, w1 / 2 + 80, swWidth, swHeight, 160);

    // Quadrant bottom-right: X > w2/2, Z < -w1/2
    this.createSidewalkBlock(w2 / 2 + 80, swHeight / 2, -(w1 / 2 + swWidth / 2), 160, swHeight, swWidth);
    this.createSidewalkBlock(w2 / 2 + swWidth / 2, swHeight / 2, -(w1 / 2 + 80), swWidth, swHeight, 160);

    // Quadrant bottom-left: X < -w2/2, Z < -w1/2
    this.createSidewalkBlock(-(w2 / 2 + 80), swHeight / 2, -(w1 / 2 + swWidth / 2), 160, swHeight, swWidth);
    this.createSidewalkBlock(-(w2 / 2 + swWidth / 2), swHeight / 2, -(w1 / 2 + 80), swWidth, swHeight, 160);
  }

  private createSidewalkBlock(x: number, y: number, z: number, w: number, h: number, d: number) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const sw = new THREE.Mesh(geo, this.materials.sidewalk);
    sw.position.set(x, y, z);
    sw.receiveShadow = true;
    sw.castShadow = true;
    this.scene.add(sw);

    // Add curb box on edge facing road
    // We also register this sidewalk as collision box so character walks onto it
    const colBox = new THREE.Box3().setFromObject(sw);
    this.collisionBoxes.push(colBox);
  }

  // ─── ADD BEAUTIFUL STREET LAMPS WITH REAL EMISSIVE BULBS ─────────
  public buildStreetlamps() {
    const poleHeight = 6.5;
    const points = [
      { x: 10, z: 12 },
      { x: -10, z: -12 },
      { x: 35, z: 12 },
      { x: -35, z: -12 },
      { x: 12, z: 35 },
      { x: -12, z: -35 },
      { x: 70, z: 12 },
      { x: -70, z: -12 },
    ];

    points.forEach((pt, idx) => {
      const lampGroup = new THREE.Group();
      lampGroup.position.set(pt.x, 0, pt.z);
      lampGroup.name = `Streetlamp_${idx}`;

      // Pole
      const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, poleHeight, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x22262d, roughness: 0.6, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = poleHeight / 2;
      pole.castShadow = true;
      lampGroup.add(pole);

      // Horizontal arm
      const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8);
      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(pt.x > 0 || Math.abs(pt.z) > 20 ? -0.7 : 0.7, poleHeight - 0.2, 0);
      arm.castShadow = true;
      lampGroup.add(arm);

      // Light head (Bulb cover)
      const headGeo = new THREE.ConeGeometry(0.4, 0.6, 12);
      const head = new THREE.Mesh(headGeo, poleMat);
      head.position.set(arm.position.x * 2, poleHeight - 0.5, 0);
      head.rotation.x = Math.PI;
      head.castShadow = true;
      lampGroup.add(head);

      // Emissive bulb
      const bulbGeo = new THREE.SphereGeometry(0.2, 12, 12);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe0a3 });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(arm.position.x * 2, poleHeight - 0.7, 0);
      lampGroup.add(bulb);

      // Real Spotlight for night feeling
      const spotLight = new THREE.SpotLight(0xffe2ad, 15, 25, Math.PI / 3.5, 0.6, 1.2);
      spotLight.position.set(arm.position.x * 2, poleHeight - 0.8, 0);
      
      // Target pointing straight down
      const targetObj = new THREE.Object3D();
      targetObj.position.set(arm.position.x * 2, 0, 0);
      lampGroup.add(targetObj);
      spotLight.target = targetObj;

      spotLight.castShadow = false;
      // Shadow maps disabled on streetlamps to avoid exceeding MAX_TEXTURE_IMAGE_UNITS (16)
      spotLight.shadow.bias = -0.005;

      lampGroup.add(spotLight);

      // Streetlamp Base
      const baseGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.6, 8);
      const base = new THREE.Mesh(baseGeo, poleMat);
      base.position.y = 0.3;
      lampGroup.add(base);

      this.scene.add(lampGroup);
      this.streetlights.push(lampGroup);

      // Add small collision box for pole
      const colBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(pt.x, poleHeight / 2, pt.z),
        new THREE.Vector3(0.5, poleHeight, 0.5)
      );
      this.collisionBoxes.push(colBox);
    });
  }

  // ─── ADD SCENERY PROPS (TREES, FENCES, BINS) ─────────────────────
  public buildSceneryProps() {
    const propLocations = [
      { x: 18, z: 45, type: 'tree' },
      { x: -18, z: 45, type: 'tree' },
      { x: 45, z: -20, type: 'tree' },
      { x: -45, z: -20, type: 'tree' },
      { x: -35, z: 42, type: 'tree' },
      { x: 38, z: -42, type: 'tree' },
      { x: 6, z: 10, type: 'hydrant' },
      { x: -6, z: -10, type: 'hydrant' },
    ];

    propLocations.forEach((loc, idx) => {
      const g = new THREE.Group();
      g.position.set(loc.x, 0, loc.z);

      if (loc.type === 'tree') {
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.9 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1;
        trunk.castShadow = true;
        g.add(trunk);

        // Foliage (Stylized Low Poly Layers)
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x1d4a2a, roughness: 0.85, flatShading: true });
        
        const f1 = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.5, 5), leafMat);
        f1.position.y = 2.8;
        f1.castShadow = true;
        g.add(f1);

        const f2 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.0, 5), leafMat);
        f2.position.y = 4.0;
        f2.castShadow = true;
        g.add(f2);

        this.scene.add(g);

        // Collisions
        const colBox = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(loc.x, 2.5, loc.z),
          new THREE.Vector3(1.0, 5.0, 1.0)
        );
        this.collisionBoxes.push(colBox);

      } else if (loc.type === 'hydrant') {
        const hMat = new THREE.MeshStandardMaterial({ color: 0xcc2929, roughness: 0.5, metalness: 0.6 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 8), hMat);
        body.position.y = 0.4;
        body.castShadow = true;
        g.add(body);

        const top = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), hMat);
        top.position.y = 0.8;
        g.add(top);

        this.scene.add(g);

        const colBox = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(loc.x, 0.4, loc.z),
          new THREE.Vector3(0.4, 0.8, 0.4)
        );
        this.collisionBoxes.push(colBox);
      }
    });
  }

  // ─── BUILD 3 HOUSES WITH SOLID, EMPTY INTERIORS (WOOD/TILE FLOORS) ──────
  public buildResidentialHouses(template: string = 'completed') {
    if (this.baseColliders.length === 0) {
      this.baseColliders = [...this.collisionBoxes];
    }
    this.rebuildResidentialHouses(template);
  }

  public rebuildResidentialHouses(template: string) {
    // 1. Clear existing house meshes from scene
    this.houseGroups.forEach(group => {
      group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
      this.scene.remove(group);
    });
    this.houseGroups = [];
    this.boutiqueClothes = [];

    // 2. Remove interactable doors
    this.interactables = this.interactables.filter(item => item.type !== 'door');

    // 3. Reset collisionBoxes to only contain baseColliders
    this.collisionBoxes = [...this.baseColliders];

    // 4. Build based on template
    if (template === 'completed') {
      this.buildCompletedHouses();
    } else if (template === 'outline') {
      this.buildOutlineHouses();
    } else if (template === 'skeletal') {
      this.buildSkeletalHouses();
    } else {
      // 'empty': Grille vide. Literally nothing but the grass, dojo, and streetlamps!
    }
  }

  private buildCompletedHouses() {
    // 1. House 1: Villa Nova (French Style, Peach stucco, spacious interior)
    this.createHouse({
      id: 'villa_nova',
      name: 'Villa Nova (Sector 1)',
      position: { x: 32, y: 0.25, z: 28 },
      dimensions: { width: 14, height: 4.2, depth: 10 },
      color: 0xead5c3, // Soft peach stucco
      flooring: 'wood',
      doorSide: 'left',
    });

    // 2. House 2: Modern Loft (Slate grey/white stucco, tiled floor)
    this.createHouse({
      id: 'modern_loft',
      name: 'Modern Loft (Sector 1)',
      position: { x: -32, y: 0.25, z: 28 },
      dimensions: { width: 12, height: 4.0, depth: 12 },
      color: 0x5a636c, // Sleek slate stucco
      flooring: 'tile',
      doorSide: 'center',
    });

    // 3. House 3: Suburban Dream (Warm Brick Red stucco, multiple rooms)
    this.createHouse({
      id: 'suburban_dream',
      name: 'Suburban Dream (Sector 1)',
      position: { x: 32, y: 0.25, z: -28 },
      dimensions: { width: 13, height: 4.1, depth: 11 },
      color: 0x933c3c, // Deep brick red stucco
      flooring: 'wood',
      doorSide: 'right',
    });

    // 4. House 4: Villa Celeste (Masterpiece 5D Architectural Estate)
    this.createLuxuryVilla();

    // 5. Boutique Éther (Luxury clothing storefront in North-West)
    this.createBoutiqueEther();
  }

  private buildOutlineHouses() {
    this.createHouseOutline({
      id: 'villa_nova',
      name: 'Villa Nova',
      position: { x: 32, y: 0.25, z: 28 },
      dimensions: { width: 14, height: 4.2, depth: 10 },
      color: 0xead5c3,
      flooring: 'wood',
    });

    this.createHouseOutline({
      id: 'modern_loft',
      name: 'Modern Loft',
      position: { x: -32, y: 0.25, z: 28 },
      dimensions: { width: 12, height: 4.0, depth: 12 },
      color: 0x5a636c,
      flooring: 'tile',
    });

    this.createHouseOutline({
      id: 'suburban_dream',
      name: 'Suburban Dream',
      position: { x: 32, y: 0.25, z: -28 },
      dimensions: { width: 13, height: 4.1, depth: 11 },
      color: 0x933c3c,
      flooring: 'wood',
    });

    this.createLuxuryVillaOutline();
  }

  private buildSkeletalHouses() {
    this.createHouseSkeletal({
      id: 'villa_nova',
      name: 'Villa Nova',
      position: { x: 32, y: 0.25, z: 28 },
      dimensions: { width: 14, height: 4.2, depth: 10 },
      color: 0xead5c3,
      flooring: 'wood',
    });

    this.createHouseSkeletal({
      id: 'modern_loft',
      name: 'Modern Loft',
      position: { x: -32, y: 0.25, z: 28 },
      dimensions: { width: 12, height: 4.0, depth: 12 },
      color: 0x5a636c,
      flooring: 'tile',
    });

    this.createHouseSkeletal({
      id: 'suburban_dream',
      name: 'Suburban Dream',
      position: { x: 32, y: 0.25, z: -28 },
      dimensions: { width: 13, height: 4.1, depth: 11 },
      color: 0x933c3c,
      flooring: 'wood',
    });

    this.createLuxuryVillaSkeletal();
  }

  private createHouseOutline(config: {
    id: string;
    name: string;
    position: { x: number; y: number; z: number };
    dimensions: { width: number; height: number; depth: number };
    color: number;
    flooring: 'wood' | 'tile';
  }) {
    const hGroup = new THREE.Group();
    hGroup.position.set(config.position.x, config.position.y, config.position.z);
    hGroup.name = config.id;
    hGroup.userData = { name: config.name + ' (Contour)', id: config.id };

    const { width, depth } = config.dimensions;
    const height = 0.55; // Low contour outline
    const wallThick = 0.3;

    // A. FLOOR
    const floorGeo = new THREE.BoxGeometry(width, 0.1, depth);
    const floorMat = config.flooring === 'wood' ? this.materials.woodFloor : this.materials.tileFloor;
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.05, 0);
    floor.receiveShadow = true;
    hGroup.add(floor);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(floor));

    // B. LOW CONTOUR WALLS
    const wallMat = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.8,
      map: this.textures.stucco,
    });

    // Rear wall
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThick), wallMat);
    wallBack.position.set(0, height / 2, -depth / 2 + wallThick / 2);
    wallBack.castShadow = true;
    hGroup.add(wallBack);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallBack));

    // Front wall (with door cut-out space)
    const frontW = (width - 1.5) / 2;
    const wallFrontL = new THREE.Mesh(new THREE.BoxGeometry(frontW, height, wallThick), wallMat);
    wallFrontL.position.set(-width / 4 - 0.375, height / 2, depth / 2 - wallThick / 2);
    wallFrontL.castShadow = true;
    hGroup.add(wallFrontL);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallFrontL));

    const wallFrontR = new THREE.Mesh(new THREE.BoxGeometry(frontW, height, wallThick), wallMat);
    wallFrontR.position.set(width / 4 + 0.375, height / 2, depth / 2 - wallThick / 2);
    wallFrontR.castShadow = true;
    hGroup.add(wallFrontR);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallFrontR));

    // Left wall
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth), wallMat);
    wallLeft.position.set(-width / 2 + wallThick / 2, height / 2, 0);
    wallLeft.castShadow = true;
    hGroup.add(wallLeft);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallLeft));

    // Right wall
    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth), wallMat);
    wallRight.position.set(width / 2 - wallThick / 2, height / 2, 0);
    wallRight.castShadow = true;
    hGroup.add(wallRight);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallRight));

    this.scene.add(hGroup);
    this.houseGroups.push(hGroup);
  }

  private createLuxuryVillaOutline() {
    const vGroup = new THREE.Group();
    const pos = { x: -34, y: 0.25, z: -28 };
    vGroup.position.set(pos.x, pos.y, pos.z);
    vGroup.name = 'villa_celeste';
    vGroup.userData = { name: 'Villa Celeste (Contour)', id: 'villa_celeste' };

    // Massive Base Deck
    const deckGeo = new THREE.BoxGeometry(18, 0.3, 16);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, -0.15, 0);
    deck.receiveShadow = true;
    vGroup.add(deck);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(deck));

    // Pool & Water
    const poolFrameGeo = new THREE.BoxGeometry(5.4, 0.1, 8.4);
    const poolFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
    const poolFrame = new THREE.Mesh(poolFrameGeo, poolFrameMat);
    poolFrame.position.set(5.3, 0.05, 2.5);
    vGroup.add(poolFrame);

    const waterGeo = new THREE.BoxGeometry(5.0, 0.12, 8.0);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      roughness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85,
      ior: 1.333,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(5.3, 0.04, 2.5);
    vGroup.add(water);

    // Living Room Floor
    const floorGeo = new THREE.BoxGeometry(10, 0.1, 12);
    const floorMat = this.materials.woodFloor;
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(-3.0, -0.05, 0);
    floor.receiveShadow = true;
    vGroup.add(floor);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(floor));

    // Low border walls (0.55m high)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, map: this.textures.stucco });
    
    // Back outline
    const bWall = new THREE.Mesh(new THREE.BoxGeometry(10, 0.55, 0.3), wallMat);
    bWall.position.set(-3.0, 0.275, -6.0);
    vGroup.add(bWall);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(bWall));

    // Left outline
    const lWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 12), wallMat);
    lWall.position.set(-8.0, 0.275, 0);
    vGroup.add(lWall);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(lWall));

    this.scene.add(vGroup);
    this.houseGroups.push(vGroup);
  }

  private createHouseSkeletal(config: {
    id: string;
    name: string;
    position: { x: number; y: number; z: number };
    dimensions: { width: number; height: number; depth: number };
    color: number;
    flooring: 'wood' | 'tile';
  }) {
    const hGroup = new THREE.Group();
    hGroup.position.set(config.position.x, config.position.y, config.position.z);
    hGroup.name = config.id;
    hGroup.userData = { name: config.name + ' (Squelette)', id: config.id };

    const { width, height, depth } = config.dimensions;
    const pillarSize = 0.35;

    // A. FLOOR
    const floorGeo = new THREE.BoxGeometry(width, 0.1, depth);
    const floorMat = config.flooring === 'wood' ? this.materials.woodFloor : this.materials.tileFloor;
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.05, 0);
    floor.receiveShadow = true;
    hGroup.add(floor);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(floor));

    // B. SKELETAL CONCRETE COLUMNS/PILLARS (4 corners + midpoints)
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // raw concrete grey
      roughness: 0.9,
      map: this.textures.concrete,
    });

    const corners = [
      [-width / 2 + pillarSize / 2, -depth / 2 + pillarSize / 2],
      [-width / 2 + pillarSize / 2, depth / 2 - pillarSize / 2],
      [width / 2 - pillarSize / 2, -depth / 2 + pillarSize / 2],
      [width / 2 - pillarSize / 2, depth / 2 - pillarSize / 2],
      [0, -depth / 2 + pillarSize / 2],
      [0, depth / 2 - pillarSize / 2],
    ];

    corners.forEach(([px, pz]) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(pillarSize, height, pillarSize), concreteMat);
      col.position.set(px, height / 2, pz);
      col.castShadow = true;
      col.receiveShadow = true;
      hGroup.add(col);
      this.collisionBoxes.push(new THREE.Box3().setFromObject(col));
    });

    // C. TOP HORIZONTAL CONCRETE BEAMS connecting pillars
    const beamGeoX = new THREE.BoxGeometry(width, 0.35, 0.35);
    const beamTopBack = new THREE.Mesh(beamGeoX, concreteMat);
    beamTopBack.position.set(0, height - 0.175, -depth / 2 + pillarSize / 2);
    hGroup.add(beamTopBack);

    const beamTopFront = new THREE.Mesh(beamGeoX, concreteMat);
    beamTopFront.position.set(0, height - 0.175, depth / 2 - pillarSize / 2);
    hGroup.add(beamTopFront);

    const beamGeoZ = new THREE.BoxGeometry(0.35, 0.35, depth);
    const beamTopLeft = new THREE.Mesh(beamGeoZ, concreteMat);
    beamTopLeft.position.set(-width / 2 + pillarSize / 2, height - 0.175, 0);
    hGroup.add(beamTopLeft);

    const beamTopRight = new THREE.Mesh(beamGeoZ, concreteMat);
    beamTopRight.position.set(width / 2 - pillarSize / 2, height - 0.175, 0);
    hGroup.add(beamTopRight);

    this.scene.add(hGroup);
    this.houseGroups.push(hGroup);
  }

  private createLuxuryVillaSkeletal() {
    const vGroup = new THREE.Group();
    const pos = { x: -34, y: 0.25, z: -28 };
    vGroup.position.set(pos.x, pos.y, pos.z);
    vGroup.name = 'villa_celeste';
    vGroup.userData = { name: 'Villa Celeste (Squelette)', id: 'villa_celeste' };

    // Massive Base Deck
    const deckGeo = new THREE.BoxGeometry(18, 0.3, 16);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, -0.15, 0);
    deck.receiveShadow = true;
    vGroup.add(deck);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(deck));

    // Pool & Water
    const poolFrameGeo = new THREE.BoxGeometry(5.4, 0.1, 8.4);
    const poolFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
    const poolFrame = new THREE.Mesh(poolFrameGeo, poolFrameMat);
    poolFrame.position.set(5.3, 0.05, 2.5);
    vGroup.add(poolFrame);

    const waterGeo = new THREE.BoxGeometry(5.0, 0.12, 8.0);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      roughness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85,
      ior: 1.333,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(5.3, 0.04, 2.5);
    vGroup.add(water);

    // Living Room Floor
    const floorGeo = new THREE.BoxGeometry(10, 0.1, 12);
    const floorMat = this.materials.woodFloor;
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(-3.0, -0.05, 0);
    floor.receiveShadow = true;
    vGroup.add(floor);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(floor));

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.9,
      map: this.textures.concrete,
    });

    // Vertical Columns for main level
    const pillarSize = 0.35;
    const height = 4.5;
    const pillars = [
      [-8.0, -6.0],
      [-8.0, 6.0],
      [2.0, -6.0],
      [2.0, 6.0],
      [-8.0, 0],
      [2.0, 0],
    ];

    pillars.forEach(([px, pz]) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(pillarSize, height, pillarSize), concreteMat);
      col.position.set(px, height / 2, pz);
      col.castShadow = true;
      vGroup.add(col);
      this.collisionBoxes.push(new THREE.Box3().setFromObject(col));
    });

    // Suspended mezzanine level slab
    const mezGeo = new THREE.BoxGeometry(10, 0.18, 5.5);
    const mezFloor = new THREE.Mesh(mezGeo, this.materials.tileFloor);
    mezFloor.position.set(-3.0, 2.2, -3.25);
    mezFloor.receiveShadow = true;
    vGroup.add(mezFloor);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(mezFloor));

    // Floating Stairs
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5 });
    for (let i = 0; i < 9; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.35), stepMat);
      step.position.set(-3.0, 0.1 + i * 0.22, -0.3 + i * 0.45);
      vGroup.add(step);
      this.collisionBoxes.push(new THREE.Box3().setFromObject(step));
    }

    // Top roof ceiling concrete slab (held up by pillars)
    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.25, 12.5), concreteMat);
    roofSlab.position.set(-3.0, height + 0.125, 0);
    roofSlab.castShadow = true;
    vGroup.add(roofSlab);

    this.scene.add(vGroup);
    this.houseGroups.push(vGroup);
  }

  public createLuxuryVilla() {
    const vGroup = new THREE.Group();
    const pos = { x: -34, y: 0.25, z: -28 };
    vGroup.position.set(pos.x, pos.y, pos.z);
    vGroup.name = 'villa_celeste';
    vGroup.userData = { name: 'Villa Celeste (5D Luxury Estate)', id: 'villa_celeste' };

    // 1. MASSIVE BASE DECK (Concrete/Stone)
    // Width: 18, Depth: 16, Height: 0.3
    const deckGeo = new THREE.BoxGeometry(18, 0.3, 16);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 }); // Pristine white stone
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, -0.15, 0);
    deck.receiveShadow = true;
    vGroup.add(deck);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(deck));

    // 2. EMBEDDED GLOWING SWIMMING POOL (Right Side of the Deck)
    const poolFrameGeo = new THREE.BoxGeometry(5.4, 0.1, 8.4);
    const poolFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 }); // Dark slate border
    const poolFrame = new THREE.Mesh(poolFrameGeo, poolFrameMat);
    poolFrame.position.set(5.3, 0.05, 2.5);
    vGroup.add(poolFrame);

    // Glowing underwater core
    const waterGeo = new THREE.BoxGeometry(5.0, 0.12, 8.0);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9, // Turquoise cyan water
      roughness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85,
      ior: 1.333,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(5.3, 0.04, 2.5);
    vGroup.add(water);

    // Cyan glowing point light inside pool water
    const poolLight = new THREE.PointLight(0x0ea5e9, 5.0, 12);
    poolLight.position.set(5.3, 0.4, 2.5);
    vGroup.add(poolLight);

    // 3. MAIN FLOOR VILLA LIVING ROOM (Left Side of the Deck)
    // Area: 10m width, 12m depth, 4.5m height
    const floorGeo = new THREE.BoxGeometry(10, 0.1, 12);
    // Custom ultra-high-fidelity polished Carrara Marble flooring with reflective tile pattern!
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.12,
      metalness: 0.08,
      map: this.textures.tile, // grid alignment
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(-3.0, -0.05, 0);
    floor.receiveShadow = true;
    vGroup.add(floor);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(floor));

    // Walls (Sleek minimalist white stucco + natural teak wood slats)
    const wallStucco = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, map: this.textures.stucco });
    const wallWood = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.6, map: this.textures.wood });

    // Rear Wall
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 0.3), wallStucco);
    wallBack.position.set(-3.0, 2.25, -6.0);
    wallBack.castShadow = true;
    wallBack.receiveShadow = true;
    vGroup.add(wallBack);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallBack));

    // Left Wall
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 12), wallWood);
    wallLeft.position.set(-8.0, 2.25, 0);
    wallLeft.castShadow = true;
    wallLeft.receiveShadow = true;
    vGroup.add(wallLeft);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallLeft));

    // Right Divider Wall
    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 5), wallStucco);
    wallRight.position.set(2.0, 2.25, -3.5);
    wallRight.castShadow = true;
    vGroup.add(wallRight);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallRight));

    // 4. FLOATING CEILING / UPPER MEZZANINE LEVEL (Split deck)
    const mezGeo = new THREE.BoxGeometry(10, 0.18, 5.5);
    // Luxurious oiled walnut hardwood parquet flooring!
    const mezFloorMat = new THREE.MeshStandardMaterial({
      color: 0x3d2810,
      roughness: 0.4,
      metalness: 0.05,
      map: this.textures.wood,
    });
    const mezFloor = new THREE.Mesh(mezGeo, mezFloorMat);
    mezFloor.position.set(-3.0, 2.2, -3.25); // suspended halfway up
    mezFloor.receiveShadow = true;
    vGroup.add(mezFloor);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(mezFloor));

    // Glass safety railing for mezzanine
    const railGeo = new THREE.PlaneGeometry(10, 0.9);
    const glassRail = new THREE.Mesh(railGeo, this.materials.glass);
    glassRail.position.set(-3.0, 2.65, -0.5);
    vGroup.add(glassRail);

    // Floating Stairs (Wooden block steps leading from main floor to mezzanine)
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5 });
    for (let i = 0; i < 9; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.35), stepMat);
      step.position.set(-3.0, 0.1 + i * 0.22, -0.3 + i * 0.45);
      step.castShadow = true;
      vGroup.add(step);
      this.collisionBoxes.push(new THREE.Box3().setFromObject(step));
    }

    // 5. SPECTACULAR FRONT FLOOR-TO-CEILING GLASS FACADE
    const colMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });
    for (let x = -7.8; x <= 1.8; x += 3.2) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.5, 8), colMat);
      column.position.set(x, 2.25, 6.0);
      column.castShadow = true;
      vGroup.add(column);
    }

    // Panoramic PBR Glass panes in front
    const frontGlassGeo = new THREE.PlaneGeometry(9.6, 4.4);
    const frontGlass = new THREE.Mesh(frontGlassGeo, this.materials.glass);
    frontGlass.position.set(-3.0, 2.2, 6.01);
    vGroup.add(frontGlass);

    // Swinging glass designer entry door with gold handles!
    this.createDoorSwinging(vGroup, {
      id: 'villa_celeste_door',
      houseId: 'villa_celeste',
      x: 1.8,
      y: 0,
      z: 6.0,
      width: 1.4,
      height: 2.8,
    });

    // 6. MODERN OUTDOOR ARCHITECTURAL PERGOLA (Above pool-deck lounge)
    const pergolaBeamMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 });
    for (let z = -2; z <= 6; z += 1.5) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.12, 0.12), pergolaBeamMat);
      beam.position.set(5.5, 4.3, z);
      beam.castShadow = true;
      vGroup.add(beam);
    }

    // Vertical supports for pergola
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.3, 0.15), pergolaBeamMat);
    postL.position.set(8.5, 2.15, 6.0);
    postL.castShadow = true;
    vGroup.add(postL);

    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.3, 0.15), pergolaBeamMat);
    postR.position.set(8.5, 2.15, -2.0);
    postR.castShadow = true;
    vGroup.add(postR);

    // 7. ROOF COVERING (with built-in LED ambient ceiling lights)
    const roofGeo = new THREE.BoxGeometry(11, 0.3, 13);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(-3.0, 4.65, 0);
    roof.castShadow = true;
    vGroup.add(roof);

    // Living ceiling warm light
    const pendantLight = new THREE.PointLight(0xfff3d1, 3.5, 16);
    pendantLight.position.set(-3.0, 4.0, 0);
    pendantLight.castShadow = false; // Disabled to avoid exceeding MAX_TEXTURE_IMAGE_UNITS
    vGroup.add(pendantLight);

    const pendantBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff9e6 })
    );
    pendantBulb.position.set(-3.0, 4.2, 0);
    vGroup.add(pendantBulb);

    // ─── UPGRADE: LUXURY ARCHITECTURAL DETAILS ───────────────────────

    // A. Built-in Luxury Walnut Fitting Room Partition (Fully Accessible in rear-left ground floor)
    const fitGroup = new THREE.Group();
    fitGroup.position.set(-6.5, 0, -4.5);

    // Walnut wood panel materials
    const fitWallMat = new THREE.MeshStandardMaterial({ color: 0x271505, roughness: 0.5 });

    // Lateral partition panel
    const fitSideWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 1.8), fitWallMat);
    fitSideWall.position.set(1.0, 1.3, 0.9);
    fitSideWall.castShadow = true;
    fitSideWall.receiveShadow = true;
    fitGroup.add(fitSideWall);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(fitSideWall));

    // Gold brass curtain hanging rod
    const fitRod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.22, 10), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.92, roughness: 0.1 }));
    fitRod.position.set(0.4, 2.45, 1.78);
    fitRod.rotation.z = Math.PI / 2;
    fitGroup.add(fitRod);

    // Elegant velvet heavy purple curtain drape
    const fitCurtain = new THREE.Mesh(new THREE.BoxGeometry(0.96, 2.1, 0.04), new THREE.MeshStandardMaterial({ color: 0x2e0854, roughness: 0.95 }));
    fitCurtain.position.set(0.4, 1.05, 1.78);
    fitCurtain.castShadow = true;
    fitGroup.add(fitCurtain);

    // Elegant full-body silver designer mirror
    const fitMirror = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.9, 0.02), new THREE.MeshStandardMaterial({ color: 0xc8d6e5, metalness: 0.9, roughness: 0.03 }));
    fitMirror.position.set(-1.38, 1.1, 0.5);
    fitMirror.rotation.y = Math.PI / 2;
    fitGroup.add(fitMirror);

    // Golden dress-hooks on the inner wood wall
    const fitHook = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 }));
    fitHook.position.set(-1.36, 1.7, 1.0);
    fitHook.rotation.x = Math.PI / 2;
    fitGroup.add(fitHook);

    // Wooden circular styling seat
    const seatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x541c09, roughness: 0.4 }));
    seatTop.position.set(-0.3, 0.38, 0.5);
    seatTop.castShadow = true;
    fitGroup.add(seatTop);

    const seatLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.38, 8), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.1 }));
    seatLeg.position.set(-0.3, 0.19, 0.5);
    seatLeg.castShadow = true;
    fitGroup.add(seatLeg);

    // Warm ceiling dressing light inside the cabin
    const fitSpot = new THREE.PointLight(0xffebd1, 3.0, 6);
    fitSpot.position.set(0, 2.5, 0.5);
    fitGroup.add(fitSpot);

    vGroup.add(fitGroup);

    // B. Gold Recessed Linear Track Lighting System on Ceiling
    const trackBar = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.92, roughness: 0.1 }));
    trackBar.position.set(-3.0, 4.45, -2.2);
    vGroup.add(trackBar);

    for (let lx = -5.5; lx <= -0.5; lx += 2.0) {
      // Direct point lights throwing beautiful light down
      const spotLight = new THREE.PointLight(0xffecd1, 2.4, 9);
      spotLight.position.set(lx, 4.15, -2.2);
      spotLight.castShadow = false; // Disabled to avoid exceeding MAX_TEXTURE_IMAGE_UNITS
      vGroup.add(spotLight);

      // Visual spotlight bulb casing
      const spotBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff9e6, emissiveIntensity: 2.2 }));
      spotBulb.position.set(lx, 4.38, -2.2);
      vGroup.add(spotBulb);
    }

    this.scene.add(vGroup);
    this.houseGroups.push(vGroup);
  }

  private createHouse(config: {
    id: string;
    name: string;
    position: { x: number; y: number; z: number };
    dimensions: { width: number; height: number; depth: number };
    color: number;
    flooring: 'wood' | 'tile';
    doorSide: 'left' | 'center' | 'right';
  }) {
    const hGroup = new THREE.Group();
    hGroup.position.set(config.position.x, config.position.y, config.position.z);
    hGroup.name = config.id;
    hGroup.userData = { name: config.name, id: config.id };

    const { width, height, depth } = config.dimensions;
    const wallThick = 0.3;

    // A. FLOOR
    const floorGeo = new THREE.BoxGeometry(width, 0.1, depth);
    const floorMat = config.flooring === 'wood' ? this.materials.woodFloor : this.materials.tileFloor;
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.05, 0);
    floor.receiveShadow = true;
    hGroup.add(floor);

    // Floor collision
    this.collisionBoxes.push(new THREE.Box3().setFromObject(floor));

    // B. HOUSE WALLS (Outer shell with precise interior space)
    const wallMat = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.8,
      map: this.textures.stucco,
    });

    // Rear wall
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThick), wallMat);
    wallBack.position.set(0, height / 2, -depth / 2 + wallThick / 2);
    wallBack.castShadow = true;
    wallBack.receiveShadow = true;
    hGroup.add(wallBack);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallBack));

    // Left wall
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth), wallMat);
    wallLeft.position.set(-width / 2 + wallThick / 2, height / 2, 0);
    wallLeft.castShadow = true;
    wallLeft.receiveShadow = true;
    hGroup.add(wallLeft);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallLeft));

    // Right wall
    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth), wallMat);
    wallRight.position.set(width / 2 - wallThick / 2, height / 2, 0);
    wallRight.castShadow = true;
    wallRight.receiveShadow = true;
    hGroup.add(wallRight);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallRight));

    // Interior divider wall (creates two separate rooms inside for realistic RP)
    const dividerGeo = new THREE.BoxGeometry(wallThick, height, depth * 0.6);
    const divider = new THREE.Mesh(dividerGeo, wallMat);
    divider.position.set(-width * 0.15, height / 2, -depth * 0.15);
    divider.castShadow = true;
    divider.receiveShadow = true;
    hGroup.add(divider);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(divider));

    // C. FRONT WALL (with Door cutout and Window layout)
    // We break the front wall into segments to leave empty spaces for Door and Window
    const doorWidth = 1.4;
    const doorHeight = 2.6;
    const winWidth = 3.2;
    const winHeight = 1.8;

    // Calculate door X position relative to layout choice
    let doorX = 0;
    if (config.doorSide === 'left') {
      doorX = -width / 3;
    } else if (config.doorSide === 'right') {
      doorX = width / 3;
    }

    const frontY = height / 2;
    const frontZ = depth / 2 - wallThick / 2;

    // 1. Door Side segment 1 (Left of door)
    const dLeftW = (width / 2 + doorX) - (doorWidth / 2);
    if (dLeftW > 0.1) {
      const segmentL = new THREE.Mesh(new THREE.BoxGeometry(dLeftW, height, wallThick), wallMat);
      segmentL.position.set(doorX - doorWidth / 2 - dLeftW / 2, frontY, frontZ);
      segmentL.castShadow = true;
      segmentL.receiveShadow = true;
      hGroup.add(segmentL);
      this.collisionBoxes.push(new THREE.Box3().setFromObject(segmentL));
    }

    // 2. Door Side segment 2 (Right of door to end or window)
    const dRightW = (width / 2 - doorX) - (doorWidth / 2);
    if (dRightW > 0.1) {
      const segmentR = new THREE.Mesh(new THREE.BoxGeometry(dRightW, height, wallThick), wallMat);
      segmentR.position.set(doorX + doorWidth / 2 + dRightW / 2, frontY, frontZ);
      segmentR.castShadow = true;
      segmentR.receiveShadow = true;
      hGroup.add(segmentR);
      this.collisionBoxes.push(new THREE.Box3().setFromObject(segmentR));
    }

    // 3. Lintel above door
    const lintelH = height - doorHeight;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, lintelH, wallThick), wallMat);
    lintel.position.set(doorX, height - lintelH / 2, frontZ);
    lintel.castShadow = true;
    hGroup.add(lintel);

    // D. LARGE WINDOW GLASS WITH PBR EFFECT
    // Placed in one of the segments (opposite to the door)
    const windowX = doorX > 0 ? -width / 4 : width / 4;
    const windowGlass = new THREE.Mesh(new THREE.PlaneGeometry(winWidth, winHeight), this.materials.glass);
    windowGlass.position.set(windowX, 1.6, frontZ + 0.05);
    hGroup.add(windowGlass);

    // Frame for window
    const frameGeo = new THREE.BoxGeometry(winWidth + 0.1, 0.1, 0.25);
    const winFrameB = new THREE.Mesh(frameGeo, this.materials.doorFrame);
    winFrameB.position.set(windowX, 1.6 - winHeight / 2, frontZ);
    hGroup.add(winFrameB);

    const winFrameT = new THREE.Mesh(frameGeo, this.materials.doorFrame);
    winFrameT.position.set(windowX, 1.6 + winHeight / 2, frontZ);
    hGroup.add(winFrameT);

    // E. ROOF
    const roofGeo = new THREE.BoxGeometry(width + 0.8, 0.4, depth + 0.8);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x272c35, roughness: 0.65 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, height + 0.2, 0);
    roof.castShadow = true;
    hGroup.add(roof);

    // F. REALISTIC GTA-STYLE SWINGING WOOD DOOR
    this.createDoorSwinging(hGroup, {
      id: `${config.id}_door`,
      houseId: config.id,
      x: doorX - doorWidth / 2, // The hinge/gond point (aligned with door's left side)
      y: 0,
      z: frontZ,
      width: doorWidth,
      height: doorHeight,
    });

    // G. HOUSE LIGHTING SWITCH AND BULB
    const houseLight = new THREE.PointLight(0xfff3d1, 3.5, 12);
    houseLight.position.set(0, height - 0.6, 0);
    houseLight.castShadow = false; // Disabled to avoid exceeding MAX_TEXTURE_IMAGE_UNITS
    hGroup.add(houseLight);

    // Glowing bulb mesh
    const hBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff9e6 })
    );
    hBulb.position.set(0, height - 0.4, 0);
    hGroup.add(hBulb);

    this.scene.add(hGroup);
    this.houseGroups.push(hGroup);
  }

  /** Génère le magasin de luxe physique Boutique Éther */
  private createBoutiqueEther() {
    const bGroup = new THREE.Group();
    const pos = { x: -16, y: 0.25, z: 12 };
    bGroup.position.set(pos.x, pos.y, pos.z);
    bGroup.name = 'boutique_ether';
    bGroup.userData = { name: 'Boutique Éther', id: 'boutique_ether' };

    const width = 14;
    const depth = 10;
    const height = 4.2;
    const wallThick = 0.3;

    // A. FLOOR (Polished tile Floor)
    const floorGeo = new THREE.BoxGeometry(width, 0.1, depth);
    const floor = new THREE.Mesh(floorGeo, this.materials.tileFloor);
    floor.position.set(0, -0.05, 0);
    floor.receiveShadow = true;
    bGroup.add(floor);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(floor));

    // B. LUXURY MARBLE & GOLD WALLS
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x111116, // Dark obsidian/marble
      roughness: 0.15,
      metalness: 0.85,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Elegant Gold
      roughness: 0.15,
      metalness: 0.95,
    });

    // Rear Wall
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThick), wallMat);
    wallBack.position.set(0, height / 2, -depth / 2 + wallThick / 2);
    wallBack.castShadow = true;
    wallBack.receiveShadow = true;
    bGroup.add(wallBack);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallBack));

    // Left Wall
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth), wallMat);
    wallLeft.position.set(-width / 2 + wallThick / 2, height / 2, 0);
    wallLeft.castShadow = true;
    wallLeft.receiveShadow = true;
    bGroup.add(wallLeft);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallLeft));

    // Right Wall
    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, depth), wallMat);
    wallRight.position.set(width / 2 - wallThick / 2, height / 2, 0);
    wallRight.castShadow = true;
    wallRight.receiveShadow = true;
    bGroup.add(wallRight);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(wallRight));

    // Front Wall (Open glass storefront layout with gold columns)
    const storeHeight = height;
    const columnWidth = 0.4;
    
    // Left column
    const colLeft = new THREE.Mesh(new THREE.BoxGeometry(columnWidth, storeHeight, columnWidth), goldMat);
    colLeft.position.set(-width / 2 + columnWidth / 2, storeHeight / 2, depth / 2 - columnWidth / 2);
    colLeft.castShadow = true;
    bGroup.add(colLeft);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(colLeft));

    // Right column
    const colRight = new THREE.Mesh(new THREE.BoxGeometry(columnWidth, storeHeight, columnWidth), goldMat);
    colRight.position.set(width / 2 - columnWidth / 2, storeHeight / 2, depth / 2 - columnWidth / 2);
    colRight.castShadow = true;
    bGroup.add(colRight);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(colRight));

    // Center columns flanking a wide open entry
    const entryWidth = 3.5;
    const leftColX = -entryWidth / 2 - columnWidth / 2;
    const rightColX = entryWidth / 2 + columnWidth / 2;

    const colMidLeft = new THREE.Mesh(new THREE.BoxGeometry(columnWidth, storeHeight, columnWidth), goldMat);
    colMidLeft.position.set(leftColX, storeHeight / 2, depth / 2 - columnWidth / 2);
    colMidLeft.castShadow = true;
    bGroup.add(colMidLeft);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(colMidLeft));

    const colMidRight = new THREE.Mesh(new THREE.BoxGeometry(columnWidth, storeHeight, columnWidth), goldMat);
    colMidRight.position.set(rightColX, storeHeight / 2, depth / 2 - columnWidth / 2);
    colMidRight.castShadow = true;
    bGroup.add(colMidRight);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(colMidRight));

    // Huge Glass windows between side columns and entry columns
    const glassLeftWidth = Math.abs((-width / 2 + columnWidth) - (leftColX - columnWidth / 2));
    const glassLeftX = (-width / 2 + columnWidth) + glassLeftWidth / 2;
    const glassLeft = new THREE.Mesh(new THREE.PlaneGeometry(glassLeftWidth, storeHeight - 0.2), this.materials.glass);
    glassLeft.position.set(glassLeftX, storeHeight / 2, depth / 2 - 0.05);
    bGroup.add(glassLeft);

    const glassRightWidth = Math.abs((width / 2 - columnWidth) - (rightColX + columnWidth / 2));
    const glassRightX = (width / 2 - columnWidth) - glassRightWidth / 2;
    const glassRight = new THREE.Mesh(new THREE.PlaneGeometry(glassRightWidth, storeHeight - 0.2), this.materials.glass);
    glassRight.position.set(glassRightX, storeHeight / 2, depth / 2 - 0.05);
    bGroup.add(glassRight);

    // Front header sign board
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(width, 0.8, 0.5), wallMat);
    signBoard.position.set(0, storeHeight - 0.4, depth / 2);
    signBoard.castShadow = true;
    bGroup.add(signBoard);

    const signTrim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.08, 0.6), goldMat);
    signTrim.position.set(0, storeHeight - 0.8, depth / 2);
    bGroup.add(signTrim);

    // Sign letters area glowing halo
    const logoGlow = new THREE.PointLight(0xa78bfa, 4.0, 5);
    logoGlow.position.set(0, storeHeight - 0.4, depth / 2 + 0.4);
    bGroup.add(logoGlow);

    const logoMesh = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 0.1), new THREE.MeshBasicMaterial({ color: 0xa78bfa }));
    logoMesh.position.set(0, storeHeight - 0.4, depth / 2 + 0.26);
    bGroup.add(logoMesh);

    // Roof
    const roofGeo = new THREE.BoxGeometry(width + 0.6, 0.3, depth + 0.6);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.5 }));
    roof.position.set(0, storeHeight + 0.15, 0);
    roof.castShadow = true;
    bGroup.add(roof);

    // C. INTERNAL DECOR & BOUTIQUE DISPLAY
    // Warm lighting overhead
    const ambientLight = new THREE.PointLight(0xfff5ea, 5.0, 10);
    ambientLight.position.set(0, height - 0.6, 0);
    bGroup.add(ambientLight);

    const ambientLight2 = new THREE.PointLight(0xfff5ea, 3.0, 8);
    ambientLight2.position.set(3, height - 0.6, 2);
    bGroup.add(ambientLight2);

    const ambientLight3 = new THREE.PointLight(0xfff5ea, 3.0, 8);
    ambientLight3.position.set(-3, height - 0.6, -2);
    bGroup.add(ambientLight3);

    // 2 Fitting Stall rooms
    const stallWidth = 2.0;
    const stallDepth = 2.0;
    const stallHeight = 2.4;
    const stallMat = new THREE.MeshStandardMaterial({ color: 0x1f1f2e, roughness: 0.8 });

    // Stall 1 (Left Back)
    const stall1Back = new THREE.Mesh(new THREE.BoxGeometry(stallWidth, stallHeight, wallThick), stallMat);
    stall1Back.position.set(-width / 2 + stallWidth / 2, stallHeight / 2, -depth / 2 + stallDepth + wallThick / 2);
    stall1Back.castShadow = true;
    bGroup.add(stall1Back);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(stall1Back));

    const stall1Side = new THREE.Mesh(new THREE.BoxGeometry(wallThick, stallHeight, stallDepth), stallMat);
    stall1Side.position.set(-width / 2 + stallWidth - wallThick / 2, stallHeight / 2, -depth / 2 + stallDepth / 2);
    stall1Side.castShadow = true;
    bGroup.add(stall1Side);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(stall1Side));

    // Stall 2 (Right Back)
    const stall2Back = new THREE.Mesh(new THREE.BoxGeometry(stallWidth, stallHeight, wallThick), stallMat);
    stall2Back.position.set(width / 2 - stallWidth / 2, stallHeight / 2, -depth / 2 + stallDepth + wallThick / 2);
    stall2Back.castShadow = true;
    bGroup.add(stall2Back);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(stall2Back));

    const stall2Side = new THREE.Mesh(new THREE.BoxGeometry(wallThick, stallHeight, stallDepth), stallMat);
    stall2Side.position.set(width / 2 - stallWidth + wallThick / 2, stallHeight / 2, -depth / 2 + stallDepth / 2);
    stall2Side.castShadow = true;
    bGroup.add(stall2Side);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(stall2Side));

    // D. LUXURY CASHIER COUNTER (La Caisse)
    const counterGeo = new THREE.BoxGeometry(3.0, 1.1, 1.2);
    const counter = new THREE.Mesh(counterGeo, stallMat);
    counter.position.set(0, 1.1 / 2, -depth / 2 + 1.8);
    counter.castShadow = true;
    bGroup.add(counter);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(counter));

    const counterTrim = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.08, 1.3), goldMat);
    counterTrim.position.set(0, 1.1, -depth / 2 + 1.8);
    bGroup.add(counterTrim);

    // Cash register/screen box on counter
    const register = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), new THREE.MeshStandardMaterial({ color: 0x050505 }));
    register.position.set(0, 1.1 + 0.15, -depth / 2 + 1.8);
    bGroup.add(register);

    // E. MANNEQUINS & CLOTHES DISPLAY
    const clothesList = [
      {
        id: 'garment_glow',
        brand: 'Maison Éther',
        type: 'Veste Éther-Glow',
        color: '#8b5cf6', // Violet
        colorHex: 0x8b5cf6,
        price: '450 $',
        tag: 'Émanation d\'Éther violette stabilisée',
        relPos: { x: -3.5, z: 2.0 },
      },
      {
        id: 'garment_cyber',
        brand: 'Aura Couture',
        type: 'Manteau Cyber-Chic',
        color: '#10b981', // Vert émeraude
        colorHex: 0x10b981,
        price: '950 $',
        tag: 'Nano-tissage de fils d\'or d\'Éther',
        relPos: { x: 3.5, z: 2.0 },
      },
      {
        id: 'garment_mirage',
        brand: 'Vortex Paris',
        type: 'Blouson Mirage',
        color: '#f59e0b', // Or / Ambre
        colorHex: 0xf59e0b,
        price: '250 $',
        tag: 'Réfraction lumineuse adaptative',
        relPos: { x: -3.5, z: -1.5 },
      },
      {
        id: 'garment_neon',
        brand: 'Forge Factory',
        type: 'Parka Néon-Forge',
        color: '#ef4444', // Rouge
        colorHex: 0xef4444,
        price: '600 $',
        tag: 'Isolation en plasma condensé résistant',
        relPos: { x: 3.5, z: -1.5 },
      },
    ];

    clothesList.forEach((garment) => {
      // 1. Pedestal Base
      const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 16), goldMat);
      pedBase.position.set(garment.relPos.x, 0.125, garment.relPos.z);
      pedBase.castShadow = true;
      bGroup.add(pedBase);

      // Pedestal column stem
      const pedStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), goldMat);
      pedStem.position.set(garment.relPos.x, 0.25 + 0.5, garment.relPos.z);
      pedStem.castShadow = true;
      bGroup.add(pedStem);

      // Mannequin Torso
      const torsoMat = new THREE.MeshStandardMaterial({
        color: parseInt(garment.color.replace('#', '0x')),
        roughness: 0.1,
        metalness: 0.5,
      });
      const pedTorso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.25), torsoMat);
      pedTorso.position.set(garment.relPos.x, 1.25, garment.relPos.z);
      pedTorso.castShadow = true;
      bGroup.add(pedTorso);

      // Small glowing orb floating above the mannequin
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshBasicMaterial({ color: parseInt(garment.color.replace('#', '0x')) })
      );
      orb.position.set(garment.relPos.x, 1.85, garment.relPos.z);
      bGroup.add(orb);

      // Light glow
      const glowLight = new THREE.PointLight(parseInt(garment.color.replace('#', '0x')), 3.0, 3);
      glowLight.position.set(garment.relPos.x, 1.85, garment.relPos.z);
      bGroup.add(glowLight);

      // Push to public boutiqueClothes with computed world position
      const worldX = pos.x + garment.relPos.x;
      const worldZ = pos.z + garment.relPos.z;
      
      this.boutiqueClothes.push({
        id: garment.id,
        brand: garment.brand,
        type: garment.type,
        color: garment.color,
        colorHex: garment.colorHex,
        price: garment.price,
        tag: garment.tag,
        worldPos: new THREE.Vector3(worldX, 1.25, worldZ),
      });
    });

    this.scene.add(bGroup);
    this.houseGroups.push(bGroup);
  }

  // ─── SWINGING HINGE ASSEMBLY FOR DOORS ───────────────────────────
  private createDoorSwinging(
    parent: THREE.Group,
    opt: { id: string; houseId: string; x: number; y: number; z: number; width: number; height: number }
  ) {
    const doorGroup = new THREE.Group();
    doorGroup.position.set(opt.x, opt.y, opt.z);

    // Pivot (Gond) represents the rotation axis
    const pivot = new THREE.Group();
    pivot.name = opt.id;
    pivot.userData = {
      type: 'door',
      isOpen: false,
      targetRotation: 0,
      locked: false,
      id: opt.id,
      houseId: opt.houseId,
    };

    // Actual Door slab mesh (offset so pivot is at left edge)
    const slabGeo = new THREE.BoxGeometry(opt.width - 0.05, opt.height - 0.05, 0.12);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x472d1c, // dark mahogany wood
      roughness: 0.6,
      map: this.textures.wood,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    // Offset by half width to make the hinge at X = 0 relative to pivot
    slab.position.set(opt.width / 2, opt.height / 2, 0);
    slab.castShadow = true;
    slab.receiveShadow = true;
    pivot.add(slab);

    // Door Handle (metal sphere)
    const handleGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 });
    const handleIn = new THREE.Mesh(handleGeo, handleMat);
    handleIn.position.set(opt.width - 0.15, opt.height / 2, 0.08);
    pivot.add(handleIn);

    const handleOut = new THREE.Mesh(handleGeo, handleMat);
    handleOut.position.set(opt.width - 0.15, opt.height / 2, -0.08);
    pivot.add(handleOut);

    doorGroup.add(pivot);
    parent.add(doorGroup);

    // Save interactive element
    this.interactables.push({
      id: opt.id,
      type: 'door',
      mesh: pivot,
      parentGroup: parent,
      userData: pivot.userData,
    });
  }

  // ─── GENERATE QUEBEC SIGN CANVAS TEXTURES ────────────────────────
  private createQuebecSignTexture(textLine1: string, textLine2: string, textLine3: string, isGreen: boolean = true) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background (emerald green for autoroute or pristine white for limits)
      ctx.fillStyle = isGreen ? '#15803d' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Border outline
      ctx.strokeStyle = isGreen ? '#ffffff' : '#111827';
      ctx.lineWidth = 14;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      if (isGreen) {
        // Inner thin line for highway aesthetic
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

        // Header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ QC AUTOROUTE 138 ⚡', canvas.width / 2, 45);

        // Destination title
        ctx.font = 'bold 36px "Space Grotesk", sans-serif';
        ctx.fillText(textLine1, canvas.width / 2, 105);

        // Subtitle / County
        ctx.fillStyle = '#fef08a'; // beautiful yellow accent
        ctx.font = 'bold 28px "Space Grotesk", sans-serif';
        ctx.fillText(textLine2, canvas.width / 2, 160);

        // Village / Sign info
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'italic 18px sans-serif';
        ctx.fillText(textLine3, canvas.width / 2, 215);
      } else {
        // Speed Limit Sign
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 24px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(textLine1, canvas.width / 2, 55);

        ctx.font = 'black 95px "JetBrains Mono", monospace';
        ctx.fillText(textLine2, canvas.width / 2, 155);

        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(textLine3, canvas.width / 2, 215);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // ─── BUILD SCENIC QUEBEC HIGHWAY 138 SIGNPOSTS ───────────────────
  public buildQuebecHighwaySigns() {
    const signsGroup = new THREE.Group();
    signsGroup.name = "Quebec_Highway_138_Signs";

    // Build the dynamic textures
    const westSignTex = this.createQuebecSignTexture("138 OUEST", "Trois-Rivières", "← Comté de Portneuf", true);
    const eastSignTex = this.createQuebecSignTexture("138 EST", "Québec / Portneuf", "Route du Roy →", true);
    const limitSignTex = this.createQuebecSignTexture("MAXIMUM", "90", "km/h", false);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const boardBackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    // 1. WESTBOUND ROUTE 138 SIGN (Placed on the west side of town)
    const signpostW = new THREE.Group();
    signpostW.position.set(-65, 0, -10);

    const poleW1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8), poleMat);
    poleW1.position.set(-1.4, 2.6, 0);
    poleW1.castShadow = true;
    signpostW.add(poleW1);

    const poleW2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8), poleMat);
    poleW2.position.set(1.4, 2.6, 0);
    poleW2.castShadow = true;
    signpostW.add(poleW2);

    const boardW = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.9, 0.12), [
      boardBackMat, // right
      boardBackMat, // left
      boardBackMat, // top
      boardBackMat, // bottom
      new THREE.MeshStandardMaterial({ map: westSignTex, roughness: 0.3, metalness: 0.1 }), // front
      boardBackMat  // back
    ]);
    boardW.position.set(0, 3.8, 0.06);
    boardW.castShadow = true;
    signpostW.add(boardW);

    signsGroup.add(signpostW);

    // 2. EASTBOUND ROUTE 138 SIGN (Placed on the east side of town)
    const signpostE = new THREE.Group();
    signpostE.position.set(65, 0, 10);

    const poleE1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8), poleMat);
    poleE1.position.set(-1.4, 2.6, 0);
    poleE1.castShadow = true;
    signpostE.add(poleE1);

    const poleE2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8), poleMat);
    poleE2.position.set(1.4, 2.6, 0);
    poleE2.castShadow = true;
    signpostE.add(poleE2);

    const boardE = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.9, 0.12), [
      boardBackMat, // right
      boardBackMat, // left
      boardBackMat, // top
      boardBackMat, // bottom
      new THREE.MeshStandardMaterial({ map: eastSignTex, roughness: 0.3, metalness: 0.1 }), // front
      boardBackMat  // back
    ]);
    boardE.position.set(0, 3.8, 0.06);
    boardE.rotation.y = Math.PI; // Look towards the intersection when arriving eastbound
    boardE.castShadow = true;
    signpostE.add(boardE);

    signsGroup.add(signpostE);

    // 3. SPEED LIMIT SIGN 90 KM/H (Placed near Avenue entry)
    const signpostL = new THREE.Group();
    signpostL.position.set(-18, 0, 11.5);

    const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5, 8), poleMat);
    poleL.position.set(0, 1.75, 0);
    poleL.castShadow = true;
    signpostL.add(poleL);

    const boardL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.08), [
      boardBackMat, // right
      boardBackMat, // left
      boardBackMat, // top
      boardBackMat, // bottom
      new THREE.MeshStandardMaterial({ map: limitSignTex, roughness: 0.4 }), // front
      boardBackMat  // back
    ]);
    boardL.position.set(0, 2.4, 0.04);
    boardL.castShadow = true;
    signpostL.add(boardL);

    signsGroup.add(signpostL);

    // 4. Welcome billboard for Comté de Portneuf
    const welcomeGroup = new THREE.Group();
    welcomeGroup.position.set(12, 0, -18);
    welcomeGroup.rotation.y = Math.PI / 4;

    const welcomePole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.0, 8), poleMat);
    welcomePole.position.set(0, 1.5, 0);
    welcomePole.castShadow = true;
    welcomeGroup.add(welcomePole);

    const welcomeTex = this.createQuebecSignTexture("BIENVENUE !", "Comté de Portneuf", "✨ Terroir et Fleuve ✨", true);
    const welcomeBoard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.08), [
      boardBackMat,
      boardBackMat,
      boardBackMat,
      boardBackMat,
      new THREE.MeshStandardMaterial({ map: welcomeTex, roughness: 0.4 }),
      boardBackMat
    ]);
    welcomeBoard.position.set(0, 2.1, 0.04);
    welcomeBoard.castShadow = true;
    welcomeGroup.add(welcomeBoard);

    signsGroup.add(welcomeGroup);

    this.scene.add(signsGroup);

    // Call Portneuf Scenic Environment generator
    this.buildQuebecPortneufScenery();
  }

  /** Génère le fleuve Saint-Laurent, le quai, le phare, la cantine et tous les villages de Portneuf */
  private buildQuebecPortneufScenery() {
    const qGroup = new THREE.Group();
    qGroup.name = "Quebec_Portneuf_Scenery";

    // 1. FLEUVE SAINT-LAURENT (Southern Water Body)
    const riverGeo = new THREE.PlaneGeometry(350, 110);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Deep blue Saint-Laurent
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.05, -135);
    river.receiveShadow = true;
    qGroup.add(river);

    // 2. LE QUAI DE PORTNEUF (Wood Pier extending into the river)
    const pierGroup = new THREE.Group();
    pierGroup.position.set(-30, 0, -80);

    const plankMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2e1d11, roughness: 0.95 });

    // Wooden walkway
    const boardwalk = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 52), plankMat);
    boardwalk.position.set(0, 0.2, -26);
    boardwalk.castShadow = true;
    boardwalk.receiveShadow = true;
    pierGroup.add(boardwalk);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(boardwalk));

    // Support pilings/posts
    for (let pz = -4; pz >= -50; pz -= 8) {
      const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6.0, 8), postMat);
      poleL.position.set(-2.4, -2.8, pz);
      pierGroup.add(poleL);

      const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6.0, 8), postMat);
      poleR.position.set(2.4, -2.8, pz);
      pierGroup.add(poleR);
    }

    // T-shaped platform at end of pier
    const tPlatform = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.4, 8.0), plankMat);
    tPlatform.position.set(0, 0.2, -52);
    tPlatform.castShadow = true;
    tPlatform.receiveShadow = true;
    pierGroup.add(tPlatform);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(tPlatform));

    // Wooden handrails on sides of pier
    const railMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.9 });
    for (let side = -1; side <= 1; side += 2) {
      if (side === 0) continue;
      const railH = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 48), railMat);
      railH.position.set(2.2 * side, 1.1, -24);
      pierGroup.add(railH);

      // Verticals for support
      for (let pz = -4; pz >= -48; pz -= 6) {
        const vert = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), railMat);
        vert.position.set(2.2 * side, 0.6, pz);
        pierGroup.add(vert);
      }
    }

    // Signpost at Quai entrance
    const signBoardMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.1), signBoardMat);
    signBoard.position.set(0, 3.2, 0);
    pierGroup.add(signBoard);

    // Decorative anchor logo or sign text backing
    const quaiSignTex = this.createQuebecSignTexture("⚓ PORTNEUF ⚓", "Le Quai Municipal", "Fierté du Saint-Laurent", true);
    signBoard.material = new THREE.MeshStandardMaterial({ map: quaiSignTex, roughness: 0.4 });

    const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.5, 8), postMat);
    signPole.position.set(0, 1.75, 0);
    pierGroup.add(signPole);

    qGroup.add(pierGroup);

    // 3. LE PHARE DE PORTNEUF (Lighthouse guarding the waters)
    const lighthouseGroup = new THREE.Group();
    lighthouseGroup.position.set(50, 0, -85);

    // Rocky foundation
    const foundation = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.0, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 }));
    foundation.position.y = 0.8;
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    lighthouseGroup.add(foundation);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(foundation));

    // Conical Tower Base (White stucco)
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.75 });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 9.5, 12), towerMat);
    tower.position.y = 1.6 + 4.75;
    tower.castShadow = true;
    lighthouseGroup.add(tower);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(tower));

    // Red balcony deck at top
    const balcony = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 }));
    balcony.position.y = 1.6 + 9.5 + 0.2;
    balcony.castShadow = true;
    lighthouseGroup.add(balcony);

    // Metal guard rails
    const blackMetal = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 });
    const rails = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.8, 12, 1, true), blackMetal);
    rails.position.y = 1.6 + 9.5 + 0.6;
    lighthouseGroup.add(rails);

    // Glass light housing chamber
    const lightChamber = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.2, 12), this.materials.glass);
    lightChamber.position.y = 1.6 + 9.5 + 0.4 + 1.1;
    lighthouseGroup.add(lightChamber);

    // Conical Red Roof
    const fRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.8, 12), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 }));
    fRoof.position.y = 1.6 + 9.5 + 0.4 + 2.2 + 0.9;
    fRoof.castShadow = true;
    lighthouseGroup.add(fRoof);

    // Internal Light Bulb
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    bulb.position.y = 1.6 + 9.5 + 0.4 + 1.1;
    lighthouseGroup.add(bulb);

    // Rotating Spotlight & Volumetric beam
    const beamGroup = new THREE.Group();
    beamGroup.position.set(0, 1.6 + 9.5 + 0.4 + 1.1, 0);

    const beamGeo = new THREE.ConeGeometry(2.8, 32, 16);
    beamGeo.translate(0, -16, 0); // shift pivot
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.rotation.x = Math.PI / 2;
    beamGroup.add(beamMesh);

    // Spotlight
    const spotlight = new THREE.SpotLight(0xfef08a, 45, 60, Math.PI / 5.5, 0.5, 1.0);
    spotlight.position.set(0, 0, 0);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(0, 0, 15);
    beamGroup.add(targetObj);
    spotlight.target = targetObj;
    beamGroup.add(spotlight);

    lighthouseGroup.add(beamGroup);
    this.lighthouseBeam = beamGroup; // Stored for update loop rotation!

    // Flagpole with waving Quebec Flag
    const fpGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8);
    const flagPole = new THREE.Mesh(fpGeo, blackMetal);
    flagPole.position.set(0, 1.6 + 9.5 + 0.4 + 2.2 + 1.8 + 0.8, 0);
    lighthouseGroup.add(flagPole);

    const qcFlag = this.createQuebecFlagMesh();
    qcFlag.position.set(0.65, 1.6 + 9.5 + 0.4 + 2.2 + 1.8 + 1.2, 0);
    lighthouseGroup.add(qcFlag);

    qGroup.add(lighthouseGroup);

    // 4. VILLAGE DE NEUVILLE (Corn fields / Blé d'inde)
    const neuvilleGroup = new THREE.Group();
    neuvilleGroup.position.set(-85, 0, 18);
    
    // Wood sign "Neuville"
    const signN = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 0.08), new THREE.MeshStandardMaterial({
      map: this.createQuebecSignTexture("🌾 NEUVILLE 🌾", "Kiosque de Blé d'Inde", "Auto-cueillette fraîche", true),
      roughness: 0.5
    }));
    signN.position.set(0, 1.8, 0);
    signN.castShadow = true;
    neuvilleGroup.add(signN);

    const postN = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8), postMat);
    postN.position.set(0, 1.1, 0);
    postN.castShadow = true;
    neuvilleGroup.add(postN);

    // Corn fields: Grid of yellow and green corn crop boxes
    const cornLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9, flatShading: true });
    const cornCobMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.8 });

    for (let cx = -4; cx <= 4; cx += 1.8) {
      for (let cz = -4; cz <= 4; cz += 1.8) {
        if (Math.abs(cx) < 0.5 && Math.abs(cz) < 0.5) continue; // clear center for sign
        
        const cropGroup = new THREE.Group();
        cropGroup.position.set(cx, 0, cz);

        // Stalk
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), cornLeafMat);
        stalk.position.y = 0.75;
        cropGroup.add(stalk);

        // Leaves
        const leaf1 = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 4), cornLeafMat);
        leaf1.position.set(-0.1, 0.8, 0);
        leaf1.rotation.z = 0.4;
        cropGroup.add(leaf1);

        const leaf2 = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 4), cornLeafMat);
        leaf2.position.set(0.1, 1.0, 0);
        leaf2.rotation.z = -0.4;
        cropGroup.add(leaf2);

        // Yellow corn top cobs
        const cob = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6), cornCobMat);
        cob.position.set(0, 1.4, 0);
        cropGroup.add(cob);

        neuvilleGroup.add(cropGroup);
      }
    }
    qGroup.add(neuvilleGroup);

    // 5. VILLAGE DE DONNACONA (Paper Mill Chimney / Usine de Pâte et Papier)
    const donnaconaGroup = new THREE.Group();
    donnaconaGroup.position.set(-52, 0, 20);

    // Stone foundation slab
    const factoryBase = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }));
    factoryBase.position.y = 0.15;
    factoryBase.castShadow = true;
    donnaconaGroup.add(factoryBase);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(factoryBase));

    // Tall industrial chimney (Paper Mill)
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.9 }); // Deep terracotta brick red
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 11.0, 10), brickMat);
    chimney.position.set(0, 5.5 + 0.3, 0);
    chimney.castShadow = true;
    chimney.receiveShadow = true;
    donnaconaGroup.add(chimney);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(chimney));

    // Metallic chimney rim ring
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.4, 10), blackMetal);
    rim.position.set(0, 11.0 + 0.3, 0);
    donnaconaGroup.add(rim);

    // Donnacona Paper Mill signage billboard
    const signD = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 0.08), new THREE.MeshStandardMaterial({
      map: this.createQuebecSignTexture("🏭 DONNACONA 🏭", "Moulin de Pâte & Papier", "Économie locale de Portneuf", true),
      roughness: 0.4
    }));
    signD.position.set(0, 1.6, 2.5);
    donnaconaGroup.add(signD);

    qGroup.add(donnaconaGroup);

    // 6. VILLAGE DE CAP-SANTÉ (Beautiful gabled chapel church / L'Église)
    const capsanteGroup = new THREE.Group();
    capsanteGroup.position.set(-18, 0, -25); // Placed beautifully in Southwest sector

    // Church main building
    const churchBody = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 12), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.85 }));
    churchBody.position.set(0, 2.1, 0);
    churchBody.castShadow = true;
    churchBody.receiveShadow = true;
    capsanteGroup.add(churchBody);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(churchBody));

    // Gabled tin roof (Classic Quebec silver/tin metal roof styling)
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.82, roughness: 0.25 });
    const tinRoofGeo = new THREE.ConeGeometry(6.5, 4.0, 4);
    const tinRoof = new THREE.Mesh(tinRoofGeo, roofMat);
    tinRoof.position.set(0, 4.2 + 2.0, 0);
    tinRoof.rotation.y = Math.PI / 4; // align gables with building box
    tinRoof.scale.set(1.4, 1.0, 2.0); // stretch to fit gabled format
    capsanteGroup.add(tinRoof);

    // Bell Tower / Silver Clocher (Steeple)
    const steepleLower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.5, 2.2), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 }));
    steepleLower.position.set(0, 4.2 + 1.75, 5);
    steepleLower.castShadow = true;
    capsanteGroup.add(steepleLower);

    // Shiny silver spire top
    const silverSpire = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.2, 8), roofMat);
    silverSpire.position.set(0, 4.2 + 3.5 + 2.1, 5);
    silverSpire.castShadow = true;
    capsanteGroup.add(silverSpire);

    // Gold Cross at the absolute peak
    const crossGroup = new THREE.Group();
    crossGroup.position.set(0, 4.2 + 3.5 + 4.2 + 0.6, 5);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.1, metalness: 0.9 });
    const crossV = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), goldMat);
    crossGroup.add(crossV);
    const crossH = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), goldMat);
    crossH.rotation.z = Math.PI / 2;
    crossH.position.y = 0.25;
    crossGroup.add(crossH);
    capsanteGroup.add(crossGroup);

    // Big front double door (brown wood)
    const doorC = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 0.15), new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 }));
    doorC.position.set(0, 1.4, 6.01);
    capsanteGroup.add(doorC);

    // Round rose window on front facade
    const roseWin = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x9333ea, emissive: 0x4c1d95, roughness: 0.1 }));
    roseWin.rotation.x = Math.PI / 2;
    roseWin.position.set(0, 4.0, 5.01);
    capsanteGroup.add(roseWin);

    // Chapel sign
    const signChapel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.0, 0.08), new THREE.MeshStandardMaterial({
      map: this.createQuebecSignTexture("⛪ CAP-SANTÉ ⛪", "Église de la Sainte-Famille", "Fleuron d'architecture (1714)", true),
      roughness: 0.4
    }));
    signChapel.position.set(0, 1.2, 7.8);
    capsanteGroup.add(signChapel);

    qGroup.add(capsanteGroup);

    // 7. VILLAGE DE DESCHAMBAULT-GRONDINES (Stone windmill / Moulin à vent)
    const deschambaultGroup = new THREE.Group();
    deschambaultGroup.position.set(65, 0, -28); // South-East sector

    // Base mound
    const grassMound = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.2, 0.8, 12), this.materials.grassField);
    grassMound.position.y = 0.4;
    grassMound.receiveShadow = true;
    deschambaultGroup.add(grassMound);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(grassMound));

    // Stone round tower body
    const stoneTower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.2, 6.2, 10), new THREE.MeshStandardMaterial({ color: 0xa1a1aa, roughness: 0.9 }));
    stoneTower.position.y = 0.8 + 3.1;
    stoneTower.castShadow = true;
    stoneTower.receiveShadow = true;
    deschambaultGroup.add(stoneTower);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(stoneTower));

    // Cap/Roof (wooden dome)
    const capRoof = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 }));
    capRoof.position.y = 0.8 + 6.2;
    capRoof.castShadow = true;
    deschambaultGroup.add(capRoof);

    // Windmill rotating sails (Le mécanisme)
    const sailsGroup = new THREE.Group();
    sailsGroup.position.set(0, 0.8 + 6.2 + 0.3, 1.8); // extend slightly forward on the cap

    const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 8), blackMetal);
    centerHub.rotation.x = Math.PI / 2;
    sailsGroup.add(centerHub);

    // 4 sails (cross style)
    const latticeMat = new THREE.MeshStandardMaterial({ color: 0xead5c3, roughness: 0.9 });
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i;
      const sailArm = new THREE.Group();
      sailArm.rotation.z = angle;

      // Wooden beam
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.2, 0.1), postMat);
      beam.position.y = 2.1;
      sailArm.add(beam);

      // Fabric lattice blade
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.2, 0.04), latticeMat);
      blade.position.set(0.38, 2.1, 0.05);
      sailArm.add(blade);

      sailsGroup.add(sailArm);
    }
    deschambaultGroup.add(sailsGroup);
    this.windmillSails = sailsGroup; // Stored for rotate animation inside loop!

    // Windmill Sign
    const signW = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.08), new THREE.MeshStandardMaterial({
      map: this.createQuebecSignTexture("🌾 GRONDINES 🌾", "Moulin à vent de Grondines", "Patrimoine historique (1674)", true),
      roughness: 0.4
    }));
    signW.position.set(0, 1.2, 3.5);
    deschambaultGroup.add(signW);

    qGroup.add(deschambaultGroup);

    // 8. LA CANTINE QUÉBÉCOISE (La Roulotte "Chez Gaston")
    const cantineGroup = new THREE.Group();
    cantineGroup.position.copy(this.cantineWorldPos); // (-10, 0.5, -15) - Very close to main street intersection

    // Chrome body trailer
    const trailerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.8 });
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.5, 3.2), trailerMat);
    trailer.position.y = 1.25;
    trailer.castShadow = true;
    cantineGroup.add(trailer);
    this.collisionBoxes.push(new THREE.Box3().setFromObject(trailer));

    // Wheels
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10);
    const wheel1 = new THREE.Mesh(wheelGeo, tireMat);
    wheel1.rotation.z = Math.PI / 2;
    wheel1.position.set(-1.8, 0, -1.61);
    cantineGroup.add(wheel1);

    const wheel2 = new THREE.Mesh(wheelGeo, tireMat);
    wheel2.rotation.z = Math.PI / 2;
    wheel2.position.set(1.8, 0, -1.61);
    cantineGroup.add(wheel2);

    // Service window shelf
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0x0ea5e9 }));
    shelf.position.set(0, 1.1, 1.61);
    cantineGroup.add(shelf);

    // Service awning (red & white stripe canvas)
    const canvasMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.8 });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 1.2), canvasMat);
    awning.position.set(0, 2.2, 2.1);
    awning.rotation.x = 0.25; // tilt down
    cantineGroup.add(awning);

    // Menu Sign on Cantine front
    const menuTex = this.createQuebecSignTexture("⚜️ CHEZ GASTON ⚜️", "La Roulotte de Portneuf", "Poutine • Blé d'Inde • Bière", true);
    const menuSign = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 0.08), new THREE.MeshStandardMaterial({ map: menuTex, roughness: 0.4 }));
    menuSign.position.set(0, 3.1, 0);
    cantineGroup.add(menuSign);

    // High 7-meter flag pole with a large Quebec Flag!
    const fpCantine = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 7.2, 8), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.15 }));
    fpCantine.position.set(-2.8, 3.6, -1.5);
    cantineGroup.add(fpCantine);

    const flagCantine = this.createQuebecFlagMesh();
    flagCantine.scale.set(1.6, 1.6, 1.6); // larger flag
    flagCantine.position.set(-1.75, 6.2, -1.5);
    cantineGroup.add(flagCantine);

    qGroup.add(cantineGroup);

    this.scene.add(qGroup);
  }

  /** Crée une texture de Drapeau du Québec haute fidélité (Fleurdelisé) */
  private createQuebecFlagTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 170;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 1. Fond bleu royal québécois
      ctx.fillStyle = '#0033a0';
      ctx.fillRect(0, 0, 256, 170);

      // 2. Croix blanche (largeur environ 1/6 de la hauteur du drapeau)
      const crossWidth = 24;
      ctx.fillStyle = '#ffffff';
      // Barre horizontale
      ctx.fillRect(0, (170 - crossWidth) / 2, 256, crossWidth);
      // Barre verticale
      ctx.fillRect((256 - crossWidth) / 2, 0, crossWidth, 170);

      // 3. Fleur de lys dessinée dans chacun des quatre cantons
      const drawFleurDeLys = (cx: number, cy: number) => {
        ctx.fillStyle = '#ffffff';
        // Pétale central
        ctx.beginPath();
        ctx.ellipse(cx, cy - 8, 4, 10, 0, 0, Math.PI * 2);
        // Pétale gauche
        ctx.ellipse(cx - 7, cy - 3, 7, 4, Math.PI / 4, 0, Math.PI * 2);
        // Pétale droit
        ctx.ellipse(cx + 7, cy - 3, 7, 4, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Attache horizontale de la fleur de lys
        ctx.fillRect(cx - 8, cy + 1, 16, 2.5);
        
        // Pieds du bas
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy + 4);
        ctx.lineTo(cx + 4, cy + 4);
        ctx.lineTo(cx, cy + 11);
        ctx.closePath();
        ctx.fill();
      };

      // Dessiner dans les 4 quadrants
      drawFleurDeLys(52, 38);   // Canton Haut-Gauche
      drawFleurDeLys(204, 38);  // Canton Haut-Droit
      drawFleurDeLys(52, 132);  // Canton Bas-Gauche
      drawFleurDeLys(204, 132); // Canton Bas-Droit
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  /** Crée le mesh 3D double face d'un drapeau fleurdelisé */
  private createQuebecFlagMesh(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(1.3, 0.85);
    const mat = new THREE.MeshStandardMaterial({
      map: this.createQuebecFlagTexture(),
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.0,
    });
    const flag = new THREE.Mesh(geo, mat);
    flag.name = "Quebec_Flag_Mesh";
    return flag;
  }
}

