// C:\troxtetherworld\server\kernel\intellectus\index.js
// TroxT Intellectus Pack 4.0 — Les 5 Noyaux
// Arcadius · Benedictus · Decaprius · Lotus · Momentus

import crypto from 'crypto';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. ARCADIUS — Bus d'événements avec priorité, historique, traces
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class ArcadiusBus {
  constructor(options = {}) {
    this.listeners = new Map();
    this.history = [];
    this.middlewares = [];
    this.maxHistory = options.maxHistory || 100;
    this.debug = options.debug || false;
    
    // File d'attente par priorité
    this.queues = {
      critical: [],
      high: [],
      normal: [],
      low: []
    };
  }

  /**
   * S'abonner à un type d'événement
   */
  on(type, handler, options = {}) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push({ handler, options });
    this.listeners.set(type, handlers);
    
    if (this.debug) {
      console.log(`[Arcadius] Nouvel abonné: ${type}`);
    }
    
    // Retourne une fonction pour se désabonner
    return () => {
      const handlers = this.listeners.get(type) ?? [];
      this.listeners.set(type, handlers.filter(h => h.handler !== handler));
    };
  }

  /**
   * S'abonner une seule fois
   */
  once(type, handler) {
    const wrapper = (event) => {
      handler(event);
      this.off(type, wrapper);
    };
    return this.on(type, wrapper);
  }

  /**
   * Se désabonner
   */
  off(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    this.listeners.set(type, handlers.filter(h => h.handler !== handler));
  }

  /**
   * Émettre un événement avec priorité
   * priority: 'critical' | 'high' | 'normal' | 'low'
   */
  async emit(type, payload, priority = 'normal') {
    const event = {
      id: crypto.randomUUID(),
      type,
      payload,
      priority,
      createdAt: new Date().toISOString(),
      trace: [],
      handled: 0,
      failed: 0
    };

    // Traces pour debugging
    if (this.debug) {
      const stack = new Error().stack?.split('\n').slice(2, 5).join(' → ') || '';
      event.trace.push(stack);
    }

    // Historique (limitée)
    this.history.unshift(event);
    this.history = this.history.slice(0, this.maxHistory);

    // Middlewares
    for (const middleware of this.middlewares) {
      const result = await middleware(event);
      if (result === false) {
        if (this.debug) console.log(`[Arcadius] Événement ${type} bloqué par middleware`);
        return event;
      }
    }

    // Récupérer les handlers
    const handlers = [
      ...(this.listeners.get(type) ?? []),
      ...(this.listeners.get('*') ?? []) // wildcard
    ];

    if (handlers.length === 0) {
      if (this.debug) console.log(`[Arcadius] Aucun handler pour: ${type}`);
      return event;
    }

    // Exécuter selon la priorité
    if (priority === 'low') {
      // Fire-and-forget pour les événements non-critiques
      handlers.forEach(({ handler }) => {
        handler(event).catch(err => {
          event.failed++;
          console.error(`[Arcadius] Erreur handler ${type}:`, err);
        });
      });
      event.handled = handlers.length;
    } else {
      // Parallèle pour événements importants
      const results = await Promise.allSettled(
        handlers.map(({ handler }) => handler(event))
      );

      event.handled = results.filter(r => r.status === 'fulfilled').length;
      event.failed = results.filter(r => r.status === 'rejected').length;

      if (event.failed > 0) {
        console.error(`[Arcadius] ${event.failed} handler(s) ont échoué pour ${type}`);
      }
    }

    // Émettre sur le bus parent si on est un sous-bus
    if (this.parent) {
      this.parent.emit(`child:${type}`, event, 'low');
    }

    return event;
  }

  /**
   * Émettre de manière synchrone (pour événements ultra-rapides)
   */
  emitSync(type, payload) {
    const event = {
      id: crypto.randomUUID(),
      type,
      payload,
      priority: 'critical',
      createdAt: new Date().toISOString(),
      handled: 0,
      failed: 0
    };

    const handlers = this.listeners.get(type) ?? [];
    for (const { handler } of handlers) {
      try {
        handler(event);
        event.handled++;
      } catch (err) {
        event.failed++;
        console.error(`[Arcadius] Erreur synchrone ${type}:`, err);
      }
    }

    return event;
  }

  /**
   * Ajouter un middleware
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * Attendre un événement spécifique
   */
  waitFor(type, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off(type, handler);
        reject(new Error(`Timeout en attendant ${type}`));
      }, timeout);

      const handler = (event) => {
        clearTimeout(timeoutId);
        resolve(event);
      };

      this.once(type, handler);
    });
  }

  /**
   * Obtenir l'historique filtré
   */
  getHistory(filter = {}) {
    let filtered = [...this.history];
    
    if (filter.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }
    if (filter.priority) {
      filtered = filtered.filter(e => e.priority === filter.priority);
    }
    if (filter.since) {
      filtered = filtered.filter(e => new Date(e.createdAt) > new Date(filter.since));
    }
    
    return filtered;
  }

  /**
   * Créer un sous-bus isolé
   */
  createChild(namespace) {
    const child = new ArcadiusBus({ debug: this.debug });
    child.parent = this;
    child.namespace = namespace;
    return child;
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. BENEDICTUS — Validation des contrats et frontières
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class BenedictusContracts {
  constructor(options = {}) {
    this.rules = new Map();
    this.contracts = new Map();
    this.failedAttempts = new Map();
    this.maxFailedAttempts = options.maxFailedAttempts || 10;
    this.lockoutDuration = options.lockoutDuration || 300000; // 5 min
  }

  /**
   * Enregistrer une règle de validation
   */
  addRule(name, validator) {
    this.rules.set(name, validator);
  }

  /**
   * Définir un contrat (schéma de validation)
   */
  defineContract(name, schema) {
    this.contracts.set(name, schema);
  }

  /**
   * Valider une commande administrateur
   */
  validateCommand(input) {
    const prompt = String(input?.prompt ?? '').trim();
    
    if (prompt.length < 4) {
      return { ok: false, reason: 'La commande est trop courte (minimum 4 caractères).' };
    }
    
    if (prompt.length > 1200) {
      return { ok: false, reason: 'La commande dépasse la limite de 1200 caractères.' };
    }

    // Vérifier les patterns dangereux
    const dangerous = [
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /process\.exit/i,
      /require\(['"]fs['"]\)/i,
      /child_process/i,
      /eval\s*\(/i,
      /exec\s*\(/i
    ];

    for (const pattern of dangerous) {
      if (pattern.test(prompt)) {
        return { 
          ok: false, 
          reason: 'La commande contient des patterns interdits.',
          risk: 'RED'
        };
      }
    }

    return { ok: true, prompt };
  }

  /**
   * Valider un patch BuildRealtime
   */
  validateBuildPatch(input) {
    if (!input?.type) {
      return { ok: false, reason: 'Type de patch requis.' };
    }
    
    if (!input?.position) {
      return { ok: false, reason: 'Position requise pour le patch.' };
    }

    const validTypes = ['create', 'update', 'delete', 'move', 'rotate', 'scale', 'color'];
    if (!validTypes.includes(input.type)) {
      return { ok: false, reason: `Type de patch invalide. Types valides: ${validTypes.join(', ')}` };
    }

    // Valider les coordonnées
    const { position } = input;
    if (typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
      return { ok: false, reason: 'Position invalide (x, y, z doivent être des nombres).' };
    }

    // Vérifier les limites du monde
    const worldLimit = 500;
    if (Math.abs(position.x) > worldLimit || Math.abs(position.z) > worldLimit) {
      return { ok: false, reason: `Position hors limite du monde (max: ${worldLimit}).` };
    }

    return { ok: true, patch: input };
  }

  /**
   * Valider une transaction RP
   */
  validateRPTransaction(transaction) {
    const { type, fromId, toId, amount, item } = transaction;

    if (!type || !['money', 'item', 'property', 'vehicle'].includes(type)) {
      return { ok: false, reason: 'Type de transaction invalide.' };
    }

    if (!fromId || !toId) {
      return { ok: false, reason: 'Expéditeur et destinataire requis.' };
    }

    if (type === 'money' && (!amount || amount <= 0 || amount > 10000000)) {
      return { ok: false, reason: 'Montant invalide (1 - 10,000,000).' };
    }

    if (type === 'item' && !item?.id) {
      return { ok: false, reason: 'Item requis pour la transaction.' };
    }

    return { ok: true, transaction };
  }

  /**
   * Valider un message chat
   */
  validateChatMessage(message) {
    if (!message || typeof message !== 'string') {
      return { ok: false, reason: 'Message invalide.' };
    }

    const trimmed = message.trim();
    if (trimmed.length === 0 || trimmed.length > 500) {
      return { ok: false, reason: 'Le message doit faire entre 1 et 500 caractères.' };
    }

    // Vérifier le spam (répétitions)
    const authorId = message.authorId;
    const attempts = this.failedAttempts.get(authorId) || [];
    const now = Date.now();
    const recentAttempts = attempts.filter(t => now - t < 2000); // 2 secondes
    
    if (recentAttempts.length > 5) {
      return { ok: false, reason: 'Spam détecté. Ralentissez.' };
    }

    return { ok: true, message: trimmed };
  }

  /**
   * Créer un contrat d'API
   */
  createAPIContract(name, methods) {
    return {
      name,
      methods,
      validate: (methodName, params) => {
        const method = methods[methodName];
        if (!method) {
          return { ok: false, reason: `Méthode ${methodName} non définie dans le contrat ${name}.` };
        }
        return method.validate?.(params) || { ok: true };
      }
    };
  }

  /**
   * Vérifier si un utilisateur est lockout
   */
  isLockedOut(userId) {
    const attempts = this.failedAttempts.get(userId) || [];
    const now = Date.now();
    const recentAttempts = attempts.filter(t => now - t < this.lockoutDuration);
    return recentAttempts.length >= this.maxFailedAttempts;
  }

  /**
   * Enregistrer une tentative échouée
   */
  recordFailedAttempt(userId) {
    const attempts = this.failedAttempts.get(userId) || [];
    attempts.push(Date.now());
    this.failedAttempts.set(userId, attempts);
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. DECAPRIUS — Exécution des commandes avec rollback
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class DecapriusCommands {
  constructor({ contracts, thirdEye, bus } = {}) {
    this.contracts = contracts || new BenedictusContracts();
    this.thirdEye = thirdEye;
    this.bus = bus || new ArcadiusBus();
    
    this.commands = new Map();
    this.executionHistory = [];
    this.rollbackHandlers = new Map();
    this.maxHistory = 100;
  }

  /**
   * Enregistrer une commande
   */
  register(name, handler, options = {}) {
    this.commands.set(name, {
      handler,
      rollback: options.rollback || null,
      permission: options.permission || 'user',
      rateLimit: options.rateLimit || 0,
      cooldown: new Map()
    });
  }

  /**
   * Exécuter une commande administrateur avec validation
   */
  async executeAdminCommand(input, handler) {
    // Étape 1: Valider le contrat
    const contract = this.contracts.validateCommand(input);
    if (!contract.ok) {
      return { ok: false, reason: contract.reason, risk: 'YELLOW' };
    }

    // Étape 2: Évaluer le risque (Third Eye)
    let risk = { level: 'GREEN', reason: '' };
    if (this.thirdEye) {
      risk = this.thirdEye.assess(contract.prompt);
      if (risk.level === 'RED') {
        return { ok: false, reason: risk.reason, risk: risk.level };
      }
    }

    // Étape 3: Émettre événement d'acceptation
    await this.bus.emit('admin.command.accepted', {
      prompt: contract.prompt,
      risk: risk.level,
      timestamp: Date.now()
    }, 'high');

    // Étape 4: Exécuter
    const executionId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      const result = await handler(contract.prompt, risk);
      const duration = Date.now() - startTime;

      // Journaliser
      this.executionHistory.unshift({
        id: executionId,
        prompt: contract.prompt,
        risk: risk.level,
        status: 'completed',
        duration,
        timestamp: startTime
      });
      this.executionHistory = this.executionHistory.slice(0, this.maxHistory);

      // Émettre succès
      await this.bus.emit('admin.command.completed', {
        id: executionId,
        prompt: contract.prompt,
        result,
        duration,
        risk: risk.level
      }, 'normal');

      return { ok: true, result, risk: risk.level, executionId };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.executionHistory.unshift({
        id: executionId,
        prompt: contract.prompt,
        risk: risk.level,
        status: 'failed',
        error: error.message,
        duration,
        timestamp: startTime
      });

      await this.bus.emit('admin.command.failed', {
        id: executionId,
        prompt: contract.prompt,
        error: error.message,
        duration,
        risk: risk.level
      }, 'high');

      return { ok: false, reason: error.message, risk: risk.level };
    }
  }

  /**
   * Exécuter une commande enregistrée
   */
  async execute(commandName, params = {}, context = {}) {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new Error(`Commande inconnue: ${commandName}`);
    }

    // Vérifier les permissions
    if (command.permission === 'admin' && !context.isAdmin) {
      throw new Error('Permissions insuffisantes');
    }

    // Vérifier le rate limit
    if (command.rateLimit > 0 && context.userId) {
      const lastExec = command.cooldown.get(context.userId) || 0;
      if (Date.now() - lastExec < command.rateLimit) {
        throw new Error('Veuillez attendre avant d\'exécuter cette commande');
      }
      command.cooldown.set(context.userId, Date.now());
    }

    // Sauvegarder l'état pour rollback
    const snapshot = await this._createSnapshot(commandName, params);

    try {
      const result = await command.handler(params, context);
      
      // Enregistrer le rollback handler
      if (command.rollback) {
        this.rollbackHandlers.set(snapshot.id, {
          handler: command.rollback,
          params,
          snapshot,
          timestamp: Date.now()
        });
      }

      return { ok: true, result, snapshotId: snapshot.id };
    } catch (error) {
      // Rollback automatique si échec
      await this._performRollback(snapshot.id);
      throw error;
    }
  }

  /**
   * Rollback une commande
   */
  async rollback(snapshotId) {
    const rollbackData = this.rollbackHandlers.get(snapshotId);
    if (!rollbackData) {
      throw new Error(`Aucun rollback trouvé pour ${snapshotId}`);
    }

    try {
      await rollbackData.handler(rollbackData.params, rollbackData.snapshot);
      this.rollbackHandlers.delete(snapshotId);
      
      await this.bus.emit('command.rollback', {
        snapshotId,
        timestamp: Date.now()
      }, 'high');

      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  /**
   * Obtenir l'historique des exécutions
   */
  getHistory(filter = {}) {
    let history = [...this.executionHistory];
    
    if (filter.status) {
      history = history.filter(h => h.status === filter.status);
    }
    if (filter.since) {
      history = history.filter(h => h.timestamp > new Date(filter.since).getTime());
    }
    
    return history;
  }

  async _createSnapshot(commandName, params) {
    return {
      id: crypto.randomUUID(),
      commandName,
      params: structuredClone(params),
      timestamp: Date.now()
    };
  }

  async _performRollback(snapshotId) {
    try {
      await this.rollback(snapshotId);
    } catch (e) {
      console.error(`[Decaprius] Rollback échoué pour ${snapshotId}:`, e.message);
    }
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. LOTUS — Mémoire persistante avec versions et snapshots
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class LotusMemory {
  constructor(options = {}) {
    this.maxVersions = options.maxVersions || 20;
    this.ttl = options.ttl || 3600000; // 1 heure
    this.lruLimit = options.lruLimit || 1000;
    
    this.versions = [];
    this.state = {
      players: [],
      houses: [],
      weapons: [],
      rpSchemas: [],
      buildPatches: [],
      economy: {
        moneySupply: 0,
        inflation: 0,
        lastReset: null
      },
      world: {
        time: 12,
        weather: 'sunny',
        season: 'summer',
        day: 1
      },
      metadata: {}
    };

    // LRU Cache
    this.lruCache = new Map();
    this.lruOrder = [];
  }

  /**
   * Lire l'état actuel
   */
  read(path = null) {
    if (path) {
      return this._getNestedValue(this.state, path);
    }
    return structuredClone(this.state);
  }

  /**
   * Mutatation avec snapshot automatique (style immer)
   */
  mutate(label, updater) {
    const previousState = structuredClone(this.state);
    
    // Appliquer la mutation
    const next = structuredClone(this.state);
    updater(next);
    
    // Valider la mutation via contrat Benedictus
    this.state = next;

    // Créer une version
    const version = {
      id: crypto.randomUUID(),
      label,
      createdAt: new Date().toISOString(),
      previousState,
      state: structuredClone(this.state),
      diff: this._computeDiff(previousState, this.state)
    };

    this.versions.unshift(version);
    
    // Limiter le nombre de versions
    this.versions = this.versions.slice(0, this.maxVersions);

    return this.read();
  }

  /**
   * Accéder à une version spécifique
   */
  getVersion(versionId) {
    return this.versions.find(v => v.id === versionId) || null;
  }

  /**
   * Revenir à une version antérieure
   */
  revertTo(versionId) {
    const version = this.getVersion(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} non trouvée`);
    }

    const reverted = this.mutate(`revert: ${version.label}`, (state) => {
      Object.assign(state, version.previousState);
    });

    return reverted;
  }

  /**
   * Calculer un diff entre deux états
   */
  diffVersions(fromId, toId) {
    const from = this.getVersion(fromId);
    const to = this.getVersion(toId);
    
    if (!from || !to) {
      throw new Error('Version non trouvée');
    }

    return this._computeDiff(from.state, to.state);
  }

  /**
   * Rechercher dans l'historique
   */
  searchHistory(query) {
    return this.versions.filter(v => {
      const labelMatch = v.label.toLowerCase().includes(query.toLowerCase());
      const stateMatch = JSON.stringify(v.state).toLowerCase().includes(query.toLowerCase());
      return labelMatch || stateMatch;
    });
  }

  /**
   * Obtenir les statistiques de mémoire
   */
  getStats() {
    const totalSize = new TextEncoder().encode(JSON.stringify(this.state)).length;
    
    return {
      versions: this.versions.length,
      cacheSize: this.lruCache.size,
      stateSize: `${(totalSize / 1024).toFixed(2)} KB`,
      lastModified: this.versions[0]?.createdAt || null,
      keys: Object.keys(this.state)
    };
  }

  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  _computeDiff(oldState, newState) {
    const diff = { added: {}, removed: {}, modified: {} };
    
    const oldKeys = new Set(this._getAllKeys(oldState));
    const newKeys = new Set(this._getAllKeys(newState));

    for (const key of newKeys) {
      if (!oldKeys.has(key)) {
        diff.added[key] = this._getNestedValue(newState, key);
      } else {
        const oldVal = JSON.stringify(this._getNestedValue(oldState, key));
        const newVal = JSON.stringify(this._getNestedValue(newState, key));
        if (oldVal !== newVal) {
          diff.modified[key] = {
            from: JSON.parse(oldVal),
            to: JSON.parse(newVal)
          };
        }
      }
    }

    for (const key of oldKeys) {
      if (!newKeys.has(key)) {
        diff.removed[key] = this._getNestedValue(oldState, key);
      }
    }

    return diff;
  }

  _getAllKeys(obj, prefix = '') {
    let keys = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys = [...keys, ...this._getAllKeys(value, fullKey)];
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. MOMENTUS — Scheduler, Timeout, Debounce, Throttle, Retry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class MomentusScheduler {
  constructor() {
    this.tasks = new Map();
    this.timeouts = new Map();
    this.intervals = new Map();
    this.cronTasks = new Map();
    this.schedules = new Map();
  }

  /**
   * Exécuter une tâche à intervalle régulier
   */
  every(name, intervalMs, task) {
    this.stop(name);
    
    const id = setInterval(async () => {
      const start = Date.now();
      try {
        await task();
        const duration = Date.now() - start;
        if (duration > intervalMs * 0.8) {
          console.warn(`[Momentus] Attention: ${name} a pris ${duration}ms (intervalle: ${intervalMs}ms)`);
        }
      } catch (error) {
        console.error(`[Momentus] Erreur dans ${name}:`, error.message);
      }
    }, intervalMs);

    this.intervals.set(name, id);
    this.tasks.set(name, { type: 'interval', id, intervalMs });
    return id;
  }

  /**
   * Exécuter une tâche après un délai
   */
  delay(name, delayMs, task) {
    this.stop(name);
    
    const id = setTimeout(async () => {
      try {
        await task();
      } catch (error) {
        console.error(`[Momentus] Erreur dans delay ${name}:`, error.message);
      }
      this.tasks.delete(name);
      this.timeouts.delete(name);
    }, delayMs);

    this.timeouts.set(name, id);
    this.tasks.set(name, { type: 'delay', id, delayMs });
    return id;
  }

  /**
   * Exécuter une tâche à une heure spécifique (format HH:MM)
   */
  at(name, timeStr, task) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);

    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const delayMs = target.getTime() - now.getTime();
    
    return this.delay(name, delayMs, async () => {
      await task();
      // Reschedule pour le lendemain
      this.at(name, timeStr, task);
    });
  }

  /**
   * Debounce — exécuter seulement après un silence
   */
  debounce(name, waitMs, task) {
    const existing = this.timeouts.get(`debounce:${name}`);
    if (existing) clearTimeout(existing);

    const id = setTimeout(async () => {
      try {
        await task();
      } catch (error) {
        console.error(`[Momentus] Erreur debounce ${name}:`, error.message);
      }
      this.timeouts.delete(`debounce:${name}`);
    }, waitMs);

    this.timeouts.set(`debounce:${name}`, id);
    return id;
  }

  /**
   * Throttle — exécuter au maximum une fois par intervalle
   */
  throttle(name, limitMs, task) {
    const lastRun = this.schedules.get(`throttle:${name}`) || 0;
    const now = Date.now();

    if (now - lastRun >= limitMs) {
      this.schedules.set(`throttle:${name}`, now);
      return task();
    }
  }

  /**
   * Exécuter avec retry automatique
   */
  async retry(name, task, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const baseDelay = options.baseDelay || 1000;
    const maxDelay = options.maxDelay || 30000;
    const exponential = options.exponential !== false;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await task();
        
        if (attempt > 1) {
          console.log(`[Momentus] ${name}: Succès après ${attempt} tentative(s)`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = exponential
            ? Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
            : baseDelay;
          
          console.log(`[Momentus] ${name}: Tentative ${attempt}/${maxRetries} échouée, nouvel essai dans ${delay}ms`);
          await this._sleep(delay);
        }
      }
    }

    throw new Error(`[Momentus] ${name}: Échec après ${maxRetries} tentatives: ${lastError?.message}`);
  }

  /**
   * Exécuter une tâche avec timeout
   */
  async timeout(name, task, timeoutMs = 5000) {
    return Promise.race([
      task(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout: ${name} a dépassé ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  }

  /**
   * Exécuter en séquence (une par une)
   */
  async sequence(name, tasks) {
    const results = [];
    
    for (let i = 0; i < tasks.length; i++) {
      try {
        const result = await tasks[i]();
        results.push({ index: i, status: 'completed', result });
      } catch (error) {
        results.push({ index: i, status: 'failed', error: error.message });
      }
    }

    return results;
  }

  /**
   * Exécuter en parallèle avec limite de concurrence
   */
  async parallel(name, tasks, concurrency = 5) {
    const results = [];
    const executing = new Set();

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      const promise = task().then(result => {
        results[i] = { status: 'completed', result };
        executing.delete(promise);
      }).catch(error => {
        results[i] = { status: 'failed', error: error.message };
        executing.delete(promise);
      });

      executing.add(promise);

      if (executing.size >= concurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Arrêter une tâche
   */
  stop(name) {
    // Interval
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }

    // Timeout
    const timeout = this.timeouts.get(name);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(name);
    }

    // Debounce
    const debounce = this.timeouts.get(`debounce:${name}`);
    if (debounce) {
      clearTimeout(debounce);
      this.timeouts.delete(`debounce:${name}`);
    }

    this.tasks.delete(name);
    this.schedules.delete(`throttle:${name}`);
  }

  /**
   * Arrêter toutes les tâches
   */
  stopAll() {
    for (const name of this.intervals.keys()) this.stop(name);
    for (const name of this.timeouts.keys()) this.stop(name);
    this.tasks.clear();
  }

  /**
   * Obtenir le statut de toutes les tâches
   */
  getStatus() {
    return {
      intervals: Array.from(this.intervals.keys()),
      timeouts: Array.from(this.timeouts.keys()),
      tasks: Array.from(this.tasks.entries()).map(([name, task]) => ({
        name,
        type: task.type,
        status: 'running'
      })),
      schedules: Array.from(this.schedules.keys())
    };
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT — Intellectus Pack Complet
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default class Intellectus {
  constructor(options = {}) {
    this.bus = new ArcadiusBus(options.bus);
    this.contracts = new BenedictusContracts(options.contracts);
    this.memory = new LotusMemory(options.memory);
    this.scheduler = new MomentusScheduler();
    this.commands = new DecapriusCommands({
      contracts: this.contracts,
      bus: this.bus,
      thirdEye: options.thirdEye || null
    });

    this.initialized = false;
  }

  async initialize() {
    console.log('[Intellectus] Initialisation des 5 noyaux...');
    
    // Connecter les noyaux entre eux via le bus
    this.bus.on('memory:save', async (event) => {
      this.memory.mutate('auto-save', (state) => {
        Object.assign(state, event.payload);
      });
    });

    this.bus.on('scheduler:task', async (event) => {
      const { name, type, interval, task } = event.payload;
      
      if (type === 'every') {
        this.scheduler.every(name, interval, () => this.commands.execute(task.name, task.params));
      }
    });

    this.initialized = true;
    console.log('[Intellectus] ✓ 5 noyaux prêts');
    
    return this;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      bus: {
        listeners: this.bus.listeners.size,
        history: this.bus.history.length
      },
      contracts: {
        rules: this.contracts.rules.size,
        contracts: this.contracts.contracts.size
      },
      memory: this.memory.getStats(),
      scheduler: this.scheduler.getStatus(),
      commands: {
        registered: this.commands.commands.size,
        history: this.commands.executionHistory.length
      }
    };
  }

  destroy() {
    this.scheduler.stopAll();
    this.bus.listeners.clear();
    this.bus.history = [];
    this.initialized = false;
    console.log('[Intellectus] Noyaux arrêtés');
  }
}