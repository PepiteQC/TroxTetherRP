// EtherWorld RP — Port-Éther
// Architecte de la ville — orchestre la construction des 5 districts

import * as THREE from 'three';
import { RoadSystem } from './RoadSystem';
import { BuildingFactory, type BuiltBuilding } from './BuildingFactory';
import { MaterialsFactory } from './MaterialsFactory';
import type { Vector3, DistrictName } from '../shared/types';
import { WORLD_SIZE } from '../shared/constants';

export class CityArchitect {
  public readonly group: THREE.Group = new THREE.Group();
  public readonly roadSystem: RoadSystem = new RoadSystem();
  public readonly buildings: BuiltBuilding[] = [];
  public readonly trees: THREE.Group = new THREE.Group();
  public readonly streetLamps: THREE.Group = new THREE.Group();
  public readonly props: THREE.Group = new THREE.Group();
  public readonly ground: THREE.Mesh = new THREE.Mesh();

  constructor() {
    this.group.name = 'CityArchitect';
  }

  /** Construit la ville entière */
  buildAll(): void {
    this.buildGround();
    this.roadSystem.buildAll();
    this.group.add(this.roadSystem.group);

    this.buildCentreVille();
    this.buildDistrictCommercial();
    this.buildDistrictResidentiel();
    this.buildZoneIndustrielle();
    this.buildServicesPublics();

    this.buildTrees();
    this.buildStreetLamps();
    this.buildUrbanProps();

    this.group.add(this.trees);
    this.group.add(this.streetLamps);
    this.group.add(this.props);
  }

