// C:\troxtetherworld\server\admin\src\components\physics\CannonPhysics.js
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class CannonPhysics {
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
      allowSleep: true,
      broadphase: new CANNON.SAPBroadphase()
    });

    // Configuration de la physique
    this.world.defaultContactMaterial.friction = 0.3;
    this.world.defaultContactMaterial.restitution = 0.2;
    this.world.solver.iterations = 10;
    this.world.solver.tolerance = 0.001;

    // Matériaux
    this.materials = {
      player: new CANNON.Material('player'),
      vehicle: new CANNON.Material('vehicle'),
      ground: new CANNON.Material('ground'),
      prop: new CANNON.Material('prop'),
      ragdoll: new CANNON.Material('ragdoll'),
      bullet: new CANNON.Material('bullet')
    };

    // Contacts entre matériaux
    this._setupContactMaterials();

    // Corps physiques
    this.bodies = new Map(); // id → CANNON.Body
    this.ragdolls = new Map(); // id → RagdollInstance
    this.projectiles = [];
    this.vehicles = new Map();

    // Time
    this.fixedTimeStep = 1 / 60;
    this.maxSubSteps = 3;
    this.lastCallTime = performance.now();
  }

  initialize(scene) {
    // Créer le sol
    this._createGround();
    
    // Créer les murs de la ville (boundaries)
    this._createWorldBounds();

    console.log('[Physics] Initialisé avec Cannon-es');
    return this;
  }

  update() {
    const time = performance.now();
    const dt = (time - this.lastCallTime) / 1000;
    this.lastCallTime = time;

    // Step de la physique
    this.world.step(this.fixedTimeStep, dt, this.maxSubSteps);

    // Mettre à jour les ragdolls
    this._updateRagdolls();

    // Nettoyer les projectiles terminés
    this._cleanProjectiles();

    // Vérifier les collisions
    this._checkBulletHits();
  }

  // ─── JOUEUR ────────────────────────────────────────

  createPlayerBody(id, position = { x: 0, y: 1, z: 0 }) {
    const shape = new CANNON.Cylinder(0.3, 0.3, 1.8, 8);
    const body = new CANNON.Body({
      mass: 75,
      shape,
      material: this.materials.player,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      fixedRotation: true,
      linearDamping: 0.9
    });

    // Capsule de collision
    const collisionGroup = 1; // Joueur
    body.collisionFilterGroup = collisionGroup;
    body.collisionFilterMask = -1; // Tout

    this.world.addBody(body);
    this.bodies.set(id, body);

    return body;
  }

  movePlayer(id, direction, speed, deltaTime) {
    const body = this.bodies.get(id);
    if (!body) return;

    // Appliquer la force dans la direction du regard
    const force = new CANNON.Vec3(
      direction.x * speed * deltaTime * 50,
      0,
      direction.z * speed * deltaTime * 50
    );

    body.applyImpulse(force, body.position);
  }

  jumpPlayer(id, force = 5) {
    const body = this.bodies.get(id);
    if (!body) return;

    // Vérifier si au sol
    if (!this._isOnGround(body)) return;

    body.velocity.y = force;
  }

  setPlayerPosition(id, position) {
    const body = this.bodies.get(id);
    if (!body) return;

    body.position.set(position.x, position.y, position.z);
    body.velocity.set(0, 0, 0);
  }

  getPlayerPosition(id) {
    const body = this.bodies.get(id);
    if (!body) return null;

    return {
      x: body.position.x,
      y: body.position.y,
      z: body.position.z
    };
  }

  // ─── RAGDOLL ────────────────────────────────────────

  createRagdoll(id, position, velocity = { x: 0, y: 0, z: 0 }) {
    // Supprimer l'ancienne hitbox joueur
    const oldBody = this.bodies.get(id);
    if (oldBody) {
      this.world.removeBody(oldBody);
      this.bodies.delete(id);
    }

    // Supprimer ancien ragdoll si existe
    this.removeRagdoll(id);

    // Créer les parties du corps
    const parts = this._createRagdollParts(position, velocity);
    const constraints = this._createRagdollConstraints(parts);

    // Ajouter au monde
    for (const part of Object.values(parts)) {
      this.world.addBody(part);
    }
    for (const constraint of constraints) {
      this.world.addConstraint(constraint);
    }

    const ragdoll = {
      id,
      parts,
      constraints,
      createdAt: Date.now(),
      lifetime: 10000, // 10 secondes avant cleanup
      active: true
    };

    this.ragdolls.set(id, ragdoll);

    // Auto-destruction après le lifetime
    setTimeout(() => this.removeRagdoll(id), ragdoll.lifetime);

    return ragdoll;
  }

  removeRagdoll(id) {
    const ragdoll = this.ragdolls.get(id);
    if (!ragdoll) return;

    for (const part of Object.values(ragdoll.parts)) {
      this.world.removeBody(part);
    }
    for (const constraint of ragdoll.constraints) {
      this.world.removeConstraint(constraint);
    }

    this.ragdolls.delete(id);
  }

  applyForceToRagdoll(id, force, origin) {
    const ragdoll = this.ragdolls.get(id);
    if (!ragdoll) return;

    // Appliquer la force au torse (principal)
    const chest = ragdoll.parts.chest;
    if (chest) {
      chest.applyImpulse(
        new CANNON.Vec3(force.x, force.y, force.z),
        new CANNON.Vec3(origin.x, origin.y, origin.z)
      );
    }
  }

  // ─── PROJECTILES / ARMES ────────────────────────────

  shootBullet(origin, direction, shooterId, weaponData) {
    const { damage = 25, speed = 50, range = 100, spread = 0.02 } = weaponData;

    // Appliquer le spread
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;

    // Normaliser
    const dir = new CANNON.Vec3(direction.x, direction.y, direction.z);
    dir.normalize();

    // Créer la balle (petite sphère rapide)
    const bullet = new CANNON.Body({
      mass: 0.01,
      shape: new CANNON.Sphere(0.02),
      material: this.materials.bullet,
      position: new CANNON.Vec3(origin.x, origin.y, origin.z),
      velocity: dir.scale(speed),
      linearDamping: 0,
      collisionFilterGroup: 2, // Projectile
      collisionFilterMask: 1 | 4 | 8 // Player, Ground, Prop
    });

    bullet.userData = {
      type: 'bullet',
      shooterId,
      damage,
      range,
      startPosition: { ...origin },
      createdAt: Date.now()
    };

    this.world.addBody(bullet);
    this.projectiles.push(bullet);

    // Détruire après range
    setTimeout(() => {
      this.world.removeBody(bullet);
      this.projectiles = this.projectiles.filter(b => b !== bullet);
    }, (range / speed) * 1000);

    return bullet;
  }

  // ─── VÉHICULES ──────────────────────────────────────

  createVehicle(id, model, position, rotation = 0) {
    const config = vehicleConfigs[model] || defaultVehicleConfig;
    
    // Châssis principal
    const chassis = new CANNON.Body({
      mass: config.mass || 1000,
      shape: new CANNON.Box(
        new CANNON.Vec3(config.dimensions.x / 2, config.dimensions.y / 2, config.dimensions.z / 2)
      ),
      material: this.materials.vehicle,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      angularDamping: 0.3,
      linearDamping: 0.1
    });

    // Quaternion pour la rotation
    const quat = new CANNON.Quaternion();
    quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
    chassis.quaternion = quat;

    // Roues
    const wheels = [];
    const wheelShape = new CANNON.Sphere(config.wheelRadius || 0.3);

    for (const wheelPos of config.wheelPositions) {
      const wheel = new CANNON.Body({
        mass: 20,
        shape: wheelShape,
        material: this.materials.vehicle
      });
      wheel.position.set(
        position.x + wheelPos.x,
        position.y + wheelPos.y,
        position.z + wheelPos.z
      );
      wheels.push(wheel);
    }

    // Contraintes pour les roues
    const constraints = [];
    for (let i = 0; i < 4 && i < wheels.length; i++) {
      const constraint = new CANNON.HingeConstraint(wheels[i], chassis, {
        pivotA: new CANNON.Vec3(0, 0, 0),
        axisA: new CANNON.Vec3(0, 0, 1),
        pivotB: new CANNON.Vec3(
          0,
          -config.dimensions.y / 2 + config.wheelRadius,
          (i < 2 ? config.dimensions.z / 2 : -config.dimensions.z / 2)
        ),
        axisB: new CANNON.Vec3(0, 0, 1)
      });
      constraints.push(constraint);
    }

    // Ajouter au monde
    this.world.addBody(chassis);
    for (const wheel of wheels) {
      this.world.addBody(wheel);
    }
    for (const constraint of constraints) {
      this.world.addConstraint(constraint);
    }

    const vehicle = {
      id,
      model,
      chassis,
      wheels,
      constraints,
      config,
      speed: 0,
      steer: 0,
      brake: false
    };

    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  driveVehicle(id, throttle, steer) {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) return;

    const { chassis, wheels, config } = vehicle;
    const speed = config.maxSpeed || 30;

    // Appliquer la force vers l'avant
    const forward = new CANNON.Vec3(0, 0, 1);
    chassis.vectorToWorldFrame(forward, forward);

    const forceMagnitude = throttle * speed * 500;
    chassis.applyImpulse(
      forward.scale(forceMagnitude * this.fixedTimeStep),
      chassis.position
    );

    // Direction
    vehicle.steer = steer;
    chassis.angularVelocity.y = steer * 2;

    // Frein
    vehicle.brake = throttle === 0 && Math.abs(chassis.velocity.length()) > 0.1;
    if (vehicle.brake) {
      chassis.velocity.scale(0.95, chassis.velocity);
    }

    vehicle.speed = chassis.velocity.length();
  }

  // ─── COLLISIONS ──────────────────────────────────────

  _setupContactMaterials() {
    // Player ↔ Ground
    this.world.addContactMaterial(
      this.materials.player,
      this.materials.ground,
      { friction: 0.5, restitution: 0.1 }
    );

    // Player ↔ Player
    this.world.addContactMaterial(
      this.materials.player,
      this.materials.player,
      { friction: 0.3, restitution: 0.1 }
    );

    // Player ↔ Vehicle
    this.world.addContactMaterial(
      this.materials.player,
      this.materials.vehicle,
      { friction: 0.5, restitution: 0.3 }
    );

    // Bullet ↔ Player
    this.world.addContactMaterial(
      this.materials.bullet,
      this.materials.player,
      { friction: 0.1, restitution: 0.01 }
    );

    // Bullet ↔ Ground
    this.world.addContactMaterial(
      this.materials.bullet,
      this.materials.ground,
      { friction: 0.1, restitution: 0.01 }
    );

    // Ragdoll ↔ Ground
    this.world.addContactMaterial(
      this.materials.ragdoll,
      this.materials.ground,
      { friction: 0.8, restitution: 0.05 }
    );
  }

  _createGround() {
    const groundShape = new CANNON.Plane();
    const ground = new CANNON.Body({
      mass: 0, // Statique
      shape: groundShape,
      material: this.materials.ground
    });
    ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(ground);
  }

  _createWorldBounds() {
    const walls = [
      { pos: [0, 10, -250], size: [500, 20, 1] },  // Nord
      { pos: [0, 10, 250], size: [500, 20, 1] },   // Sud
      { pos: [-250, 10, 0], size: [1, 20, 500] },  // Ouest
      { pos: [250, 10, 0], size: [1, 20, 500] }    // Est
    ];

    for (const wall of walls) {
      const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(
          new CANNON.Vec3(wall.size[0]/2, wall.size[1]/2, wall.size[2]/2)
        ),
        material: this.materials.ground,
        position: new CANNON.Vec3(wall.pos[0], wall.pos[1], wall.pos[2])
      });
      this.world.addBody(body);
    }
  }

  _createRagdollParts(position, velocity) {
    const parts = {};

    // Tête
    parts.head = new CANNON.Body({
      mass: 5,
      shape: new CANNON.Sphere(0.15),
      material: this.materials.ragdoll,
      position: new CANNON.Vec3(position.x, position.y + 1.7, position.z),
      velocity: new CANNON.Vec3(velocity.x, velocity.y, velocity.z),
      linearDamping: 0.3,
      angularDamping: 0.3
    });

    // Tronc (torse)
    parts.chest = new CANNON.Body({
      mass: 20,
      shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.3, 0.15)),
      material: this.materials.ragdoll,
      position: new CANNON.Vec3(position.x, position.y + 1.2, position.z),
      velocity: new CANNON.Vec3(velocity.x, velocity.y, velocity.z),
      linearDamping: 0.2,
      angularDamping: 0.2
    });

    // Bassin
    parts.hips = new CANNON.Body({
      mass: 15,
      shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.15, 0.2)),
      material: this.materials.ragdoll,
      position: new CANNON.Vec3(position.x, position.y + 0.8, position.z),
      velocity: new CANNON.Vec3(velocity.x, velocity.y, velocity.z),
      linearDamping: 0.3,
      angularDamping: 0.3
    });

    // Bras gauche
    parts.leftArm = new CANNON.Body({
      mass: 5,
      shape: new CANNON.Box(new CANNON.Vec3(0.05, 0.25, 0.05)),
      material: this.materials.ragdoll,
      position: new CANNON.Vec3(position.x - 0.35, position.y + 1.2, position.z),
      velocity: new CANNON.Vec3(velocity.x, velocity.y, velocity.z),
      linearDamping: 0.2,
      angularDamping: 0.2
    });

    // Bras droit
    parts.rightArm = new CANNON.Body({
      mass: 5,
      shape: new CANNON.Box(new CANNON.Vec3(0.05, 0.25, 0.05)),
      material: this.materials.ragdoll,
      position: new CANNON.Vec3(position.x + 0.35, position.y + 1.2, position.z),
      velocity: new CANNON.Vec3(velocity.x, velocity.y, velocity.z),
      linearDamping: 0.2,
      angularDamping: 0.2
    });

    // Jambe gauche
    parts.leftLeg = new CANNON.Body({
      mass: 8,
      shape: new CANNON.Box(new CANNON.Vec3(0.08, 0.35, 0.08)),
      material: this.materials.ragdoll,
      position: new CANNON.Vec3(position.x - 0.1, position.y + 0.35, position.z),
      velocity: new CANNON.Vec3(velocity.x, velocity.y, velocity.z),
      linearDamping: 0.3,
      angularDamping: 0.3
    });

    // Jambe droite
    parts.rightLeg = new CANNON.Body({
      mass: 8,
      shape: new CANNON.Box(new CANNON.Vec3(0.08, 0.35, 0.08)),
      material: this.materials.ragdoll,
      position: new CANNON.Vec3(position.x + 0.1, position.y + 0.35, position.z),
      velocity: new CANNON.Vec3(velocity.x, velocity.y, velocity.z),
      linearDamping: 0.3,
      angularDamping: 0.3
    });

    return parts;
  }

  _createRagdollConstraints(parts) {
    const constraints = [];
    const { head, chest, hips, leftArm, rightArm, leftLeg, rightLeg } = parts;

    // Cou (tête ↔ torse)
    constraints.push(new CANNON.ConeTwistConstraint(head, chest, {
      pivotA: new CANNON.Vec3(0, -0.15, 0),
      pivotB: new CANNON.Vec3(0, 0.3, 0),
      axisA: new CANNON.Vec3(0, 1, 0),
      axisB: new CANNON.Vec3(0, 1, 0),
      angle: Math.PI / 4,
      twistAngle: Math.PI / 8
    }));

    // Torse ↔ Bassin
    constraints.push(new CANNON.ConeTwistConstraint(chest, hips, {
      pivotA: new CANNON.Vec3(0, -0.3, 0),
      pivotB: new CANNON.Vec3(0, 0.15, 0),
      axisA: new CANNON.Vec3(0, 1, 0),
      axisB: new CANNON.Vec3(0, 1, 0),
      angle: Math.PI / 4,
      twistAngle: Math.PI / 8
    }));

    // Bras gauche (torse ↔ bras)
    constraints.push(new CANNON.ConeTwistConstraint(chest, leftArm, {
      pivotA: new CANNON.Vec3(-0.25, 0.1, 0),
      pivotB: new CANNON.Vec3(0, 0.25, 0),
      axisA: new CANNON.Vec3(0, 1, 0),
      axisB: new CANNON.Vec3(0, 1, 0),
      angle: Math.PI / 2,
      twistAngle: Math.PI / 4
    }));

    // Bras droit
    constraints.push(new CANNON.ConeTwistConstraint(chest, rightArm, {
      pivotA: new CANNON.Vec3(0.25, 0.1, 0),
      pivotB: new CANNON.Vec3(0, 0.25, 0),
      axisA: new CANNON.Vec3(0, 1, 0),
      axisB: new CANNON.Vec3(0, 1, 0),
      angle: Math.PI / 2,
      twistAngle: Math.PI / 4
    }));

    // Jambe gauche (bassin ↔ jambe)
    constraints.push(new CANNON.ConeTwistConstraint(hips, leftLeg, {
      pivotA: new CANNON.Vec3(-0.1, -0.15, 0),
      pivotB: new CANNON.Vec3(0, 0.35, 0),
      axisA: new CANNON.Vec3(0, -1, 0),
      axisB: new CANNON.Vec3(0, 1, 0),
      angle: Math.PI / 3,
      twistAngle: Math.PI / 8
    }));

    // Jambe droite
    constraints.push(new CANNON.ConeTwistConstraint(hips, rightLeg, {
      pivotA: new CANNON.Vec3(0.1, -0.15, 0),
      pivotB: new CANNON.Vec3(0, 0.35, 0),
      axisA: new CANNON.Vec3(0, -1, 0),
      axisB: new CANNON.Vec3(0, 1, 0),
      angle: Math.PI / 3,
      twistAngle: Math.PI / 8
    }));

    return constraints;
  }

  _updateRagdolls() {
    for (const [id, ragdoll] of this.ragdolls) {
      if (!ragdoll.active) continue;

      // Vérifier si le ragdoll est trop loin ou sous le monde
      for (const part of Object.values(ragdoll.parts)) {
        if (part.position.y < -50) {
          this.removeRagdoll(id);
          break;
        }
        if (part.position.length() > 1000) {
          this.removeRagdoll(id);
          break;
        }
      }
    }
  }

  _cleanProjectiles() {
    this.projectiles = this.projectiles.filter(bullet => {
      // Supprimer les balles trop vieilles (>5s)
      if (Date.now() - bullet.userData.createdAt > 5000) {
        this.world.removeBody(bullet);
        return false;
      }

      // Supprimer les balles trop loin
      const dist = Math.sqrt(
        Math.pow(bullet.position.x - bullet.userData.startPosition.x, 2) +
        Math.pow(bullet.position.z - bullet.userData.startPosition.z, 2)
      );
      if (dist > bullet.userData.range) {
        this.world.removeBody(bullet);
        return false;
      }

      return true;
    });
  }

  _checkBulletHits() {
    this.world.addEventListener('postStep', () => {
      // Vérifier les contacts
      for (const contact of this.world.contacts) {
        const { bi, bj } = contact;

        // Vérifier si un des corps est une balle
        const bulletBody = bi.userData?.type === 'bullet' ? bi : 
                          bj.userData?.type === 'bullet' ? bj : null;
        
        if (!bulletBody) continue;

        const otherBody = bi === bulletBody ? bj : bi;
        const otherId = this._findBodyId(otherBody);

        if (otherId && otherId !== bulletBody.userData.shooterId) {
          // Hit! Émettre l'événement
          this.onBulletHit?.({
            bulletId: bulletBody.id,
            shooterId: bulletBody.userData.shooterId,
            targetId: otherId,
            damage: bulletBody.userData.damage,
            position: {
              x: contact.bi.position.x,
              y: contact.bi.position.y,
              z: contact.bi.position.z
            }
          });

          // Supprimer la balle
          this.world.removeBody(bulletBody);
          this.projectiles = this.projectiles.filter(b => b !== bulletBody);
        }
      }
    });
  }

  _isOnGround(body) {
    const contactNormals = this.world.contacts
      .filter(c => c.bi === body || c.bj === body)
      .map(c => c.ni);

    return contactNormals.some(n => n.y > 0.5);
  }

  _findBodyId(body) {
    for (const [id, b] of this.bodies) {
      if (b === body) return id;
    }
    for (const [id, ragdoll] of this.ragdolls) {
      for (const part of Object.values(ragdoll.parts)) {
        if (part === body) return id;
      }
    }
    for (const [id, vehicle] of this.vehicles) {
      if (vehicle.chassis === body) return id;
    }
    return null;
  }

  destroy() {
    this.world.removeAllEventListeners();
    this.bodies.clear();
    this.ragdolls.clear();
    this.projectiles = [];
    this.vehicles.clear();
  }
}

