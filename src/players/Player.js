// server/src/players/Player.js
export class Player {
  constructor(id, data = {}) {
    this.id = id;
    this.identifier = data.identifier || 'Unknown';
    this.socket = data.socket || null;
    this.ip = data.ip || '0.0.0.0';
    
    // État
    this.position = data.position || { x: 0, y: 0, z: 0 };
    this.rotation = data.rotation || { x: 0, y: 0, z: 0 };
    this.health = data.health ?? 100;
    this.armor = data.armor ?? 0;
    this.faction = data.faction || null;
    this.properties = data.properties || {};
    this.inventory = data.inventory || [];
    this.metadata = data.metadata || {};
    this.room = data.room || 'global';
    
    // Timing
    this.lastSeen = Date.now();
    this.lastHeartbeat = Date.now();
    this.lastMove = Date.now();
    this.connected = true;
    this.joinTime = Date.now();
    
    // Statistiques
    this.playTime = 0;
    this.disconnectCount = 0;
  }

  reconnect(socket) {
    this.socket = socket;
    this.connected = true;
    this.lastSeen = Date.now();
    this.lastHeartbeat = Date.now();
    this.disconnectCount++;
  }

  disconnect() {
    this.socket = null;
    this.connected = false;
    this.playTime += Date.now() - this.joinTime;
    this.lastSeen = Date.now();
  }

  serialize() {
    return {
      id: this.id,
      identifier: this.identifier,
      position: this.position,
      rotation: this.rotation,
      health: this.health,
      armor: this.armor,
      faction: this.faction,
      properties: this.properties,
      inventory: this.inventory,
      metadata: this.metadata,
      connected: this.connected,
      playTime: this.playTime + (this.connected ? Date.now() - this.joinTime : 0)
    };
  }

  toJSON() {
    return this.serialize();
  }
}