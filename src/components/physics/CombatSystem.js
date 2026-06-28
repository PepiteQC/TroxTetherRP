// C:\troxtetherworld\server\admin\src\components\physics\CombatSystem.js
import { EventEmitter } from 'events';

export class CombatSystem extends EventEmitter {
  constructor(kernel, physics) {
    super();
    this.kernel = kernel;
    this.physics = physics;
    
    this.players = new Map(); // playerId → { health, armor, state }
    this.weapons = new Map(); // weaponId → WeaponData
    this.damageModifiers = new Map();
    
    // Config
    this.config = {
      defaultHealth: 100,
      defaultArmor: 0,
      maxHealth: 200,
      maxArmor: 100,
      healthRegenDelay: 5000, // 5s après dernier hit
      healthRegenRate: 2, // HP par seconde
      armorRegenRate: 1,
      friendlyFire: false,
      damageMultiplier: 1.0,
      headshotMultiplier: 2.5,
      limbMultiplier: 0.7
    };

    // Armes par défaut
    this._registerDefaultWeapons();
  }

  initialize() {
    // Écouter les hits de balle depuis la physique
    this.physics.onBulletHit = (data) => {
      this.handleBulletHit(data);
    };

    // Écouter les événements de combat
    this.kernel.bus.on('player:damage', this.handleDamage.bind(this));
    this.kernel.bus.on('player:heal', this.handleHeal.bind(this));
    this.kernel.bus.on('player:kill', this.handleKill.bind(this));
    this.kernel.bus.on('player:respawn', this.handleRespawn.bind(this));

    // Boucle de regen
    this._regenInterval = setInterval(() => this._tickRegen(), 1000);

    console.log('[Combat] Système initialisé');
    return this;
  }

  registerPlayer(playerId, initialData = {}) {
    this.players.set(playerId, {
      health: initialData.health || this.config.defaultHealth,
      armor: initialData.armor || this.config.defaultArmor,
      maxHealth: this.config.maxHealth,
      maxArmor: this.config.maxArmor,
      lastHit: 0,
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      damageTaken: 0,
      combatState: 'idle', // idle, fighting, dead
      lastAttacker: null,
      streak: 0,
      isInVehicle: false,
      currentWeapon: null
    });
  }

  unregisterPlayer(playerId) {
    this.players.delete(playerId);
  }

  // ─── DÉGÂTS ──────────────────────────────────────────

  applyDamage(targetId, attackerId, damage, data = {}) {
    const target = this.players.get(targetId);
    const attacker = this.players.get(attackerId);
    
    if (!target || target.combatState === 'dead') return;
    if (!this.config.friendlyFire && this._isSameFaction(targetId, attackerId)) return;

    // Calculer les dégâts avec modificateurs
    let finalDamage = damage;

    // Multiplicateur par type de hit
    if (data.hitType === 'headshot') {
      finalDamage *= this.config.headshotMultiplier;
    } else if (data.hitType === 'limb') {
      finalDamage *= this.config.limbMultiplier;
    }

    // Multiplicateur global
    finalDamage *= this.config.damageMultiplier;

    // Réduction par l'armure
    let armorDamage = 0;
    if (target.armor > 0) {
      armorDamage = Math.min(finalDamage * 0.6, target.armor);
      target.armor -= armorDamage;
      finalDamage -= armorDamage * 0.5; // L'armure absorbe 50%
    }

    // Appliquer les dégâts
    target.health -= finalDamage;
    target.lastHit = Date.now();
    target.combatState = 'fighting';
    target.lastAttacker = attackerId;

    // Stats
    if (attacker) {
      attacker.damageDealt += finalDamage;
    }
    target.damageTaken += finalDamage;

    // Créer du push (ragdoll)
    if (data.force) {
      this.physics.applyForceToRagdoll(targetId, data.force, data.hitPosition);
    }

    // Émettre événement
    const damageEvent = {
      targetId,
      attackerId,
      damage: finalDamage,
      armorDamage,
      health: target.health,
      armor: target.armor,
      hitType: data.hitType || 'body',
      weapon: data.weapon,
      position: data.hitPosition,
      timestamp: Date.now()
    };

    this.emit('damage', damageEvent);
    this.kernel.bus.emit('combat:damage', damageEvent);

    // Vérifier si mort
    if (target.health <= 0) {
      this._handleDeath(targetId, attackerId, data);
    }

    return damageEvent;
  }

  handleBulletHit(data) {
    const { shooterId, targetId, damage, position } = data;
    
    // Déterminer le type de hit basé sur la position
    const hitType = this._determineHitType(targetId, position);

    this.applyDamage(targetId, shooterId, damage, {
      hitType,
      weapon: 'bullet',
      hitPosition: position,
      force: { x: 0, y: 2, z: 0 }
    });
  }

  handleDamage(data) {
    this.applyDamage(data.targetId, data.attackerId, data.damage, data);
  }

