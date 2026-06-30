// server/agents/EtherCore.js
// ⚙️ Orchestrateur & Standardisateur - Version 3.0 Optimisée

export class EtherCore {
  constructor(config = {}) {
    this.name = "EtherCore";
    this.version = "3.0.0";

    // Configuration flexible
    this.config = {
      idLength: config.idLength || 12,             // Longueur ID aléatoire
      enableMetrics: config.enableMetrics !== false,
      logLevel: config.logLevel || 'warn',
      strictValidation: config.strictValidation !== false,
      autoRegister: config.autoRegister !== false,   // Auto-enregistrement lors de standardisation
      ...config
    };

    this.conventions = new Map();
    this.registry = new Map();       // id → entry
    this.typeIndex = new Map();      // type → Set(ids)
    this.schemaCache = new Map();    // Cache des regex compilés

    this.metrics = {
      idsGenerated: 0,
      namesStandardized: 0,
      validations: 0,
      registrations: 0,
      errors: 0
    };

    this.#loadConventions();
    this._log('info', `[${this.name}] Initialisé v${this.version}`);
  }

  async process(packet) {
    try {
      const startTime = Date.now();

      return {
        agent: this.name,
        version: this.version,
        mission: packet?.mission,
        success: true,
        confidence: 99,
        processingTime: Date.now() - startTime,
        data: {
          conventions: this.conventions.size,
          registry: this.registry.size,
          metrics: this.config.enableMetrics ? this.getMetrics() : undefined
        }
      };
    } catch (error) {
      this._incrementMetric('errors');
      return {
        agent: this.name,
        success: false,
        error: error.message,
        confidence: 0
      };
    }
  }

