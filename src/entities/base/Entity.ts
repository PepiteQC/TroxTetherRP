import * as THREE from 'three';
import type { Game } from '../../core/Game';

/**
 * Classe abstraite de base pour toute entité du jeu.
 * Tout ce qui existe dans le monde (joueur, PNJ, véhicule, prop interactif)
 * doit hériter de cette classe.
 */
export abstract class Entity {
  public readonly uuid: string;
  public readonly mesh: THREE.Object3D;
  public readonly game: Game;

  protected isAlive: boolean = true;
  protected tags: Set<string> = new Set();

  constructor(game: Game, mesh: THREE.Object3D, uuid?: string) {
    this.game = game;
    this.mesh = mesh;
    this.uuid = uuid ?? crypto.randomUUID();

    // Enregistrement automatique dans le EntityManager
    game.entities.register(this);
    game.scene.add(this.mesh);
  }

  // ------------------------------------------------------------------
  // API publique - Cycle de vie
  // ------------------------------------------------------------------

  /** Mise à jour appelée chaque frame par le EntityManager */
  abstract update(delta: number): void;

  /** Nettoyage : retire du scene graph et du manager */
  dispose(): void {
    this.isAlive = false;
    this.game.scene.remove(this.mesh);
    this.game.entities.unregister(this.uuid);
    this.onDispose();
  }

  /** Hook pour nettoyage custom dans les sous-classes */
  protected onDispose(): void {}

  // ------------------------------------------------------------------
  // API publique - Tags & Queries
  // ------------------------------------------------------------------

  addTag(tag: string): this {
    this.tags.add(tag);
    return this;
  }

  hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  get alive(): boolean {
    return this.isAlive;
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  get rotation(): THREE.Euler {
    return this.mesh.rotation;
  }

  /** Distance horizontale (ignore Y) à une autre entité ou position */
  distanceTo(target: Entity | THREE.Vector3): number {
    const otherPos = target instanceof Entity ? target.position : target;
    const dx = this.position.x - otherPos.x;
    const dz = this.position.z - otherPos.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}