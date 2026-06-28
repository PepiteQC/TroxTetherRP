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
  public collisionBoxes: THREE.Box3[] = []; // Obstacles verticaux seulement (murs, poteaux, arbres)
  public groundBoxes: THREE.Box3[] = [];    // Surfaces de sol uniquement (planchers, trottoirs, deck)
  public baseColliders: THREE.Box3[] = [];
  public baseGroundBoxes: THREE.Box3[] = [];

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

    // NOTE: On n'ajoute PAS les trottoirs comme colliders horizontaux (murs invisibles).
    // Le joueur monte dessus naturellement grâce au système de détection du sol (currentGroundY).
    // Seuls les obstacles verticaux (murs, poteaux, arbres) bloquent le déplacement horizontal.
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

      spotLight.castShadow = true;
      spotLight.shadow.mapSize.width = 512;
      spotLight.shadow.mapSize.height = 512;
      spotLight.shadow.bias = -0.005;

      lampGroup.add(spotLight);

      // Streetlamp Base
      const baseGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.6, 8);
      const base = new THREE.Mesh(baseGeo, poleMat);
      base.position.y = 0.3;
      lampGroup.add(base);

      this.scene.add(lampGroup);
      this.streetlights.push(lampGroup);

      // Collider précis et minimal sur le poteau seulement (diamètre réel 0.36m)
      const colBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(pt.x, poleHeight / 2, pt.z),
        new THREE.Vector3(0.36, poleHeight, 0.36)
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
      this.baseGroundBoxes = [...this.groundBoxes];
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

    // 2. Remove interactable doors
    this.interactables = this.interactables.filter(item => item.type !== 'door');

    // 3. Reset collisionBoxes and groundBoxes to only contain base versions
    this.collisionBoxes = [...this.baseColliders];
    this.groundBoxes = [...this.baseGroundBoxes];

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
    const pendantLight = new THREE.PointLight(0xfff3d1, 8.0, 20);
    pendantLight.position.set(-3.0, 4.0, 0);
    vGroup.add(pendantLight);

    // Soft daylight fill inside the villa living room
    const villaFill = new THREE.PointLight(0xffffff, 5.0, 18);
    villaFill.position.set(-3.0, 2.0, 0);
    vGroup.add(villaFill);

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
      spotLight.castShadow = true;
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
    const houseLight = new THREE.PointLight(0xfff3d1, 8.0, 16);
    houseLight.position.set(0, height - 0.6, 0);
    hGroup.add(houseLight);

    // Warm ambient booster inside room
    const roomAmb = new THREE.PointLight(0xffffff, 4.0, 14);
    roomAmb.position.set(0, 1.5, 0);
    hGroup.add(roomAmb);

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
}
