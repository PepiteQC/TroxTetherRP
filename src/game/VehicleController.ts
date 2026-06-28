// EtherWorld RP — Port-Éther
// Contrôleur véhicule — entrer/sortir, conduite, physique simplifiée

import * as THREE from 'three';
import type { VehicleData, Vector3 } from '../shared/types';
import {
  VEHICLE_FUEL_MAX,
  VEHICLE_SPEED_MAX,
  VEHICLE_ACCEL,
  VEHICLE_BRAKE,
  VEHICLE_FRICTION,
  VEHICLE_STEER_SPEED,
  VEHICLE_FUEL_CONSUMPTION,
} from '../shared/constants';

export class VehicleController {
  public data: VehicleData;
  public mesh: THREE.Group;
  public isOccupied = false;
  public occupiedBy: string | null = null;
  public currentSpeed = 0;
  public currentSteer = 0;

  private input = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
  };

  private static plateCounter = 1000;

  constructor(model: string, position: Vector3, ownerId: string | null = null) {
    this.data = this.createVehicleData(model, position, ownerId);
    this.mesh = this.buildVehicleMesh(model);
    this.mesh.position.set(position.x, position.y, position.z);
  }

  private createVehicleData(model: string, pos: Vector3, ownerId: string | null): VehicleData {
    return {
      id: `veh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      model: model as VehicleData['model'],
      ownerId,
      plate: `PE-${++VehicleController.plateCounter}`,
      fuel: VEHICLE_FUEL_MAX,
      health: 100,
      position: pos,
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      garageId: null,
      locked: true,
      engineOn: false,
      jobRequired: null,
      color: 0x4488cc,
    };
  }

  private buildVehicleMesh(model: string): THREE.Group {
    const group = new THREE.Group();
    group.name = `vehicle_${model}`;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.data.color,
      roughness: 0.3,
      metalness: 0.6,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3,
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.9,
    });
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      emissive: 0xff2222,
      emissiveIntensity: 0.5,
    });

    // Carrosserie principale
    let bodyW = 2.0, bodyH = 1.2, bodyD = 4.0;
    switch (model) {
      case 'Ether-Compact': bodyW = 1.8; bodyH = 1.2; bodyD = 3.8; break;
      case 'Forge-Pickup': bodyW = 2.0; bodyH = 1.5; bodyD = 5.0; break;
      case 'Nova-Sedan': bodyW = 1.9; bodyH = 1.3; bodyD = 4.2; break;
      case 'Atlas-Van': bodyW = 2.1; bodyH = 1.8; bodyD = 5.2; break;
      case 'Port-Ether-Taxi': bodyW = 1.9; bodyH = 1.3; bodyD = 4.2;
        bodyMat.color.setHex(0xffcc00);
        break;
      case 'Municipal-Cruiser':
        bodyW = 2.0; bodyH = 1.4; bodyD = 4.5;
        bodyMat.color.setHex(0x335577);
        break;
      case 'Utility-Truck':
        bodyW = 2.0; bodyH = 1.5; bodyD = 5.5;
        bodyMat.color.setHex(0x556666);
        break;
    }

    // Corps
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyD);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = bodyH / 2;
    body.castShadow = true;
    group.add(body);

    // Toit / habitacle (cabine pour pickup/van)
    if (model !== 'Forge-Pickup' && model !== 'Utility-Truck') {
      const cabinGeo = new THREE.BoxGeometry(bodyW * 0.8, bodyH * 0.5, bodyD * 0.5);
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(0, bodyH * 1.2, -bodyD * 0.1);
      group.add(cabin);
    }

    // Roues
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 8);
    wheelGeo.rotateX(Math.PI / 2);
    const wheelPositions = [
      { x: -bodyW / 2 - 0.1, z: -bodyD / 3 },
      { x: bodyW / 2 + 0.1, z: -bodyD / 3 },
      { x: -bodyW / 2 - 0.1, z: bodyD / 3 },
      { x: bodyW / 2 + 0.1, z: bodyD / 3 },
    ];
    for (const wp of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wp.x, 0.25, wp.z);
      group.add(wheel);
    }

    // Phares avant
    const lightGeo = new THREE.SphereGeometry(0.08, 6, 6);
    for (const xOff of [-0.6, 0.6]) {
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(xOff, 0.5, -bodyD / 2 - 0.05);
      group.add(light);
    }

    // Plaque d'immatriculation
    const plateGeo = new THREE.BoxGeometry(0.3, 0.12, 0.02);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 0.15, bodyD / 2 + 0.02);
    group.add(plate);

    return group;
  }

  /** Mise à jour de la physique du véhicule */
  update(deltaTime: number): void {
    if (!this.data.engineOn) return;

    // Accélération / freinage
    if (this.input.forward) {
      this.currentSpeed = Math.min(
        this.currentSpeed + VEHICLE_ACCEL * deltaTime,
        VEHICLE_SPEED_MAX,
      );
    } else if (this.input.backward) {
      this.currentSpeed = Math.max(
        this.currentSpeed - VEHICLE_ACCEL * deltaTime * 0.5,
        -VEHICLE_SPEED_MAX * 0.3,
      );
    } else if (this.input.brake) {
      this.currentSpeed *= (1 - VEHICLE_BRAKE * deltaTime);
      if (Math.abs(this.currentSpeed) < 0.1) this.currentSpeed = 0;
    } else {
      // Friction
      this.currentSpeed *= (1 - VEHICLE_FRICTION * deltaTime);
      if (Math.abs(this.currentSpeed) < 0.05) this.currentSpeed = 0;
    }

    // Direction
    if (Math.abs(this.currentSpeed) > 0.5) {
      const steerFactor = this.currentSpeed > 0 ? 1 : -1;
      if (this.input.left) {
        this.currentSteer += VEHICLE_STEER_SPEED * deltaTime * steerFactor;
      } else if (this.input.right) {
        this.currentSteer -= VEHICLE_STEER_SPEED * deltaTime * steerFactor;
      } else {
        this.currentSteer *= 0.9;
      }
      this.currentSteer = Math.max(-1, Math.min(1, this.currentSteer));

      // Rotation
      this.mesh.rotation.y += this.currentSteer * 1.5 * deltaTime * Math.sign(this.currentSpeed);
    }

    // Mouvement vers l'avant
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.mesh.quaternion);
    this.mesh.position.x += forward.x * this.currentSpeed * deltaTime;
    this.mesh.position.z += forward.z * this.currentSpeed * deltaTime;

    // Consommation carburant
    if (Math.abs(this.currentSpeed) > 0.5) {
      this.data.fuel = Math.max(0, this.data.fuel - Math.abs(this.currentSpeed) * VEHICLE_FUEL_CONSUMPTION * deltaTime);
      if (this.data.fuel <= 0) {
        this.data.engineOn = false;
        this.currentSpeed = 0;
      }
    }

    // Mettre à jour l'état
    this.data.position = {
      x: this.mesh.position.x,
      y: this.mesh.position.y,
      z: this.mesh.position.z,
    };
    this.data.rotation = {
      x: this.mesh.rotation.x,
      y: this.mesh.rotation.y,
      z: this.mesh.rotation.z,
    };
    this.data.velocity = {
      x: forward.x * this.currentSpeed,
      y: 0,
      z: forward.z * this.currentSpeed,
    };
  }

  handleKeyDown(key: string): void {
    switch (key.toLowerCase()) {
      case 'z': case 'w': this.input.forward = true; break;
      case 's': this.input.backward = true; break;
      case 'q': case 'a': this.input.left = true; break;
      case 'd': this.input.right = true; break;
      case 'shift': this.input.brake = true; break;
    }
  }

  handleKeyUp(key: string): void {
    switch (key.toLowerCase()) {
      case 'z': case 'w': this.input.forward = false; break;
      case 's': this.input.backward = false; break;
      case 'q': case 'a': this.input.left = false; break;
      case 'd': this.input.right = false; break;
      case 'shift': this.input.brake = false; break;
    }
  }

  toggleEngine(): void {
    if (this.data.fuel > 0) {
      this.data.engineOn = !this.data.engineOn;
    }
  }

  teleport(position: Vector3): void {
    this.mesh.position.set(position.x, position.y, position.z);
    this.data.position = position;
  }
}