  private buildGround(): void {
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE);
    const mat = MaterialsFactory.getGrass();
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.01;
    this.ground.receiveShadow = true;
    this.ground.name = 'ground';
    this.group.add(this.ground);
  }

  private register(building: BuiltBuilding): void {
    this.buildings.push(building);
    this.group.add(building.mesh);
  }

  // ============ DISTRICT 1 : CENTRE-VILLE ============
  private buildCentreVille(): void {
    const district: DistrictName = 'centre-ville';

    // Mairie / Hôtel de Ville
    const mairie = BuildingFactory.build({
      position: { x: -20, y: 0, z: -15 },
      district,
      size: { x: 16, y: 8, z: 12 },
      type: 'mairie',
      name: 'Hôtel de Ville de Port-Éther',
      color: 0xccddee,
      roofColor: 0x335577,
      floors: 2,
    });
    this.register(mairie);

    // Banque
    const banque = BuildingFactory.build({
      position: { x: 20, y: 0, z: -15 },
      district,
      size: { x: 10, y: 5, z: 8 },
      type: 'bank',
      name: 'Banque Centrale Ether',
      color: 0xeeddcc,
      roofColor: 0x776655,
    });
    this.register(banque);

    // Bureaux (gauche)
    const bureau1 = BuildingFactory.buildMultiFloor(
      { x: -30, y: 0, z: 15 },
      district, 8, 8, 3, 0x7788aa
    );
    this.register(bureau1);

    // Bureaux (droite)
    const bureau2 = BuildingFactory.buildMultiFloor(
      { x: 30, y: 0, z: 15 },
      district, 8, 8, 4, 0x88aacc
    );
    this.register(bureau2);

    // Place publique (au centre)
    this.buildPlaza({ x: 0, y: 0, z: 0 });

    // Terminal de jobs
    const terminal = BuildingFactory.build({
      position: { x: 0, y: 0, z: 25 },
      district,
      size: { x: 3, y: 3, z: 2 },
      type: 'terminal-jobs',
      name: 'Terminal Emplois',
      color: 0x44aa88,
      roofColor: 0x226644,
    });
    this.register(terminal);

    // Parking public
    this.buildParking({ x: 0, y: 0, z: -40 }, 6, 3, district);
  }

  // ============ DISTRICT 2 : COMMERCIAL ============
  private buildDistrictCommercial(): void {
    const district: DistrictName = 'commercial';

    // Dépanneur
    const dep = BuildingFactory.buildShop(
      { x: 170, y: 0, z: -80 }, district
    );
    dep.data.name = 'Dépanneur Port-Éther';
    this.register(dep);

    // Boutique vêtements
    const boutique = BuildingFactory.build({
      position: { x: 190, y: 0, z: -80 },
      district,
      size: { x: 7, y: 4, z: 6 },
      type: 'shop-clothes',
      name: 'Mode & Style',
      color: 0xcc88aa,
      roofColor: 0x884466,
    });
    this.register(boutique);

    // Garage mécanique
    const garage = BuildingFactory.build({
      position: { x: 210, y: 0, z: -80 },
      district,
      size: { x: 10, y: 4, z: 8 },
      type: 'garage-mechanic',
      name: 'Garage Mécanique Ether',
      color: 0x666666,
      roofColor: 0x444444,
    });
    this.register(garage);

    // Station-service
    const gas = BuildingFactory.buildGasStation({ x: 240, y: 0, z: -80 });
    this.register(gas);

    // Concessionnaire
    const dealer = BuildingFactory.build({
      position: { x: 170, y: 0, z: -120 },
      district,
      size: { x: 14, y: 5, z: 10 },
      type: 'dealership',
      name: 'Concessionnaire Ether Motors',
      color: 0xaaccee,
      roofColor: 0x5588aa,
    });
    this.register(dealer);

    // Restaurant
    const resto = BuildingFactory.build({
      position: { x: 220, y: 0, z: -120 },
      district,
      size: { x: 8, y: 4, z: 8 },
      type: 'restaurant',
      name: 'Bistro du Port',
      color: 0xddaa66,
      roofColor: 0x996633,
    });
    this.register(resto);

    // Parking client
    this.buildParking({ x: 195, y: 0, z: -100 }, 8, 2, district);
  }

  // ============ DISTRICT 3 : RÉSIDENTIEL ============
  private buildDistrictResidentiel(): void {
    const district: DistrictName = 'residentiel';

    // Maisons individuelles
    const housePositions: Vector3[] = [];
    for (let i = 0; i < 4; i++) {
      housePositions.push({ x: -180 + i * 20, y: 0, z: -110 });
      housePositions.push({ x: -180 + i * 20, y: 0, z: -60 });
    }

    const houseColors = [0xc4a882, 0xb89878, 0xd4b892, 0xa88868, 0xc8b098, 0xd8c0a0, 0xb0a088, 0xe0c8a8];

    housePositions.forEach((pos, i) => {
      const house = BuildingFactory.buildHouse(
        pos,
        district,
        houseColors[i % houseColors.length],
      );
      this.register(house);

      // Garage lié
      const garagePos: Vector3 = {
        x: pos.x + 6,
        y: 0,
        z: pos.z,
      };
      const garage = BuildingFactory.buildGarage(garagePos, district);
      this.register(garage);
    });

    // Appartements (2 immeubles)
    const apt1 = BuildingFactory.buildMultiFloor(
      { x: -160, y: 0, z: -30 },
      district, 10, 8, 4, 0x997766
    );
    apt1.data.name = 'Résidence du Parc';
    apt1.data.type = 'apartment';
    this.register(apt1);

    const apt2 = BuildingFactory.buildMultiFloor(
      { x: -120, y: 0, z: -60 },
      district, 10, 8, 3, 0x887766
    );
    apt2.data.name = 'Résidence des Cèdres';
    apt2.data.type = 'apartment';
    this.register(apt2);
  }

  // ============ DISTRICT 4 : INDUSTRIEL ============
  private buildZoneIndustrielle(): void {
    const district: DistrictName = 'industriel';

    // Entrepôt 1
    const entrepot1 = BuildingFactory.build({
      position: { x: -40, y: 0, z: 170 },
      district,
      size: { x: 18, y: 6, z: 12 },
      type: 'warehouse',
      name: 'Entrepôt Industriel A',
      color: 0x7a7a7a,
      roofColor: 0x5a5a5a,
    });
    this.register(entrepot1);

    // Entrepôt 2
    const entrepot2 = BuildingFactory.build({
      position: { x: 40, y: 0, z: 170 },
      district,
      size: { x: 18, y: 6, z: 12 },
      type: 'warehouse',
      name: 'Entrepôt Industriel B',
      color: 0x6a6a6a,
      roofColor: 0x4a4a4a,
    });
    this.register(entrepot2);

    // Quai de chargement (plateforme)
    const quai = BuildingFactory.build({
      position: { x: 0, y: 0, z: 200 },
      district,
      size: { x: 20, y: 1.5, z: 8 },
      type: 'loading-dock',
      name: 'Quai de Chargement',
      color: 0x888888,
      roofColor: 0x666666,
    });
    this.register(quai);

    // Containers
    this.buildContainers({ x: -30, y: 0, z: 200 }, 3, district);
    this.buildContainers({ x: 30, y: 0, z: 200 }, 2, district);

    // Parking camions
    this.buildParking({ x: 0, y: 0, z: 230 }, 5, 2, district);
  }

  // ============ DISTRICT 5 : SERVICES PUBLICS ============
  private buildServicesPublics(): void {
    const district: DistrictName = 'services-publics';

    // Poste de sécurité
    const police = BuildingFactory.build({
      position: { x: 170, y: 0, z: 140 },
      district,
      size: { x: 14, y: 5, z: 10 },
      type: 'police',
      name: 'Poste de Sécurité Port-Éther',
      color: 0x334466,
      roofColor: 0x223355,
    });
    this.register(police);

    // Hôpital
    const hopital = BuildingFactory.build({
      position: { x: 220, y: 0, z: 140 },
      district,
      size: { x: 16, y: 6, z: 12 },
      type: 'hospital',
      name: 'Centre Médical Port-Éther',
      color: 0xeeddff,
      roofColor: 0x9977aa,
    });
    this.register(hopital);

    // Fourrière
    const fourriere = BuildingFactory.build({
      position: { x: 170, y: 0, z: 190 },
      district,
      size: { x: 10, y: 3.5, z: 10 },
      type: 'impound',
      name: 'Fourrière Municipale',
      color: 0x888877,
      roofColor: 0x666655,
    });
    this.register(fourriere);

    // Caserne fictive
    const caserne = BuildingFactory.build({
      position: { x: 220, y: 0, z: 190 },
      district,
      size: { x: 12, y: 5, z: 10 },
      type: 'fire-station',
      name: 'Caserne Municipale',
      color: 0xcc4444,
      roofColor: 0x882222,
    });
    this.register(caserne);
  }

  // ============ ÉLÉMENTS URBAINS ============

  private buildPlaza(pos: Vector3): void {
    const geo = new THREE.BoxGeometry(14, 0.08, 14);
    const mat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.9 });
    const plaza = new THREE.Mesh(geo, mat);
    plaza.position.set(pos.x, 0.04, pos.z);
    plaza.receiveShadow = true;
    this.group.add(plaza);
  }

  private buildParking(pos: Vector3, spotsX: number, spotsZ: number, _district: string): void {
    const totalW = spotsX * 3;
    const totalD = spotsZ * 5.5;
    const pGeo = new THREE.BoxGeometry(totalW, 0.08, totalD);
    const pMat = MaterialsFactory.getConcrete();
    const parking = new THREE.Mesh(pGeo, pMat);
    parking.position.set(pos.x, 0.04, pos.z);
    parking.receiveShadow = true;
    this.group.add(parking);

    // Lignes de stationnement
    const lineGeo = new THREE.BoxGeometry(0.08, 0.04, 4.5);
    const lineMat = MaterialsFactory.getRoadLineWhite();
    for (let i = 0; i < spotsX - 1; i++) {
      for (let j = 0; j < spotsZ; j++) {
        const line = new THREE.Mesh(lineGeo, lineMat);
        const xOff = -totalW / 2 + (i + 1) * 3;
        const zOff = -totalD / 2 + j * 5.5 + 2.75;
        line.position.set(pos.x + xOff, 0.08, pos.z + zOff);
        this.group.add(line);
      }
    }
  }

  private buildContainers(pos: Vector3, count: number, _district: string): void {
    const conGeo = new THREE.BoxGeometry(2.5, 2.5, 6);
    const conMat = new THREE.MeshStandardMaterial({
      color: 0x8a7a5a,
      roughness: 0.8,
      metalness: 0.5,
    });
    for (let i = 0; i < count; i++) {
      const container = new THREE.Mesh(conGeo, conMat);
      const xOff = (i - (count - 1) / 2) * 3;
      container.position.set(pos.x + xOff, 1.25, pos.z);
      container.castShadow = true;
      container.receiveShadow = true;
      this.group.add(container);
    }
  }

  private buildTrees(): void {
    const treePositions: Vector3[] = [
      // Centre-ville
      { x: -10, y: 0, z: -10 }, { x: 10, y: 0, z: -10 },
      { x: -10, y: 0, z: 10 }, { x: 10, y: 0, z: 10 },
      { x: -40, y: 0, z: 10 }, { x: 40, y: 0, z: 10 },
      { x: -45, y: 0, z: -30 }, { x: 45, y: private buildTrees(): void {
    const treePositions: Vector3[] = [
      { x: -10, y: 0, z: -10 }, { x: 10, y: 0, z: -10 },
      { x: -10, y: 0, z: 10 }, { x: 10, y: 0, z: 10 },
      { x: -40, y: 0, z: 10 }, { x: 40, y: 0, z: 10 },
      { x: -45, y: 0, z: -30 }, { x: 45, y: 0, z: -30 },
      { x: -35, y: 0, z: 35 }, { x: 35, y: 0, z: 35 },
      // Commercial
      { x: 160, y: 0, z: -70 }, { x: 260, y: 0, z: -70 },
      { x: 160, y: 0, z: -130 }, { x: 260, y: 0, z: -130 },
      { x: 180, y: 0, z: -95 }, { x: 230, y: 0, z: -95 },
      // Résidentiel
      { x: -210, y: 0, z: -40 }, { x: -210, y: 0, z: -130 },
      { x: -90, y: 0, z: -40 }, { x: -90, y: 0, z: -130 },
      { x: -140, y: 0, z: -25 }, { x: -140, y: 0, z: -135 },
      { x: -170, y: 0, z: -95 }, { x: -130, y: 0, z: -95 },
      // Industriel
      { x: -60, y: 0, z: 160 }, { x: 60, y: 0, z: 160 },
      { x: -50, y: 0, z: 220 }, { x: 50, y: 0, z: 220 },
      // Services
      { x: 160, y: 0, z: 130 }, { x: 240, y: 0, z: 130 },
      { x: 160, y: 0, z: 200 }, { x: 240, y: 0, z: 200 },
    ];

    const trunkMat = MaterialsFactory.getTreeTrunk();
    const topMat = MaterialsFactory.getTreeTop();

    for (const pos of treePositions) {
      const tree = new THREE.Group();
      tree.name = 'tree';

      const trunkH = 2 + Math.random() * 1.5;
      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, trunkH);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      const topR = 1.5 + Math.random() * 1.0;
      const topGeo = new THREE.SphereGeometry(topR, 8, 6);
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = trunkH + topR * 0.6;
      top.castShadow = true;
      tree.add(top);

      tree.position.set(pos.x, 0, pos.z);
      this.trees.add(tree);
    }
  }

  private buildStreetLamps(): void {
    const lampPositions: Vector3[] = [
      // Centre-ville - Rue Principale
      { x: -8, y: 0, z: -80 }, { x: 8, y: 0, z: -80 },
      { x: -8, y: 0, z: -40 }, { x: 8, y: 0, z: -40 },
      { x: -8, y: 0, z: 0 }, { x: 8, y: 0, z: 0 },
      { x: -8, y: 0, z: 40 }, { x: 8, y: 0, z: 40 },
      { x: -8, y: 0, z: 80 }, { x: 8, y: 0, z: 80 },
      // Avenue du Port
      { x: -60, y: 0, z: -8 }, { x: -60, y: 0, z: 8 },
      { x: -20, y: 0, z: -8 }, { x: -20, y: 0, z: 8 },
      { x: 20, y: 0, z: -8 }, { x: 20, y: 0, z: 8 },
      { x: 60, y: 0, z: -8 }, { x: 60, y: 0, z: 8 },
      // Commercial
      { x: 160, y: 0, z: -75 }, { x: 240, y: 0, z: -75 },
      { x: 160, y: 0, z: -125 }, { x: 240, y: 0, z: -125 },
      // Résidentiel
      { x: -190, y: 0, z: -80 }, { x: -110, y: 0, z: -80 },
      { x: -190, y: 0, z: -130 }, { x: -110, y: 0, z: -30 },
      // Industriel
      { x: -60, y: 0, z: 150 }, { x: 60, y: 0, z: 150 },
      { x: -60, y: 0, z: 200 }, { x: 60, y: 0, z: 200 },
      // Services
      { x: 160, y: 0, z: 120 }, { x: 240, y: 0, z: 120 },
      { x: 160, y: 0, z: 190 }, { x: 240, y: 0, z: 190 },
    ];

    const poleMat = MaterialsFactory.getLampPost();
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffdd88,
      emissive: 0xffdd88,
      emissiveIntensity: 1.0,
    });

    for (const pos of lampPositions) {
      const lamp = new THREE.Group();
      lamp.name = 'streetlamp';

      const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.5);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2.25;
      lamp.add(pole);

      const armGeo = new THREE.BoxGeometry(0.6, 0.06, 0.06);
      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.position.set(0.3, 4.5, 0);
      lamp.add(arm);

      const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(0.6, 4.4, 0);
      lamp.add(light);

      lamp.position.set(pos.x, 0, pos.z);
      this.streetLamps.add(lamp);
    }
  }

  private buildUrbanProps(): void {
    // Bancs publics (quelques positions)
    const benchPositions: Vector3[] = [
      { x: 0, y: 0, z: -5 }, { x: 0, y: 0, z: 5 },
      { x: -3, y: 0, z: 0 }, { x: 3, y: 0, z: 0 },
      { x: -25, y: 0, z: -15 }, { x: 25, y: 0, z: -15 },
      { x: 170, y: 0, z: -85 }, { x: 220, y: 0, z: -125 },
      { x: -140, y: 0, z: -80 }, { x: -140, y: 0, z: -60 },
    ];
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 });
    const benchMatMetal = MaterialsFactory.getMetal(0x555555);

    for (const pos of benchPositions) {
      const bench = new THREE.Group();
      bench.name = 'bench';

      const seatGeo = new THREE.BoxGeometry(1.8, 0.08, 0.5);
      const seat = new THREE.Mesh(seatGeo, benchMat);
      seat.position.y = 0.45;
      bench.add(seat);

      const legGeo = new THREE.BoxGeometry(0.06, 0.4, 0.5);
      for (const xOff of [-0.8, 0.8]) {
        const leg = new THREE.Mesh(legGeo, benchMatMetal);
        leg.position.set(xOff, 0.2, 0);
        bench.add(leg);
      }

      const backGeo = new THREE.BoxGeometry(1.8, 0.4, 0.06);
      const back = new THREE.Mesh(backGeo, benchMat);
      back.position.set(0, 0.7, -0.25);
      bench.add(back);

      bench.position.set(pos.x, 0, pos.z);
      const rot = Math.random() * Math.PI * 2;
      bench.rotation.y = rot;
      this.props.add(bench);
    }

    // Poubelles
    const trashPositions: Vector3[] = [
      { x: -2, y: 0, z: -8 }, { x: 2, y: 0, z: -8 },
      { x: -15, y: 0, z: 5 }, { x: 15, y: 0, z: 5 },
      { x: 180, y: 0, z: -90 }, { x: -120, y: 0, z: -80 },
    ];
    const trashMat = new THREE.MeshStandardMaterial({ color: 0x447744, roughness: 0.8 });

    for (const pos of trashPositions) {
      const binGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.6, 8);
      const bin = new THREE.Mesh(binGeo, trashMat);
      bin.position.set(pos.x, 0.3, pos.z);
      bin.name = 'trash';
      this.props.add(bin);
    }
  }

  /** Retourne le bâtiment à une position donnée */
  getBuildingAtPosition(position: Vector3): BuiltBuilding | null {
    const p = new THREE.Vector3(position.x, position.y, position.z);
    for (const b of this.buildings) {
      const worldBox = b.collisionBox.clone();
      const worldPos = new THREE.Vector3(
        b.data.position.x, 0, b.data.position.z
      );
      worldBox.min.add(worldPos);
      worldBox.max.add(worldPos);
      if (worldBox.containsPoint(p)) {
        return b;
      }
    }
    return null;
  }
}