  handleHeal(data) {
    const target = this.players.get(data.targetId);
    if (!target) return;

    target.health = Math.min(target.health + data.amount, target.maxHealth);
    
    this.kernel.bus.emit('combat:healed', {
      targetId: data.targetId,
      healerId: data.healerId,
      amount: data.amount,
      health: target.health
    });
  }

  handleKill(data) {
    this._handleDeath(data.targetId, data.killerId, {});
  }

  handleRespawn(data) {
    const player = this.players.get(data.playerId);
    if (!player) return;

    player.health = this.config.defaultHealth;
    player.armor = this.config.defaultArmor;
    player.combatState = 'idle';
    player.lastAttacker = null;

    // Si ragdoll, le retirer
    this.physics.removeRagdoll(data.playerId);

    // Recréer la hitbox
    this.physics.createPlayerBody(data.playerId, data.spawnPosition);

    this.kernel.bus.emit('combat:respawned', {
      playerId: data.playerId,
      position: data.spawnPosition
    });
  }

  // ─── ARMES ───────────────────────────────────────────

  registerWeapon(id, data) {
    this.weapons.set(id, {
      id,
      name: data.name,
      type: data.type, // melee, pistol, rifle, shotgun, sniper, heavy
      damage: data.damage,
      fireRate: data.fireRate, // ms entre chaque tir
      range: data.range,
      spread: data.spread,
      magSize: data.magSize,
      reloadTime: data.reloadTime,
      bulletSpeed: data.bulletSpeed || 50,
      isAutomatic: data.isAutomatic || false,
      damageFalloff: data.damageFalloff || 0, // % de perte par 10m
      ammoType: data.ammoType || 'standard',
      weight: data.weight || 1
    });
  }

  shoot(playerId, targetPosition) {
    const player = this.players.get(playerId);
    if (!player || player.combatState === 'dead') return;

    const weapon = player.currentWeapon ? this.weapons.get(player.currentWeapon) : null;
    if (!weapon) return;

    // Cooldown
    const now = Date.now();
    if (player._lastShot && now - player._lastShot < weapon.fireRate) return;
    player._lastShot = now;

    // Obtenir la position du joueur
    const playerPos = this.physics.getPlayerPosition(playerId);
    if (!playerPos) return;

    // Calculer la direction
    const direction = {
      x: targetPosition.x - playerPos.x,
      y: targetPosition.y - playerPos.y,
      z: targetPosition.z - playerPos.z
    };

    // Normaliser
    const length = Math.sqrt(direction.x**2 + direction.y**2 + direction.z**2);
    direction.x /= length;
    direction.y /= length;
    direction.z /= length;

    // Appliquer le damage falloff basé sur la distance
    let damage = weapon.damage;
    const distance = length;
    if (distance > 10 && weapon.damageFalloff > 0) {
      const falloffFactor = Math.min(1, (distance - 10) / 100 * weapon.damageFalloff);
      damage *= (1 - falloffFactor);
    }

    // Créer la balle dans la physique
    this.physics.shootBullet(playerPos, direction, playerId, {
      damage: Math.round(damage),
      speed: weapon.bulletSpeed,
      range: weapon.range,
      spread: weapon.spread
    });

    // Recul (effet visuel côté serveur)
    this.kernel.bus.emit('combat:shot', {
      playerId,
      weapon: weapon.id,
      position: playerPos,
      direction,
      timestamp: now
    });
  }

  equipWeapon(playerId, weaponId) {
    const player = this.players.get(playerId);
    const weapon = this.weapons.get(weaponId);
    
    if (!player || !weapon) return false;

    player.currentWeapon = weaponId;
    
    this.kernel.bus.emit('combat:weapon_equipped', {
      playerId,
      weaponId,
      weapon: weapon.name
    });

    return true;
  }

  // ─── PRIVÉ ───────────────────────────────────────────

  _handleDeath(targetId, killerId, data) {
    const target = this.players.get(targetId);
    const killer = this.players.get(killerId);

    if (!target) return;

    target.health = 0;
    target.combatState = 'dead';
    target.deaths++;
    target.streak = 0;

    if (killer) {
      killer.kills++;
      killer.streak++;
    }

    // Créer le ragdoll
    const position = this.physics.getPlayerPosition(targetId);
    const velocity = data.force ? { x: data.force.x, y: data.force.y, z: data.force.z } : { x: 0, y: 0, z: 0 };
    
    if (position) {
      this.physics.createRagdoll(targetId, position, velocity);
    }

    // Émettre événement de mort
    const deathEvent = {
      targetId,
      killerId,
      weapon: data.weapon,
      hitType: data.hitType,
      position,
      timestamp: Date.now(),
      killerStreak: killer?.streak || 0
    };

    this.emit('death', deathEvent);
    this.kernel.bus.emit('combat:death', deathEvent);
  }

