import * as THREE from 'three';
import type { Game } from './Game';

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================

export interface CameraOptions {
  fov?: number;
  near?: number;
  far?: number;
  distance?: number;
  height?: number;
  sensitivity?: number;
  pitchMin?: number;
  pitchMax?: number;
  smoothing?: number; // 0 = instantané, 1 = très lent (0.1 recommandé)
  collisionMask?: number;
  collisionRadius?: number;
  zoomMin?: number;
  zoomMax?: number;
  zoomSpeed?: number;
}

const DEFAULT_OPTIONS: Required<CameraOptions> = {
  fov: 70,
  near: 0.1,
  far: 500,
  distance: 8,
  height: 3,
  sensitivity: 0.002,
  pitchMin: -1.2,
  pitchMax: 0.5,
  smoothing: 0.12,
  collisionMask: -1,
  collisionRadius: 0.25,
  zoomMin: 2,
  zoomMax: 15,
  zoomSpeed: 1,
};

// ============================================================================
// CAMERA
// ============================================================================

export class Camera implements Disposable {
  public readonly camera: THREE.PerspectiveCamera;

  private readonly game: Game;
  private readonly opts: Required<CameraOptions>;
  private readonly pivot: THREE.Object3D;

  // État interne (sphérique = pas de gimbal lock, pas de sin/cos manuels)
  private readonly spherical = new THREE.Spherical();
  private readonly targetSpherical = new THREE.Spherical();

  // Pré-allocation : ZÉRO allocation par frame (critique pour le GC)
  private readonly _lookTarget = new THREE.Vector3();
  private readonly _desiredPos = new THREE.Vector3();
  private readonly _rayOrigin = new THREE.Vector3();
  private readonly _rayDir = new THREE.Vector3();
  private readonly _forward = new THREE.Vector3(0, 0, -1);
  private readonly _right = new THREE.Vector3(1, 0, 0);

  private readonly raycaster = new THREE.Raycaster();

  // Shake
  private shakeIntensity = 0;
  private shakeDecay = 5;
  private shakeOffset = new THREE.Vector3();

  constructor(game: Game, options: CameraOptions = {}) {
    this.game = game;
    this.opts = { ...DEFAULT_OPTIONS, ...options };

    this.camera = new THREE.PerspectiveCamera(
      this.opts.fov,
      window.innerWidth / window.innerHeight,
      this.opts.near,
      this.opts.far
    );

    this.pivot = new THREE.Object3D();
    this.pivot.add(this.camera);
    game.scene.add(this.pivot);

    // État initial
    this.spherical.set(this.opts.distance, Math.PI / 2 + 0.3, 0);
    this.targetSpherical.copy(this.spherical);

    this.bindEvents();
  }

  // --------------------------------------------------------------------------
  // API PUBLIQUE
  // --------------------------------------------------------------------------

  /** Appelé chaque frame par le game loop. */
  update(delta: number): void {
    this.handleInput();
    this.interpolate(delta);
    this.applyTransform(delta);
    this.updateCachedVectors();
  }

  /** Zoom via molette. delta > 0 = zoom arrière. */
  zoom(delta: number): void {
    this.targetSpherical.radius = THREE.MathUtils.clamp(
      this.targetSpherical.radius + delta * this.opts.zoomSpeed,
      this.opts.zoomMin,
      this.opts.zoomMax
    );
  }

