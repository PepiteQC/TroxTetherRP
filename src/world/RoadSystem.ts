// EtherWorld RP — Port-Éther
// Système routier complet — routes, intersections, trottoirs, marquages

import * as THREE from 'three';
import { MaterialsFactory } from './MaterialsFactory';
import type { RoadData, Vector3, DistrictName } from '../shared/types';
import {
  ROAD_WIDTH,
  ROAD_SMALL,
  SIDEWALK_WIDTH,
  LANE_WIDTH,
  WORLD_SIZE,
} from '../shared/constants';

export interface RoadSegment {
  road: RoadData;
  mesh: THREE.Group;
  collisionBoxes: THREE.Box3[];
  driveZone: THREE.Box3;
}

export class RoadSystem {
  public readonly group: THREE.Group = new THREE.Group();
  public readonly roads: RoadSegment[] = [];
  public readonly intersections: THREE.Group = new THREE.Group();

  constructor() {
    this.group.name = 'RoadSystem';
    this.intersections.name = 'Intersections';
    this.group.add(this.intersections);
  }

  /** Crée toutes les routes de la ville */
  buildAll(): void {
    this.buildCentreVilleRoads();
    this.buildCommercialRoads();
    this.buildResidentielRoads();
    this.buildIndustrielRoads();
    this.buildServicesRoads();
    this.buildIntersections();
  }

  private addRoad(
    id: string,
    name: string,
    district: DistrictName,
    start: Vector3,
    end: Vector3,
    width: number = ROAD_WIDTH,
    speedLimit: number = 50,
    type: RoadData['type'] = 'main',
    lanes: number = 2,
  ): void {
    const road: RoadData = {
      id,
      name,
      district,
      start,
      end,
      width,
      speedLimit,
      type,
      drivable: true,
      lanes,
      hasSidewalk: true,
      hasParking: type === 'commercial',
    };

    const segment = this.buildRoadMesh(road);
    this.roads.push(segment);
    this.group.add(segment.mesh);
  }

  private buildRoadMesh(road: RoadData): RoadSegment {
    const group = new THREE.Group();
    group.name = `road_${road.id}`;

    const dx = road.end.x - road.start.x;
    const dz = road.end.z - road.start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const midX = (road.start.x + road.end.x) / 2;
    const midZ = (road.start.z + road.end.z) / 2;

    // === Assise de la route ===
    const roadGeo = new THREE.BoxGeometry(road.width, 0.15, length);
    const roadMesh = new THREE.Mesh(roadGeo, MaterialsFactory.getAsphalt());
    roadMesh.position.set(midX, 0.075, midZ);
    roadMesh.rotation.y = angle;
    roadMesh.receiveShadow = true;
    group.add(roadMesh);

    // === Trottoirs ===
    if (road.hasSidewalk) {
      const swWidth = SIDEWALK_WIDTH;
      const swGeo = new THREE.BoxGeometry(swWidth, 0.2, length);

      for (const side of [-1, 1]) {
        const sidewalk = new THREE.Mesh(swGeo, MaterialsFactory.getConcrete());
        const offset = (road.width / 2 + swWidth / 2) * side;
        sidewalk.position.set(
          midX + offset * Math.sin(angle),
          0.1,
          midZ + offset * Math.cos(angle),
        );
        sidewalk.rotation.y = angle;
        sidewalk.receiveShadow = true;
        group.add(sidewalk);
      }
    }

    // === Lignes centrales ===
    if (road.lanes > 1) {
      const lineLength = length;
      const lineWidth = 0.15;
      const lineGeo = new THREE.BoxGeometry(lineWidth, 0.05, lineLength);

      // Ligne jaune centrale double
      for (const offset of [-0.2, 0.2]) {
        const line = new THREE.Mesh(lineGeo, MaterialsFactory.getRoadLineYellow());
        line.position.set(midX + offset * Math.sin(angle), 0.2, midZ + offset * Math.cos(angle));
        line.rotation.y = angle;
        group.add(line);
      }
    }

    // === Lignes de voie ===
    if (road.lanes >= 2) {
      const lineGeo = new THREE.BoxGeometry(0.1, 0.04, length);
      const segments = 20;
      const segLen = length / segments;

      for (let lane = 1; lane < road.lanes; lane++) {
        const offset = (lane - road.lanes / 2 + 0.5) * LANE_WIDTH;
        for (let s = 0; s < segments; s++) {
          if (s % 2 === 0) continue; // lignes pointillées
          const t = (s + 0.5) / segments;
          const lx = road.start.x + dx * t + offset * Math.sin(angle);
          const lz = road.start.z + dz * t + offset * Math.cos(angle);
          const line = new THREE.Mesh(lineGeo, MaterialsFactory.getRoadLineWhite());
          line.scale.z = 0.5;
          line.position.set(lx, 0.2, lz);
          line.rotation.y = angle;
          group.add(line);
        }
      }
    }

    // === Zone de conduite (collision) ===
    const halfW = road.width / 2;
    const halfL = length / 2;
    const driveZone = new THREE.Box3(
      new THREE.Vector3(midX - halfW, 0, midZ - halfL),
      new THREE.Vector3(midX + halfW, 0.5, midZ + halfL),
    );
    // On rotate la box approximativement
    const corners = [
      new THREE.Vector3(-halfW, 0, -halfL),
      new THREE.Vector3(halfW, 0, -halfL),
      new THREE.Vector3(-halfW, 0, halfL),
      new THREE.Vector3(halfW, 0, halfL),
    ];
    const worldCorners = corners.map((c) => {
      const x = c.x * Math.cos(angle) + c.z * Math.sin(angle);
      const z = -c.x * Math.sin(angle) + c.z * Math.cos(angle);
      return new THREE.Vector3(midX + x, 0, midZ + z);
    });
    const minX = Math.min(...worldCorners.map((c) => c.x));
    const maxX = Math.max(...worldCorners.map((c) => c.x));
    const minZ = Math.min(...worldCorners.map((c) => c.z));
    const maxZ = Math.max(...worldCorners.map((c) => c.z));

    const finalDrive = new THREE.Box3(
      new THREE.Vector3(minX, 0, minZ),
      new THREE.Vector3(maxX, 0.5, maxZ),
    );

    return {
      road,
      mesh: group,
      collisionBoxes: [finalDrive],
      driveZone: finalDrive,
    };
  }

