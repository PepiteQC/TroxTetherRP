import type { Game } from '../../core/Game';
import type { Entity } from './Entity';

/**
 * Registre central de toutes les entités du jeu.
 * Gère le cycle de vie et permet des queries par tag ou type.
 */
export class EntityManager {
  private readonly entities = new Map<string, Entity>();
  private readonly game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  register(entity: Entity): void {
    this.entities.set(entity.uuid, entity);
  }

  unregister(uuid: string): void {
    this.entities.delete(uuid);
  }

  get(uuid: string): Entity | undefined {
    return this.entities.get(uuid);
  }

  /** Retourne toutes les entités vivantes */
  all(): Entity[] {
    return Array.from(this.entities.values()).filter((e) => e.alive);
  }

  /** Query par tag */
  byTag(tag: string): Entity[] {
    return this.all().filter((e) => e.hasTag(tag));
  }

  /** Query par classe (type-safe) */
  byType<T extends Entity>(ctor: new (...args: any[]) => T): T[] {
    return this.all().filter((e): e is T => e instanceof ctor);
  }

  /** Entités dans un rayon autour d'une position */
  inRadius(center: { x: number; z: number }, radius: number): Entity[] {
    const r2 = radius * radius;
    return this.all().filter((e) => {
      const dx = e.position.x - center.x;
      const dz = e.position.z - center.z;
      return dx * dx + dz * dz <= r2;
    });
  }

  /** Update toutes les entités - appelé une fois par frame depuis Game */
  updateAll(delta: number): void {
    for (const entity of this.entities.values()) {
      if (entity.alive) entity.update(delta);
    }
  }

  /** Dispose toutes les entités (cleanup au changement de scène) */
  disposeAll(): void {
    for (const entity of this.entities.values()) {
      if (entity.alive) entity.dispose();
    }
    this.entities.clear();
  }

  get count(): number {
    return this.entities.size;
  }
}