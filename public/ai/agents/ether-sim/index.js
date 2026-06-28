// EtherWorld RP — Port-Éther
// Agent mémoire persistante — stockage et rappel contextuel

class EtherMemoryAgent {
  constructor() {
    this.memoryStore = new Map();
    this.shortTerm = [];
    this.maxShortTerm = 100;
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    console.log('🧠 Ether-Memory: Agent mémoire initialisé');
    return true;
  }

  remember(key, value, ttl = null) {
    const entry = {
      value,
      timestamp: Date.now(),
      ttl: ttl ? Date.now() + ttl : null,
    };
    this.memoryStore.set(key, entry);
    this.shortTerm.push({ key, value, timestamp: entry.timestamp });
    if (this.shortTerm.length > this.maxShortTerm) {
      this.shortTerm.shift();
    }
    return true;
  }

  recall(key) {
    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (entry.ttl && Date.now() > entry.ttl) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  forget(key) {
    return this.memoryStore.delete(key);
  }

  getStats() {
    return {
      total: this.memoryStore.size,
      shortTerm: this.shortTerm.length,
      initialized: this.initialized,
    };
  }
}

module.exports = new EtherMemoryAgent();
FICHIER 30 : public/ai/agents/ether-sim/index.js
javascript



// EtherWorld RP — Port-Éther
// Agent de simulation de vie RP — NPCs, routines, économie simulée

class EtherSimAgent {
  constructor() {
    this.npcs = new Map();
    this.routines = new Map();
    this.simulationTick = 0;
    this.running = false;
  }

  async initialize() {
    this.running = true;
    this.startSimulation();
    console.log('🌆 Ether-Sim: Simulation de vie démarrée');
    return true;
  }

  registerNPC(npc) {
    this.npcs.set(npc.id, {
      ...npc,
      state: 'idle',
      lastUpdate: Date.now(),
    });
  }

  registerRoutine(routine) {
    this.routines.set(routine.id, routine);
  }

  startSimulation() {
    setInterval(() => {
      this.tick();
    }, 5000); // Tick toutes les 5 secondes
  }

  tick() {
    this.simulationTick++;
    for (const [id, npc] of this.npcs) {
      this.updateNPC(id, npc);
    }
  }

  updateNPC(id, npc) {
    const now = Date.now();
    if (now - npc.lastUpdate < 10000) return;

    const states = ['idle', 'walking', 'working', 'shopping', 'returning'];
    npc.state = states[Math.floor(Math.random() * states.length)];
    npc.lastUpdate = now;
    this.npcs.set(id, npc);
  }

  getStats() {
    return {
      npcs: this.npcs.size,
      routines: this.routines.size,
      tick: this.simulationTick,
      running: this.running,
    };
  }
}

module.exports = new EtherSimAgent();
FICHIER 31 : public/ai/agents/forge-factory/index.js
javascript



// EtherWorld RP — Port-Éther
// Agent de génération procédurale — bâtiments, props, villes

class ForgeFactoryAgent {
  constructor() {
    this.templates = new Map();
    this.generated = new Map();
  }

  async initialize() {
    this.registerTemplates();
    console.log('🏭 Forge-Factory: Agent de génération prêt');
    return true;
  }

  registerTemplates() {
    this.templates.set('house', {
      baseSize: { x: 8, y: 3.5, z: 8 },
      floors: 1,
      windows: 4,
      door: true,
      roofStyle: 'flat',
    });
    this.templates.set('shop', {
      baseSize: { x: 8, y: 4, z: 6 },
      windows: 2,
      sign: true,
      door: true,
    });
    this.templates.set('warehouse', {
      baseSize: { x: 18, y: 6, z: 12 },
      loadingDock: true,
      roofStyle: 'industrial',
    });
  }

  generateBuilding(type, variations = {}) {
    const template = this.templates.get(type);
    if (!template) return null;

    const building = {
      ...template,
      ...variations,
      id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      generated: Date.now(),
    };

    const key = building.id;
    this.generated.set(key, building);
    return building;
  }

  getGenerated(key) {
    return this.generated.get(key);
  }

  getStats() {
    return {
      templates: this.templates.size,
      generated: this.generated.size,
    };
  }
}

module.exports = new ForgeFactoryAgent();