  _determineHitType(targetId, hitPosition) {
    const playerPos = this.physics.getPlayerPosition(targetId);
    if (!playerPos) return 'body';

    const dy = hitPosition.y - playerPos.y;
    
    if (dy > 1.3) return 'headshot';    // Au-dessus du torse
    if (dy > 0.5) return 'body';        // Tronc
    if (dy > -0.5) return 'limb';       // Bras/jambes hautes
    return 'limb';                        // Jambes
  }

  _isSameFaction(id1, id2) {
    const p1 = this.players.get(id1);
    const p2 = this.players.get(id2);
    return p1?.faction === p2?.faction && p1?.faction !== null;
  }

  _tickRegen() {
    const now = Date.now();
    
    for (const [id, player] of this.players) {
      if (player.combatState === 'dead') continue;
      
      // Regen santé
      if (player.health < player.maxHealth && 
          now - player.lastHit > this.config.healthRegenDelay) {
        player.health = Math.min(
          player.health + this.config.healthRegenRate,
          player.maxHealth
        );
      }

      // Regen armure
      if (player.armor < player.maxArmor && 
          now - player.lastHit > this.config.healthRegenDelay) {
        player.armor = Math.min(
          player.armor + this.config.armorRegenRate,
          player.maxArmor
        );
      }

      // Reset combat state si pas de dégâts depuis 10s
      if (player.combatState === 'fighting' && 
          now - player.lastHit > 10000) {
        player.combatState = 'idle';
      }
    }
  }

  _registerDefaultWeapons() {
    // Armes de poing
    this.registerWeapon('colt_45', {
      name: 'Colt .45',
      type: 'pistol',
      damage: 25,
      fireRate: 400,
      range: 50,
      spread: 0.05,
      magSize: 7,
      reloadTime: 2000,
      bulletSpeed: 40,
      isAutomatic: false,
      damageFalloff: 5
    });

    this.registerWeapon('beretta', {
      name: 'Beretta 92F',
      type: 'pistol',
      damage: 20,
      fireRate: 300,
      range: 40,
      spread: 0.04,
      magSize: 15,
      reloadTime: 2500,
      bulletSpeed: 35,
      isAutomatic: false,
      damageFalloff: 3
    });

    this.registerWeapon('desert_eagle', {
      name: 'Desert Eagle',
      type: 'pistol',
      damage: 50,
      fireRate: 600,
      range: 60,
      spread: 0.08,
      magSize: 7,
      reloadTime: 2500,
      bulletSpeed: 45,
      isAutomatic: false,
      damageFalloff: 8
    });

    // Fusils d'assaut
    this.registerWeapon('ak47', {
      name: 'AK-47',
      type: 'rifle',
      damage: 35,
      fireRate: 150,
      range: 150,
      spread: 0.06,
      magSize: 30,
      reloadTime: 3000,
      bulletSpeed: 60,
      isAutomatic: true,
      damageFalloff: 10
    });

    this.registerWeapon('m4a1', {
      name: 'M4A1',
      type: 'rifle',
      damage: 30,
      fireRate: 120,
      range: 160,
      spread: 0.04,
      magSize: 30,
      reloadTime: 2800,
      bulletSpeed: 65,
      isAutomatic: true,
      damageFalloff: 8
    });

    // Fusils à pompe
    this.registerWeapon('remington_870', {
      name: 'Remington 870',
      type: 'shotgun',
      damage: 15,
      fireRate: 900,
      range: 30,
      spread: 0.3,
      magSize: 8,
      reloadTime: 4000,
      bulletSpeed: 30,
      isAutomatic: false,
      damageFalloff: 20
    });

    // Fusils de sniper
    this.registerWeapon('awp', {
      name: 'AWP',
      type: 'sniper',
      damage: 100,
      fireRate: 1500,
      range: 300,
      spread: 0.01,
      magSize: 5,
      reloadTime: 4000,
      bulletSpeed: 80,
      isAutomatic: false,
      damageFalloff: 2
    });

    // Armes de corps à corps
    this.registerWeapon('batte_baseball', {
      name: 'Batte de baseball',
      type: 'melee',
      damage: 35,
      fireRate: 1000,
      range: 3,
      spread: 0,
      magSize: Infinity,
      reloadTime: 0,
      bulletSpeed: 0,
      isAutomatic: false,
      damageFalloff: 0
    });

    this.registerWeapon('couteau', {
      name: 'Couteau',
      type: 'melee',
      damage: 50,
      fireRate: 800,
      range: 2,
      spread: 0,
      magSize: Infinity,
      reloadTime: 0,
      bulletSpeed: 0,
      isAutomatic: false,
      damageFalloff: 0
    });
  }

  destroy() {
    if (this._regenInterval) {
      clearInterval(this._regenInterval);
    }
    this.removeAllListeners();
    this.players.clear();
    this.weapons.clear();
  }
}