  private buildCentreVilleRoads(): void {
    // Rue Principale (axe Z)
    this.addRoad('cv_main', 'Rue Principale', 'centre-ville',
      { x: 0, y: 0, z: -100 }, { x: 0, y: 0, z: 100 },
      ROAD_WIDTH, 50, 'main', 4);

    // Avenue du Port (axe X)
    this.addRoad('cv_avenue', 'Avenue du Port', 'centre-ville',
      { x: -80, y: 0, z: 0 }, { x: 80, y: 0, z: 0 },
      ROAD_WIDTH, 50, 'main', 4);

    // Rue transversale nord
    this.addRoad('cv_north', 'Rue du Nord', 'centre-ville',
      { x: -60, y: 0, z: -60 }, { x: 60, y: 0, z: -60 },
      ROAD_SMALL, 30, 'secondary', 2);

    // Rue transversale sud
    this.addRoad('cv_south', 'Rue du Sud', 'centre-ville',
      { x: -60, y: 0, z: 60 }, { x: 60, y: 0, z: 60 },
      ROAD_SMALL, 30, 'secondary', 2);

    // Avenue Est
    this.addRoad('cv_east', 'Avenue Est', 'centre-ville',
      { x: 60, y: 0, z: -40 }, { x: 60, y: 0, z: 40 },
      ROAD_SMALL, 30, 'secondary', 2);

    // Avenue Ouest
    this.addRoad('cv_west', 'Avenue Ouest', 'centre-ville',
      { x: -60, y: 0, z: -40 }, { x: -60, y: 0, z: 40 },
      ROAD_SMALL, 30, 'secondary', 2);
  }

  private buildCommercialRoads(): void {
    // Boulevard du Commerce
    this.addRoad('co_main', 'Boulevard du Commerce', 'commercial',
      { x: 150, y: 0, z: -80 }, { x: 250, y: 0, z: -80 },
      ROAD_WIDTH, 50, 'main', 4);

    this.addRoad('co_second', 'Rue des Commerces', 'commercial',
      { x: 150, y: 0, z: -120 }, { x: 250, y: 0, z: -120 },
      ROAD_SMALL, 30, 'secondary', 2);

    // Rue transversale
    this.addRoad('co_cross', 'Allée des Boutiques', 'commercial',
      { x: 200, y: 0, z: -130 }, { x: 200, y: 0, z: -70 },
      ROAD_SMALL, 30, 'residential', 2);
  }

