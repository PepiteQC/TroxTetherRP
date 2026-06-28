// EtherWorld RP — Port-Éther
// Factory de bâtiments — génération par primitives Three.js

import * as THREE from 'three';
import { MaterialsFactory } from './MaterialsFactory';
import type { BuildingData, Vector3, DistrictName } from '../shared/types';

export interface BuiltBuilding {
  data: BuildingData;
  mesh: THREE.Group;
  collisionBox: THREE.Box3;
  entryPoint?: { position: Vector3; rotation: number };
}

export class BuildingFactory {
  private static idCounter = 0;

  private static nextId(prefix: string): string {
    return `${prefix}_${++this.idCounter}`;
  }

  /** Crée un bâtiment complet à partir de données */
  static build(data: Partial<BuildingData> & { position: Vector3; district: DistrictName }): BuiltBuilding {
    const id = data.id || this.nextId(data.type || 'bldg');
    const fullData: BuildingData = {
      id,
      name: data.name || 'Bâtiment',
      type: data.type || 'generic',
      district: data.district,
      position: data.position,
      size: data.size || { x: 10, y: 6, z: 10 },
      rotation: data.rotation || 0,
      interactable: data.interactable ?? true,
      collisionBox: data.collisionBox || {
        min: { x: data.position.x - 5, y: data.position.y, z: data.position.z - 5 },
        max: { x: data.position.x + 5, y: data.position.y + 6, z: data.position.z + 5 },
      },
      entryPoint: data.entryPoint,
      ownerId: data.ownerId || null,
      locked: data.locked ?? false,
      color: data.color,
      roofColor: data.roofColor,
      floors: data.floors || 1,
      hasGarage: data.hasGarage || false,
    };

    const group = new THREE.Group();
    group.name = `building_${id}`;
    group.position.set(fullData.position.x, 0, fullData.position.z);

    const { size } = fullData;
    const color = fullData.color || 0x8a8a8a;
    const roofColor = fullData.roofColor || 0x6a6a6a;

    // Corps du bâtiment
    const bodyGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const bodyMat = MaterialsFactory.getBuilding(color);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = size.y / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Toit
    const roofGeo = new THREE.BoxGeometry(size.x + 0.5, 0.3, size.z + 0.5);
    const roof = new THREE.Mesh(roofGeo, MaterialsFactory.getRoof(roofColor));
    roof.position.y = size.y + 0.15;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    // Fenêtres (sur les 4 faces)
    if (size.x > 2 && size.z > 2) {
      const winMat = MaterialsFactory.getWindow();
      const winW = 1.2;
      const winH = 1.5;
      const winD = 0.1;
      const winGeo = new THREE.BoxGeometry(winW, winH, winD);

      // Face avant (Z positif)
      for (let i = 0; i < Math.floor(size.x / 3); i++) {
        const win = new THREE.Mesh(winGeo, winMat);
        const xOff = -size.x / 2 + 1.5 + i * 3;
        win.position.set(xOff, size.y * 0.6, size.z / 2 + 0.05);
        group.add(win);
      }
      // Face arrière (Z négatif)
      for (let i = 0; i < Math.floor(size.x / 3); i++) {
        const win = new THREE.Mesh(winGeo, winMat);
        const xOff = -size.x / 2 + 1.5 + i * 3;
        win.position.set(xOff, size.y * 0.6, -size.z / 2 - 0.05);
        win.rotation.y = Math.PI;
        group.add(win);
      }
      // Face droite (X positif)
      const winGeo2 = new THREE.BoxGeometry(winD, winH, winW);
      for (let i = 0; i < Math.floor(size.z / 3); i++) {
        const win = new THREE.Mesh(winGeo2, winMat);
        const zOff = -size.z / 2 + 1.5 + i * 3;
        win.position.set(size.x / 2 + 0.05, size.y * 0.6, zOff);
        win.rotation.y = Math.PI / 2;
        group.add(win);
      }
      // Face gauche (X négatif)
      for (let i = 0; i < Math.floor(size.z / 3); i++) {
        const win = new THREE.Mesh(winGeo2, winMat);
        const zOff = -size.z / 2 + 1.5 + i * 3;
        win.position.set(-size.x / 2 - 0.05, size.y * 0.6, zOff);
        win.rotation.y = -Math.PI / 2;
        group.add(win);
      }
    }

    // Porte (face avant)
    const doorMat = MaterialsFactory.getDoor();
    const doorGeo = new THREE.BoxGeometry(1.0, 2.2, 0.1);
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.1, size.z / 2 + 0.05);
    group.add(door);

    // Entry point si non défini
    if (!fullData.entryPoint) {
      fullData.entryPoint = {
        position: {
          x: fullData.position.x,
          y: 0,
          z: fullData.position.z + size.z / 2 + 2,
        },
        rotation: 0,
      };
    }

