import * as THREE from 'three';

/**
 * Composant physique réutilisable.
 * Gère vélocité, gravité, collisions avec le sol (raycast) et friction.
 * 
 * Usage : à composer dans n'importe quelle Entity (Player, NPC, Projectile...)
 */
export class PhysicsBody {
  public velocity = new THREE.Vector3();
  public isGrounded: boolean = false;
  public mass: number;

  // Pré-allocation pour éviter le GC dans la boucle de rendu
  private readonly _rayOrigin = new THREE.Vector3();
  private readonly _rayDir = new THREE.Vector3(0, -1, 0);
  private readonly _raycaster = new THREE.Raycaster();
  private readonly _moveStep = new THREE.Vector3();

  private readonly gravity: number;
  private readonly groundOffset: number;
  private readonly friction: number;
  private readonly maxFallSpeed: number;

  constructor(opts: {
    mass?: number;
    gravity?: number;
    groundOffset?: number;
    friction?: number;
    maxFallSpeed?: number;
  } = {}) {
    this.mass = opts.mass ?? 1;
    this.gravity = opts.gravity ?? -25;
    this.groundOffset = opts.groundOffset ?? 0.05;
    this.friction = opts.friction ?? 8;
    this.maxFallSpeed = opts.maxFallSpeed ?? -50;
  }

  /**
   * Mise à jour physique : applique gravité, friction et gère le sol.
   * @param mesh Le mesh à déplacer
   * @param delta Delta time
   * @param scene Pour le raycast de détection du sol
   * @param ignoreObjects Objets à ignorer dans le raycast (ex: le joueur lui-même)
   */
  update(
    mesh: THREE.Object3D,
    delta: number,
    scene: THREE.Scene,
    ignoreObjects: THREE.Object3D[] = [],
  ): void {
    // 1. Applique la gravité si en l'air
    if (!this.isGrounded) {
      this.velocity.y += this.gravity * delta;
      this.velocity.y = Math.max(this.velocity.y, this.maxFallSpeed);
    }

    // 2. Friction horizontale (décélération quand pas d'input)
    if (this.isGrounded) {
      const frictionFactor = Math.exp(-this.friction * delta);
      this.velocity.x *= frictionFactor;
      this.velocity.z *= frictionFactor;
    }

    // 3. Applique le mouvement
    this._moveStep.copy(this.velocity).multiplyScalar(delta);
    mesh.position.add(this._moveStep);

    // 4. Détection du sol par raycast
    this._rayOrigin.copy(mesh.position);
    this._rayOrigin.y += 1; // Part du torse vers le bas
    this._raycaster.set(this._rayOrigin, this._rayDir);
    this._raycaster.far = 2 + this.groundOffset;
    
    const hits = this._raycaster.intersectObjects(scene.children, true);
    const groundHit = hits.find(
      (h) => !ignoreObjects.includes(h.object) && !this.isDescendantOf(h.object, ignoreObjects)
    );

    if (groundHit && groundHit.distance <= 1.05 + this.groundOffset) {
      // On snap au sol
      mesh.position.y = groundHit.point.y;
      if (this.velocity.y < 0) this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  }

  /** Applique une impulsion instantanée (saut, recul, explosion...) */
  applyImpulse(impulse: THREE.Vector3): void {
    this.velocity.add(impulse);
  }

  /** Définit la vélocité horizontale (remplace, n'ajoute pas) */
  setHorizontalVelocity(x: number, z: number): void {
    this.velocity.x = x;
    this.velocity.z = z;
  }

  /** Remet la vélocité horizontale à zéro */
  stopHorizontal(): void {
    this.velocity.x = 0;
    this.velocity.z = 0;
  }

  /** Vérifie si un objet est descendant d'un des objets ignorés */
  private isDescendantOf(obj: THREE.Object3D, ignored: THREE.Object3D[]): boolean {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (ignored.includes(current)) return true;
      current = current.parent;
    }
    return false;
  }
}