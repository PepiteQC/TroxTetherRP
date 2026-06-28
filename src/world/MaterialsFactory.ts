// EtherWorld RP — Port-Éther
// Factory de matériaux Three.js — réutilisation optimisée

import * as THREE from 'three';

export class MaterialsFactory {
  private static cache = new Map<string, THREE.Material>();

  static getAsphalt(): THREE.Material {
    const key = 'asphalt';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getSidewalk(): THREE.Material {
    const key = 'sidewalk';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.85,
      metalness: 0.0,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getGrass(): THREE.Material {
    const key = 'grass';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x4a7a3a,
      roughness: 0.95,
      metalness: 0.0,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getRoadLineWhite(): THREE.Material {
    const key = 'roadLineWhite';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.1,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getRoadLineYellow(): THREE.Material {
    const key = 'roadLineYellow';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffdd00,
      roughness: 0.7,
      metalness: 0.1,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getBuilding(color: number = 0x8a8a8a): THREE.Material {
    const key = `building_${color}`;
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.2,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getRoof(color: number = 0x6a6a6a): THREE.Material {
    const key = `roof_${color}`;
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getWindow(): THREE.Material {
    const key = 'window';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.6,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getDoor(): THREE.Material {
    const key = 'door';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x5a3a1a,
      roughness: 0.6,
      metalness: 0.3,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getTreeTrunk(): THREE.Material {
    const key = 'treeTrunk';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x4a2a0a,
      roughness: 0.95,
      metalness: 0.0,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getTreeTop(): THREE.Material {
    const key = 'treeTop';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3a7a2a,
      roughness: 0.95,
      metalness: 0.0,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getLampPost(): THREE.Material {
    const key = 'lampPost';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.5,
      metalness: 0.7,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getConcrete(): THREE.Material {
    const key = 'concrete';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x7a7a7a,
      roughness: 0.9,
      metalness: 0.0,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getMetal(color: number = 0x6a7a8a): THREE.Material {
    const key = `metal_${color}`;
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.8,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getInteriorWall(): THREE.Material {
    const key = 'interiorWall';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd4c4a4,
      roughness: 0.9,
      metalness: 0.0,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getCrosswalk(): THREE.Material {
    const key = 'crosswalk';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      roughness: 0.8,
      metalness: 0.0,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static getPropGhost(): THREE.Material {
    const key = 'propGhost';
    if (this.cache.has(key)) return this.cache.get(key)!.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x44ffff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.5,
      metalness: 0.3,
    });
    this.cache.set(key, mat);
    return mat.clone();
  }

  static disposeAll(): void {
    this.cache.forEach((mat) => mat.dispose());
    this.cache.clear();
  }
}