  standardizeName(name, type = "entity") {
    this._incrementMetric("namesStandardized");

    try {
      if (typeof name !== "string") return `${type}_invalid`;

      const convention = this.conventions.get(type) || {};
      let std = name.trim();
      if (!std) return `${type}_empty`;

      const steps = [
        s => convention.uppercase ? s.toUpperCase() : s,
        s => convention.lowercase ? s.toLowerCase() : s,
        s => convention.capitalize ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s,
        s => convention.prefix ? `${convention.prefix}_${s}` : s,
        s => convention.maxLength ? s.slice(0, convention.maxLength) : s,
        s => s.replace(/[\s\W]+/g, "_"),
        s => s.replace(/^_+|_+$/g, "")
      ];

      for (const step of steps) std = step(std);

      return std;
    } catch {
      this._incrementMetric("errors");
      return name;
    }
  }
  // ✅ Valider un schéma (Avec cache de Regex pour performance)
  validate(data, schema) {
    try {
      this._incrementMetric('validations');

      if (!data || !schema) {
        return { valid: false, errors: [{ field: "*", error: "Data ou Schema manquant" }] };
      }

      const errors = [];
      const fields = Object.keys(schema);

      for (const field of fields) {
        const rules = schema[field];
        const val = data[field];

        // Vérification Required
        if (rules.required && (val === undefined || val === null || val === "")) {
          errors.push({ field, code: "REQUIRED", message: "Champ requis" });
          if (this.config.strictValidation) continue;
        }

        // Si valeur présente, vérifier les règles
        if (val !== undefined && val !== null) {
          // Type check
          if (rules.type) {
            const actualType = Array.isArray(val) ? 'array' : typeof val;
            if (actualType !== rules.type) {
              errors.push({ field, code: "TYPE_MISMATCH", message: `Type attendu: ${rules.type}, reçu: ${actualType}` });
              if (this.config.strictValidation) continue;
            }
          }

          // Numeric checks
          if (typeof val === 'number') {
            if (rules.min !== undefined && val < rules.min) {
              errors.push({ field, code: "MIN_VALUE", message: `Minimum: ${rules.min}` });
            }
            if (rules.max !== undefined && val > rules.max) {
              errors.push({ field, code: "MAX_VALUE", message: `Maximum: ${rules.max}` });
            }
          }

          // String checks
          if (typeof val === 'string') {
            if (rules.maxLen !== undefined && val.length > rules.maxLen) {
              errors.push({ field, code: "MAX_LENGTH", message: `Longueur max: ${rules.maxLen}` });
            }
            if (rules.minLen !== undefined && val.length < rules.minLen) {
              errors.push({ field, code: "MIN_LENGTH", message: `Longueur min: ${rules.minLen}` });
            }

            // Pattern avec cache
            if (rules.pattern) {
              let regex = this.schemaCache.get(rules.pattern);
              if (!regex) {
                try {
                  regex = new RegExp(rules.pattern);
                  this.schemaCache.set(rules.pattern, regex);
                } catch (e) {
                  errors.push({ field, code: "INVALID_PATTERN", message: "Pattern regex invalide" });
                  continue;
                }
              }
              if (!regex.test(val)) {
                errors.push({ field, code: "PATTERN_MISMATCH", message: `Ne correspond pas au pattern` });
              }
            }
          }

          // Enum check
          if (rules.enum && Array.isArray(rules.enum)) {
            if (!rules.enum.includes(val)) {
              errors.push({ field, code: "ENUM_INVALID", message: `Valeur doit être parmi: ${rules.enum.join(', ')}` });
            }
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        validatedAt: Date.now()
      };
    } catch (error) {
      this._incrementMetric('errors');
      return { valid: false, errors: [{ field: "*", error: `Erreur validation: ${error.message}` }] };
    }
  }

  // 📦 Enregistrer une entité (avec indexation)
  register(id, type, metadata = {}) {
    try {
      if (!id) throw new Error("ID requis");

      const entry = {
        id,
        type,
        metadata,
        registeredAt: Date.now(),
        updatedAt: Date.now()
      };

      this.registry.set(id, entry);

      // Indexation par type pour recherche rapide
      if (!this.typeIndex.has(type)) {
        this.typeIndex.set(type, new Set());
      }
      this.typeIndex.get(type).add(id);

      this._incrementMetric('registrations');
      this._log('debug', `Entité enregistrée: ${id} (${type})`);

      return entry;
    } catch (error) {
      this._incrementMetric('errors');
      throw error;
    }
  }

  // 🔄 Mettre à jour une entité
  update(id, updates = {}) {
    const entry = this.registry.get(id);
    if (!entry) {
      return { success: false, error: "Entité non trouvée" };
    }

    // Merge metadata
    entry.metadata = { ...entry.metadata, ...updates };
    entry.updatedAt = Date.now();

    this._log('debug', `Entité mise à jour: ${id}`);
    return { success: true, entry };
  }

  // ❌ Supprimer une entité
  unregister(id) {
    const entry = this.registry.get(id);
    if (!entry) {
      return { success: false, error: "Entité non trouvée" };
    }

    this.registry.delete(id);

    // Nettoyer index
    const typeSet = this.typeIndex.get(entry.type);
    if (typeSet) {
      typeSet.delete(id);
      if (typeSet.size === 0) {
        this.typeIndex.delete(entry.type);
      }
    }

    this._log('debug', `Entité supprimée: ${id}`);
    return { success: true, id };
  }

  // 🔍 Rechercher par ID
  getById(id) {
    return this.registry.get(id) || null;
  }

  // 🔍 Rechercher par Type (Ultra-rapide grâce à l'index)
  getByType(type) {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];

    const results = [];
    for (const id of ids) {
      const entry = this.registry.get(id);
      if (entry) results.push(entry);
    }
    return results;
  }

  // 🌟 Standardiser une structure complète
  standardize(obj, type = "entity", options = {}) {
    try {
      const standardized = {
        ...obj,
        id: obj.id || this.generateId(type, options.prefix),
        name: obj.name ? this.standardizeName(obj.name, type) : undefined,
        type: obj.type || type,
        version: obj.version || "1.0.0",
        createdAt: obj.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        __standardized: true,
        __standardizedAt: Date.now()
      };

      // Nettoyage des champs undefined
      Object.keys(standardized).forEach(key => {
        if (standardized[key] === undefined) {
          delete standardized[key];
        }
      });

      // Auto-enregistrement si activé
      if (this.config.autoRegister && !this.registry.has(standardized.id)) {
        this.register(standardized.id, standardized.type, {
          originalData: obj,
          ...options.metadata
        });
      }

      return standardized;
    } catch (error) {
      this._incrementMetric('errors');
      this._log('error', `Erreur standardisation: ${error.message}`);
      return obj; // Retour original en cas d'erreur
    }
  }

  // 📋 Charger/Modifier les conventions dynamiquement
  setConvention(type, rules) {
    this.conventions.set(type, rules);
    this._log('info', `Convention mise à jour pour: ${type}`);
  }

  #loadConventions() {
    // Conventions par défaut optimisées
    this.conventions.set("gang", { capitalize: true, maxLength: 32, prefix: null });
    this.conventions.set("player", { capitalize: true, maxLength: 24, prefix: null });
    this.conventions.set("item", { lowercase: true, maxLength: 48, prefix: null });
    this.conventions.set("territory", { capitalize: true, maxLength: 32, prefix: "zone" });
    this.conventions.set("event", { lowercase: true, maxLength: 64, prefix: "evt" });
    this.conventions.set("weapon", { uppercase: true, maxLength: 20, prefix: "wpn" });
    this.conventions.set("vehicle", { capitalize: true, maxLength: 30, prefix: "veh" });
  }

  getConventions() {
    return Object.fromEntries(this.conventions);
  }

  getRegistry() {
    return Array.from(this.registry.values());
  }

  getRegistrySize() {
    return this.registry.size;
  }

  getMetrics() {
    return {
      ...this.metrics,
      registrySize: this.registry.size,
      typesIndexed: this.typeIndex.size,
      cacheSize: this.schemaCache.size,
      timestamp: Date.now()
    };
  }

  _incrementMetric(metric) {
    if (this.config.enableMetrics && this.metrics[metric] !== undefined) {
      this.metrics[metric]++;
    }
  }

  _log(level, message) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = levels[this.config.logLevel] ?? 1;
    const messageLevel = levels[level] ?? 2;

    if (messageLevel <= currentLevel) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${message}`);
    }
  }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      conventions: this.conventions.size,
      registry: this.registry.size,
      metrics: this.config.enableMetrics ? this.getMetrics() : undefined
    };
  }
}

export default EtherCore;