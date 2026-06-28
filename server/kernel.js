import { TroxTBrain } from './brain/TroxTBrain.js';
import { logger } from './shared/logger.js';

// ============================================================================
// KERNEL — Noyau Intellectus (Arcadius + Lotus + Momentus + Benedictus + Decaprius)
// ============================================================================
class EventBus {
  constructor() { this._handlers = new Map(); }
  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    this._handlers.get(event).push(handler);
  }
  async emit(event, data, priority = 'normal') {
    const handlers = this._handlers.get(event) || [];
    for (const h of handlers) await h(data, priority);
    return { event, data, handled: handlers.length };
  }
}

class MemoryStore {
  constructor() { this._store = new Map(); this._snapshots = []; }
  set(key, value, meta = {}) { this._store.set(key, { value, meta, ts: Date.now() }); }
  get(key) { return this._store.get(key)?.value; }
  read() {
    const data = {};
    for (const [k, v] of this._store) data[k] = v.value;
    data.rpSchemas = this.get('rpSchemas') || [];
    return data;
  }
  snapshot() { const s = { ts: Date.now(), size: this._store.size }; this._snapshots.push(s); return s; }
}

class Scheduler {
  constructor() { this._jobs = new Map(); }
  every(name, ms, fn) {
    const interval = setInterval(fn, ms);
    this._jobs.set(name, interval);
    logger.info('Scheduler', `Job "${name}" planifie toutes les ${ms}ms`);
  }
  stopAll() { for (const [name, interval] of this._jobs) { clearInterval(interval); logger.warn('Scheduler', `Job "${name}" arrete`); } }
}

class Kernel {
  constructor() {
    this.bus = new EventBus();
    this.memory = new MemoryStore();
    this.scheduler = new Scheduler();
    this.brain = null;
    this._initialized = false;
  }

  async initialize() {
    if (this._initialized) return this;
    logger.info('Kernel', 'Initialisation du noyau Intellectus...');

    // Init Brain
    this.brain = new TroxTBrain();
    await this.brain.initialize();

    // Init RP schemas storage
    this.memory.set('rpSchemas', []);
    this.memory.set('players', new Map());
    this.memory.set('properties', new Map());
    this.memory.set('vehicles', new Map());
    this.memory.set('jobs', this._defaultJobs());
    this.memory.set('factions', this._defaultFactions());
    this.memory.set('items', this._defaultItems());
    this.memory.set('worldState', { time: 720, weather: 'sunny', season: 'summer' });

    // Bus listeners
    this.bus.on('world.autosave', async (data) => {
      logger.info('Kernel', `AutoSave: ${data.schemas} schemas sauvegardes`);
    });

    this.bus.on('player.join', async (data) => {
      logger.ok('Kernel', `Joueur connecte: ${data.playerId}`);
    });

    this.bus.on('player.leave', async (data) => {
      logger.warn('Kernel', `Joueur deconnecte: ${data.playerId}`);
    });

    this._initialized = true;
    logger.ok('Kernel', '✅ Noyau Intellectus operationnel');
    return this;
  }

  _defaultJobs() {
    return [
      { id: 'police', name: 'Police', salary: 5000, maxPlayers: 10, color: '#3b82f6' },
      { id: 'medic', name: 'Medecin', salary: 4500, maxPlayers: 8, color: '#ef4444' },
      { id: 'mechanic', name: 'Mecanicien', salary: 3500, maxPlayers: 6, color: '#f59e0b' },
      { id: 'dealer', name: 'Dealer', salary: 0, maxPlayers: 20, color: '#8b5cf6', illegal: true },
      { id: 'trucker', name: 'Camionneur', salary: 4000, maxPlayers: 15, color: '#10b981' },
      { id: 'taxi', name: 'Chauffeur Taxi', salary: 3000, maxPlayers: 12, color: '#f59e0b' },
    ];
  }

  _defaultFactions() {
    return [
      { id: 'lspd', name: 'LSPD', type: 'police', color: '#3b82f6', territory: ['downtown'] },
      { id: 'ems', name: 'EMS', type: 'medical', color: '#ef4444', territory: ['hospital'] },
      { id: 'gang-north', name: 'North Side Bloods', type: 'gang', color: '#dc2626', territory: ['north'] },
      { id: 'gang-south', name: 'South Street Crew', type: 'gang', color: '#7c3aed', territory: ['south'] },
    ];
  }

  _defaultItems() {
    return [
      { id: 'phone', name: 'Telephone', category: 'electronics', weight: 0.1, price: 500 },
      { id: 'wallet', name: 'Portefeuille', category: 'misc', weight: 0.05, price: 50 },
      { id: 'water', name: 'Eau', category: 'food', weight: 0.5, price: 5 },
      { id: 'sandwich', name: 'Sandwich', category: 'food', weight: 0.3, price: 10 },
      { id: 'bandage', name: 'Bandage', category: 'medical', weight: 0.2, price: 50 },
      { id: 'lockpick', name: 'Crochet', category: 'tools', weight: 0.1, price: 200, illegal: true },
      { id: 'pistol', name: 'Pistolet', category: 'weapons', weight: 1.0, price: 5000, illegal: true },
      { id: 'rifle', name: 'Fusil', category: 'weapons', weight: 3.0, price: 15000, illegal: true },
      { id: 'car-key', name: 'Cle de voiture', category: 'keys', weight: 0.05, price: 0 },
      { id: 'house-key', name: 'Cle de maison', category: 'keys', weight: 0.05, price: 0 },
    ];
  }
}

export const kernel = new Kernel();
