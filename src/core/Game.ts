import * as THREE from 'three';
import { Input } from './Input';
import { Camera } from './Camera';
import { World } from '../world/World';
import { Player } from '../entities/Player';

export class Game {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public camera: Camera;
  public input: Input;
  public player: Player;
  public world: World;

  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  // ⚡ Cache DOM : On ne requête JAMAIS le DOM dans la boucle de rendu
  private appContainer: HTMLElement;
  private hudCoords: HTMLElement | null;

  constructor(containerId: string = 'app', hudCoordsId: string = 'coords') {
    // 1. Résolution DOM sécurisée (plus de crash silencieux avec '!')
    const appEl = document.getElementById(containerId);
    if (!appEl) throw new Error(`Game container #${containerId} not found.`);
    this.appContainer = appEl;
    this.hudCoords = document.getElementById(hudCoordsId);

    // 2. Initialisation Three.js
    this.scene = new THREE.Scene();
    this.setupEnvironment();

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: 'high-performance' 
    });
    this.setupRenderer();
    this.appContainer.appendChild(this.renderer.domElement);

    // 3. Systèmes (L'ordre est important : le World avant le Player/Camera)
    this.clock = new THREE.Clock();
    this.input = new Input();
    this.world = new World(this);
    this.player = new Player(this); // 🐛 Bug corrigé : thisapse -> this
    this.camera = new Camera(this);

    // 4. Événements
    this.bindEvents();
  }

  // --------------------------------------------------------------------------
  // CONFIGURATION
  // --------------------------------------------------------------------------

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ombres
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // 🎨 Color Management (CRUCIAL pour Three.js moderne r152+)
    // Sans ça, les couleurs paraissent délavées et l'éclairage faux.
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  private setupEnvironment(): void {
    const skyColor = 0x87CEEB;
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog = new THREE.Fog(skyColor, 100, 300);

    // Lumière ambiante
    this.scene.add(new THREE.AmbientLight(0x404060, 0.5));

    // Soleil (Directional)
    const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    
    // Optimisation des ombres
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    sun.shadow.bias = -0.0001; // Évite le "shadow acne" (artefacts sur les textures)
    this.scene.add(sun);

    // Lumière hémisphérique (Ciel/Sol)
    this.scene.add(new THREE.HemisphereLight(skyColor, 0x362d1e, 0.6));
  }

  // --------------------------------------------------------------------------
  // CYCLE DE VIE (LIFECYCLE)
  // --------------------------------------------------------------------------

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /** 🧹 Nettoyage complet pour éviter les fuites de mémoire (Memory Leaks) */
  public dispose(): void {
    this.stop();
    this.unbindEvents();

    // 1. Dispose les ressources Three.js (Geometries, Materials, Textures)
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    // 2. Dispose le renderer
    this.renderer.dispose();

    // 3. Retire le canvas du DOM
    this.renderer.domElement.remove();
  }

  // --------------------------------------------------------------------------
  // BOUCLE DE RENDU
  // --------------------------------------------------------------------------

  private animate = (): void => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Clamp le delta pour éviter que la physique n'explose si l'onglet était inactif
    const delta = Math.min(this.clock.getDelta(), 0.05);

    // Mise à jour des systèmes
    this.input.update();
    this.player.update(delta);
    this.camera.update(delta);
    // this.world.update(delta); // À ajouter si le monde a des animations/physique

    // Rendu
    this.renderer.render(this.scene, this.camera.camera);

    // Mise à jour HUD (Ultra-rapide grâce au cache)
    if (this.hudCoords) {
      const p = this.player.mesh.position;
      this.hudCoords.textContent = `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;
    }
  };

  // --------------------------------------------------------------------------
  // ÉVÉNEMENTS
  // --------------------------------------------------------------------------

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.camera.aspect = width / height;
    this.camera.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onCanvasClick = (): void => {
    // Le Pointer Lock doit être demandé sur le Canvas, pas sur le Body
    if (!document.pointerLockElement) {
      this.renderer.domElement.requestPointerLock();
    }
  };

  /** ⏸️ Met en pause le jeu quand on change d'onglet */
  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.stop();
    } else {
      this.start();
    }
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('click', this.onCanvasClick);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('click', this.onCanvasClick);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}