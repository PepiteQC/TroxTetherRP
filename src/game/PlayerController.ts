// EtherWorld RP — Port-Éther
// Contrôleur joueur — déplacement WASD/ZQSD, sprint, saut, collision, caméra TPS

import * as THREE from 'three';
import type { PlayerState, Vector3 } from '../shared/types';
import {
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_SPRINT_MULT,
  PLAYER_JUMP_FORCE,
  PLAYER_GRAVITY,
  PLAYER_CAMERA_DISTANCE,
  PLAYER_CAMERA_SMOOTH,
  STARTING_CASH,
} from '../shared/constants';

export class PlayerController {
  public state: PlayerState;
  public mesh: THREE.Group;
  public camera: THREE.PerspectiveCamera;
  public cameraTarget: THREE.Vector3 = new THREE.Vector3();
  public isOnGround = true;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isPointerLocked = false;

  private input = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
  };
  private mouseX = 0;
  private mouseY = 0;
  private cameraTheta = 0;
  private cameraPhi = Math.PI / 4;
  private cameraDistance = PLAYER_CAMERA_DISTANCE;
  private collisionObjects: THREE.Box3[] = [];

  constructor(
    playerId: string,
    playerName: string,
    spawnPosition: Vector3,
    camera: THREE.PerspectiveCamera,
  ) {
    this.camera = camera;
    this.state = this.createDefaultState(playerId, playerName, spawnPosition);
    this.mesh = this.buildAvatar();
    this.mesh.position.set(spawnPosition.x, 0, spawnPosition.z);
    this.updateCameraTarget();
  }

  private createDefaultState(id: string, name: string, pos: Vector3): PlayerState {
    return {
      id,
      name,
      job: 'sans-emploi',
      jobRank: 1,
      cash: STARTING_CASH,
      bank: 0,
      health: 100,
      hunger: 100,
      thirst: 100,
      currentVehicleId: null,
      currentPropertyId: null,
      permissions: [],
      position: pos,
      rotation: { x: 0, y: 0, z: 0 },
      isSprinting: false,
      isDriving: false,
      isBuilding: false,
      jacketColor: '#4488cc',
    };
  }

  private buildAvatar(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'player';

    // Corps (veste)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.7 });
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);

    // Tête
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffddaa, roughness: 0.6 });
    const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.5;
    head.castShadow = true;
    group.add(head);

    // Jambes
    const legMat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.8 });
    const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.25);
    for (const xOff of [-0.15, 0.15]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(xOff, 0.35, 0);
      group.add(leg);
    }

    // Bras
    const armMat = new THREE.MeshStandardMaterial({ color: 0x4488cc, roughness: 0.7 });
    const armGeo = new THREE.BoxGeometry(0.15, 0.7, 0.15);
    for (const xOff of [-0.4, 0.4]) {
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(xOff, 0.9, 0);
      group.add(arm);
    }

    return group;
  }

  setCollisionObjects(objects: THREE.Box3[]): void {
    this.collisionObjects = objects;
  }

  /** Met à jour le joueur chaque frame */
  update(deltaTime: number): void {
    if (this.state.isDriving || this.state.isBuilding) return;

    const speed = this.input.sprint ? PLAYER_SPEED * PLAYER_SPRINT_MULT : PLAYER_SPEED;
    this.state.isSprinting = this.input.sprint;

    // Direction du mouvement (relatif à la caméra)
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();
    right.applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();

    const moveDir = new THREE.Vector3();
    if (this.input.forward) moveDir.add(forward);
    if (this.input.backward) moveDir.sub(forward);
    if (this.input.left) moveDir.sub(right);
    if (this.input.right) moveDir.add(right);
    moveDir.normalize();

    // Vélocité horizontale
    this.velocity.x = moveDir.x * speed;
    this.velocity.z = moveDir.z * speed;

    // Saut
    if (this.input.jump && this.isOnGround) {
      this.velocity.y = PLAYER_JUMP_FORCE;
      this.isOnGround = false;
    }

    // Gravité
    if (!this.isOnGround) {
      this.velocity.y += PLAYER_GRAVITY * deltaTime;
    }

    // Appliquer mouvement avec collision simple
    const newPos = this.mesh.position.clone();
    newPos.x += this.velocity.x * deltaTime;
    newPos.z += this.velocity.z * deltaTime;
    newPos.y += this.velocity.y * deltaTime;

    // Collision au sol
    if (newPos.y < 0) {
      newPos.y = 0;
      this.velocity.y = 0;
      this.isOnGround = true;
    }

    // Collision avec les objets
    const playerBox = new THREE.Box3(
      new THREE.Vector3(newPos.x - PLAYER_RADIUS, newPos.y, newPos.z - PLAYER_RADIUS),
      new THREE.Vector3(newPos.x + PLAYER_RADIUS, newPos.y + PLAYER_HEIGHT, newPos.z + PLAYER_RADIUS),
    );

    let collided = false;
    for (const box of this.collisionObjects) {
      if (playerBox.intersectsBox(box)) {
        collided = true;
        break;
      }
    }

    if (!collided) {
      this.mesh.position.copy(newPos);
    }

    // Rotation du joueur vers la direction de la caméra
    if (moveDir.length() > 0.1) {
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.mesh.rotation.y = targetAngle;
    }

    // Mettre à jour l'état
    this.state.position = {
      x: this.mesh.position.x,
      y: this.mesh.position.y,
      z: this.mesh.position.z,
    };
    this.state.rotation = {
      x: this.mesh.rotation.x,
      y: this.mesh.rotation.y,
      z: this.mesh.rotation.z
    };
  }
}