// server/agents/EtherCore.js
// ⚙️ Orchestre et standardise tout — noms, IDs, conventions
export class EtherCore {
  constructor() {
    this.name        = "EtherCore";
    this.version     = "2.0.0";
    this.conventions = new Map();
    this.registry    = new Map();   // id → metadata
    this.#loadConventions();
  }

  async process(packet) {
    return {
      agent: this.name,
      mission: packet?.mission,
      success: true,
      confidence: 95,
      data: { conventions: this.conventions.size, registry: this.registry.size }
    };
  }

  // Générer un ID standardisé
  generateId(type = "entity", prefix = "") {
    const ts   = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    const id   = `${prefix || type}_${ts}_${rand}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    return id;
  }

  // Standardiser un nom selon les conventions
  standardizeName(name, type = "entity") {
    const convention = this.conventions.get(type) || {};
    let std = name.trim();
    if (convention.uppercase)  std = std.toUpperCase();
    if (convention.lowercase)  std = std.toLowerCase();
    if (convention.capitalize) std = std.charAt(0).toUpperCase() + std.slice(1).toLowerCase();
    if (convention.prefix)     std = `${convention.prefix}_${std}`;
    if (convention.maxLength)  std = std.slice(0, convention.maxLength);
    return std.replace(/\s+/g, "_");
  }

  // Valider un schéma
  validate(data, schema) {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      const val = data[field];
      if (rules.required && (val === undefined || val === null || val === "")) {
        errors.push({ field, error: "Requis" });
        continue;
      }
      if (val !== undefined) {
        if (rules.type   && typeof val !== rules.type)                       errors.push({ field, error: `Type attendu: ${rules.type}` });
        if (rules.min    !== undefined && val < rules.min)                   errors.push({ field, error: `Min: ${rules.min}` });
        if (rules.max    !== undefined && val > rules.max)                   errors.push({ field, error: `Max: ${rules.max}` });
        if (rules.maxLen !== undefined && String(val).length > rules.maxLen) errors.push({ field, error: `MaxLen: ${rules.maxLen}` });
        if (rules.pattern && !new RegExp(rules.pattern).test(String(val)))   errors.push({ field, error: `Pattern: ${rules.pattern}` });
      }
    }
    return { valid: errors.length === 0, errors };
  }

  // Enregistrer une entité
  register(id, type, metadata = {}) {
    const entry = { id, type, metadata, registeredAt: Date.now() };
    this.registry.set(id, entry);
    return entry;
  }

  // Standardiser une structure complète
  standardize(obj, type = "entity") {
    return {
      ...obj,
      id:        obj.id        || this.generateId(type),
      name:      obj.name      ? this.standardizeName(obj.name, type) : `${type}_${Date.now()}`,
      type:      obj.type      || type,
      version:   obj.version   || "1.0.0",
      createdAt: obj.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __standardized: true
    };
  }

  #loadConventions() {
    this.conventions.set("gang",      { capitalize: true, maxLength: 32, prefix: null });
    this.conventions.set("player",    { capitalize: true, maxLength: 24, prefix: null });
    this.conventions.set("item",      { lowercase:  true, maxLength: 48, prefix: null });
    this.conventions.set("territory", { capitalize: true, maxLength: 32, prefix: "zone" });
    this.conventions.set("event",     { lowercase:  true, maxLength: 64, prefix: "evt" });
  }

  getConventions() { return Object.fromEntries(this.conventions); }
  getRegistry()    { return Array.from(this.registry.values()); }
  getStatus()      { return { name: this.name, version: this.version, conventions: this.conventions.size, registry: this.registry.size }; }
}

export default EtherCore;