    // Collision Box
    const halfX = size.x / 2;
    const halfZ = size.z / 2;
    const colBox = new THREE.Box3(
      new THREE.Vector3(-halfX, 0, -halfZ),
      new THREE.Vector3(halfX, size.y, halfZ),
    );

    group.rotation.y = fullData.rotation || 0;

    return {
      data: fullData,
      mesh: group,
      collisionBox: colBox,
      entryPoint: fullData.entryPoint,
    };
  }

  /** Bâtiment avec plusieurs étages */
  static buildMultiFloor(
    pos: Vector3,
    district: DistrictName,
    width: number,
    depth: number,
    floors: number,
    color?: number,
  ): BuiltBuilding {
    const floorHeight = 3.0;
    const totalHeight = floors * floorHeight;
    return this.build({
      position: pos,
      district,
      size: { x: width, y: totalHeight, z: depth },
      floors,
      color,
      type: 'building',
      name: `Immeuble ${floors} étages`,
    });
  }

  /** Maison individuelle */
  static buildHouse(pos: Vector3, district: DistrictName, color?: number): BuiltBuilding {
    return this.build({
      position: pos,
      district,
      size: { x: 8, y: 3.5, z: 8 },
      type: 'house',
      name: 'Maison',
      color: color || 0xc4a882,
      roofColor: 0x8a3a1a,
      interactable: true,
      hasGarage: true,
      entryPoint: {
        position: { x: pos.x, y: 0, z: pos.z + 6 },
        rotation: 0,
      },
    });
  }

  /** Garage */
  static buildGarage(pos: Vector3, district: DistrictName): BuiltBuilding {
    return this.build({
      position: pos,
      district,
      size: { x: 5, y: 2.8, z: 6 },
      type: 'garage',
      name: 'Garage',
      color: 0x666666,
      roofColor: 0x444444,
      interactable: true,
      hasGarage: false,
    });
  }

  /** Petit commerce / dépanneur */
  static buildShop(pos: Vector3, district: DistrictName): BuiltBuilding {
    const b = this.build({
      position: pos,
      district,
      size: { x: 8, y: 4, z: 6 },
      type: 'shop',
      name: 'Commerce',
      color: 0xd4a06a,
      roofColor: 0x8a5a3a,
      interactable: true,
    });
    // Enseigne
    const signGeo = new THREE.BoxGeometry(4, 0.6, 0.1);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xffee00, emissive: 0xffee00, emissiveIntensity: 0.3 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 3.8, 3.05);
    b.mesh.add(sign);
    return b;
  }

  /** Station-service */
  static buildGasStation(pos: Vector3): BuiltBuilding {
    const group = new THREE.Group();
    group.name = 'gas_station';
    group.position.set(pos.x, 0, pos.z);

    // Auvent
    const roofGeo = new THREE.BoxGeometry(12, 0.2, 6);
    const roofMat = MaterialsFactory.getMetal(0x888888);
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.y = 4;
    roofMesh.receiveShadow = true;
    group.add(roofMesh);

    // Piliers
    const pillarGeo = new THREE.BoxGeometry(0.3, 4, 0.3);
    const pillarMat = MaterialsFactory.getMetal(0xaaaaaa);
    for (const x of [-5, 5]) {
      for (const z of [-2, 2]) {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(x, 2, z);
        group.add(pillar);
      }
    }

    // Pompes (3)
    const pumpGeo = new THREE.BoxGeometry(0.8, 1.5, 0.8);
    const pumpMat = MaterialsFactory.getMetal(0xcc4444);
    for (let i = -1; i <= 1; i++) {
      const pump = new THREE.Mesh(pumpGeo, pumpMat);
      pump.position.set(i * 2.5, 0.75, 0);
      group.add(pump);
      // Écran pomp
      const screenGeo = new THREE.BoxGeometry(0.4, 0.3, 0.05);
      const screenMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.2 });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(i * 2.5, 1.0, 0.45);
      group.add(screen);
    }

    const colBox = new THREE.Box3(
      new THREE.Vector3(-6, 0, -3),
      new THREE.Vector3(6, 4.5, 3),
    );

    return {
      data: {
        id: this.nextId('gas'),
        name: 'Station-Service Ether',
        type: 'gas-station',
        district: 'commercial',
        position: pos,
        size: { x: 12, y: 4.5, z: 6 },
        rotation: 0,
        interactable: true,
        collisionBox: { min: { x: pos.x - 6, y: pos.y, z: pos.z - 3 }, max: { x: pos.x + 6, y: pos.y + 4.5, z: pos.z + 3 } },
        entryPoint: { position: { x: pos.x, y: 0, z: pos.z + 5 }, rotation: 0 },
        ownerId: null,
        locked: false,
      },
      mesh: group,
      collisionBox: colBox,
      entryPoint: { position: { x: pos.x, y: 0, z: pos.z + 5 }, rotation: 0 },
    };
  }
}