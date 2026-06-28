// EtherWorld RP — Port-Éther
// Système d'interactions — raycast, proximité, prompts, portes, terminaux

import * as THREE from 'three';
import type { InteractionDef, InteractionType, Vector3 } from '../shared/types';
import { INTERACTION_DISTANCE } from '../shared/constants';

export interface InteractionResult {
  interaction: InteractionDef;
  distance: number;
}

export class InteractionSystem {
  public interactions: Map<string, InteractionDef> = new Map();
  public nearestInteraction: InteractionResult | null = null;
  public onInteraction: ((interaction: InteractionDef) => void) | null = null;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private interactiveMeshes: Map<string, { mesh: THREE.Object3D; interactionId: string }> = new Map();

  /** Enregistre une interaction */
  registerInteraction(def: InteractionDef, mesh?: THREE.Object3D): void {
    this.interactions.set(def.id, def);
    if (mesh) {
      this.interactiveMeshes.set(mesh.uuid, { mesh, interactionId: def.id });
    }
  }

  /** Supprime une interaction */
  unregisterInteraction(id: string): void {
    this.interactions.delete(id);
    for (const [key, val] of this.interactiveMeshes) {
      if (val.interactionId === id) {
        this.interactiveMeshes.delete(key);
      }
    }
  }

  /** Crée une interaction simple */
  createInteraction(
    id: string,
    type: InteractionType,
    label: string,
    position: Vector3,
    action: string,
    radius: number = INTERACTION_DISTANCE,
  ): InteractionDef {
    return {
      id,
      type,
      label,
      position,
      radius,
      action,
    };
  }

  /** Raycast pour détection d'interaction */
  checkRaycast(camera: THREE.PerspectiveCamera, scene: THREE.Scene): InteractionResult | null {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const meshes: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (this.interactiveMeshes.has(obj.uuid)) {
        meshes.push(obj);
      }
    });

    const intersects = this.raycaster.intersectObjects(meshes, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      let obj = hit.object;
      while (obj.parent && !this.interactiveMeshes.has(obj.uuid)) {
        obj = obj.parent;
      }
      const entry = this.interactiveMeshes.get(obj.uuid);
      if (entry) {
        const def = this.interactions.get(entry.interactionId);
        if (def) {
          return { interaction: def, distance: hit.distance };
        }
      }
    }
    return null;
  }

  /** Détection par proximité */
  checkProximity(playerPosition: Vector3): InteractionResult | null {
    let nearest: InteractionResult | null = null;
    let nearestDist = Infinity;

    for (const [, def] of this.interactions) {
      const dx = playerPosition.x - def.position.x;
      const dz = playerPosition.z - def.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= def.radius && dist < nearestDist) {
        nearestDist = dist;
        nearest = { interaction: def, distance: dist };
      }
    }

    this.nearestInteraction = nearest;
    return nearest;
  }

  /** Déclenche l'interaction la plus proche */
  triggerNearest(): void {
    if (this.nearestInteraction && this.onInteraction) {
      this.onInteraction(this.nearestInteraction.interaction);
    }
  }

  /** Porte : ouvrir/fermer */
  createDoorInteraction(
    id: string,
    position: Vector3,
    label: string = 'Porte',
    isLocked: boolean = false,
  ): InteractionDef {
    return this.createInteraction(
      id,
      'door',
      isLocked ? '🔒 Porte verrouillée' : `🚪 ${label} — E`,
      position,
      isLocked ? 'door_locked' : 'door_open',
    );
  }

  /** Terminal emploi */
  createJobTerminal(position: Vector3): InteractionDef {
    return this.createInteraction(
      `job_terminal_${position.x}_${position.z}`,
      'terminal-job',
      '📋 Terminal Emplois — E',
      position,
      'open_job_terminal',
    );
  }

  /** Terminal véhicule */
  createVehicleTerminal(position: Vector3): InteractionDef {
    return this.createInteraction(
      `veh_terminal_${position.x}_${position.z}`,
      'terminal-vehicle',
      '🚗 Terminal Véhicules — E',
      position,
      'open_vehicle_terminal',
    );
  }

  /** Caisse boutique */
  createShopCashier(position: Vector3): InteractionDef {
    return this.createInteraction(
      `shop_${position.x}_${position.z}`,
      'shop-cashier',
      '💰 Caisse — E',
      position,
      'open_shop',
    );
  }

  /** Entrée de propriété */
  createPropertyEntry(position: Vector3, address: string): InteractionDef {
    return this.createInteraction(
      `property_${position.x}_${position.z}`,
      'property',
      `🏠 ${address} — E`,
      position,
      'enter_property',
    );
  }

  /** Garage */
  createGarageInteraction(position: Vector3): InteractionDef {
    return this.createInteraction(
      `garage_${position.x}_${position.z}`,
      'garage',
      '🏗️ Garage — E',
      position,
      'open_garage',
    );
  }
}