  private buildResidentielRoads(): void {
    // Boulevard Résidentiel
    this.addRoad('re_main', 'Boulevard des Résidences', 'residentiel',
      { x: -200, y: 0, z: -80 }, { x: -100, y: 0, z: -80 },
      ROAD_SMALL, 30, 'residential', 2);

    this.addRoad('re_second_a', 'Rue des Érables', 'residentiel',
      { x: -200, y: 0, z: -130 }, { x: -100, y: 0, z: -130 },
      ROAD_SMALL, 30, 'residential', 2);

    this.addRoad('re_second_b', 'Rue des Bouleaux', 'residentiel',
      { x: -200, y: 0, z: -30 }, { x: -100, y: 0, z: -30 },
      ROAD_SMALL, 30, 'residential', 2);

    // Allées transversales
    this.addRoad('re_cross_a', 'Allée des Jardins', 'residentiel',
      { x: -150, y: 0, z: -140 }, { x: -150, y: 0, z: -20 },
      ROAD_SMALL, 20, 'residential', 2);

    this.addRoad('re_cross_b', 'Chemin du Parc', 'residentiel',
      { x: -180, y: 0, z: -110 }, { x: -180, y: 0, z: -50 },
      ROAD_SMALL, 20, 'residential', 2);
  }

  private buildIndustrielRoads(): void {
    // Route Industrielle
    this.addRoad('in_main', 'Route Industrielle', 'industriel',
      { x: -80, y: 0, z: 150 }, { x: 80, y: 0, z: 150 },
      ROAD_WIDTH, 70, 'industrial', 2);

    this.addRoad('in_second', 'Chemin des Entrepôts', 'industriel',
      { x: -80, y: 0, z: 200 }, { x: 80, y: 0, z: 200 },
      ROAD_SMALL, 50, 'industrial', 2);

    // Quai de chargement
    this.addRoad('in_dock', 'Quai de Chargement', 'industriel',
      { x: 0, y: 0, z: 170 }, { x: 0, y: 0, z: 230 },
      ROAD_SMALL, 30, 'industrial', 2);
  }

  private buildServicesRoads(): void {
    // Route des Services
    this.addRoad('sv_main', 'Avenue des Services', 'services-publics',
      { x: 150, y: 0, z: 120 }, { x: 250, y: 0, z: 120 },
      ROAD_WIDTH, 50, 'main', 2);

    this.addRoad('sv_second', 'Rue de l\'Hôpital', 'services-publics',
      { x: 150, y: 0, z: 180 }, { x: 250, y: 0, z: 180 },
      ROAD_SMALL, 30, 'secondary', 2);

    // Fourrière
    this.addRoad('sv_impound', 'Chemin de la Fourrière', 'services-publics',
      { x: 200, y: 0, z: 100 }, { x: 200, y: 0, z: 150 },
      ROAD_SMALL, 30, 'secondary', 2);
  }

  private buildIntersections(): void {
    // Intersection centre-ville (Rue Principale x Avenue du Port)
    this.buildIntersectionMesh({ x: 0, y: 0, z: 0 }, ROAD_WIDTH, 'centre-ville');
    // Intersection nord
    this.buildIntersectionMesh({ x: 0, y: 0, z: -100 }, ROAD_WIDTH, 'centre-ville');
    // Intersection sud
    this.buildIntersectionMesh({ x: 0, y: 0, z: 100 }, ROAD_WIDTH, 'centre-ville');
  }

  private buildIntersectionMesh(pos: Vector3, size: number, district: string): void {
    const group = new THREE.Group();
    group.name = `intersection_${pos.x}_${pos.z}`;

    // Surface d'intersection
    const geo = new THREE.BoxGeometry(size, 0.15, size);
    const mesh = new THREE.Mesh(geo, MaterialsFactory.getAsphalt());
    mesh.position.set(pos.x, 0.075, pos.z);
    mesh.receiveShadow = true;
    group.add(mesh);

    // Passages piétons
    const pwGeo = new THREE.BoxGeometry(0.4, 0.05, size * 0.6);
    for (let i = -2; i <= 2; i++) {
      const pw = new THREE.Mesh(pwGeo, MaterialsFactory.getCrosswalk());
      pw.position.set(pos.x + i * 0.8, 0.2, pos.z);
      group.add(pw);
    }

    const pwGeo2 = new THREE.BoxGeometry(size * 0.6, 0.05, 0.4);
    for (let i = -2; i <= 2; i++) {
      const pw = new THREE.Mesh(pwGeo2, MaterialsFactory.getCrosswalk());
      pw.position.set(pos.x, 0.2, pos.z + i * 0.8);
      group.add(pw);
    }

    this.intersections.add(group);
  }

  /** Retourne la route à une position donnée */
  getStreetAtPosition(position: Vector3): RoadData | null {
    const pos = new THREE.Vector3(position.x, position.y, position.z);
    for (const seg of this.roads) {
      if (seg.driveZone.containsPoint(pos)) {
        return seg.road;
      }
    }
    return null;
  }

  /** Vérifie si une position est sur une route praticable */
  isOnDrivableRoad(position: Vector3): boolean {
    return this.getStreetAtPosition(position) !== null;
  }
}