  /** Déclenche un shake. intensity en unités monde, duration en secondes. */
  shake(intensity: number, duration = 0.3): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDecay = intensity / duration;
  }

  /** Recalcule le ratio quand la fenêtre est redimensionnée. */
  handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /** Getters performants : retournent une RÉFÉRENCE partagée.
   *  ⚠️ Ne pas modifier les vecteurs retournés. Cloner si besoin de mutation. */
  get forward(): THREE.Vector3 { return this._forward; }
  get right(): THREE.Vector3 { return this._right; }
  get position(): THREE.Vector3 { return this.camera.getWorldPosition(new THREE.Vector3()); }

  /** Variante "safe" qui clone le résultat (allocation acceptée). */
  getForward(out = new THREE.Vector3()): THREE.Vector3 {
    return out.copy(this._forward);
  }

  getRight(out = new THREE.Vector3()): THREE.Vector3 {
    return out.copy(this._right);
  }

  dispose(): void {
    this.unbindEvents();
    this.game.scene.remove(this.pivot);
  }

  // --------------------------------------------------------------------------
  // INTERNE
  // --------------------------------------------------------------------------

  private handleInput(): void {
    const input = this.game.input;
    if (!document.pointerLockElement) return;

    const { sensitivity, pitchMin, pitchMax } = this.opts;

    // Yaw (horizontal)
    this.targetSpherical.theta -= input.mouse.x * sensitivity;

    // Pitch (vertical) : phi va de 0 (haut) à PI (bas)
    this.targetSpherical.phi = THREE.MathUtils.clamp(
      this.targetSpherical.phi + input.mouse.y * sensitivity,
      Math.PI / 2 - pitchMax,
      Math.PI / 2 - pitchMin
    );

    input.mouse.x = 0;
    input.mouse.y = 0;
  }

  /** Interpolation frame-rate independent. */
  private interpolate(delta: number): void {
    const t = 1 - Math.pow(1 - this.opts.smoothing, delta * 60);

    this.spherical.radius = THREE.MathUtils.lerp(
      this.spherical.radius, this.targetSpherical.radius, t
    );
    this.spherical.theta = THREE.MathUtils.lerp(
      this.spherical.theta, this.targetSpherical.theta, t
    );
    // Attention aux angles : on interpole le plus court chemin
    this.spherical.phi = THREE.MathUtils.lerp(
      this.spherical.phi, this.targetSpherical.phi, t
    );
  }

  private applyTransform(delta: number): void {
    const player = this.game.player.mesh;
    const playerPos = player.position;

    // 1. Pivot = position du joueur + hauteur d'offset (épaules/tête)
    this.pivot.position.set(playerPos.x, playerPos.y + this.opts.height, playerPos.z);

    // 2. Pivot = rotation yaw seulement
    this.pivot.rotation.y = this.spherical.theta;

    // 3. Position désirée de la caméra (locale au pivot, via spherical)
    this._desiredPos.setFromSpherical(this.spherical);

    // 4. COLLISION : raycast du pivot vers la position désirée
    const actualDistance = this.resolveCollision(this.pivot.position, this._desiredPos);
    const safeSpherical = this.spherical.clone();
    safeSpherical.radius = actualDistance;

    this.camera.position.setFromSpherical(safeSpherical);

    // 5. Shake
    if (this.shakeIntensity > 0.001) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * this.shakeIntensity,
        (Math.random() - 0.5) * 2 * this.shakeIntensity,
        (Math.random() - 0.5) * 2 * this.shakeIntensity
      );
      this.camera.position.add(this.shakeOffset);
      this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * delta);
    }

    // 6. Look at : toujours vers la tête du joueur (coordonnées monde)
    this._lookTarget.set(playerPos.x, playerPos.y + this.opts.height, playerPos.z);
    this.camera.lookAt(this._lookTarget);
  }

  /** Raycast pour éviter que la caméra ne traverse les murs. */
  private resolveCollision(origin: THREE.Vector3, desiredLocal: THREE.Vector3): number {
    this._rayOrigin.copy(origin);
    this._rayDir.copy(desiredLocal).normalize();

    this.raycaster.set(this._rayOrigin, this._rayDir);
    this.raycaster.far = this.spherical.radius;
    this.raycaster.layers.mask = this.opts.collisionMask;

    const hits = this.raycaster.intersectObjects(this.game.scene.children, true);
    const hit = hits.find(h => h.distance > 0.1 && h.object !== this.game.player.mesh);

    if (hit) {
      // On ramène la caméra légèrement devant l'obstacle
      return Math.max(this.opts.zoomMin, hit.distance - this.opts.collisionRadius);
    }
    return this.spherical.radius;
  }

  /** Met à jour les vecteurs forward/right en cache. */
  private updateCachedVectors(): void {
    this.camera.getWorldDirection(this._forward);
    this._forward.y = 0;
    this._forward.normalize();
    // right = forward × up (up = 0,1,0) → (-forward.z, 0, forward.x)
    this._right.set(-this._forward.z, 0, this._forward.x);
  }

  // --------------------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------------------

  private onWheel = (e: WheelEvent): void => {
    if (!document.pointerLockElement) return;
    this.zoom(e.deltaY * 0.01);
  };

  private onResize = (): void => this.handleResize();

  private bindEvents(): void {
    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('resize', this.onResize);
  }

  private unbindEvents(): void {
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.onResize);
  }
}