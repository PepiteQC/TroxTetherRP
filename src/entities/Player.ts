import * as THREE from 'three';
import type { Game } from '../core/Game';
import { Entity } from './base/Entity';
import { PhysicsBody } from './base/PhysicsBody';

// ------------------------------------------------------------------
// CONSTANTES
// ------------------------------------------------------------------

const CONFIG = {
  height: 1.8,
  radius: 0.4,
  walkSpeed: 5,
  sprintSpeed: 9,
  jumpForce: 9,
  rotationSpeed: 12,
  // Combat
  attackDuration: 0.35,
  attackCooldown: 0.5,
} as const;

// ------------------------------------------------------------------
// TYPES
// ------------------------------------------------------------------

export type PlayerState =
  | 'idle'
  | 'walking'
  | 'sprinting'
  | 'jumping'
  | 'falling'
  | 'attacking';

export type CombatMove = 'punch' | 'kick' | 'backflip' | 'sweep' | 'headbutt' | 'grab';

// ------------------------------------------------------------------
// PLAYER
// ------------------------------------------------------------------

export class Player extends Entity {
  public readonly physics: PhysicsBody;
  public health: number = 100;
  public maxHealth: number = 100;

  private state: PlayerState = 'idle';
  private currentMove: CombatMove | null = null;
  private attackTimer: number = 0;
  private attackCooldownTimer: number = 0;

  // Pré-allocation (zero allocation par frame)
  private readonly _moveDir = new THREE.Vector3();
  private readonly _cameraForward = new THREE.Vector3();
  private readonly _cameraRight = new THREE.Vector3();
  private readonly _desiredVelocity = new THREE.Vector3();
  private readonly _bodyMesh: THREE.Mesh;
  private readonly _armMesh: THREE.Mesh; // Pour visualiser les attaques

  constructor(game: Game) {
    // Création du mesh composite : capsule pour le corps + bras pour les attaques
    const group = new THREE.Group();

    // Corps (capsule simplifiée = cylindre + 2 sphères)
    const bodyGeo = new THREE.CapsuleGeometry(CONFIG.radius, CONFIG.height - CONFIG.radius * 2, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3498db,
      roughness: 0.7,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = CONFIG.height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Bras (pour feedback visuel des attaques)
    const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xf5d6b4 });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(CONFIG.radius + 0.15, CONFIG.height * 0.7, 0);
    arm.castShadow = true;
    group.add(arm);

    super(game, group);
    this._bodyMesh = body;
    this._armMesh = arm;

    this.physics = new PhysicsBody({
      mass: 75,
      gravity: -25,
      groundOffset: 0.05,
      friction: 10,
    });

    this.addTag('player').addTag('damageable').addTag('controllable');

