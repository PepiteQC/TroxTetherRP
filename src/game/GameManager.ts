import * as THREE from 'three';
import { CityArchitect, UrbanInteractiveElement } from './CityArchitect';
import { GModBuilder } from './GModBuilder';
import { PlayerState } from '../types';

export class GameManager {
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  
  // Subsystems
  public city!: CityArchitect;
  public builder!: GModBuilder;

  // Character Creator custom stored states & Cosmic Aura
  private customCharData: any = null;
  private activeAuraColor: number = 0x00ffff;
  private auraPointsMesh: THREE.Points | null = null;
  private auraRingsGroup: THREE.Group | null = null;

  // Mounts & Vehicles
  public activeMount: 'hoverboard' | 'broom' | null = null;
  private hoverboardMesh: THREE.Group | null = null;
  private broomMesh: THREE.Group | null = null;
  private mountParticles: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }[] = [];

  // Economy, Cannabis Cultivation & Gang Beasts physics states
  public cash = 2500;
  public weedSeeds = 5;
  public weedBuds = 0;
  public gangBeastsMode = false;
  public jointStiffness: 'stiff' | 'relaxed' | 'floppy' = 'stiff';
  public unlockedFurnitureIds: string[] = [
    'couch_nova', 'coffee_table', 'wooden_chair', 'standing_lamp', 'double_bed', 'potted_plant', 'wooden_fence', 'cardboard_box', 'office_desk', 'potted_palm', 'pool_chair', 'pool_ladder',
    'fitting_room', 'caisse_ether', 'mannequin_v', 'neon_ether', 'glass_panel', 'clothing_rack', 'display_table', 'wall_shelf'
  ];
  public weedPlants: Array<{
    uuid: string;
    mesh: THREE.Group;
    growth: number;
    waterLevel: number;
    stage: number;
    position: { x: number; y: number; z: number };
  }> = [];

  // Shop visual components
  private dispensarySign!: THREE.Group;
  private premiumStoreSign!: THREE.Group;

  // Martial Arts / Combat
  public activeCombatMove: 'punch' | 'kick' | 'backflip' | 'sweep' | 'headbutt' | 'grab' | null = null;
  private combatMoveTimer = 0;
  private combatCooldown = 0;
  public combatLogs: string[] = [
    '🥋 Bienvenue dans l\'univers Sandbox !',
    '🌱 Cultivez de la Weed, arrosez-la [E] et récoltez pour la revendre au dispensaire !',
    '🥋 Exécutez des attaques d\'arts martiaux avec les touches [1], [2], [3], [4] !',
    '🥊 Rejoignez le CHAMBER FIGHT CLUB depuis l\'onglet COMBAT pour des combats extrêmes !',
  ];

  // Chamber Fight Club state
  public fightQueueStatus: 'idle' | 'queuing' | 'match_ready' | 'fighting' = 'idle';
  public fightQueueTimer = 0;
  private queueProgressTimer = 0;
  public fightMode: 'none' | '1v1' | 'ffa' = 'none';
  public currentWeapon: 'none' | 'pipe' | 'bat' | 'bottle' | 'hammer' = 'none';
  private playerWeaponMesh: THREE.Group | THREE.Mesh | null = null;
  
  // Fight Club Ring & Gate properties
  private fightChamberGroup!: THREE.Group;
  private fightChamberPillars: THREE.Mesh[] = [];
  private fightGateActive = false;
  private fightGateMesh!: THREE.Mesh;
  private fightGateCollider!: THREE.Box3;
  private fightArenaCenter = new THREE.Vector3(26, 0.2, 18); // near dojo
  private fightArenaRadius = 7.0;

  // Spawners inside Ring
  private spawnedWeapon: { mesh: THREE.Group; type: 'pipe' | 'bat' | 'bottle' | 'hammer'; pickupCollider: THREE.Box3 } | null = null;
  private weaponSpawnTimer = 0;

  // Rivals
  public currentRivals: {
    id: string;
    name: string;
    mesh: THREE.Group;
    head: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    health: number;
    maxHealth: number;
    isKO: boolean;
    isDazed: boolean;
    dazedTimer: number;
    speed: number;
    velocity: THREE.Vector3;
    position: THREE.Vector3;
    activeWeapon: 'none' | 'pipe' | 'bat' | 'bottle' | 'hammer';
    weaponMesh: THREE.Group | THREE.Mesh | null;
    activeCombatMove: 'punch' | 'kick' | 'backflip' | 'sweep' | 'headbutt' | 'grab' | null;
    combatMoveTimer: number;
    attackCooldown: number;
    personality: 'aggressive' | 'defensive' | 'brawler';
    wobbleFactor: number;
  }[] = [];

  // Physical Training Dummies
  private dummies: {
    id: string;
    name: string;
    type: 'wooden' | 'iron' | 'punchbag';
    mesh: THREE.Group;
    pivotMesh: THREE.Group;
    initialPos: THREE.Vector3;
    health: number;
    maxHealth: number;
    wobbleAngle: number;
    wobbleSpeed: number;
    wobbleAxis: THREE.Vector3;
    impactVelocity: THREE.Vector3;
    collider: THREE.Box3;
    headMesh?: THREE.Mesh | THREE.Group;
    armLeft?: THREE.Mesh;
    armRight?: THREE.Mesh;
    jointRotVelocity?: THREE.Vector3;
    jointRot?: THREE.Vector3;
  }[] = [];
  private damageIndicators: { sprite: THREE.Sprite; velocity: THREE.Vector3; life: number }[] = [];
  private combatParticles: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }[] = [];

  // Lights & Atmosphere
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private hemisphereLight!: THREE.HemisphereLight;
  private skyTimeOfDay = 0.35; // 0 to 1, e.g. 0.35 is midday. Moves slowly
  private cycleSpeed = 0.0003; // speed of day/night cycle

  // Player Character Avatar Node
  public playerGroup!: THREE.Group;
  private playerHead!: THREE.Mesh;
  private leftLeg!: THREE.Mesh;
  private rightLeg!: THREE.Mesh;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;
  private flashlightSpot!: THREE.SpotLight;
  private flashlightOn = false;
  public playerHealth = 100;
  public playerStamina = 100;
  public inventory: Array<{ id: string; label: string; quantity: number; rarity: string }> = [
    { id: 'water_bottle', label: 'Eau Minérale', quantity: 2, rarity: 'Common' },
    { id: 'bread', label: 'Pain frais', quantity: 1, rarity: 'Common' }
  ];

  // Physics & Navigation
  public playerPos = new THREE.Vector3(0, 0, 2); // Spawn centre de l'intersection, en pleine rue
  public playerVelocity = new THREE.Vector3(0, 0, 0);
  private playerSpeed = 5.0; // units per second
  private playerSprintMultiplier = 1.8;
  private playerHeight = 1.9;
  private isGrounded = true;
  private gravity = 19.8;
  private jumpForce = 7.0;

  // Camera Orbit Control state
  public cameraYaw = 0; // horizontal angle
  public cameraPitch = -0.15; // vertical angle
  private cameraDistance = 4.8;
  private isPointerLocked = false;

  // Key inputs state
  private keys: Record<string, boolean> = {};

  // GMod Builder properties
  public activeItemId: string | null = null;
  public gridSnapSize = 0.5;
  private buildRotationOffset = 0;
  private sceneTemplate = 'completed';

  // React UI Update Callback
  private onStateUpdate: (state: PlayerState & {
    highlightedItem: string | null;
    nearDoor: UrbanInteractiveElement | null;
    playerPos: { x: number; y: number; z: number };
    cameraYaw: number;
  }) => void;

  constructor(
    private canvas: HTMLCanvasElement,
    onStateUpdate: (state: PlayerState & {
      highlightedItem: string | null;
      nearDoor: UrbanInteractiveElement | null;
      playerPos: { x: number; y: number; z: number };
      cameraYaw: number;
    }) => void
  ) {
    this.onStateUpdate = onStateUpdate;
    this.initThree();
    this.initAtmosphere();
    this.initPlayerAvatar();
    this.initSubsystems();
    this.setupEventListeners();
    this.animate();
  }

  // ─── INIT THREEJS CANVAS SCENE ───────────────────────────────────
  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xb0d0ff);
    this.scene.fog = new THREE.FogExp2(0xb0d0ff, 0.012);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private initAtmosphere() {
    // Hemispherical natural light
    this.hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    this.hemisphereLight.position.set(0, 50, 0);
    this.scene.add(this.hemisphereLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    // Dynamic Sun Light
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.6);
    this.sunLight.position.set(40, 60, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 180;
    
    const size = 65;
    this.sunLight.shadow.camera.left = -size;
    this.sunLight.shadow.camera.right = size;
    this.sunLight.shadow.camera.top = size;
    this.sunLight.shadow.camera.bottom = -size;
    this.sunLight.shadow.bias = -0.001;

    this.scene.add(this.sunLight);
  }

  // ─── GENERATE DETAILED 3D AVATAR (GTA STYLE ROBOTIC BOY) ─────────
  private initPlayerAvatar() {
    this.playerGroup = new THREE.Group();
    this.playerGroup.position.copy(this.playerPos);

    // Load Character Creator options
    try {
      const saved = localStorage.getItem('troxt_latest_character');
      if (saved) this.customCharData = JSON.parse(saved);
    } catch(e) {}

    const wScale = this.customCharData?.widthScale ?? 1.0;
    const hScale = this.customCharData?.heightScale ?? 1.0;
    const mScale = this.customCharData?.muscleScale ?? 1.0;
    const skinColor = this.customCharData?.skinTone || '#ffd1a4';
    const eyesColor = this.customCharData?.eyeColor || '#090d16';
    const primaryColor = this.customCharData?.outfitColors?.[0] || '#1e293b';
    const secondaryColor = this.customCharData?.outfitColors?.[1] || '#475569';
    const shoesColor = this.customCharData?.outfitColors?.[2] || '#f8fafc';
    const hairColorHex = this.customCharData?.hairColor || '#0f172a';
    const hairStyle = this.customCharData?.hairStyle || 'spiky';

    // Torso (Spacious corporate jacket style)
    const torsoGeo = new THREE.BoxGeometry(0.8 * wScale, 1.0, 0.45);
    const torsoMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(primaryColor), roughness: 0.65 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.0;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.playerGroup.add(torso);

    const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.04), new THREE.MeshStandardMaterial({ color: new THREE.Color(secondaryColor) }));
    chestStripe.position.set(0, 0.15, 0.22);
    torso.add(chestStripe);

    // Head (Styled round head)
    const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(skinColor), roughness: 0.55 });
    this.playerHead = new THREE.Mesh(headGeo, headMat);
    this.playerHead.position.set(0, 1.65, 0);
    this.playerHead.castShadow = true;
    this.playerGroup.add(this.playerHead);

    // ─── ADD FACE FEATURES TO PLAYER HEAD ───
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(eyesColor), roughness: 0.1 });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 0.05, 0.26);
    this.playerHead.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1, 0.05, 0.26);
    this.playerHead.add(rightEye);

    const noseGeo = new THREE.BoxGeometry(0.05, 0.08, 0.06);
    const noseMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(skinColor), roughness: 0.6 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.01, 0.28);
    this.playerHead.add(nose);

    const mouthGeo = new THREE.BoxGeometry(0.1, 0.03, 0.03);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.1, 0.26);
    this.playerHead.add(mouth);

    // Hair / Cap Customizer
    const hMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(hairColorHex), roughness: 0.7 });
    if (hairStyle !== 'bald') {
      if (hairStyle === 'short') {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.12, 12), hMat);
        c.position.set(0, 0.2, 0);
        this.playerHead.add(c);
      } else if (hairStyle === 'spiky') {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12), hMat);
        c.position.set(0, 0.18, 0);
        this.playerHead.add(c);
        for (let i = -0.16; i <= 0.16; i += 0.08) {
          const sp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), hMat);
          sp.position.set(i, 0.3, 0); sp.rotation.z = i * -1.8;
          this.playerHead.add(sp);
        }
      } else if (hairStyle === 'afro') {
        const a = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), hMat);
        a.position.set(0, 0.16, -0.04);
        this.playerHead.add(a);
      } else if (hairStyle === 'ponytail') {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.31, 12, 12), hMat);
        c.position.set(0, 0.1, 0);
        this.playerHead.add(c);
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.55, 8), hMat);
        t.position.set(0, 0.02, -0.34); t.rotation.x = -0.4;
        this.playerHead.add(t);
      } else if (hairStyle === 'long') {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.31, 12, 12), hMat);
        c.position.set(0, 0.1, 0);
        this.playerHead.add(c);
        [-0.25, 0.25].forEach(x => {
          const l = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.55, 0.18), hMat);
          l.position.set(x, -0.12, 0.05);
          this.playerHead.add(l);
        });
      } else {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 12), hMat);
        cap.position.set(0, 0.18, 0.05); cap.rotation.x = 0.15;
        this.playerHead.add(cap);
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.25), hMat);
        visor.position.set(0, 0.16, 0.32);
        this.playerHead.add(visor);
      }
    }

    // Left Arm
    const armGeo = new THREE.CylinderGeometry(0.12 * mScale, 0.1 * mScale, 0.9, 8);
    const sleeveMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(primaryColor) });
    this.leftArm = new THREE.Mesh(armGeo, sleeveMat);
    this.leftArm.position.set(-0.52 * wScale, 1.0, 0);
    this.leftArm.castShadow = true;
    this.playerGroup.add(this.leftArm);

    // Right Arm
    this.rightArm = new THREE.Mesh(armGeo, sleeveMat);
    this.rightArm.position.set(0.52 * wScale, 1.0, 0);
    this.rightArm.castShadow = true;
    this.playerGroup.add(this.rightArm);

    // Hands
    const handGeo = new THREE.SphereGeometry(0.11 * mScale, 8, 8);
    const handMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(skinColor), roughness: 0.6 });
    
    const leftHand = new THREE.Mesh(handGeo, handMat);
    leftHand.position.set(0, -0.48, 0);
    this.leftArm.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, handMat);
    rightHand.position.set(0, -0.48, 0);
    this.rightArm.add(rightHand);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.24, 0.9 * hScale, 0.24);
    const pantsMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(secondaryColor), roughness: 0.8 });
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.22 * wScale, 0.45 * hScale, 0);
    this.leftLeg.castShadow = true;
    this.playerGroup.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.22 * wScale, 0.45 * hScale, 0);
    this.rightLeg.castShadow = true;
    this.playerGroup.add(this.rightLeg);

    // Feet
    const footGeo = new THREE.BoxGeometry(0.26, 0.12, 0.36);
    const shoeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(shoesColor), roughness: 0.5 });
    
    const leftFoot = new THREE.Mesh(footGeo, shoeMat);
    leftFoot.position.set(0, -0.45 * hScale, 0.06);
    leftFoot.castShadow = true; leftFoot.receiveShadow = true;
    this.leftLeg.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, shoeMat);
    rightFoot.position.set(0, -0.45 * hScale, 0.06);
    rightFoot.castShadow = true; rightFoot.receiveShadow = true;
    this.rightLeg.add(rightFoot);

    // Attach Cosmic Aura to character in city!
    this.initCharacterAura();

    // Add Player Flashlight (F key)
    this.flashlightSpot = new THREE.SpotLight(0xffffff, 0, 18, Math.PI / 4.5, 0.5, 1.0);
    this.flashlightSpot.position.set(0, 1.6, 0.3);
    this.flashlightSpot.target = new THREE.Object3D();
    this.flashlightSpot.target.position.set(0, 1.6, 5);
    this.playerGroup.add(this.flashlightSpot);
    this.playerGroup.add(this.flashlightSpot.target);

    this.scene.add(this.playerGroup);
  }

  private initCharacterAura() {
    const auraId = this.customCharData?.aura || 'frost';
    const aurasMap: Record<string, number> = {
      divine: 0xffd700, void: 0x8a2be2, rage: 0xff0000, frost: 0x00ffff,
      nature: 0x32cd32, chaos: 0xff4500, lich: 0x4682b4, demon: 0x39ff14,
      bloodmage: 0x800000, archmage: 0x00bfff, warlord: 0xff8c00, time: 0xffa500
    };
    this.activeAuraColor = aurasMap[auraId] || 0x00ffff;

    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const th = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.6;
      positions[i * 3] = Math.cos(th) * r;
      positions[i * 3 + 1] = Math.random() * 2.2;
      positions[i * 3 + 2] = Math.sin(th) * r;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: this.activeAuraColor, size: 0.08, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending
    });
    this.auraPointsMesh = new THREE.Points(geom, pMat);
    this.playerGroup.add(this.auraPointsMesh);

    this.auraRingsGroup = new THREE.Group();
    const rGeom = new THREE.RingGeometry(0.7, 0.74, 24);
    const rMat = new THREE.MeshBasicMaterial({
      color: this.activeAuraColor, side: THREE.DoubleSide, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending
    });
    const r1 = new THREE.Mesh(rGeom, rMat); r1.rotation.x = Math.PI/2; r1.position.y = 0.3;
    const r2 = r1.clone(); r2.position.y = 0.9; r2.rotation.y = 0.5;
    this.auraRingsGroup.add(r1); this.auraRingsGroup.add(r2);
    this.playerGroup.add(this.auraRingsGroup);
  }

  private initSubsystems() {
    // Load economy and settings (such as sceneTemplate) FIRST before creating houses
    this.loadEconomy();

    this.city = new CityArchitect(this.scene);
    this.city.buildStreetNetwork();
    this.city.buildStreetlamps();
    this.city.buildSceneryProps();
    this.city.buildResidentialHouses(this.sceneTemplate);

    this.builder = new GModBuilder(this.scene);
    this.builder.instantiateAllStoredProps();

    this.initPlayerMounts();
    this.initDojoAndDummies();
    this.initFightChamber();

    // Init physical shop visual nodes & weed crops
    this.initShopsAndAura();
    this.loadWeedPlants();
  }

  public applyInitialSettings(startHour: number, jacketColor: number, gridSnap: number) {
    this.skyTimeOfDay = startHour / 24;
    this.gridSnapSize = gridSnap;
    
    // Find and update player's jacket torso mesh color
    this.playerGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) {
        const box = child.geometry as THREE.BoxGeometry;
        if (Math.abs(box.parameters.width - 0.8) < 0.05 && Math.abs(box.parameters.height - 1.0) < 0.05) {
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.color.setHex(jacketColor);
          }
        }
      }
    });
  }

  // ─── USER INPUT LISTENERS ────────────────────────────────────────
  private setupEventListeners() {
    // Keyboard key down
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;

      // Single action triggers
      if (k === 'f') {
        this.toggleFlashlight();
      } else if (k === 'e') {
        this.interactDoor();
      } else if (k === 'r' && this.activeItemId) {
        // Rotate ghost preview by 45 degrees
        this.buildRotationOffset += Math.PI / 4;
      } else if (k === 'x' || e.key === 'Delete') {
        this.builder.removeSelectedProp();
      } else if (k === '1' || k === 'j' || k === 'k') {
        this.executeCombatMove('punch');
      } else if (k === '2' || k === 'l') {
        this.executeCombatMove('kick');
      } else if (k === '3') {
        this.executeCombatMove('backflip');
      } else if (k === '4') {
        this.executeCombatMove('sweep');
      } else if (k === 'i') {
        this.executeCombatMove('headbutt');
      } else if (k === 'u') {
        this.executeCombatMove('grab');
      } else if (k === 'g') {
        this.plantWeedSeed();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse Controls - Drag to Look around
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      // Ignore click if clicking in spawned buttons/HUD overlays
      const target = e.target as HTMLElement;
      if (target.closest('.ui-interactive')) return;

      // FIX: Bloquer la rotation de la caméra si on est en train de cliquer pour poser un objet
      // Cela évite que la caméra saute au moment du clic
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      // Handle building click to spawn object in Build Mode
      if (e.button === 0 && this.activeItemId) {
        // Empêcher la propagation pour ne pas déclencher d'autres actions
        e.preventDefault();
        const success = this.builder.spawnItemAtGhost(this.activeItemId);
        if (success) {
           this.addCombatLog(`🛠️ BUILDER : Objet posé avec succès !`);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging || this.isPointerLocked) {
        const movementX = this.isPointerLocked ? e.movementX : (e.clientX - prevMouseX);
        const movementY = this.isPointerLocked ? e.movementY : (e.clientY - prevMouseY);

        this.cameraYaw -= movementX * 0.0035;
        this.cameraPitch -= movementY * 0.0035;

        // Constraint vertical pitch to prevent flipping upside down
        this.cameraPitch = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 3, this.cameraPitch));

        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      // Zoom camera in/out
      this.cameraDistance += e.deltaY * 0.005;
      this.cameraDistance = Math.max(2.5, Math.min(9.5, this.cameraDistance));
    };

    this.canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    this.canvas.addEventListener('wheel', onWheel);

    // Window Resize Handler
    const handleResize = () => {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // PointerLock Toggle
    this.canvas.addEventListener('dblclick', () => {
      // Optionally request pointer lock on double click for immersive gameplay
      this.requestMouseLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    });
  }

  public requestMouseLock() {
    try {
      this.canvas.requestPointerLock();
    } catch (e) {
      console.warn("Pointer lock not permitted inside sandbox iframe, dragging mouse remains fully functional.");
    }
  }

  // ─── GAMEPLAY FEATURES & INTERACTION ─────────────────────────────
  private toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    this.flashlightSpot.intensity = this.flashlightOn ? 25.0 : 0.0;
  }

  private interactDoor() {
    // 1. Check if standing near any planted Cannabis crop first
    let nearPlant: any = null;
    let nearPlantDist = 2.4; // interact radius
    this.weedPlants.forEach(p => {
      const dist = this.playerPos.distanceTo(new THREE.Vector3(p.position.x, p.position.y, p.position.z));
      if (dist < nearPlantDist) {
        nearPlantDist = dist;
        nearPlant = p;
      }
    });

    if (nearPlant) {
      if (nearPlant.growth >= 100) {
        // Harvest plant!
        this.scene.remove(nearPlant.mesh);
        this.weedPlants = this.weedPlants.filter(p => p.uuid !== nearPlant.uuid);
        
        const yieldBuds = Math.floor(Math.random() * 3) + 2; // yields 2-4 têtes de weed
        this.weedBuds += yieldBuds;
        
        this.addCombatLog(`✂️ RÉCOLTE : Vous avez récolté ${yieldBuds} têtes de cannabis de qualité !`);
        this.spawnCombatParticles(0xeab308, new THREE.Vector3(nearPlant.position.x, nearPlant.position.y + 0.4, nearPlant.position.z), 18);
        this.saveEconomy();
        this.saveWeedPlants();
      } else {
        // Water plant!
        nearPlant.waterLevel = 100;
        this.addCombatLog("💧 ARROSAGE : Cannabis arrosé ! Sa croissance se décuple.");
        
        // blue water drops particles
        this.spawnCombatParticles(0x3b82f6, new THREE.Vector3(nearPlant.position.x, nearPlant.position.y + 0.4, nearPlant.position.z), 15);
        this.saveWeedPlants();
      }
      return;
    }

    // 2. Fallback to door interaction
    const nearDoor = this.findNearestDoor();
    if (nearDoor) {
      if (nearDoor.userData.locked) {
        this.addCombatLog("🔒 VERROUILLÉ : Cette porte est sécurisée de l'intérieur !");
        return;
      }
      nearDoor.userData.isOpen = !nearDoor.userData.isOpen;
      nearDoor.userData.targetRotation = nearDoor.userData.isOpen ? -Math.PI / 1.6 : 0;
    }
  }

  public toggleDoorLock(doorId: string) {
    const d = this.city.interactables.find(item => item.id === doorId);
    if (d) {
      d.userData.locked = !d.userData.locked;
    }
  }

  private findNearestDoor(): UrbanInteractiveElement | null {
    let closest: UrbanInteractiveElement | null = null;
    let minDist = 2.4; // interact threshold

    this.city.interactables.forEach(item => {
      if (item.type === 'door') {
        // Find absolute world position of door
        const worldPos = new THREE.Vector3();
        item.mesh.getWorldPosition(worldPos);
        const d = this.playerPos.distanceTo(worldPos);
        if (d < minDist) {
          minDist = d;
          closest = item;
        }
      }
    });

    return closest;
  }

  // ─── ATMOSPHERIC ENVIRONMENT (CYCLE JOUR/NUIT) ───────────────────
  private updateDayNightCycle() {
    this.skyTimeOfDay += this.cycleSpeed;
    if (this.skyTimeOfDay > 1.0) this.skyTimeOfDay = 0.0;

    // Angle Sun light
    const angle = this.skyTimeOfDay * Math.PI * 2;
    const x = Math.cos(angle) * 80;
    const y = Math.sin(angle) * 60;
    const z = Math.sin(angle) * 30;
    this.sunLight.position.set(x, y, z);

    // Is night? (y <= 0)
    const isNight = y < 0.0;
    const fade = Math.max(0.0, Math.min(1.0, y / 10.0)); // dusk/dawn transition

    this.sunLight.intensity = fade * 1.6;
    this.hemisphereLight.intensity = 0.3 + fade * 0.9;
    this.ambientLight.color.setHex(isNight ? 0x223355 : 0xffffff);
    this.ambientLight.intensity = isNight ? 0.15 : 0.4;

    // Update fog color according to sunset/night/day
    let fogColor = new THREE.Color(0xb0d0ff); // Day blue sky
    if (isNight) {
      fogColor.setHex(0x060c13); // Dark night sky
    } else if (y < 8.0) {
      // Golden hour orange sunset
      const lerpFactor = y / 8.0;
      fogColor.lerpColors(new THREE.Color(0xf59e0b), new THREE.Color(0xb0d0ff), lerpFactor);
    }
    this.scene.background = fogColor;
    this.scene.fog!.color = fogColor;

    // Control streetlights based on nightfall
    this.city.streetlights.forEach(lamp => {
      const bulb = lamp.children.find(child => child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial);
      const light = lamp.children.find(child => child instanceof THREE.SpotLight) as THREE.SpotLight;
      if (light) {
        light.intensity = isNight ? 18.0 : 0.0;
      }
      if (bulb && bulb instanceof THREE.Mesh) {
        (bulb.material as THREE.MeshBasicMaterial).color.setHex(isNight ? 0xfff0a3 : 0x444444);
      }
    });
  }

  // ─── PLAYER AVATAR & CAMERA TICK LOOP ────────────────────────────
  private updatePlayerAndCamera(deltaTime: number) {
    if (deltaTime > 0.1) deltaTime = 0.1; // Cap time step on lags

    // A. DETERMINE MOVEMENT VECTORS
    const moveX = Number(this.keys['d'] || this.keys['arrowright'] || 0) - Number(this.keys['q'] || this.keys['a'] || this.keys['arrowleft'] || 0);
    const moveZ = Number(this.keys['s'] || this.keys['arrowdown'] || 0) - Number(this.keys['z'] || this.keys['w'] || this.keys['arrowup'] || 0);

    const isMoving = Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05;
    const isSprinting = this.keys['shift'] && isMoving;

    // Calculate forward/right vectors based on Camera Yaw
    const forwardVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw).normalize();
    const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw).normalize();

    const targetVelocity = new THREE.Vector3();
    targetVelocity.addScaledVector(forwardVec, -moveZ); // Z is negative forward
    targetVelocity.addScaledVector(rightVec, moveX);
    targetVelocity.normalize();

    let mountSpeedMult = 1.0;
    if (this.activeMount === 'hoverboard') {
      mountSpeedMult = 2.2;
    } else if (this.activeMount === 'broom') {
      mountSpeedMult = 1.6;
    }
    const speed = this.playerSpeed * mountSpeedMult * (isSprinting ? this.playerSprintMultiplier : 1.0);
    targetVelocity.multiplyScalar(speed);

    // Apply X and Z velocities smoothly
    this.playerVelocity.x = THREE.MathUtils.lerp(this.playerVelocity.x, targetVelocity.x, 0.12);
    this.playerVelocity.z = THREE.MathUtils.lerp(this.playerVelocity.z, targetVelocity.z, 0.12);

    // B. APPLY GRAVITY AND JUMP
    if (this.activeMount === 'broom') {
      // Broom Flight Controls - Float up/down using Space/C or Ctrl
      if (this.keys[' '] || this.keys['space']) {
        this.playerVelocity.y = 7.0;
      } else if (this.keys['control'] || this.keys['c']) {
        this.playerVelocity.y = -7.0;
      } else {
        this.playerVelocity.y = THREE.MathUtils.lerp(this.playerVelocity.y, 0, 0.15);
      }
      this.isGrounded = false;
    } else {
      if (!this.isGrounded) {
        this.playerVelocity.y -= this.gravity * deltaTime;
      }

      if (this.keys[' '] && this.isGrounded) {
        this.playerVelocity.y = this.jumpForce;
        this.isGrounded = false;
      }
    }

    // C. COLLISION RESOLUTION (BOX vs BOX)
    const proposedPos = this.playerPos.clone().addScaledVector(this.playerVelocity, deltaTime);

    // Player Bounding Box (cylinder box)
    const pBox = new THREE.Box3(
      new THREE.Vector3(proposedPos.x - 0.35, proposedPos.y, proposedPos.z - 0.35),
      new THREE.Vector3(proposedPos.x + 0.35, proposedPos.y + this.playerHeight, proposedPos.z + 0.35)
    );

    let collidesX = false;
    let collidesZ = false;

    // ALL collision boxes from city + props
    const allBoxes = [
      ...this.city.collisionBoxes,
      ...this.builder.getPropCollisionBoxes()
    ];

    // Sépare murs réels (hauteur > 0.5m) des surfaces plates (planchers, trottoirs)
    // Les surfaces plates ne bloquent pas horizontalement — elles servent uniquement de sol
    const wallObstacles = allBoxes.filter(b => (b.max.y - b.min.y) > 0.5);
    const groundObstacles = allBoxes; // tout sert de sol potentiel

    wallObstacles.forEach(obs => {
      if (pBox.intersectsBox(obs)) {
        // Collides! Let's check which axis is blocked
        // Check X axis only
        const pBoxX = new THREE.Box3(
          new THREE.Vector3(proposedPos.x - 0.35, this.playerPos.y, this.playerPos.z - 0.35),
          new THREE.Vector3(proposedPos.x + 0.35, this.playerPos.y + this.playerHeight, this.playerPos.z + 0.35)
        );
        if (pBoxX.intersectsBox(obs)) collidesX = true;

        // Check Z axis only
        const pBoxZ = new THREE.Box3(
          new THREE.Vector3(this.playerPos.x - 0.35, this.playerPos.y, proposedPos.z - 0.35),
          new THREE.Vector3(this.playerPos.x + 0.35, this.playerPos.y + this.playerHeight, proposedPos.z + 0.35)
        );
        if (pBoxZ.intersectsBox(obs)) collidesZ = true;
      }
    });

    // Apply allowed motion
    if (!collidesX) this.playerPos.x = proposedPos.x;
    else this.playerVelocity.x = 0;

    if (!collidesZ) this.playerPos.z = proposedPos.z;
    else this.playerVelocity.z = 0;

    // Y Axis motion & Ground checking
    this.playerPos.y += this.playerVelocity.y * deltaTime;

    // Check if on ground — utilise toutes les surfaces (murs ET sols)
    let currentGroundY = 0.01; // default grass level
    const playerFeetBox = new THREE.Box3(
      new THREE.Vector3(this.playerPos.x - 0.3, this.playerPos.y - 0.1, this.playerPos.z - 0.3),
      new THREE.Vector3(this.playerPos.x + 0.3, this.playerPos.y + 0.2, this.playerPos.z + 0.3)
    );

    // Monter sur les trottoirs, planchers, escaliers etc.
    groundObstacles.forEach(obs => {
      if (playerFeetBox.intersectsBox(obs)) {
        const topOfObs = obs.max.y;
        if (this.playerPos.y >= topOfObs - 0.45 && this.playerVelocity.y <= 0) {
          currentGroundY = Math.max(currentGroundY, topOfObs);
        }
      }
    });

    if (this.playerPos.y <= currentGroundY) {
      this.playerPos.y = currentGroundY;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Map Pos to player group
    this.playerGroup.position.copy(this.playerPos);

    // Rotate player group model facing forward travel direction (Corrected to face forward travel direction instead of camera)
    if (isMoving) {
      const faceAngle = Math.atan2(this.playerVelocity.x, this.playerVelocity.z);
      this.playerGroup.rotation.y = THREE.MathUtils.lerp(this.playerGroup.rotation.y, faceAngle, 0.18);
    }

    // D. WALK/RUN ALTERNATING JOINT ANIMATION OR MOUNT STANCE OVERRIDES
    if (this.activeMount === 'hoverboard') {
      // Surf stance on Hoverboard
      this.leftLeg.position.set(-0.2, 0.35, 0.25);
      this.rightLeg.position.set(0.2, 0.35, -0.25);
      this.leftLeg.rotation.set(-0.2, 0, 0);
      this.rightLeg.rotation.set(0.2, 0, 0);
      this.leftArm.rotation.set(0, 0, -Math.PI / 4.5);
      this.rightArm.rotation.set(0, 0, Math.PI / 4.5);
      
      // Floating hover effect on the deck mesh
      if (this.hoverboardMesh) {
        this.hoverboardMesh.position.y = -0.38 + Math.sin(Date.now() * 0.006) * 0.06;
      }
    } else if (this.activeMount === 'broom') {
      // Rider sitting stance on Magic Broom
      this.leftLeg.position.set(-0.22, 0.5, 0.15);
      this.rightLeg.position.set(0.22, 0.5, 0.15);
      this.leftLeg.rotation.set(0.65, 0, 0);
      this.rightLeg.rotation.set(0.65, 0, 0);
      this.leftArm.rotation.set(-0.7, 0, 0);
      this.rightArm.rotation.set(-0.7, 0, 0);
      
      // Magic bobbing effect
      if (this.broomMesh) {
        this.broomMesh.position.y = 0.5 + Math.sin(Date.now() * 0.005) * 0.08;
      }
    } else if (this.activeCombatMove) {
      // Restores feet back to standard positioning
      this.leftLeg.position.set(-0.22, 0.45, 0);
      this.rightLeg.position.set(0.22, 0.45, 0);

      // Override limbs according to active martial arts move
      if (this.activeCombatMove === 'punch') {
        this.rightArm.rotation.set(-Math.PI / 1.1, 0, -Math.PI / 6);
        this.leftArm.rotation.set(0.4, 0, 0); // hold guard
        this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0.1, 0.1);
        this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, -0.1, 0.1);
      } else if (this.activeCombatMove === 'kick') {
        this.rightLeg.rotation.set(-Math.PI / 2.0, 0, 0);
        this.leftLeg.rotation.set(0.25, 0, 0);
        this.rightArm.rotation.set(-0.4, 0, 0);
        this.leftArm.rotation.set(-0.4, 0, 0);
      } else if (this.activeCombatMove === 'backflip') {
        this.rightLeg.rotation.set(-0.7, 0, 0);
        this.leftLeg.rotation.set(0.7, 0, 0);
        this.leftArm.rotation.set(-Math.PI, 0, 0);
        this.rightArm.rotation.set(-Math.PI, 0, 0);
      } else if (this.activeCombatMove === 'sweep') {
        this.rightLeg.rotation.set(0, 0, Math.PI / 2.2); // extended side kick leg
        this.leftLeg.rotation.set(0, 0, 0);
        this.leftArm.rotation.set(0.3, 0, 0);
        this.rightArm.rotation.set(0.3, 0, 0);
      } else if (this.activeCombatMove === 'headbutt') {
        this.playerHead.rotation.set(0.85, 0, 0); // throw head forward aggressively
        this.leftArm.rotation.set(0.5, 0, -0.2);
        this.rightArm.rotation.set(0.5, 0, 0.2);
        this.leftLeg.rotation.set(-0.25, 0, 0);
        this.rightLeg.rotation.set(-0.25, 0, 0);
      } else if (this.activeCombatMove === 'grab') {
        this.leftArm.rotation.set(-Math.PI / 1.8, 0, 0.35); // forward reaching arms
        this.rightArm.rotation.set(-Math.PI / 1.8, 0, -0.35);
        this.leftLeg.rotation.set(0.15, 0, 0);
        this.rightLeg.rotation.set(0.15, 0, 0);
      }
    } else if (isMoving && this.isGrounded) {
      // Return legs to default positions first
      this.leftLeg.position.set(-0.22, 0.45, 0);
      this.rightLeg.position.set(0.22, 0.45, 0);

      const cycle = Date.now() * 0.009 * (isSprinting ? 1.6 : 1.0);
      const swing = Math.sin(cycle) * 0.45;
      
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      
      this.leftArm.rotation.x = -swing;
      this.rightArm.rotation.x = swing;
      this.leftArm.rotation.z = 0;
      this.rightArm.rotation.z = 0;
    } else {
      // return back to idle pose
      this.leftLeg.position.set(-0.22, 0.45, 0);
      this.rightLeg.position.set(0.22, 0.45, 0);

      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, 0.1);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, 0.1);
      this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, 0.1);
      this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0, 0.1);
      this.leftArm.rotation.z = THREE.MathUtils.lerp(this.leftArm.rotation.z, 0, 0.1);
      this.rightArm.rotation.z = THREE.MathUtils.lerp(this.rightArm.rotation.z, 0, 0.1);
    }

    // D2. RAGDOLL / FLO_WOBBLE PHYSICS OVERRIDES (Gang Beasts & Toribash Modes)
    if (this.gangBeastsMode && !this.activeMount) {
      const cycle = Date.now() * 0.015;
      const velocityLength = Math.sqrt(this.playerVelocity.x * this.playerVelocity.x + this.playerVelocity.z * this.playerVelocity.z);
      const walkFactor = Math.min(1.0, velocityLength / 3.0);

      // Comical head wobble
      this.playerHead.rotation.z = Math.sin(cycle) * 0.25;
      this.playerHead.rotation.x = Math.cos(cycle * 0.5) * 0.18 + this.cameraPitch * 0.3;

      // Jelly arms flailing in 3D
      this.leftArm.rotation.set(
        Math.sin(cycle * 0.8) * 0.65 * (0.4 + walkFactor * 1.5),
        Math.cos(cycle) * 0.4 * walkFactor,
        -Math.PI / 3.5 + Math.sin(cycle * 1.1) * 0.35
      );
      
      this.rightArm.rotation.set(
        Math.cos(cycle * 0.8) * 0.65 * (0.4 + walkFactor * 1.5),
        Math.sin(cycle) * 0.4 * walkFactor,
        Math.PI / 3.5 + Math.cos(cycle * 1.1) * 0.35
      );

      // Comical waddling legs
      this.leftLeg.position.set(-0.22, 0.45 + Math.sin(cycle * 2) * 0.08 * walkFactor, 0);
      this.rightLeg.position.set(0.22, 0.45 + Math.cos(cycle * 2) * 0.08 * walkFactor, 0);

      this.leftLeg.rotation.set(
        Math.sin(cycle * 1.2) * 0.6 * walkFactor,
        Math.sin(cycle) * 0.2 * walkFactor,
        Math.sin(cycle) * 0.18 * walkFactor
      );
      this.rightLeg.rotation.set(
        -Math.sin(cycle * 1.2) * 0.6 * walkFactor,
        -Math.sin(cycle) * 0.2 * walkFactor,
        -Math.sin(cycle) * 0.18 * walkFactor
      );

       // Exaggerate arms swing during punches/attacks in Gang Beasts mode!
      if (this.activeCombatMove === 'punch') {
        this.rightArm.rotation.x = Math.sin(cycle * 3.5) * Math.PI * 1.5;
        this.rightArm.rotation.y = Math.cos(cycle * 3.5) * Math.PI * 0.5;
      } else if (this.activeCombatMove === 'kick') {
        this.rightLeg.rotation.x = Math.sin(cycle * 3.5) * Math.PI * 1.2;
        this.rightLeg.rotation.z = Math.cos(cycle * 3.5) * 0.8;
      } else if (this.activeCombatMove === 'headbutt') {
        this.playerHead.rotation.x = Math.sin(cycle * 4.5) * 1.1;
      } else if (this.activeCombatMove === 'grab') {
        this.leftArm.rotation.x = -Math.PI / 2 + Math.sin(cycle * 3.0) * 0.45;
        this.rightArm.rotation.x = -Math.PI / 2 + Math.cos(cycle * 3.0) * 0.45;
      }

      // Roll and tilt whole player mesh randomly to simulate jelliness
      this.playerGroup.rotation.z = Math.sin(cycle * 0.6) * 0.08 + (this.playerVelocity.x * 0.035);
      this.playerGroup.rotation.x = Math.cos(cycle * 0.6) * 0.05 + (this.playerVelocity.z * 0.035);
    } else if (!this.activeMount && !this.activeCombatMove) {
      // Apply joint stiffness modifiers when not on mounts
      if (this.jointStiffness === 'relaxed') {
        // sag under gravity and swing slightly
        const cycle = Date.now() * 0.003;
        this.leftArm.rotation.set(0.85 + Math.sin(cycle) * 0.15, 0, -0.1);
        this.rightArm.rotation.set(0.85 + Math.cos(cycle) * 0.15, 0, 0.1);
        this.playerHead.rotation.z = Math.sin(cycle * 0.5) * 0.08;
      } else if (this.jointStiffness === 'floppy') {
        // total jelly sways
        const cycle = Date.now() * 0.007;
        this.leftArm.rotation.set(1.15 + Math.sin(cycle * 1.4) * 0.35, Math.sin(cycle) * 0.2, -0.2);
        this.rightArm.rotation.set(1.15 + Math.cos(cycle * 1.4) * 0.35, Math.cos(cycle) * 0.2, 0.2);
        this.playerHead.rotation.set(Math.sin(cycle) * 0.15, 0, Math.cos(cycle * 0.8) * 0.12);
        
        // tilt legs funny
        this.leftLeg.rotation.z = 0.12 + Math.sin(cycle) * 0.05;
        this.rightLeg.rotation.z = -0.12 - Math.sin(cycle) * 0.05;
      }
    }

    // Decay combat cooldowns and move timers
    if (this.combatCooldown > 0) {
      this.combatCooldown -= deltaTime;
    }
    if (this.combatMoveTimer > 0) {
      this.combatMoveTimer -= deltaTime;
      if (this.combatMoveTimer <= 0) {
        this.activeCombatMove = null;
      }
    }

    // Play visual rotation during combat backflips/sweeps!
    if (this.activeCombatMove === 'backflip') {
      const progress = Math.max(0.01, this.combatMoveTimer / 0.45); // 1 to 0
      this.playerGroup.rotation.x = (1.0 - progress) * Math.PI * 2;
    } else {
      this.playerGroup.rotation.x = THREE.MathUtils.lerp(this.playerGroup.rotation.x, 0, 0.15);
    }

    // Update physical training dummies wobble & impact physics (GangBeasts & Toribash joint feedback)
    this.dummies.forEach(dummy => {
      // Joint stiffness configurations based on the jointStiffness settings!
      let mult = 1.0;
      if (this.jointStiffness === 'relaxed') mult = 0.5;
      if (this.jointStiffness === 'floppy') mult = 0.18;

      const springK = (dummy.type === 'iron' ? 140.0 : 80.0) * mult; 
      const damp = (dummy.type === 'iron' ? 12.0 : 6.5) * Math.sqrt(mult);

      // Multi-axis physical spring-damper joint simulation (harmonic wobble)
      if (dummy.jointRot && dummy.jointRotVelocity) {
        const ax = -springK * dummy.jointRot.x - damp * dummy.jointRotVelocity.x;
        const ay = -springK * dummy.jointRot.y - damp * dummy.jointRotVelocity.y;
        const az = -springK * dummy.jointRot.z - damp * dummy.jointRotVelocity.z;

        dummy.jointRotVelocity.x += ax * deltaTime;
        dummy.jointRotVelocity.y += ay * deltaTime;
        dummy.jointRotVelocity.z += az * deltaTime;

        // Apply velocities
        dummy.jointRot.x += dummy.jointRotVelocity.x * deltaTime;
        dummy.jointRot.y += dummy.jointRotVelocity.y * deltaTime;
        dummy.jointRot.z += dummy.jointRotVelocity.z * deltaTime;

        // Apply angular rotations to pivot mesh (mixing joint displacement and linear impact velocity tilt)
        dummy.pivotMesh.rotation.x = dummy.jointRot.x - (dummy.impactVelocity.z * 0.16);
        dummy.pivotMesh.rotation.y = dummy.jointRot.y;
        dummy.pivotMesh.rotation.z = dummy.jointRot.z + (dummy.impactVelocity.x * 0.16);

        // Bobble head reaction (combining harmonic wobble and raw impact ragdoll knockback tilt)
        const cycleTime = Date.now() * 0.001;
        if (dummy.headMesh) {
          // Direct neck bend under impact force
          const impactNeckX = -dummy.impactVelocity.z * 0.45;
          const impactNeckZ = dummy.impactVelocity.x * 0.45;
          dummy.headMesh.rotation.x = impactNeckX + Math.sin(cycleTime * 25) * dummy.jointRot.x * 1.5;
          dummy.headMesh.rotation.z = impactNeckZ + Math.cos(cycleTime * 25) * dummy.jointRot.z * 1.5;
        }

        // Flapping arms (Toribash floppy muscle joint torque + physical air resistance drag)
        if (dummy.armLeft) {
          const dragZ = -dummy.impactVelocity.x * 1.1;
          const dragX = -dummy.impactVelocity.z * 1.1;
          dummy.armLeft.rotation.x = (Math.PI / 2.5) + dragX + Math.sin(cycleTime * 30) * dummy.jointRot.x * 2.5;
          dummy.armLeft.rotation.z = dragZ + Math.cos(cycleTime * 15) * dummy.jointRot.z * 1.5;
        }
        if (dummy.armRight) {
          const dragZ = -dummy.impactVelocity.x * 1.1;
          const dragX = -dummy.impactVelocity.z * 1.1;
          dummy.armRight.rotation.x = (-Math.PI / 2.5) + dragX + Math.cos(cycleTime * 30) * dummy.jointRot.z * 2.5;
          dummy.armRight.rotation.z = dragZ + Math.sin(cycleTime * 15) * dummy.jointRot.x * 1.5;
        }
      }

      // Smooth decay of impact velocity
      dummy.impactVelocity.multiplyScalar(0.92);
    });

    // Update floating damage indicators
    this.damageIndicators.forEach((ind, index) => {
      ind.sprite.position.addScaledVector(ind.velocity, deltaTime);
      ind.velocity.y -= 2.2 * deltaTime; // gravity pull on numbers
      ind.life -= deltaTime;
      ind.sprite.material.opacity = Math.max(0, ind.life);
      if (ind.life <= 0) {
        this.scene.remove(ind.sprite);
        this.damageIndicators.splice(index, 1);
      }
    });

    // Update hit sparks with realistic gravity pull and scale shrinkage
    this.combatParticles.forEach((part, index) => {
      part.mesh.position.addScaledVector(part.velocity, deltaTime);
      part.velocity.y -= 9.8 * deltaTime; // fall naturally under gravity
      part.mesh.scale.multiplyScalar(0.93); // fade out scaling
      part.life -= deltaTime;
      if (part.life <= 0) {
        this.scene.remove(part.mesh);
        this.combatParticles.splice(index, 1);
      }
    });

    // Update mount neon trail sparks
    if (this.activeMount && isMoving && Math.random() < 0.45) {
      this.spawnTrailParticle();
    }
    this.mountParticles.forEach((part, index) => {
      part.mesh.position.addScaledVector(part.velocity, deltaTime);
      part.mesh.scale.multiplyScalar(0.9);
      part.life -= deltaTime;
      if (part.life <= 0) {
        this.scene.remove(part.mesh);
        this.mountParticles.splice(index, 1);
      }
    });

    // Rotate player head slightly according to pitch
    this.playerHead.rotation.x = THREE.MathUtils.lerp(this.playerHead.rotation.x, this.cameraPitch * 0.4, 0.1);

    // E. UPDATE CAMERA POSITION (3rd Person GTA shoulder follow + Spring Arm collision)
    const shoulderOffset = new THREE.Vector3(0.55, 2.1, 0);
    shoulderOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

    const backOffset = new THREE.Vector3(0, 0, this.cameraDistance);
    backOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraPitch);
    backOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

    const targetCameraPos = this.playerPos.clone().add(shoulderOffset).add(backOffset);
    const lookAtTarget = this.playerPos.clone().add(new THREE.Vector3(0, 1.35, 0));

    // Spring Arm Anti-collision: Prevents camera from clipping into house roofs or exterior walls
    const rayOrigin = lookAtTarget.clone();
    const rayVec = targetCameraPos.clone().sub(rayOrigin);
    const rayDist = rayVec.length();
    rayVec.normalize();

    const collidableMeshes: THREE.Object3D[] = [];
    this.scene.children.forEach(c => {
      // FIX: Ne pas inclure le ghost du builder et les auras dans les collisions de caméra
      if (
        c !== this.playerGroup && 
        !(c instanceof THREE.Light) && 
        !(c instanceof THREE.Points) &&
        c.name !== "ghost_mesh_group" && // Nom standard du ghost dans GModBuilder
        !c.name.includes("aura")
      ) {
        collidableMeshes.push(c);
      }
    });

    const camRay = new THREE.Raycaster(rayOrigin, rayVec, 0.05, rayDist);
    const camHits = camRay.intersectObjects(collidableMeshes, true);
    if (camHits.length > 0 && camHits[0].distance < rayDist) {
      // Pull camera closer inside the room just before hitting the wall or ceiling!
      targetCameraPos.copy(rayOrigin).addScaledVector(rayVec, Math.max(0.35, camHits[0].distance - 0.25));
    }
    
    this.camera.position.copy(targetCameraPos);
    this.camera.lookAt(lookAtTarget);
  }

  // ─── MASTER ANIMATION TICK (60FPS LOOP) ──────────────────────────
  private clock = new THREE.Clock();

  private animate = () => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    // 1. Update systems
    this.updateDayNightCycle();
    this.updatePlayerAndCamera(deltaTime);
    this.updateWeedPlants(deltaTime);
    this.updateFightClub(deltaTime);

    // Animate Cosmic Aura in city
    if (this.auraPointsMesh && this.auraPointsMesh.geometry) {
      const posAttr = this.auraPointsMesh.geometry.attributes.position as THREE.BufferAttribute;
      if (posAttr && posAttr.array) {
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < arr.length / 3; i++) {
          arr[i * 3 + 1] += 0.016;
          const x = arr[i * 3]; const z = arr[i * 3 + 2]; const th = 0.015;
          arr[i * 3] = x * Math.cos(th) - z * Math.sin(th);
          arr[i * 3 + 2] = x * Math.sin(th) + z * Math.cos(th);
          if (arr[i * 3 + 1] > 2.2) arr[i * 3 + 1] = 0;
        }
        posAttr.needsUpdate = true;
      }
    }
    if (this.auraRingsGroup) {
      this.auraRingsGroup.rotation.y += 0.035;
    }

    // Animate physical shop spinning signs
    if (this.dispensarySign) {
      this.dispensarySign.rotation.y += 0.02;
      this.dispensarySign.position.y = 1.3 + Math.sin(Date.now() * 0.004) * 0.08;
    }
    if (this.premiumStoreSign) {
      this.premiumStoreSign.rotation.y -= 0.015;
      this.premiumStoreSign.position.y = 1.4 + Math.sin(Date.now() * 0.003) * 0.08;
    }

    // 2. Animate swinging doors (lerping)
    this.city.interactables.forEach(item => {
      if (item.type === 'door') {
        item.mesh.rotation.y = THREE.MathUtils.lerp(
          item.mesh.rotation.y,
          item.userData.targetRotation,
          0.09
        );
      }
    });

    // 3. Update Build Mode Ghost Preview if active
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // List all potential build placement surfaces (ground, homes, curbs, props)
    const groundMeshes: THREE.Object3D[] = [];
    this.scene.children.forEach(child => {
      // Filter out player avatar and lights
      if (child !== this.playerGroup && !(child instanceof THREE.Light) && child.name !== "NovaCity_Main") {
        groundMeshes.push(child);
      }
    });

    if (this.activeItemId) {
      // Place ghost projection directly ahead of the player (shoulder height)
      const rayOrigin = this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0));
      this.builder.updateGhostPreview(
        this.activeItemId,
        rayOrigin,
        cameraDirection,
        this.gridSnapSize,
        this.playerGroup.rotation.y + this.buildRotationOffset,
        groundMeshes
      );
    } else {
      this.builder.clearGhost();
      // GMod delete highlights - raycast ahead to highlight target objects to delete
      const rayOrigin = this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0));
      this.builder.performSelectionHover(rayOrigin, cameraDirection);
    }

    // 4. Render
    this.renderer.render(this.scene, this.camera);

    // 5. Calculate Street name based on player coordinate
    let streetName = 'Zone Résidentielle';
    if (Math.abs(this.playerPos.z) < 7.0) {
      streetName = 'Avenue des Alliés';
    } else if (Math.abs(this.playerPos.x) < 6.0) {
      streetName = 'Rue de la République';
    }

    // Identify if inside or near Villa Celeste estate
    const distToVillaCeleste = this.playerPos.distanceTo(new THREE.Vector3(-34, this.playerPos.y, -28));
    if (distToVillaCeleste < 11.0) {
      streetName = 'Villa Celeste (Domaine de Luxe)';
    }

    // 6. Push updates to React State UI
    this.onStateUpdate({
      health: this.playerHealth,
      cash: this.cash,
      weedSeeds: this.weedSeeds,
      weedBuds: this.weedBuds,
      gangBeastsMode: this.gangBeastsMode,
      jointStiffness: this.jointStiffness,
      unlockedFurnitureIds: this.unlockedFurnitureIds,
      sceneTemplate: this.sceneTemplate,
      activeStreet: streetName,
      isSprinting: this.keys['shift'] && (Math.abs(this.playerVelocity.x) > 0.1 || Math.abs(this.playerVelocity.z) > 0.1),
      isBuilding: this.activeItemId !== null,
      selectedItemId: this.activeItemId,
      gridSnapSize: this.gridSnapSize,
      activeMount: this.activeMount,
      activeCombatMove: this.activeCombatMove,
      combatLogs: this.combatLogs,
      highlightedItem: this.builder.selectedPropUuid ? this.builder.getItemById(this.scene.getObjectByName(this.builder.selectedPropUuid)?.userData.itemId)?.name || null : null,
      nearDoor: this.findNearestDoor(),
      playerPos: { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
      cameraYaw: this.cameraYaw,
      
      // Fight Club details
      fightQueueStatus: this.fightQueueStatus,
      fightQueueTimer: this.fightQueueTimer,
      currentWeapon: this.currentWeapon,
      fightMode: this.fightMode,
      currentRivals: this.currentRivals.map(r => ({
        id: r.id,
        name: r.name,
        health: r.health,
        maxHealth: r.maxHealth,
        activeWeapon: r.activeWeapon,
        isKO: r.isKO
      }))
    });
  };

  // ─── MOUNTS & MARTIAL ARTS METHODS ────────────────────────────────
  private initPlayerMounts() {
    // 1. Hoverboard
    const boardGroup = new THREE.Group();
    boardGroup.name = 'hoverboard_mount';
    
    const deckGeo = new THREE.BoxGeometry(0.7, 0.08, 1.8);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.1, metalness: 0.8 });
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.castShadow = true;
    boardGroup.add(deckMesh);
    
    const neonGeo = new THREE.BoxGeometry(0.5, 0.04, 1.4);
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const neonMesh = new THREE.Mesh(neonGeo, neonMat);
    neonMesh.position.set(0, -0.06, 0);
    boardGroup.add(neonMesh);

    const finGeo = new THREE.BoxGeometry(0.1, 0.2, 0.3);
    const finMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
    const finL = new THREE.Mesh(finGeo, finMat);
    finL.position.set(-0.3, 0.08, -0.6);
    const finR = finL.clone();
    finR.position.x = 0.3;
    boardGroup.add(finL);
    boardGroup.add(finR);

    const thrusterGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.25, 8);
    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.9 });
    const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(0, -0.02, -0.9);
    boardGroup.add(thruster);

    boardGroup.position.set(0, -0.38, 0);
    boardGroup.visible = false;
    this.playerGroup.add(boardGroup);
    this.hoverboardMesh = boardGroup;

    // 2. Magic Broom
    const broomGroup = new THREE.Group();
    broomGroup.name = 'broom_mount';

    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.8 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.rotation.x = Math.PI / 2;
    broomGroup.add(shaft);

    const brushGeo = new THREE.ConeGeometry(0.24, 0.8, 12);
    const brushMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.95 });
    const brush = new THREE.Mesh(brushGeo, brushMat);
    brush.rotation.x = -Math.PI / 2;
    brush.position.set(0, 0, -1.1);
    broomGroup.add(brush);

    const bandGeo = new THREE.TorusGeometry(0.14, 0.03, 8, 16);
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.set(0, 0, -0.8);
    band.rotation.x = Math.PI / 2;
    broomGroup.add(band);

    const crystalGeo = new THREE.OctahedronGeometry(0.12, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(0, 0.12, 1.1);
    broomGroup.add(crystal);

    const crystalLight = new THREE.PointLight(0xa855f7, 2.5, 5);
    crystalLight.position.set(0, 0.12, 1.1);
    broomGroup.add(crystalLight);

    broomGroup.position.set(0, 0.5, 0);
    broomGroup.visible = false;
    this.playerGroup.add(broomGroup);
    this.broomMesh = broomGroup;
  }

  private initDojoAndDummies() {
    // Dojo platform in a designated grassy zone
    const dojoGroup = new THREE.Group();
    dojoGroup.position.set(8, 0.1, 18);
    dojoGroup.name = 'street_dojo';

    const platformGeo = new THREE.BoxGeometry(9, 0.2, 9);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.receiveShadow = true;
    dojoGroup.add(platform);
    this.city.collisionBoxes.push(new THREE.Box3().setFromObject(platform));

    const matGeo = new THREE.BoxGeometry(7.5, 0.05, 7.5);
    const matMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.9 });
    const matMesh = new THREE.Mesh(matGeo, matMat);
    matMesh.position.y = 0.11;
    dojoGroup.add(matMesh);

    const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    const lanternGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const offsets = [
      [-4.2, -4.2],
      [-4.2, 4.2],
      [4.2, -4.2],
      [4.2, 4.2]
    ];
    offsets.forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 1.25, pz);
      pillar.castShadow = true;
      dojoGroup.add(pillar);

      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(px, 2.6, pz);
      dojoGroup.add(lantern);

      const glow = new THREE.PointLight(0xef4444, 2.5, 6);
      glow.position.set(px, 2.6, pz);
      dojoGroup.add(glow);
      
      this.city.collisionBoxes.push(new THREE.Box3().setFromObject(pillar));
    });

    this.scene.add(dojoGroup);

    const spawnDummy = (id: string, name: string, type: 'wooden' | 'iron' | 'punchbag', localPos: THREE.Vector3) => {
      const dummyGroup = new THREE.Group();
      const worldX = 8 + localPos.x;
      const worldY = 0.2 + localPos.y;
      const worldZ = 18 + localPos.z;
      dummyGroup.position.set(worldX, worldY, worldZ);
      dummyGroup.name = 'dummy_' + id;

      const dummySubGroup = new THREE.Group();
      dummySubGroup.name = 'pivot';
      dummyGroup.add(dummySubGroup);

      let headMesh: THREE.Mesh | THREE.Group | undefined;
      let armLeft: THREE.Mesh | undefined;
      let armRight: THREE.Mesh | undefined;

      if (type === 'wooden') {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
        base.position.y = 0.05;
        dummySubGroup.add(base);

        const trunkGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.6, 10);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.9;
        trunk.castShadow = true;
        dummySubGroup.add(trunk);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), new THREE.MeshStandardMaterial({ color: 0x7c2d12 }));
        head.position.y = 1.8;
        head.castShadow = true;
        dummySubGroup.add(head);
        headMesh = head;

        const pegGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.5, 8);
        const pegMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12 });

        const peg1 = new THREE.Mesh(pegGeo, pegMat);
        peg1.rotation.z = Math.PI / 2.5;
        peg1.rotation.y = 0.2;
        peg1.position.set(0.2, 1.2, 0.15);
        dummySubGroup.add(peg1);
        armLeft = peg1;

        const peg2 = new THREE.Mesh(pegGeo, pegMat);
        peg2.rotation.z = -Math.PI / 2.5;
        peg2.rotation.y = -0.2;
        peg2.position.set(-0.2, 1.2, 0.15);
        dummySubGroup.add(peg2);
        armRight = peg2;
      } else if (type === 'iron') {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.15, 12), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8 }));
        base.position.y = 0.075;
        dummySubGroup.add(base);

        const bodyGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.5, 12);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.3, metalness: 0.9 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9;
        body.castShadow = true;
        dummySubGroup.add(body);

        const stripeGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.2, 12);
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, 1.3, 0);
        dummySubGroup.add(stripe);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.8 }));
        head.position.y = 1.75;
        dummySubGroup.add(head);
        headMesh = head;
      } else {
        const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
        const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), standMat);
        standPole.position.set(-0.6, 1.3, 0);
        standPole.castShadow = true;
        dummyGroup.add(standPole);

        const standArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), standMat);
        standArm.rotation.z = Math.PI / 2;
        standArm.position.set(-0.2, 2.6, 0);
        standArm.castShadow = true;
        dummyGroup.add(standArm);

        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0x000000 }));
        rope.position.set(0, 2.45, 0);
        dummySubGroup.add(rope);

        const bagGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.2, 10);
        const bagMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.8 });
        const bag = new THREE.Mesh(bagGeo, bagMat);
        bag.position.y = 1.7;
        bag.castShadow = true;
        dummySubGroup.add(bag);
        headMesh = bag;
      }

      this.scene.add(dummyGroup);

      const collider = new THREE.Box3().setFromObject(dummyGroup);
      this.city.collisionBoxes.push(collider);

      this.dummies.push({
        id,
        name,
        type,
        mesh: dummyGroup,
        pivotMesh: dummySubGroup,
        initialPos: new THREE.Vector3(worldX, worldY, worldZ),
        health: type === 'iron' ? 500 : 150,
        maxHealth: type === 'iron' ? 500 : 150,
        wobbleAngle: 0,
        wobbleSpeed: 0,
        wobbleAxis: new THREE.Vector3(1, 0, 0),
        impactVelocity: new THREE.Vector3(0, 0, 0),
        collider,
        headMesh,
        armLeft,
        armRight,
        jointRotVelocity: new THREE.Vector3(0, 0, 0),
        jointRot: new THREE.Vector3(0, 0, 0),
      });
    };

    spawnDummy('bob', 'Mannequin Bob (Bois)', 'wooden', new THREE.Vector3(-2.2, 0, -1.8));
    spawnDummy('iron', 'Mannequin d\'Acier Blindé (Métal)', 'iron', new THREE.Vector3(2.2, 0, -1.8));
    spawnDummy('punchbag', 'Sac de Frappe Suspendu', 'punchbag', new THREE.Vector3(0, 0, 2.2));
  }

  public toggleMount(mount: 'hoverboard' | 'broom') {
    if (this.activeMount === mount) {
      this.activeMount = null;
      this.addCombatLog(`🚶 Descendu de la monture (${mount === 'hoverboard' ? 'Hoverboard' : 'Balai'}).`);
    } else {
      this.activeMount = mount;
      this.addCombatLog(`🚀 Monté sur le ${mount === 'hoverboard' ? 'Hoverboard (+120% vitesse)' : 'Balai Magique (Vol 3D - ESPACE / CTRL)'} !`);
    }

    if (this.hoverboardMesh) this.hoverboardMesh.visible = (this.activeMount === 'hoverboard');
    if (this.broomMesh) this.broomMesh.visible = (this.activeMount === 'broom');

    if (!this.activeMount) {
      // Restore legs/arms
      this.leftLeg.position.set(-0.22, 0.45, 0);
      this.rightLeg.position.set(0.22, 0.45, 0);
      this.leftLeg.rotation.set(0, 0, 0);
      this.rightLeg.rotation.set(0, 0, 0);
      this.leftArm.rotation.set(0, 0, 0);
      this.rightArm.rotation.set(0, 0, 0);
    }
  }

  public executeCombatMove(move: 'punch' | 'kick' | 'backflip' | 'sweep' | 'headbutt' | 'grab') {
    if (this.combatCooldown > 0) return;

    this.activeCombatMove = move;
    this.combatMoveTimer = 0.45;
    this.combatCooldown = 0.5;

    let baseDmg = 15;
    let attackReach = 2.4;

    if (move === 'punch') {
      baseDmg = 20;
    } else if (move === 'kick') {
      baseDmg = 35;
      attackReach = 2.8;
    } else if (move === 'backflip') {
      baseDmg = 55;
      attackReach = 3.2;
      this.playerVelocity.y = 7.5;
      this.isGrounded = false;
    } else if (move === 'sweep') {
      baseDmg = 25;
      attackReach = 2.6;
    } else if (move === 'headbutt') {
      baseDmg = 30;
      attackReach = 1.9;
    } else if (move === 'grab') {
      baseDmg = 10;
      attackReach = 2.0;
    }

    // Apply arena weapon modifiers
    let weaponBonusDmg = 0;
    let weaponBonusReach = 0;
    let weaponParticleColor = 0xef4444; // default blood red splash
    let hitPrefix = '🥊';

    if (this.currentWeapon === 'pipe') {
      weaponBonusDmg = 20;
      weaponBonusReach = 0.8;
      weaponParticleColor = 0xe5e7eb; // sparks
      hitPrefix = '🔧 CLANG!';
    } else if (this.currentWeapon === 'bat') {
      weaponBonusDmg = 25;
      weaponBonusReach = 0.9;
      weaponParticleColor = 0xd97706; // wood splinters
      hitPrefix = '🏏 CRACK!';
    } else if (this.currentWeapon === 'bottle') {
      weaponBonusDmg = 15;
      weaponBonusReach = 0.4;
      weaponParticleColor = 0x38bdf8; // glass shards
      hitPrefix = '🍾 SHATTER!';
    } else if (this.currentWeapon === 'hammer') {
      weaponBonusDmg = 45;
      weaponBonusReach = 1.2;
      weaponParticleColor = 0xeab308; // heavy flash
      hitPrefix = '🔨 SLAM!';
      this.combatCooldown = 0.8; // slower recovery
    }

    baseDmg += weaponBonusDmg;
    attackReach += weaponBonusReach;

    this.addCombatLog(`🥋 Martial Arts : Vous lancez un ${move.toUpperCase()} !`);

    // Hitting Active Rivals in Chamber Fight Club
    if (this.fightQueueStatus === 'fighting') {
      this.currentRivals.forEach(rival => {
        if (rival.isKO) return;

        const d = this.playerPos.distanceTo(rival.position);
        if (d < attackReach) {
          const toRival = rival.position.clone().sub(this.playerPos).normalize();
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerGroup.quaternion).normalize();
          const dot = forward.dot(toRival);

          if (move === 'sweep' || move === 'grab' || dot > 0.3) {
            const variance = Math.floor(Math.random() * 11) - 5;
            const damage = Math.max(5, baseDmg + variance);
            
            // Bottle has higher critical hit probability
            const critThreshold = this.currentWeapon === 'bottle' ? 0.6 : 0.25;
            const isCrit = (move === 'backflip') || (Math.random() < critThreshold);
            const finalDmg = isCrit ? Math.floor(damage * 1.5) : damage;

            rival.health = Math.max(0, rival.health - finalDmg);
            rival.wobbleFactor = isCrit ? 2.8 : 1.5; // push physical joint wobble to maximum!

            // Knock back velocity
            const forceScalar = move === 'grab' ? -1.8 : (isCrit ? 6.5 : 3.5);
            const forceVec = toRival.clone().multiplyScalar(forceScalar);
            rival.velocity.add(forceVec);

            // Spawn indicators and particles
            const headPos = rival.position.clone().add(new THREE.Vector3(0, 1.8, 0));
            this.spawnDamageIndicator(`${isCrit ? '🔥 CRITICAL -' : '💢 -'}${finalDmg} HP`, headPos, isCrit);
            this.spawnCombatParticles(weaponParticleColor, headPos.clone().add(new THREE.Vector3(0, -0.6, 0)), isCrit ? 22 : 12);

            this.addCombatLog(`${hitPrefix} : Vous frappez ${rival.name} ! -${finalDmg} PV ! (${Math.ceil(rival.health)}/${rival.maxHealth} HP)`);

            // Check if wall-slam threshold is triggered! (if pushed close to cage octagonal wall)
            const distFromCenter = rival.position.distanceTo(this.fightArenaCenter);
            if (distFromCenter > this.fightArenaRadius - 1.2) {
              const wallSlamDmg = 35;
              rival.health = Math.max(0, rival.health - wallSlamDmg);
              rival.isDazed = true;
              rival.dazedTimer = 1.8;
              rival.velocity.multiplyScalar(-0.4); // rebound flaccidly
              
              const slamPos = rival.position.clone();
              this.spawnDamageIndicator(`💥 WALL SLAM! -${wallSlamDmg} HP`, slamPos.add(new THREE.Vector3(0, 1.2, 0)), true);
              this.spawnCombatParticles(0xff0000, slamPos, 25);
              this.addCombatLog(`💥 CAGE IMPACT : ${rival.name} s'écrase violemment contre la cage métallique ! Assommé !`);
            }

            if (rival.health <= 0) {
              rival.isKO = true;
              this.addCombatLog(`💀 OUT ! ${rival.name} est mis K.O. technique par vos coups !`);
              this.spawnCombatParticles(0xff0000, rival.position.clone().add(new THREE.Vector3(0, 1.0, 0)), 40);
            }
          }
        }
      });
    }

    let hitDummy = false;
    this.dummies.forEach(dummy => {
      const d = this.playerPos.distanceTo(dummy.initialPos);
      if (d < attackReach) {
        const toDummy = dummy.initialPos.clone().sub(this.playerPos).normalize();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.playerGroup.quaternion).normalize();
        const dot = forward.dot(toDummy);

        if (move === 'sweep' || move === 'grab' || dot > 0.35) {
          hitDummy = true;
          const variance = Math.floor(Math.random() * 11) - 5;
          const damage = Math.max(5, baseDmg + variance);
          const isCrit = (move === 'backflip') || (Math.random() < 0.25);
          const finalDmg = isCrit ? Math.floor(damage * 1.5) : damage;

          dummy.health = Math.max(0, dummy.health - finalDmg);

          const forceScalar = move === 'grab' ? -1.8 : (isCrit ? 4.5 : 2.2);
          const forceVec = toDummy.clone().multiplyScalar(forceScalar);
          dummy.impactVelocity.add(forceVec);

          // Apply Toribash joint torque / muscle twist impulse on hit!
          if (dummy.jointRotVelocity) {
            const torque = new THREE.Vector3(
              (Math.random() - 0.5) * (isCrit ? 14.0 : 8.0),
              (Math.random() - 0.5) * (isCrit ? 10.0 : 5.0),
              (Math.random() - 0.5) * (isCrit ? 14.0 : 8.0)
            );
            dummy.jointRotVelocity.add(torque);
          }

          const headPos = dummy.initialPos.clone().add(new THREE.Vector3(0, 1.8, 0));
          this.spawnDamageIndicator(`${isCrit ? '💥 CRITICAL -' : '💢 -'}${finalDmg} HP`, headPos, isCrit);

          const particleColor = dummy.type === 'wooden' ? 0xd97706 : dummy.type === 'iron' ? 0xeab308 : 0xef4444;
          this.spawnCombatParticles(particleColor, headPos.clone().add(new THREE.Vector3(0, -0.6, 0)), 15);

          this.addCombatLog(`🥊 COUP SOLIDE ! ${dummy.name} touchée : -${finalDmg} PV ! (${dummy.health}/${dummy.maxHealth})`);

          if (dummy.health <= 0) {
            this.addCombatLog(`💀 VICTOIRE K.O. ! Vous avez démoli le ${dummy.name} !`);
            this.spawnCombatParticles(0xff0000, dummy.initialPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 35);
            
            dummy.pivotMesh.visible = false;
            dummy.health = dummy.maxHealth;
            
            setTimeout(() => {
              dummy.pivotMesh.visible = true;
              this.spawnCombatParticles(0x3b82f6, dummy.initialPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 20);
              this.addCombatLog(`🔄 Le ${dummy.name} s'est réassemblé pour l'entraînement.`);
            }, 3500);
          }
        }
      }
    });

    if (!hitDummy) {
      const whooshPos = this.playerPos.clone().add(new THREE.Vector3(0, 1.2, 0.8).applyQuaternion(this.playerGroup.quaternion));
      this.spawnCombatParticles(0xf8fafc, whooshPos, 4);
    }
  }

  private addCombatLog(msg: string) {
    this.combatLogs.unshift(msg);
    if (this.combatLogs.length > 8) {
      this.combatLogs.pop();
    }
  }

  private spawnDamageIndicator(text: string, position: THREE.Vector3, isCrit = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, 180, 64);
      
      ctx.font = isCrit ? 'black 26px sans-serif' : 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(text, 90, 32);
      
      ctx.fillStyle = isCrit ? '#f97316' : '#facc15';
      ctx.fillText(text, 90, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(position).add(new THREE.Vector3(Math.random() * 0.3 - 0.15, 0.4, Math.random() * 0.3 - 0.15));
    sprite.scale.set(1.4, 0.5, 1.0);
    this.scene.add(sprite);

    this.damageIndicators.push({
      sprite,
      velocity: new THREE.Vector3(Math.random() * 0.2 - 0.1, 1.5 + Math.random() * 0.5, Math.random() * 0.2 - 0.1),
      life: 1.0,
    });
  }

  private spawnCombatParticles(color: number, position: THREE.Vector3, count = 12) {
    for (let i = 0; i < count; i++) {
      // Vary sizes of wood splinters / metal shards
      const w = 0.03 + Math.random() * 0.08;
      const h = 0.015 + Math.random() * 0.03;
      const d = 0.015 + Math.random() * 0.03;
      const geo = new THREE.BoxGeometry(w, h, d);
      
      const mat = new THREE.MeshStandardMaterial({ 
        color, 
        emissive: color, 
        emissiveIntensity: 1.6,
        roughness: 0.2,
        metalness: 0.8
      });
      
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position).add(new THREE.Vector3(Math.random() * 0.4 - 0.2, Math.random() * 0.4 - 0.2, Math.random() * 0.4 - 0.2));
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5.0,
        (Math.random() - 0.25) * 6.0, // strong upward pop
        (Math.random() - 0.5) * 5.0
      );
      
      this.scene.add(mesh);
      this.combatParticles.push({
        mesh,
        velocity,
        life: 0.6 + Math.random() * 0.4, // randomized lifetime
      });
    }
  }

  private spawnTrailParticle() {
    const isBroom = (this.activeMount === 'broom');
    const color = isBroom ? 0xc084fc : 0x22d3ee;
    const geo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const particle = new THREE.Mesh(geo, mat);
    
    const offset = new THREE.Vector3(0, isBroom ? 0.3 : -0.38, isBroom ? -0.8 : -0.6);
    offset.applyQuaternion(this.playerGroup.quaternion);
    particle.position.copy(this.playerPos).add(offset);
    
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.2) * 0.2,
      (Math.random() - 0.5) * 0.4
    );

    this.scene.add(particle);
    this.mountParticles.push({
      mesh: particle,
      velocity,
      life: 0.4,
    });
  }

  // ─── WEED CULTIVATION & COMMERCE SYSTEM ───────────────────────────
  private loadEconomy() {
    try {
      const c = localStorage.getItem('troxt_game_cash');
      if (c !== null) this.cash = Number(c);
      
      const s = localStorage.getItem('troxt_game_seeds');
      if (s !== null) this.weedSeeds = Number(s);
      
      const b = localStorage.getItem('troxt_game_buds');
      if (b !== null) this.weedBuds = Number(b);
      
      const g = localStorage.getItem('troxt_game_gangbeasts');
      if (g !== null) this.gangBeastsMode = (g === 'true');
      
      const js = localStorage.getItem('troxt_game_jointstiffness');
      if (js !== null) this.jointStiffness = js as any;

      const u = localStorage.getItem('troxt_game_unlocked_props');
      if (u !== null) {
        this.unlockedFurnitureIds = JSON.parse(u);
      }

      const st = localStorage.getItem('troxt_game_scene_template');
      if (st !== null) {
        this.sceneTemplate = st;
      }
    } catch (e) {
      console.warn("Could not load economy states from localstorage", e);
    }
  }

  private saveEconomy() {
    try {
      localStorage.setItem('troxt_game_cash', this.cash.toString());
      localStorage.setItem('troxt_game_seeds', this.weedSeeds.toString());
      localStorage.setItem('troxt_game_buds', this.weedBuds.toString());
      localStorage.setItem('troxt_game_gangbeasts', this.gangBeastsMode.toString());
      localStorage.setItem('troxt_game_jointstiffness', this.jointStiffness);
      localStorage.setItem('troxt_game_unlocked_props', JSON.stringify(this.unlockedFurnitureIds));
      localStorage.setItem('troxt_game_scene_template', this.sceneTemplate);
    } catch (e) {
      console.warn("Could not save economy states", e);
    }
  }

  private loadWeedPlants() {
    try {
      const stored = localStorage.getItem('troxt_game_weed_plants_v2');
      if (stored) {
        const list = JSON.parse(stored);
        list.forEach((p: any) => {
          const mesh = this.createWeedPlantMesh(p.growth, p.waterLevel);
          mesh.position.set(p.position.x, p.position.y, p.position.z);
          this.scene.add(mesh);
          this.weedPlants.push({
            uuid: p.uuid,
            mesh,
            growth: p.growth,
            waterLevel: p.waterLevel,
            stage: p.stage,
            position: p.position
          });
        });
      }
    } catch (e) {
      console.warn("Could not load weed plants", e);
    }
  }

  private saveWeedPlants() {
    try {
      const data = this.weedPlants.map(p => ({
        uuid: p.uuid,
        growth: p.growth,
        waterLevel: p.waterLevel,
        stage: p.stage,
        position: { x: p.position.x, y: p.position.y, z: p.position.z }
      }));
      localStorage.setItem('troxt_game_weed_plants_v2', JSON.stringify(data));
    } catch (e) {
      console.warn("Could not save weed plants", e);
    }
  }

  private createWeedPlantMesh(growth: number, waterLevel: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'weed_plant_mesh';

    // 1. Terracotta flower pot base
    const potGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.35, 10);
    const potMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.8 }); // brown terracotta
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = 0.175;
    pot.castShadow = true;
    pot.receiveShadow = true;
    group.add(pot);

    // Soil
    const soilGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.05, 10);
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.34;
    group.add(soil);

    // Plant leaves & buds scaling with growth stage
    const scale = Math.max(0.12, growth / 100);
    const plantGroup = new THREE.Group();
    plantGroup.scale.set(scale, scale, scale);
    plantGroup.position.y = 0.35;
    group.add(plantGroup);

    // Plant Stalk
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.045, 1.2, 8);
    const stemColor = waterLevel < 20 ? 0x65a30d : 0x15803d; // lighter/drier green if dry
    const stemMat = new THREE.MeshStandardMaterial({ color: stemColor, roughness: 0.6 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.6;
    stem.castShadow = true;
    plantGroup.add(stem);

    // Radial leaves
    const leafGeo = new THREE.BoxGeometry(0.12, 0.02, 0.55);
    const leafColor = waterLevel < 20 ? 0x4d7c0f : 0x166534;
    const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.7 });

    const leafTiers = [0.3, 0.65, 1.0];
    leafTiers.forEach((height, index) => {
      const leavesCount = 4 + index;
      for (let i = 0; i < leavesCount; i++) {
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.y = height;
        leaf.rotation.y = (i * Math.PI * 2) / leavesCount + (index * 0.4);
        leaf.rotation.x = 0.25; // tilt up
        leaf.castShadow = true;
        plantGroup.add(leaf);
      }
    });

    // Golden Amber glowing Cannabis Buds!
    if (growth >= 70) {
      const budGeo = new THREE.DodecahedronGeometry(0.14, 0);
      const budMat = new THREE.MeshStandardMaterial({
        color: 0xeab308, // beautiful ambery trichomes
        emissive: 0x22c55e, // lime neon glowing buds
        emissiveIntensity: 0.35,
        roughness: 0.2
      });
      const topBud = new THREE.Mesh(budGeo, budMat);
      topBud.position.set(0, 1.25, 0);
      topBud.castShadow = true;
      plantGroup.add(topBud);

      // side buds
      const sideOffsets = [
        [0.12, 0.8, 0.08],
        [-0.12, 0.75, -0.08],
        [0.05, 0.9, -0.12]
      ];
      sideOffsets.forEach(([bx, by, bz]) => {
        const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), budMat);
        b.position.set(bx, by, bz);
        b.castShadow = true;
        plantGroup.add(b);
      });
    }

    return group;
  }

  private updateWeedPlants(deltaTime: number) {
    let stateChanged = false;
    this.weedPlants.forEach(plant => {
      // 1. Decay water level
      const dryRate = 2.0; // fully dries out in 50 seconds
      plant.waterLevel = Math.max(0, plant.waterLevel - dryRate * deltaTime);

      // 2. Grow
      if (plant.growth < 100) {
        // grows 4.5x faster if watered
        const speed = plant.waterLevel > 0 ? 4.5 : 1.0; // 22 secs vs 100 secs
        const prevGrowth = plant.growth;
        plant.growth = Math.min(100, plant.growth + speed * deltaTime);

        // recreate plant model if stage changes
        const oldStage = Math.floor(prevGrowth / 33);
        const newStage = Math.floor(plant.growth / 33);
        if (oldStage !== newStage || plant.growth === 100 || (Math.random() < 0.02)) {
          this.scene.remove(plant.mesh);
          const newMesh = this.createWeedPlantMesh(plant.growth, plant.waterLevel);
          newMesh.position.copy(plant.mesh.position);
          this.scene.add(newMesh);
          plant.mesh = newMesh;
          plant.stage = Math.min(3, newStage);
          stateChanged = true;
        }
      }
    });

    if (stateChanged || (this.weedPlants.length > 0 && Math.random() < 0.08)) {
      this.saveWeedPlants();
    }
  }

  public plantWeedSeed() {
    if (this.weedSeeds <= 0) {
      this.addCombatLog("⚠️ ÉCHEC : Vous n'avez pas de Graines de Cannabis ! Achetez-en au Dispensaire.");
      return;
    }

    if (this.weedPlants.length >= 15) {
      this.addCombatLog("⚠️ ÉCHEC : Limite de 15 plantes de Cannabis cultivées simultanément atteinte.");
      return;
    }

    this.weedSeeds--;
    this.addCombatLog("🌱 PLANTATION : Graine de Cannabis plantée ! Arrosez-la avec [E].");

    const uuid = 'weed_' + Math.random().toString(36).substring(2, 9);
    const plantPos = this.playerPos.clone();
    
    // Plant directly onto the ground where player stands
    const mesh = this.createWeedPlantMesh(0, 100);
    mesh.position.set(plantPos.x, plantPos.y, plantPos.z);
    this.scene.add(mesh);

    this.weedPlants.push({
      uuid,
      mesh,
      growth: 0,
      waterLevel: 100,
      stage: 0,
      position: { x: plantPos.x, y: plantPos.y, z: plantPos.z }
    });

    this.spawnCombatParticles(0x22c55e, plantPos.clone().add(new THREE.Vector3(0, 0.4, 0)), 12);
    this.saveEconomy();
    this.saveWeedPlants();
  }

  private initShopsAndAura() {
    // 1. Weed Dispensary
    const dispGroup = new THREE.Group();
    dispGroup.position.set(-8, 0.04, 5);
    dispGroup.name = 'shop_dispensary';
    this.scene.add(dispGroup);

    // Green glowing cylinder circle
    const padGeo = new THREE.CylinderGeometry(2.0, 2.0, 0.04, 16);
    const padMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.2 });
    const pad = new THREE.Mesh(padGeo, padMat);
    dispGroup.add(pad);

    // Glowing rim
    const ringGeo = new THREE.TorusGeometry(2.0, 0.04, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    dispGroup.add(ring);

    // spinning floating central green sign (Stylised leaves)
    const leafGroup = new THREE.Group();
    leafGroup.position.y = 1.3;
    dispGroup.add(leafGroup);
    this.dispensarySign = leafGroup;

    const boxGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
    const leafMat3d = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.1, metalness: 0.5 });
    const verticalStem = new THREE.Mesh(boxGeo, leafMat3d);
    leafGroup.add(verticalStem);

    for (let i = 0; i < 5; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.6), leafMat3d);
      blade.rotation.y = (i * Math.PI) / 5;
      blade.position.y = 0.05;
      leafGroup.add(blade);
    }

    // Green glow light
    const dispLight = new THREE.PointLight(0x10b981, 5.0, 6);
    dispLight.position.set(0, 1.5, 0);
    dispGroup.add(dispLight);


    // 2. GMod Premium Store
    const storeGroup = new THREE.Group();
    storeGroup.position.set(-12, 0.04, -15);
    storeGroup.name = 'shop_premium_store';
    this.scene.add(storeGroup);

    // Purple glowing cylinder circle
    const padGeoPurp = new THREE.CylinderGeometry(2.0, 2.0, 0.04, 16);
    const padMatPurp = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.2 });
    const padPurp = new THREE.Mesh(padGeoPurp, padMatPurp);
    storeGroup.add(padPurp);

    // Glowing rim
    const ringGeoPurp = new THREE.TorusGeometry(2.0, 0.04, 8, 24);
    const ringMatPurp = new THREE.MeshBasicMaterial({ color: 0x8b5cf6 });
    const ringPurp = new THREE.Mesh(ringGeoPurp, ringMatPurp);
    ringPurp.rotation.x = Math.PI / 2;
    storeGroup.add(ringPurp);

    // spinning floating central star
    const starGroup = new THREE.Group();
    starGroup.position.y = 1.4;
    storeGroup.add(starGroup);
    this.premiumStoreSign = starGroup;

    const starBox1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.1 }));
    starGroup.add(starBox1);
    const starBox2 = starBox1.clone();
    starBox2.rotation.set(Math.PI / 4, Math.PI / 4, 0);
    starGroup.add(starBox2);

    // Purple light glow
    const storeLight = new THREE.PointLight(0x8b5cf6, 5.0, 6);
    storeLight.position.set(0, 1.5, 0);
    storeGroup.add(storeLight);
  }

  // Transaction API for React Components
  public buyWeedSeed() {
    const cost = 15;
    if (this.cash >= cost) {
      this.cash -= cost;
      this.weedSeeds++;
      this.addCombatLog(`💰 TRANSACTION : Acheté 1x Graine pour $${cost}. (Graines: ${this.weedSeeds})`);
      this.saveEconomy();
    } else {
      this.addCombatLog(`⚠️ ÉCHEC : Cash insuffisant ! Vous avez besoin de $${cost}.`);
    }
  }

  public sellWeedBud() {
    const payout = 50;
    if (this.weedBuds > 0) {
      this.weedBuds--;
      this.cash += payout;
      this.addCombatLog(`💰 TRANSACTION : Vendu 1x Tête de Cannabis pour +$${payout} !`);
      this.saveEconomy();
    } else {
      this.addCombatLog("⚠️ ÉCHEC : Vous n'avez pas de Têtes de Cannabis à vendre !");
    }
  }

  public sellAllWeedBuds() {
    const payout = 50;
    if (this.weedBuds > 0) {
      const sold = this.weedBuds;
      const totalGain = sold * payout;
      this.weedBuds = 0;
      this.cash += totalGain;
      this.addCombatLog(`💰 RECOLTE FINANCIÈRE : Vendu ${sold}x Têtes pour +$${totalGain} !!`);
      this.saveEconomy();
    } else {
      this.addCombatLog("⚠️ ÉCHEC : Vous n'avez aucune Tête de Cannabis dans votre inventaire.");
    }
  }

  public buySeedPack() {
    const cost = 70; // buy 5 seeds for $70 (saves $5)
    if (this.cash >= cost) {
      this.cash -= cost;
      this.weedSeeds += 5;
      this.addCombatLog(`💰 TRANSACTION : Pack de 5x Graines acheté pour $${cost}.`);
      this.saveEconomy();
    } else {
      this.addCombatLog(`⚠️ ÉCHEC : Cash insuffisant ! Vous avez besoin de $${cost}.`);
    }
  }

  public unlockPremiumFurniture(itemId: string, cost: number) {
    if (this.unlockedFurnitureIds.includes(itemId)) {
      this.addCombatLog("⚠️ INFO : Cet élément est déjà débloqué !");
      return;
    }
    if (this.cash >= cost) {
      this.cash -= cost;
      this.unlockedFurnitureIds.push(itemId);
      this.addCombatLog(`🎉 DÉBLOCAGE : Meuble Premium [${itemId.toUpperCase()}] débloqué pour GMod !`);
      this.saveEconomy();
    } else {
      this.addCombatLog(`⚠️ ÉCHEC : Cash insuffisant ! Déblocage requis: $${cost}.`);
    }
  }

  public setGangBeastsMode(active: boolean) {
    this.gangBeastsMode = active;
    this.addCombatLog(active ? "🤪 GANG BEASTS : Activé ! Vous êtes extrêmement FLASQUE et DRÔLE !" : "🚶 MODE SÉRIEUX : Activé. Physique classique.");
    this.saveEconomy();
  }

  public setJointStiffness(stiffness: 'stiff' | 'relaxed' | 'floppy') {
    this.jointStiffness = stiffness;
    this.addCombatLog(`🥋 RIGIDITÉ TORIBASH : Joints réglés sur [${stiffness.toUpperCase()}] !`);
    this.saveEconomy();
  }

  public setSceneTemplate(template: string) {
    this.sceneTemplate = template;
    this.saveEconomy();
    if (this.city) {
      this.city.rebuildResidentialHouses(template);
      this.addCombatLog(`🏗️ BUILDER 5D : Layout de scène changé vers [${template.toUpperCase()}] !`);
    }
  }

  // ─── CHAMBER FIGHT CLUB ENGINE ─────────────────────────────────────
  
  public initFightChamber() {
    this.fightChamberGroup = new THREE.Group();
    this.fightChamberGroup.name = "fight_chamber";
    this.scene.add(this.fightChamberGroup);

    // 1. Raised concrete Octagonal Platform
    const platformGeo = new THREE.CylinderGeometry(this.fightArenaRadius + 0.3, this.fightArenaRadius + 0.6, 0.4, 8);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
      metalness: 0.1
    });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.position.copy(this.fightArenaCenter).setY(0.2);
    platformMesh.receiveShadow = true;
    this.fightChamberGroup.add(platformMesh);

    // Visual circle on floor
    const circleGeo = new THREE.RingGeometry(this.fightArenaRadius - 0.5, this.fightArenaRadius - 0.3, 8);
    const circleMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const circleMesh = new THREE.Mesh(circleGeo, circleMat);
    circleMesh.rotation.x = Math.PI / 2;
    circleMesh.position.copy(this.fightArenaCenter).setY(0.41);
    this.fightChamberGroup.add(circleMesh);

    // Glowing Neon Sign hovering above
    const signBoxGeo = new THREE.BoxGeometry(3.5, 0.6, 0.2);
    const signBoxMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.7 });
    const signBox = new THREE.Mesh(signBoxGeo, signBoxMat);
    signBox.position.copy(this.fightArenaCenter).setY(4.5);
    this.fightChamberGroup.add(signBox);

    const signTextGeo = new THREE.BoxGeometry(3.3, 0.4, 0.24);
    const signTextMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1.5
    });
    const signText = new THREE.Mesh(signTextGeo, signTextMat);
    signText.position.copy(signBox.position);
    this.fightChamberGroup.add(signText);

    // 2. Spawn 8 Metal cage pillars and chain-link fencing
    const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.0, 6);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });

    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5,
      metalness: 0.8,
      transparent: true,
      opacity: 0.38,
      wireframe: true
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = this.fightArenaCenter.x + Math.cos(angle) * this.fightArenaRadius;
      const z = this.fightArenaCenter.z + Math.sin(angle) * this.fightArenaRadius;

      // Pillars
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 2.2, z);
      pillar.castShadow = true;
      this.fightChamberGroup.add(pillar);
      this.fightChamberPillars.push(pillar);

      // Add to collisionBoxes to block player movement through pillars
      const pCol = new THREE.Box3().setFromObject(pillar);
      this.city.collisionBoxes.push(pCol);

      // Fence panel to next pillar
      const nextAngle = ((i + 1) / 8) * Math.PI * 2;
      const nx = this.fightArenaCenter.x + Math.cos(nextAngle) * this.fightArenaRadius;
      const nz = this.fightArenaCenter.z + Math.sin(nextAngle) * this.fightArenaRadius;

      const midX = (x + nx) / 2;
      const midZ = (z + nz) / 2;
      const dist = Math.sqrt((nx - x) ** 2 + (nz - z) ** 2);

      // Draw wire mesh wall except at segment 0 (the Gate)
      if (i !== 0) {
        const fenceGeo = new THREE.BoxGeometry(dist, 3.2, 0.05);
        const fence = new THREE.Mesh(fenceGeo, fenceMat);
        fence.position.set(midX, 1.8, midZ);
        
        // Yaw rotation to align with segment
        const segmentYaw = -Math.atan2(nz - z, nx - x);
        fence.rotation.y = segmentYaw;
        this.fightChamberGroup.add(fence);

        // Add wall collider
        const fCol = new THREE.Box3().setFromObject(fence);
        this.city.collisionBoxes.push(fCol);
      } else {
        // This is segment 0: THE GATE!
        // We spawn a glowing barricade that activates when the fight starts
        const gateGeo = new THREE.BoxGeometry(dist, 3.2, 0.15);
        const gateMat = new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xf97316,
          emissiveIntensity: 0.1,
          transparent: true,
          opacity: 0.8
        });
        this.fightGateMesh = new THREE.Mesh(gateGeo, gateMat);
        // Initially placed underground (open)
        this.fightGateMesh.position.set(midX, -10, midZ);
        this.fightGateMesh.rotation.y = -Math.atan2(nz - z, nx - x);
        this.fightChamberGroup.add(this.fightGateMesh);

        // Prepare collider box (initially empty or set way below ground)
        this.fightGateCollider = new THREE.Box3();
        this.fightGateCollider.setFromCenterAndSize(new THREE.Vector3(midX, -10, midZ), new THREE.Vector3(dist, 3.2, 0.5));
        this.city.collisionBoxes.push(this.fightGateCollider);
      }
    }

    // Overhead spotlights
    const spotGeo = new THREE.ConeGeometry(0.4, 0.8, 8);
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const spotlightCone = new THREE.Mesh(spotGeo, spotMat);
    spotlightCone.position.copy(this.fightArenaCenter).setY(4.9);
    spotlightCone.rotation.x = Math.PI;
    this.fightChamberGroup.add(spotlightCone);

    const matchLight = new THREE.SpotLight(0xfffbeb, 6.0, 18, Math.PI / 3, 0.6, 1);
    matchLight.position.copy(this.fightArenaCenter).setY(4.8);
    matchLight.target = platformMesh;
    this.fightChamberGroup.add(matchLight);
  }

  public joinFightQueue(mode: '1v1' | 'ffa') {
    if (this.fightQueueStatus !== 'idle') return;
    this.fightQueueStatus = 'queuing';
    this.fightMode = mode;
    this.fightQueueTimer = 0;
    this.queueProgressTimer = 0;
    this.addCombatLog(`🥊 MATCHMAKING : Vous entrez dans la file d'attente pour le combat [${mode.toUpperCase()}] !`);
  }

  public leaveFightQueue() {
    if (this.fightQueueStatus === 'queuing') {
      this.fightQueueStatus = 'idle';
      this.fightMode = 'none';
      this.addCombatLog("❌ MATCHMAKING : Recherche de combat annulée.");
    } else if (this.fightQueueStatus === 'fighting') {
      // Forfeit / Teleport out
      this.fightQueueStatus = 'idle';
      this.fightMode = 'none';
      
      // Open cage gates
      this.fightGateActive = false;
      this.fightGateMesh.position.y = -10;
      this.fightGateCollider.setFromCenterAndSize(new THREE.Vector3(0,-10,0), new THREE.Vector3(0.1,0.1,0.1));

      // Reset weapon
      this.currentWeapon = 'none';
      if (this.playerWeaponMesh) {
        this.playerGroup.remove(this.playerWeaponMesh);
        this.playerWeaponMesh = null;
      }

      // Teleport to dojo
      this.playerPos.set(20, 1.2, 10);
      this.playerVelocity.set(0, 0, 0);

      // Clean rivals
      this.currentRivals.forEach(rival => {
        this.scene.remove(rival.mesh);
      });
      this.currentRivals = [];

      // Clean spawned weapons
      if (this.spawnedWeapon) {
        this.scene.remove(this.spawnedWeapon.mesh);
        this.spawnedWeapon = null;
      }

      this.addCombatLog("🏳️ COMBAT : Vous avez déclaré forfait ! Téléportation en sécurité vers le Dojo.");
    }
  }

  private startFight() {
    this.fightQueueStatus = 'fighting';
    
    // Teleport player into ring
    this.playerPos.copy(this.fightArenaCenter).add(new THREE.Vector3(0, 0.8, 3.2));
    this.playerVelocity.set(0, 0, 0);

    // Lock cage gates physically & visually
    this.fightGateActive = true;
    this.fightGateMesh.position.y = 1.8;
    if (this.fightGateMesh.material && !(this.fightGateMesh.material instanceof Array)) {
      (this.fightGateMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
    }
    // Update active collider to block exit
    this.fightGateCollider.setFromObject(this.fightGateMesh);

    // Spawners reset
    if (this.spawnedWeapon) {
      this.scene.remove(this.spawnedWeapon.mesh);
      this.spawnedWeapon = null;
    }
    this.weaponSpawnTimer = 0;

    // Reset player weapon
    this.currentWeapon = 'none';
    if (this.playerWeaponMesh) {
      this.playerGroup.remove(this.playerWeaponMesh);
      this.playerWeaponMesh = null;
    }

    // Spawn Rivals
    this.currentRivals = [];
    const names1v1 = ["Ivan le Terrible (Champion Octogone)", "Alistair le Cogneur", "Conor le Pitbull", "Zlatan le Briseur"];
    const namesFFA = ["Sandro le Chauve", "Baki le Gringo", "Mike le Flasque", "Ronda la Cogneuse", "Gérard la Fureur"];

    const count = this.fightMode === '1v1' ? 1 : 3;
    const namesPool = this.fightMode === '1v1' ? names1v1 : namesFFA;

    for (let i = 0; i < count; i++) {
      const angle = ((i + 1.5) / (count + 1)) * Math.PI * 2;
      const rx = this.fightArenaCenter.x + Math.cos(angle) * (this.fightArenaRadius - 2.5);
      const rz = this.fightArenaCenter.z + Math.sin(angle) * (this.fightArenaRadius - 2.5);
      const rPos = new THREE.Vector3(rx, 0.8, rz);

      // Create physical mesh for Rival
      const rivalGroup = new THREE.Group();
      rivalGroup.position.copy(rPos);
      this.scene.add(rivalGroup);

      // Color scheme
      const jacketColor = [0xef4444, 0x8b5cf6, 0xf59e0b, 0x10b981][i % 4];

      // Torso
      const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.35);
      const torsoMat = new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.7 });
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.set(0, 1.1, 0);
      torso.castShadow = true;
      rivalGroup.add(torso);

      // Head
      const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xffe4e6, roughness: 0.6 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, 1.75, 0);
      head.castShadow = true;
      rivalGroup.add(head);

      // Angry eyes or band
      const bandGeo = new THREE.BoxGeometry(0.44, 0.1, 0.44);
      const bandMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.set(0, 1.82, 0);
      rivalGroup.add(band);

      // Left Arm
      const armGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe4e6 });
      const leftArm = new THREE.Mesh(armGeo, skinMat);
      leftArm.position.set(-0.46, 1.1, 0);
      leftArm.castShadow = true;
      rivalGroup.add(leftArm);

      // Right Arm
      const rightArm = new THREE.Mesh(armGeo, skinMat);
      rightArm.position.set(0.46, 1.1, 0);
      rightArm.castShadow = true;
      rivalGroup.add(rightArm);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.24, 0.8, 0.24);
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(-0.2, 0.4, 0);
      leftLeg.castShadow = true;
      rivalGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(0.2, 0.4, 0);
      rightLeg.castShadow = true;
      rivalGroup.add(rightLeg);

      const rName = namesPool[Math.floor(Math.random() * namesPool.length)] + ` #${Math.floor(Math.random() * 90 + 10)}`;

      this.currentRivals.push({
        id: `rival_${i}_${Date.now()}`,
        name: rName,
        mesh: rivalGroup,
        head: head,
        leftArm: leftArm,
        rightArm: rightArm,
        leftLeg: leftLeg,
        rightLeg: rightLeg,
        health: this.fightMode === '1v1' ? 250 : 150,
        maxHealth: this.fightMode === '1v1' ? 250 : 150,
        isKO: false,
        isDazed: false,
        dazedTimer: 0,
        speed: 2.8 + Math.random() * 1.5,
        velocity: new THREE.Vector3(0,0,0),
        position: rivalGroup.position,
        activeWeapon: 'none',
        weaponMesh: null,
        activeCombatMove: null,
        combatMoveTimer: 0,
        attackCooldown: 1.0 + Math.random() * 1.5,
        personality: ['aggressive', 'defensive', 'brawler'][i % 3] as any,
        wobbleFactor: 1.0
      });
    }

    this.addCombatLog(`💥 COMBAT EN COURS ! Pas de règles. Tous les coups sont permis. Battez-vous jusqu'au KO !`);
  }

  private spawnArenaWeapon() {
    if (this.spawnedWeapon) return;

    const weapons: ('pipe' | 'bat' | 'bottle' | 'hammer')[] = ['pipe', 'bat', 'bottle', 'hammer'];
    const type = weapons[Math.floor(Math.random() * weapons.length)];

    const group = new THREE.Group();
    group.position.copy(this.fightArenaCenter).setY(1.0);
    this.scene.add(group);

    // Glowing stand indicator
    const standGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 12);
    const standMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.6 });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.set(0, -0.9, 0);
    group.add(stand);

    // Build visual representation
    if (type === 'pipe') {
      const cyGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6);
      const cyMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
      const m = new THREE.Mesh(cyGeo, cyMat);
      m.rotation.z = Math.PI / 3;
      group.add(m);
    } else if (type === 'bat') {
      const cyGeo = new THREE.CylinderGeometry(0.07, 0.03, 1.4, 8);
      const cyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
      const m = new THREE.Mesh(cyGeo, cyMat);
      m.rotation.z = Math.PI / 4;
      group.add(m);
    } else if (type === 'bottle') {
      const cyGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.7, 8);
      const cyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.8, roughness: 0.1 });
      const m = new THREE.Mesh(cyGeo, cyMat);
      group.add(m);
    } else if (type === 'hammer') {
      const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.rotation.z = Math.PI / 2.5;
      group.add(handle);

      const headGeo = new THREE.BoxGeometry(0.35, 0.22, 0.22);
      const headMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0.5, 0.2, 0);
      group.add(head);
    }

    const col = new THREE.Box3().setFromObject(group);

    this.spawnedWeapon = {
      mesh: group,
      type: type,
      pickupCollider: col
    };

    this.addCombatLog(`🎁 ARME : Un(e) ${type.toUpperCase()} sauvage apparaît au centre de la cage ! Ramassez-la !`);
  }

  public updateFightClub(deltaTime: number) {
    // 1. Process matchmaking queue timers
    if (this.fightQueueStatus === 'queuing') {
      this.queueProgressTimer += deltaTime;
      if (this.queueProgressTimer >= 1.0) {
        this.fightQueueTimer += 1;
        this.queueProgressTimer = 0;

        if (this.fightQueueTimer === 3) {
          this.fightQueueStatus = 'match_ready';
          this.addCombatLog("⚡ MATCH TROUVÉ ! Connexion aux serveurs de l'Arène...");
        }
      }
    } else if (this.fightQueueStatus === 'match_ready') {
      this.queueProgressTimer += deltaTime;
      if (this.queueProgressTimer >= 1.5) {
        this.queueProgressTimer = 0;
        this.startFight();
      }
    }

    // 2. Active Fight Phase Loop
    if (this.fightQueueStatus === 'fighting') {
      // Manage Weapon Spawn Loop
      if (!this.spawnedWeapon) {
        this.weaponSpawnTimer += deltaTime;
        if (this.weaponSpawnTimer >= 11.0) {
          this.weaponSpawnTimer = 0;
          this.spawnArenaWeapon();
        }
      } else {
        // Rotate spawned floating weapon
        this.spawnedWeapon.mesh.rotation.y += 2.0 * deltaTime;
        this.spawnedWeapon.mesh.position.y = 1.0 + Math.sin(Date.now() * 0.005) * 0.12;
        this.spawnedWeapon.pickupCollider.setFromObject(this.spawnedWeapon.mesh);

        // Pickup collision: check if player is close enough
        const distToPlayer = this.playerPos.distanceTo(this.fightArenaCenter);
        if (distToPlayer < 1.6) {
          // Player picks it up!
          const type = this.spawnedWeapon.type;
          this.currentWeapon = type;
          
          this.scene.remove(this.spawnedWeapon.mesh);
          this.spawnedWeapon = null;
          
          this.addCombatLog(`🎒 ÉQUIPEMENT : Vous ramassez l'arme : ${type.toUpperCase()} ! Dégâts augmentés !`);
          this.spawnCombatParticles(0xf59e0b, this.playerPos.clone().add(new THREE.Vector3(0,0.5,0)), 20);

          // Add visual weapon inside player's right hand mesh!
          if (this.playerWeaponMesh) {
            this.playerGroup.remove(this.playerWeaponMesh);
          }
          
          this.playerWeaponMesh = new THREE.Group();
          const cyGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6);
          const cyMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
          const visualItem = new THREE.Mesh(cyGeo, cyMat);
          visualItem.rotation.x = Math.PI / 2;
          this.playerWeaponMesh.add(visualItem);
          this.playerWeaponMesh.position.set(0.48, 0.2, -0.4);
          this.playerGroup.add(this.playerWeaponMesh);
        } else {
          // Check if any rival picks it up!
          for (let rival of this.currentRivals) {
            if (!rival.isKO && rival.activeWeapon === 'none' && rival.position.distanceTo(this.fightArenaCenter) < 1.8) {
              rival.activeWeapon = this.spawnedWeapon.type;
              this.scene.remove(this.spawnedWeapon.mesh);
              this.spawnedWeapon = null;
              this.addCombatLog(`⚠️ ARME : ${rival.name} a ramassé l'arme au sol ! Attention !`);
              break;
            }
          }
        }
      }

      // Update Rivals AI & Physics
      let livingRivalsCount = 0;

      this.currentRivals.forEach(rival => {
        if (rival.isKO) {
          // Collapse fully flaccid / ragdoll floppiness physics on KO
          rival.mesh.rotation.x = THREE.MathUtils.lerp(rival.mesh.rotation.x, Math.PI / 2, 0.12);
          rival.mesh.position.y = THREE.MathUtils.lerp(rival.mesh.position.y, 0.25, 0.1);
          return;
        }

        livingRivalsCount++;

        // Handle Daze Stun
        if (rival.isDazed) {
          rival.dazedTimer -= deltaTime;
          rival.mesh.rotation.z = Math.sin(Date.now() * 0.04) * 0.25; // dizzy wobble animation
          
          // floppy arms
          rival.leftArm.rotation.z = Math.sin(Date.now() * 0.01) * 0.8;
          rival.rightArm.rotation.z = -Math.sin(Date.now() * 0.01) * 0.8;

          if (rival.dazedTimer <= 0) {
            rival.isDazed = false;
            rival.mesh.rotation.z = 0;
            this.addCombatLog(`🔄 RÉCUPÉRATION : ${rival.name} retrouve ses esprits !`);
          }
          
          // Apply flaccid sliding drag
          rival.velocity.multiplyScalar(0.92);
          rival.position.add(rival.velocity.clone().multiplyScalar(deltaTime));
          return;
        }

        // Target Selection:
        // In FFA, fight closest target (either player or other living rival)
        let targetPos = this.playerPos;
        let targetIsPlayer = true;

        if (this.fightMode === 'ffa') {
          let closestDist = this.playerPos.distanceTo(rival.position);
          this.currentRivals.forEach(other => {
            if (other.id !== rival.id && !other.isKO) {
              const d = other.position.distanceTo(rival.position);
              if (d < closestDist) {
                closestDist = d;
                targetPos = other.position;
                targetIsPlayer = false;
              }
            }
          });
        }

        // Chase Target Angle
        const diff = targetPos.clone().sub(rival.position);
        diff.y = 0;
        const distToTarget = diff.length();
        const targetAngle = -Math.atan2(diff.z, diff.x) - Math.PI / 2;

        // Smoothly rotate rival torso to look at target
        rival.mesh.rotation.y = THREE.MathUtils.lerp(rival.mesh.rotation.y, targetAngle, 0.12);

        // Move towards target if too far
        const desiredReach = rival.activeWeapon !== 'none' ? 2.4 : 1.6;

        if (distToTarget > desiredReach) {
          const moveDir = diff.clone().normalize();
          rival.velocity.copy(moveDir.multiplyScalar(rival.speed));

          // Fun walk leg swing animation (floppy physics look!)
          rival.leftLeg.rotation.x = Math.sin(Date.now() * 0.012) * 0.65;
          rival.rightLeg.rotation.x = -Math.sin(Date.now() * 0.012) * 0.65;
          rival.leftArm.rotation.x = -Math.sin(Date.now() * 0.012) * 0.55;
          rival.rightArm.rotation.x = Math.sin(Date.now() * 0.012) * 0.55;
        } else {
          // Standing face-to-face: stop and attack!
          rival.velocity.set(0, 0, 0);
          rival.leftLeg.rotation.x = THREE.MathUtils.lerp(rival.leftLeg.rotation.x, 0, 0.1);
          rival.rightLeg.rotation.x = THREE.MathUtils.lerp(rival.rightLeg.rotation.x, 0, 0.1);

          // Attack Timer & AI choice
          rival.attackCooldown -= deltaTime;
          if (rival.attackCooldown <= 0) {
            rival.attackCooldown = 1.0 + Math.random() * 1.5;

            // Choose combat move
            const moves: ('punch' | 'kick' | 'headbutt')[] = ['punch', 'kick', 'headbutt'];
            const chosenMove = moves[Math.floor(Math.random() * moves.length)];
            rival.activeCombatMove = chosenMove;
            rival.combatMoveTimer = 0.35;

            // Executing attack visually
            if (chosenMove === 'punch') {
              rival.rightArm.rotation.x = -Math.PI / 2;
            } else if (chosenMove === 'kick') {
              rival.leftLeg.rotation.x = -Math.PI / 2.5;
            } else {
              rival.head.rotation.x = Math.PI / 4;
            }

            // Damage execution logic
            let enemyDmg = chosenMove === 'punch' ? 14 : chosenMove === 'kick' ? 22 : 18;
            if (rival.activeWeapon !== 'none') {
              enemyDmg += 18; // weapon bonus
            }

            if (targetIsPlayer) {
              // Hit player
              this.playerHealth = Math.max(0, this.playerHealth - enemyDmg);
              
              // Apply push force vector to player joint physics
              const pushForce = chosenMove === 'kick' ? 6.5 : 4.0;
              this.playerVelocity.add(diff.clone().normalize().multiplyScalar(pushForce));

              // Show flash effect on screen and indicators
              this.spawnDamageIndicator(`💥 REÇU -${enemyDmg} HP`, this.playerPos.clone().add(new THREE.Vector3(0, 1.8, 0)), true);
              this.spawnCombatParticles(0x991b1b, this.playerPos.clone().add(new THREE.Vector3(0, 0.8, 0)), 12);
              this.addCombatLog(`⚠️ REÇU : ${rival.name} vous frappe avec un ${chosenMove.toUpperCase()} ! -${enemyDmg} PV !`);

              // Check wall-slam threshold for player!
              const playerDistFromCenter = this.playerPos.distanceTo(this.fightArenaCenter);
              if (playerDistFromCenter > this.fightArenaRadius - 1.2) {
                const wsDmg = 35;
                this.playerHealth = Math.max(0, this.playerHealth - wsDmg);
                this.spawnDamageIndicator(`💥 CRASH EN CAGE! -${wsDmg} HP`, this.playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)), true);
                this.spawnCombatParticles(0xff0000, this.playerPos, 22);
                this.addCombatLog(`💥 IMPACT : Vous êtes projeté lourdement contre la grille d'acier ! Assommé !`);
              }
            } else {
              // Hit another rival in FFA!
              this.currentRivals.forEach(targetRival => {
                if (targetRival.position.equals(targetPos) && !targetRival.isKO) {
                  targetRival.health = Math.max(0, targetRival.health - enemyDmg);
                  targetRival.velocity.add(diff.clone().normalize().multiplyScalar(5.0));

                  const hPos = targetRival.position.clone().add(new THREE.Vector3(0, 1.8, 0));
                  this.spawnDamageIndicator(`💢 -${enemyDmg} HP`, hPos, false);
                  this.spawnCombatParticles(0xef4444, hPos.clone().add(new THREE.Vector3(0,-0.6,0)), 10);
                  
                  this.addCombatLog(`⚔️ CHAOS : ${rival.name} tabasse ${targetRival.name} ! -${enemyDmg} PV !`);

                  if (targetRival.health <= 0) {
                    targetRival.isKO = true;
                    this.addCombatLog(`💀 OUT : ${targetRival.name} est KO suite au brawl général !`);
                    this.spawnCombatParticles(0xff0000, targetRival.position.clone().add(new THREE.Vector3(0, 1.0, 0)), 30);
                  }
                }
              });
            }
          }
        }

        // Animate rival attack retraction
        if (rival.activeCombatMove) {
          rival.combatMoveTimer -= deltaTime;
          if (rival.combatMoveTimer <= 0) {
            rival.activeCombatMove = null;
            rival.rightArm.rotation.set(0,0,0);
            rival.leftLeg.rotation.set(0,0,0);
            rival.head.rotation.set(0,0,0);
          }
        }

        // Apply friction and move Rival
        rival.velocity.y = 0; // maintain on platform
        rival.position.add(rival.velocity.clone().multiplyScalar(deltaTime));
        rival.velocity.multiplyScalar(0.8); // high drag

        // Keep inside circular boundary octagon physically
        const distFromCenter = rival.position.distanceTo(this.fightArenaCenter);
        if (distFromCenter > this.fightArenaRadius - 0.4) {
          const pushBack = rival.position.clone().sub(this.fightArenaCenter).normalize().multiplyScalar(this.fightArenaRadius - 0.4);
          rival.position.copy(this.fightArenaCenter).add(pushBack);
        }
      });

      // Victory Condition: Check if all rivals are KO
      if (livingRivalsCount === 0) {
        // Victory!
        const reward = this.fightMode === '1v1' ? 700 : 1200;
        this.cash += reward;
        this.saveEconomy();

        this.fightQueueStatus = 'idle';
        this.fightMode = 'none';

        // Open gates
        this.fightGateActive = false;
        this.fightGateMesh.position.y = -10;
        this.fightGateCollider.setFromCenterAndSize(new THREE.Vector3(0,-10,0), new THREE.Vector3(0.1,0.1,0.1));

        // Reset weapon
        this.currentWeapon = 'none';
        if (this.playerWeaponMesh) {
          this.playerGroup.remove(this.playerWeaponMesh);
          this.playerWeaponMesh = null;
        }

        // Clean rivals meshes
        this.currentRivals.forEach(rival => {
          this.scene.remove(rival.mesh);
        });
        this.currentRivals = [];

        // Clear spawned weapon
        if (this.spawnedWeapon) {
          this.scene.remove(this.spawnedWeapon.mesh);
          this.spawnedWeapon = null;
        }

        this.addCombatLog(`🏆 VICTOIRE SUPRÊME ! Vous avez dominé l'arène de combat ! Gain : +$${reward}`);
        this.spawnCombatParticles(0xeab308, this.playerPos.clone().add(new THREE.Vector3(0,1,0)), 50);
      }

      // Defeat Condition: Check if player health is 0
      if (this.playerHealth <= 0) {
        this.playerHealth = 100;
        this.fightQueueStatus = 'idle';
        this.fightMode = 'none';

        // Open gates
        this.fightGateActive = false;
        this.fightGateMesh.position.y = -10;
        this.fightGateCollider.setFromCenterAndSize(new THREE.Vector3(0,-10,0), new THREE.Vector3(0.1,0.1,0.1));

        // Reset weapon
        this.currentWeapon = 'none';
        if (this.playerWeaponMesh) {
          this.playerGroup.remove(this.playerWeaponMesh);
          this.playerWeaponMesh = null;
        }

        // Teleport to dojo
        this.playerPos.set(20, 1.2, 10);
        this.playerVelocity.set(0, 0, 0);

        // Clean rivals
        this.currentRivals.forEach(rival => {
          this.scene.remove(rival.mesh);
        });
        this.currentRivals = [];

        // Clear spawned weapon
        if (this.spawnedWeapon) {
          this.scene.remove(this.spawnedWeapon.mesh);
          this.spawnedWeapon = null;
        }

        this.addCombatLog("💀 MISE EN K.O. ! Vous avez été étalé par les combattants de la cage. Retour au dojo.");
        this.spawnCombatParticles(0xff0000, this.playerPos, 40);
      }
    }
  }
}