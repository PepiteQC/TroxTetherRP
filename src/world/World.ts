import * as THREE from 'three';
import { Game } from '../core/Game';

export class World {
  private game: Game;
  private chunks: Map<string, THREE.Group> = new Map();
  private chunkSize: number = 50;
  private viewRadius: number = 3;

  constructor(game: Game) {
    this.game = game;
    this.generateAround(new THREE.Vector3(0, 0, 0));
  }

  generateAround(position: THREE.Vector3) {
    const cx = Math.floor(position.x / this.chunkSize);
    const cz = Math.floor(position.z / this.chunkSize);

    for (let x = cx - this.viewRadius; x <= cx + this.viewRadius; x++) {
      for (let z = cz - this.viewRadius; z <= cz + this.viewRadius; z++) {
        const key = `${x},${z}`;
        if (!this.chunks.has(key)) {
          this.generateChunk(x, z);
        }
      }
    }

    // Nettoyer chunks éloignés
    for (const [key, group] of this.chunks) {
      const [cx2, cz2] = key.split(',').map(Number);
      if (
        Math.abs(cx2 - cx) > this.viewRadius + 1 ||
        Math.abs(cz2 - cz) > this.viewRadius + 1
      ) {
        this.game.scene.remove(group);
        this.chunks.delete(key);
      }
    }
  }

  private generateChunk(cx: number, cz: number) {
    const group = new THREE.Group();
    const baseX = cx * this.chunkSize;
    const baseZ = cz * this.chunkSize;

    // Sol low poly
    const groundGeo = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize(), 8, 8);
    groundGeo.rotateX(-Math.PI / 2);

    // Ajouter un peu de relief aléatoire
    const positions = groundGeo.attributes.position.array;
    for (let i = 2; i < positions.length; i += 3) {
      positions[i] += (Math.random() - 0.5) * aki2;
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c3f,
      flatShading: true,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    ground.position.set(baseX + this.chunkSize / 2, -0.1, baseZ + this.chunkSize / 2);
    group.add(ground);

    // Routes (asphalte low poly)
    this.generateRoads(group, cx, cz, baseX, baseZ);

    // Bâtiments
    this.generateBuildings(group, cx, cz, baseX, baseZ);

    // Arbres low poly
    this.generateTrees(group, baseX, baseZ);

    this.game.scene.add(group);
    this.chunks.set(`${cx},${cz}`, group);
  }

  private generateRoads(group: THREE.Group, cx: number, cz: number, ) {
    // Route horizontale (axe X)
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      flatShading: true,
    });
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(this.chunkSize, 6),
      roadMat
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(
      cx * this.chunkSize + this.chunkSize / 2,
      0.02,
      Math.round(cz / 2) * 25
    );
    group.add(road);
  }

  private generateBuildings(group: THREE.Group, cx: number, cz: number) {
    const count = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < count; i++) {
      const w = 3 + Math.random() * 4;
      const h = 2 + Math.random() * 6;
      const d = 3 + Math.random() * 4;

      const bMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(
          0.05 + Math.random() * 0.1,
          0.3,
          0.4 + Math.random() * 0.3
        ),
        flatShading: true,
      });

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        bMat
      );
      building.position.set(
        cx * this.chunkSize + 5 + Math.random() * (this.chunkSize - 10),
        h / 2,
        cz * this.chunkSize + 5 + Math.random() * (this.chunkSize - 10)
      );
      building.castShadow = true;
      building.receiveShadow = true;
      group.add(building);

      // Toit
      const roofMat = new THREE.MeshStandardMaterial({
        color: 0x884422,
        flatShading: true,
      });
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(w * 0.8, 1.5, 4),
        roofMat
      );
      roof.position.copy(building.position);
      roof.position.y += h / 2 + 0.75;
      roof.rotation.y = Math.random() * Math.PI;
      group.add(roof);
    }
  }

  private generateTrees(group: THREE.Group, baseX: number, baseZ: number) {
    const count = Math.floor(Math.random() * 8) + 3;
    for (let i = 0; i < count; i++) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 2, 5),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e, flatShading: true })
      );
      const x = baseX + Math.random() * this.chunkSize;
      const z = baseZ + Math.random() * this.chunkSize;
      trunk.position.set(x, 1, z);
      trunk.castShadow = true;
      group.add(trunk);

      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(0.8 + Math.random() * 0.5, 5, 5),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.28, 0.6, 0.3 + Math.random() * 0.2),
          flatShading: true,
        })
      );
      foliage.position.set(x, 2.5 + Math.random() * 0.5, z);
      foliage.castShadow = true;
      group.add(foliage);
    }
  }
}