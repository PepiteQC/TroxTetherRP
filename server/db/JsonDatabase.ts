/**
 * JsonDatabase — Persistance JSON locale
 * Auto-save · Transactions · Backup automatique
 * Port-Éther RP — Fichier: server/db/JsonDatabase.ts
 */

import fs from 'fs';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DatabaseSchema {
  players:    Record<string, unknown>;  // steamId → PlayerData
  properties: Record<string, unknown>;  // propertyId → PropertyData
  vehicles:   Record<string, unknown>;  // vehicleId → VehicleData
  economy:    Record<string, unknown>;  // playerId → BankAccount
  jobs:       Record<string, unknown>;  // jobId → JobConfig
  gangs:      Record<string, unknown>;  // gangId → GangData
  world:      Record<string, unknown>;  // worldState
  logs:       unknown[];                // Dernières 1000 actions
  meta: {
    version: string;
    lastSave: number;
    totalSaves: number;
    serverStart: number;
  };
}

// ─── JsonDatabase ─────────────────────────────────────────────────────────────

export class JsonDatabase {
  private static instance: JsonDatabase;
  private data: DatabaseSchema;
  private dirty = false;
  private saveInterval?: NodeJS.Timeout;
  private readonly dbPath: string;
  private readonly backupPath: string;

  static getInstance(): JsonDatabase {
    if (!JsonDatabase.instance) JsonDatabase.instance = new JsonDatabase();
    return JsonDatabase.instance;
  }

  constructor(dbDir = './data') {
    this.dbPath = path.join(dbDir, 'database.json');
    this.backupPath = path.join(dbDir, 'database.backup.json');

    // Créer le dossier si nécessaire
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.data = this.load();
    this.startAutoSave();
    console.log(`💾 [DB] JsonDatabase initialisée — ${Object.keys(this.data.players).length} joueurs connus`);
  }

  // ─── Chargement ─────────────────────────────────────────────────────────

  private load(): DatabaseSchema {
    const defaultData: DatabaseSchema = {
      players:    {},
      properties: {},
      vehicles:   {},
      economy:    {},
      jobs:       {},
      gangs:      {},
      world:      {},
      logs:       [],
      meta: {
        version:     '4.0.0',
        lastSave:    Date.now(),
        totalSaves:  0,
        serverStart: Date.now(),
      },
    };

    if (!fs.existsSync(this.dbPath)) {
      this.writeToFile(this.dbPath, defaultData);
      return defaultData;
    }

    try {
      const raw = fs.readFileSync(this.dbPath, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      // Merge pour s'assurer que tous les champs existent
      return { ...defaultData, ...parsed, meta: { ...defaultData.meta, ...parsed.meta, serverStart: Date.now() } };
    } catch (err) {
      console.error('❌ [DB] Erreur chargement, utilisation des defaults:', err);
      return defaultData;
    }
  }

  // ─── Sauvegarde ──────────────────────────────────────────────────────────

  save(force = false): boolean {
    if (!this.dirty && !force) return false;

    try {
      // Backup avant sauvegarde
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, this.backupPath);
      }

      this.data.meta.lastSave = Date.now();
      this.data.meta.totalSaves++;

      this.writeToFile(this.dbPath, this.data);
      this.dirty = false;
      return true;
    } catch (err) {
      console.error('❌ [DB] Erreur sauvegarde:', err);
      return false;
    }
  }

  private writeToFile(filePath: string, data: unknown): void {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, json, 'utf-8');
  }

  private startAutoSave(): void {
    this.saveInterval = setInterval(() => {
      if (this.dirty) {
        const saved = this.save();
        if (saved) {
          console.log(`💾 [DB] Auto-save — ${new Date().toLocaleTimeString('fr-CA')}`);
        }
      }
    }, 15_000); // Toutes les 15 secondes
  }

  // ─── CRUD Générique ──────────────────────────────────────────────────────

  set<T extends keyof DatabaseSchema>(
    table: T,
    key: string,
    value: unknown
  ): void {
    if (table === 'logs' || table === 'meta') return;
    (this.data[table] as Record<string, unknown>)[key] = value;
    this.dirty = true;
  }

  get<T extends keyof DatabaseSchema>(
    table: T,
    key: string
  ): unknown | undefined {
    if (table === 'logs' || table === 'meta') return undefined;
    return (this.data[table] as Record<string, unknown>)[key];
  }

  delete<T extends keyof DatabaseSchema>(table: T, key: string): boolean {
    if (table === 'logs' || table === 'meta') return false;
    const exists = key in (this.data[table] as Record<string, unknown>);
    if (exists) {
      delete (this.data[table] as Record<string, unknown>)[key];
      this.dirty = true;
    }
    return exists;
  }

  getAll<T extends keyof DatabaseSchema>(table: T): Record<string, unknown> {
    if (table === 'logs' || table === 'meta') return {};
    return { ...(this.data[table] as Record<string, unknown>) };
  }

  // ─── Joueurs ──────────────────────────────────────────────────────────────

  savePlayer(steamId: string, playerData: unknown): void {
    this.set('players', steamId, { ...playerData as object, _savedAt: Date.now() });
  }

  loadPlayer(steamId: string): unknown | undefined {
    return this.get('players', steamId);
  }

  getAllPlayers(): Record<string, unknown> {
    return this.getAll('players');
  }

  // ─── Logs ────────────────────────────────────────────────────────────────

  log(entry: { type: string; playerId?: string; action: string; data?: unknown }): void {
    this.data.logs.push({ ...entry, timestamp: Date.now() });
    if (this.data.logs.length > 1000) this.data.logs.shift();
    this.dirty = true;
  }

  getRecentLogs(n = 50): unknown[] {
    return this.data.logs.slice(-n);
  }

  // ─── Monde ────────────────────────────────────────────────────────────────

  saveWorldState(state: unknown): void {
    this.set('world', 'state', state);
  }

  loadWorldState(): unknown {
    return this.get('world', 'state');
  }

  // ─── Accesseurs ────────────────────────────────────────────────────────────

  getMeta()                          { return { ...this.data.meta }; }
  isDirty()                          { return this.dirty; }

  getStats() {
    return {
      players: Object.keys(this.data.players).length,
      properties: Object.keys(this.data.properties).length,
      vehicles: Object.keys(this.data.vehicles).length,
      accounts: Object.keys(this.data.economy).length,
      logs: this.data.logs.length,
      ...this.data.meta,
    };
  }

  // ─── Shutdown propre ──────────────────────────────────────────────────────

  shutdown(): void {
    if (this.saveInterval) clearInterval(this.saveInterval);
    this.save(true);
    console.log(`💾 [DB] Sauvegarde finale au shutdown`);
  }
}

export default JsonDatabase.getInstance();