    // Position de spawn
    this.position.set(0, 0, 0);
  }

  // ------------------------------------------------------------------
  // CYCLE DE VIE
  // ------------------------------------------------------------------

  update(delta: number): void {
    this.updateAttackTimers(delta);
    this.updateMovement(delta);
    this.updatePhysics(delta);
    this.updateAnimation(delta);
    this.syncStateToStore();
  }

  protected onDispose(): void {
    this._bodyMesh.geometry.dispose();
    (this._bodyMesh.material as THREE.Material).dispose();
    this._armMesh.geometry.dispose();
    (this._armMesh.material as THREE.Material).dispose();
  }

  // ------------------------------------------------------------------
  // LOGIQUE
  // ------------------------------------------------------------------

  private updateMovement(delta: number): void {
    const input = this.game.input;
    const keys = input.keys;

    // Pas de mouvement pendant une attaque
    if (this.state === 'attacking') {
      this.physics.stopHorizontal();
      return;
    }

    // 1. Input direction (ZQSD / WASD)
    this._moveDir.set(0, 0, 0);
    if (keys.forward) this._moveDir.z -= 1;
    if (keys.backward) this._moveDir.z += 1;
    if (keys.left) this._moveDir.x -= 1;
    if (keys.right) this._moveDir.x += 1;

    const isMoving = this._moveDir.lengthSq() > 0;
    if (isMoving) this._moveDir.normalize();

    // 2. Oriente la direction selon la caméra (caméra-relative movement)
    this._cameraForward.copy(this.game.camera.forward);
    this._cameraRight.copy(this.game.camera.right);

    this._desiredVelocity.set(0, 0, 0);
    this._desiredVelocity.addScaledVector(this._cameraForward, -this._moveDir.z);
    this._desiredVelocity.addScaledVector(this._cameraRight, this._moveDir.x);

    // 3. Sprint (Shift)
    const isSprinting = keys.sprint && isMoving;
    const speed = isSprinting ? CONFIG.sprintSpeed : CONFIG.walkSpeed;
    this._desiredVelocity.multiplyScalar(speed);

    // 4. Applique la vélocité horizontale
    this.physics.setHorizontalVelocity(this._desiredVelocity.x, this._desiredVelocity.z);

    // 5. Rotation du mesh vers la direction de mouvement (smooth)
    if (isMoving) {
      const targetAngle = Math.atan2(this._desiredVelocity.x, this._desiredVelocity.z);
      const currentAngle = this.mesh.rotation.y;
      const deltaAngle = this.shortestAngleDelta(currentAngle, targetAngle);
      this.mesh.rotation.y += deltaAngle * Math.min(1, CONFIG.rotationSpeed * delta);
    }

    // 6. Saut (Space)
    if (keys.jump && this.physics.isGrounded) {
      this.physics.applyImpulse(new THREE.Vector3(0, CONFIG.jumpForce, 0));
    }

    // 7. Attaque (clic gauche)
    if (input.mouse.left && this.attackCooldownTimer <= 0) {
      this.startAttack('punch');
    }
  }

  private updatePhysics(delta: number): void {
    this.physics.update(this.mesh, delta, this.game.scene, [this.mesh]);
  }

  private updateAttackTimers(delta: number): void {
    if (this.attackTimer > 0) {
      this.attackTimer -= delta;
      if (this.attackTimer <= 0) {
        this.currentMove = null;
        this.attackCooldownTimer = CONFIG.attackCooldown;
      }
    }
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= delta;
    }
  }

  private updateAnimation(delta: number): void {
    // Détermine l'état pour les animations futures
    if (this.currentMove) {
      this.state = 'attacking';
    } else if (!this.physics.isGrounded) {
      this.state = this.physics.velocity.y > 0 ? 'jumping' : 'falling';
    } else {
      const speed2 = this.physics.velocity.x ** 2 + this.physics.velocity.z ** 2;
      if (speed2 > 60) this.state = 'sprinting';
      else if (speed2 > 0.1) this.state = 'walking';
      else this.state = 'idle';
    }

    // Animation basique du bras pour le punch
    if (this.state === 'attacking' && this.currentMove === 'punch') {
      const t = 1 - this.attackTimer / CONFIG.attackDuration;
      // Mouvement sinusoïdal pour un effet de frappe naturel
      const punchSwing = Math.sin(t * Math.PI);
      this._armMesh.rotation.x = -punchSwing * 1.3;
      this._armMesh.position.z = -punchSwing * 0.4;
    } else {
      // Retour au repos (smooth)
      this._armMesh.rotation.x = THREE.MathUtils.lerp(this._armMesh.rotation.x, 0, delta * 10);
      this._armMesh.position.z = THREE.MathUtils.lerp(this._armMesh.position.z, 0, delta * 10);
    }

    // Bob léger pendant la marche
    if (this.state === 'walking' || this.state === 'sprinting') {
      const bobSpeed = this.state === 'sprinting' ? 12 : 8;
      const bobAmount = this.state === 'sprinting' ? 0.08 : 0.04;
      this._bodyMesh.position.y = CONFIG.height / 2 + Math.sin(performance.now() * 0.001 * bobSpeed) * bobAmount;
    } else {
      this._bodyMesh.position.y = CONFIG.height / 2;
    }
  }

  /** Synchronise l'état avec le StateManager (si branché) */
  private syncStateToStore(): void {
    // Exemple : this.game.store.updateSlice('character', { health: this.health, state: this.state });
    // À brancher quand vous aurez le store en place
  }

  // ------------------------------------------------------------------
  // COMBAT
  // ------------------------------------------------------------------

  startAttack(move: CombatMove): void {
    if (this.currentMove || !this.physics.isGrounded) return;
    this.currentMove = move;
    this.attackTimer = CONFIG.attackDuration;
    
    // Dispatch vers le StateManager / event bus
    // this.game.store.dispatch({ type: 'COMBAT_MOVE_EXECUTED', move });
    console.log(`[Player] ${move}!`);
  }

  takeDamage(amount: number, source?: string): void {
    this.health = Math.max(0, this.health - amount);
    console.log(`[Player] -${amount} HP (source: ${source ?? 'unknown'}) — reste ${this.health}`);
    
    // Feedback visuel
    this.flashDamage();
    // Camera shake via l'event bus si branché
    
    if (this.health <= 0) {
      this.die();
    }
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  private flashDamage(): void {
    const mat = this._bodyMesh.material as THREE.MeshStandardMaterial;
    const originalColor = mat.color.getHex();
    mat.color.setHex(0xff3333);
    setTimeout(() => {
      if (this.alive) mat.color.setHex(originalColor);
    }, 120);
  }

  private die(): void {
    console.log('[Player] Mort !');
    // TODO : ragdoll, respawn, game over screen...
    // Pour l'instant on respawn à l'origine
    setTimeout(() => {
      this.health = this.maxHealth;
      this.position.set(0, 2, 0);
      this.physics.velocity.set(0, 0, 0);
    }, 2000);
  }

  // ------------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------------

  /** Retourne l'angle le plus court entre deux angles en radians */
  private shortestAngleDelta(from: number, to: number): number {
    const diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
    return diff < -Math.PI ? diff + Math.PI * 2 : diff;
  }

  getState(): PlayerState {
    return this.state;
  }

  getCurrentMove(): CombatMove | null {
    return this.currentMove;
  }
}