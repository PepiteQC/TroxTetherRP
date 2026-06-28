// server/src/players/AntiCheat.js
export class AntiCheat {
  constructor() {
    this.positionHistory = new Map(); // playerId → [{position, timestamp}]
    this.maxHistoryLength = 60;       // 60 derniers ticks
    this.maxSpeed = 50;               // unités/seconde
    this.maxJumpHeight = 5;           // unités
    this.clipThreshold = 0.5;         // demi-unité traversée
  }

  validateMovement(player, newPosition, newRotation) {
    const issues = [];
    let severity = 'low';
    
    // 1. Vérifier que les coordonnées sont des nombres valides
    if (!this._isValidPosition(newPosition)) {
      return { valid: false, reason: 'INVALID_COORDINATES', severity: 'critical' };
    }
    
    // 2. Calculer la distance depuis la dernière position
    const dx = newPosition.x - player.position.x;
    const dy = newPosition.y - player.position.y;
    const dz = newPosition.z - player.position.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const timeDelta = (Date.now() - player.lastMove) / 1000; // en secondes
    
    // 3. Vérifier la vitesse
    const speed = timeDelta > 0 ? distance / timeDelta : 0;
    if (speed > this.maxSpeed) {
      issues.push(`SPEED_HACK: ${speed.toFixed(2)} u/s (max ${this.maxSpeed})`);
      severity = 'high';
    }
    
    // 4. Vérifier le fly (trop de mouvement vertical)
    const verticalSpeed = timeDelta > 0 ? Math.abs(dy) / timeDelta : 0;
    if (verticalSpeed > 15 && Math.abs(dy) > this.maxJumpHeight) {
      issues.push(`FLY_HACK: vertical speed ${verticalSpeed.toFixed(2)}`);
      severity = 'critical';
    }
    
    // 5. Vérifier le no-clip (traversée de murs)
    if (distance > 0 && this._checkNoClip(player.position, newPosition)) {
      issues.push('NOCLIP_DETECTED');
      severity = 'critical';
    }
    
    // 6. Enregistrer dans l'historique
    this._recordPosition(player.id, newPosition);
    
    // 7. Vérifier le pattern de mouvement (anti-bot)
    if (this._checkBotPattern(player.id, newPosition)) {
      issues.push('BOT_PATTERN');
      severity = 'medium';
    }
    
    return {
      valid: issues.length === 0,
      reason: issues.join(', '),
      severity,
      issues
    };
  }

  validate(player) {
    // Validation périodique supplémentaire
    if (!player.socket?.connected) return;
    
    // Vérifier que le joueur n'est pas dans le void
    if (player.position.y < -100) {
      player.health = 0;
      this.kernel?.bus?.emit('anti-cheat:void', { playerId: player.id });
    }
  }

  _isValidPosition(pos) {
    return (
      typeof pos?.x === 'number' && !isNaN(pos.x) &&
      typeof pos?.y === 'number' && !isNaN(pos.y) &&
      typeof pos?.z === 'number' && !isNaN(pos.z) &&
      isFinite(pos.x) && isFinite(pos.y) && isFinite(pos.z)
    );
  }

  _checkNoClip(from, to) {
    // Simulation simple — dans un vrai système, checker la collision map
    return false; // TODO: implémenter avec la map
  }

  _recordPosition(playerId, position) {
    if (!this.positionHistory.has(player