// Configurations des véhicules
const defaultVehicleConfig = {
  mass: 1000,
  dimensions: { x: 1.8, y: 1.2, z: 4 },
  wheelRadius: 0.3,
  wheelPositions: [
    { x: -0.8, y: -0.5, z: 1.5 },
    { x: 0.8, y: -0.5, z: 1.5 },
    { x: -0.8, y: -0.5, z: -1.5 },
    { x: 0.8, y: -0.5, z: -1.5 }
  ],
  maxSpeed: 30
};

const vehicleConfigs = {
  sedan: { ...defaultVehicleConfig, mass: 1200, maxSpeed: 35 },
  sport: { ...defaultVehicleConfig, mass: 800, maxSpeed: 55, dimensions: { x: 1.9, y: 1.1, z: 4.2 } },
  suv: { ...defaultVehicleConfig, mass: 1800, maxSpeed: 25, dimensions: { x: 2, y: 1.5, z: 4.5 } },
  truck: { ...defaultVehicleConfig, mass: 3000, maxSpeed: 20, dimensions: { x: 2.2, y: 1.8, z: 5 } },
  bike: {
    mass: 200,
    dimensions: { x: 0.6, y: 1, z: 1.8 },
    wheelRadius: 0.35,
    wheelPositions: [
      { x: 0, y: -0.4, z: 0.6 },
      { x: 0, y: -0.4, z: -0.6 }
    ],
    maxSpeed: 40
  }
};