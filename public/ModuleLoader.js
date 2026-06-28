"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleLoader = void 0;
// ============================================================
//  MODULE LOADER — Registre de tous les contenus
// ============================================================
class ModuleLoader {
    _entities = new Map();
    _tools = new Map();
    _modules = new Map();
    _effects = new Map();
    _vehicles = new Map();
    _npcs = new Map();
    // ──────────────────────────────────────────
    //  REGISTRATION
    // ──────────────────────────────────────────
    registerModule(def) {
        this._modules.set(def.id, def);
        console.log(`[ModuleLoader] 📦 Module: ${def.name} v${def.version}`);
    }
    registerEntity(id, def) {
        this._entities.set(id, def);
    }
    registerTool(id, def) {
        this._tools.set(id, def);
    }
    registerEffect(id, def) {
        this._effects.set(id, def);
    }
    registerVehicle(id, def) {
        this._vehicles.set(id, def);
    }
    registerNpc(id, def) {
        this._npcs.set(id, def);
    }
    // ──────────────────────────────────────────
    //  ACCÈS
    // ──────────────────────────────────────────
    getEntity(id) {
        return this._entities.get(id);
    }
    getTool(id) {
        return this._tools.get(id);
    }
    getEffect(id) {
        return this._effects.get(id);
    }
    getVehicle(id) {
        return this._vehicles.get(id);
    }
    getNpc(id) {
        return this._npcs.get(id);
    }
    hasEntity(id) {
        return this._entities.has(id);
    }
    listEntities() {
        return Array.from(this._entities.keys());
    }
    listTools() {
        return Array.from(this._tools.keys());
    }
    listModules() {
        return Array.from(this._modules.values());
    }
    getStats() {
        return {
            modules: this._modules.size,
            entities: this._entities.size,
            tools: this._tools.size,
            effects: this._effects.size,
            vehicles: this._vehicles.size,
            npcs: this._npcs.size,
        };
    }
}
exports.ModuleLoader = ModuleLoader;
