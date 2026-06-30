// server/routes/game.js
// 🎮 Routes GameWorld v2.0.0 — EtherWorld QC RP
// Routes complètes : monde, items, gangs, HUD, sécurité, mémoire, stats
import express from 'express';
import { randomUUID } from 'node:crypto';
import { brain } from '../core/TroxTBrain.js';

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════
const VERSION = '2.0.0';

const LIMITS = {
  generate: { count: { min: 1, max: 1000 } },
  simulate: { players: { min: 1, max: 500 }, duration: { min: 100, max: 60_000 } },
  items: { count: { min: 1, max: 500 } },
  audit: { limit: { min: 1, max: 500 } },
  search: { limit: { min: 1, max: 200 } },
};

const VALID_THEMES = ['street', 'luxury', 'cyberpunk', 'medieval', 'western', 'sci-fi', 'horror', 'tropical'];
const VALID_STYLES = ['realistic', 'arcade', 'cartoon', 'gritty', 'neon', 'noir'];
const VALID_ITEMS = ['weapon', 'armor', 'drug', 'vehicle', 'tool', 'clothing', 'food', 'ammo', 'electronic'];
const VALID_SCENARIOS = ['roleplay', 'combat', 'economy', 'social', 'heist', 'racing', 'survival'];
const VALID_PERIODS = ['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'evening', 'night', 'midnight'];

// ══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════════

/** Réponse standardisée succès */
const ok = (res, data, status = 200) =>
  res.status(status).json({ ok: true, version: VERSION, ts: Date.now(), ...data });

/** Réponse standardisée erreur */
const fail = (res, message, status = 500, code = 'SERVER_ERROR', details = null) =>
  res.status(status).json({
    ok: false, error: message, code,
    ...(details ? { details } : {}),
    ts: Date.now(),
  });

/** Clamp numérique */
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/** Sanitize string */
const sanitize = (str, maxLen = 128) =>
  typeof str === 'string' ? str.trim().slice(0, maxLen).replace(/[<>]/g, '') : '';

/** Wrapper async + gestion erreur uniforme */
const asyncRoute = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    const status = err.code === 'AGENT_NOT_FOUND' ? 503
      : err.code === 'VALIDATION_ERROR' ? 400
        : err.code === 'TIMEOUT' ? 504
          : 500;
    fail(res, err.message || 'Erreur interne', status, err.code || 'SERVER_ERROR');
  }
};

/** Appel agent avec timeout */
async function callAgent(agentName, method, ...args) {
  if (!brain?.callAgent) throw Object.assign(new Error('Brain non disponible'), { code: 'BRAIN_UNAVAILABLE' });
  const result = await brain.callAgent(agentName, method, ...args);
  return result;
}

/** Validation requête avec schéma */
function validate(body, schema) {
  const errors = [];
  for (const [field, rules] of Object.entries(schema)) {
    const val = body[field];
    if (rules.required && (val === undefined || val === null)) {
      errors.push(`Champ requis: ${field}`);
      continue;
    }
    if (val !== undefined) {
      if (rules.type && typeof val !== rules.type) {
        errors.push(`${field} doit être de type ${rules.type}`);
      }
      if (rules.min !== undefined && val < rules.min) {
        errors.push(`${field} minimum: ${rules.min}`);
      }
      if (rules.max !== undefined && val > rules.max) {
        errors.push(`${field} maximum: ${rules.max}`);
      }
      if (rules.enum && !rules.enum.includes(val)) {
        errors.push(`${field} doit être: ${rules.enum.join(', ')}`);
      }
      if (rules.minLength && String(val).length < rules.minLength) {
        errors.push(`${field} trop court (min ${rules.minLength})`);
      }
      if (rules.maxLength && String(val).length > rules.maxLength) {
        errors.push(`${field} trop long (max ${rules.maxLength})`);
      }
    }
  }
  return errors;
}

// ══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════════════════════════════════════════

/** Logger des routes game */
router.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'debug';
    console[level]?.(`[GAME] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

/** Rate limiter simple par IP */
const rateLimitStore = new Map();
function gameRateLimit(max = 30, windowMs = 60_000) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
    entry.count++;
    rateLimitStore.set(key, entry);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));

    if (entry.count > max) {
      return fail(res, 'Rate limit dépassé', 429, 'RATE_LIMITED', {
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
    }
    next();
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — INFO
// ══════════════════════════════════════════════════════════════════════════════

/** GET /game — Info du module */
router.get('/', (req, res) => {
  ok(res, {
    module: 'GameWorld Router',
    version: VERSION,
    endpoints: [
      'GET  /state', 'POST /generate', 'POST /simulate',
      'GET  /stats', 'POST /items/generate', 'GET  /items/:id',
      'POST /gang/pack', 'POST /gang/variants', 'GET  /gang/:gangId',
      'POST /hud/territory', 'POST /hud/minimap', 'POST /hud/inventory',
      'POST /weave', 'GET  /weave/status',
      'GET  /audit', 'GET  /audit/search', 'POST /audit/record',
      'GET  /security/status', 'POST /security/assess', 'POST /security/block',
      'GET  /memory', 'POST /memory/search', 'DELETE /memory/clear',
      'GET  /world/time', 'POST /world/time', 'POST /world/weather',
      'GET  /world/map', 'POST /world/event',
      'GET  /economy/stats', 'POST /economy/transaction',
      'GET  /players', 'GET  /players/:id',
      'POST /brain/process', 'GET  /brain/status',
    ],
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — MONDE
// ══════════════════════════════════════════════════════════════════════════════

/** GET /game/state — État complet du monde */
router.get('/state', gameRateLimit(60), asyncRoute(async (req, res) => {
  const result = await callAgent('etherSim', 'process', { mission: 'get_world_state' });
  ok(res, { world: result });
}));

/** POST /game/generate — Générer un monde */
router.post('/generate', gameRateLimit(10, 60_000), asyncRoute(async (req, res) => {
  const { seed, theme, style, count = 10 } = req.body;

  const errors = validate(req.body, {
    theme: { enum: VALID_THEMES },
    style: { enum: VALID_STYLES },
    count: { type: 'number', min: LIMITS.generate.count.min, max: LIMITS.generate.count.max },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent('etherForge', 'forge', {
    seed: seed || randomUUID().slice(0, 8),
    theme: theme || 'street',
    style: style || 'realistic',
    count: clamp(count, 1, 1000),
  });

  ok(res, { ...result, requestId: randomUUID() }, 201);
}));

/** POST /game/simulate — Simuler des joueurs */
router.post('/simulate', gameRateLimit(15, 60_000), asyncRoute(async (req, res) => {
  const { players = 50, scenario = 'roleplay', duration = 3000, seed } = req.body;

  const errors = validate(req.body, {
    players: { type: 'number', min: 1, max: 500 },
    scenario: { enum: VALID_SCENARIOS },
    duration: { type: 'number', min: 100, max: 60_000 },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent(
    'etherSim', 'simulate',
    clamp(players, 1, 500),
    scenario,
    clamp(duration, 100, 60_000),
    seed
  );

  ok(res, { simulation: result, players, scenario, duration });
}));

/** GET /game/stats — Statistiques du monde */
router.get('/stats', gameRateLimit(30), asyncRoute(async (req, res) => {
  const [worldStats, simStats, memStats] = await Promise.allSettled([
    callAgent('etherSim', 'process', { mission: 'get_stats' }),
    callAgent('etherMemory', 'getStats'),
    callAgent('etherLens', 'process', { mission: 'get_lens_stats' }),
  ]);

  ok(res, {
    world: worldStats.status === 'fulfilled' ? worldStats.value : null,
    memory: memStats.status === 'fulfilled' ? memStats.value : null,
    lens: simStats.status === 'fulfilled' ? simStats.value : null,
  });
}));

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — TEMPS & MÉTÉO
// ══════════════════════════════════════════════════════════════════════════════

/** GET /game/world/time — Heure actuelle du monde */
router.get('/world/time', asyncRoute(async (req, res) => {
  const result = await callAgent('etherSim', 'process', { mission: 'get_time' });
  ok(res, { time: result });
}));

/** POST /game/world/time — Modifier l'heure */
router.post('/world/time', gameRateLimit(10), asyncRoute(async (req, res) => {
  const { time, period } = req.body;

  const errors = validate(req.body, {
    time: { type: 'number', min: 0, max: 1439 },
    period: { enum: VALID_PERIODS },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent('etherSim', 'process', { mission: 'set_time', time, period });
  ok(res, { updated: true, time, period, result });
}));

/** POST /game/world/weather — Modifier la météo */
router.post('/world/weather', gameRateLimit(10), asyncRoute(async (req, res) => {
  const { type, duration, intensity } = req.body;

  const errors = validate(req.body, {
    type: { required: true, enum: ['sunny', 'cloudy', 'rainy', 'stormy', 'foggy', 'snowy'] },
    intensity: { type: 'number', min: 0, max: 1 },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent('etherSim', 'process', {
    mission: 'set_weather', type, duration, intensity: intensity ?? 1.0,
  });

  ok(res, { updated: true, weather: { type, duration, intensity }, result });
}));

/** GET /game/world/map — Carte du monde */
router.get('/world/map', gameRateLimit(20), asyncRoute(async (req, res) => {
  const { zoom = 1, x = 0, y = 0 } = req.query;
  const result = await callAgent('etherSim', 'process', {
    mission: 'get_map',
    zoom: clamp(Number(zoom), 0.1, 5),
    center: { x: Number(x), y: Number(y) },
  });
  ok(res, { map: result });
}));

/** POST /game/world/event — Déclencher un événement monde */
router.post('/world/event', gameRateLimit(5, 60_000), asyncRoute(async (req, res) => {
  const { type, position, radius, data } = req.body;

  const errors = validate(req.body, {
    type: { required: true, type: 'string', minLength: 2, maxLength: 64 },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent('etherSim', 'process', {
    mission: 'trigger_event',
    event: { id: randomUUID(), type: sanitize(type), position, radius, data, ts: Date.now() },
  });

  ok(res, { event: result }, 201);
}));

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — ITEMS
// ══════════════════════════════════════════════════════════════════════════════

/** POST /game/items/generate — Générer des items */
router.post('/items/generate', gameRateLimit(15), asyncRoute(async (req, res) => {
  const { count = 50, type = 'weapon', theme = 'street', rarity, quality } = req.body;

  const errors = validate(req.body, {
    count: { type: 'number', min: 1, max: 500 },
    type: { enum: VALID_ITEMS },
    theme: { enum: VALID_THEMES },
    rarity: { enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'] },
    quality: { type: 'number', min: 1, max: 100 },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent(
    'forgeFactory', 'generateItems',
    clamp(count, 1, 500),
    type,
    theme,
    { rarity, quality }
  );

  ok(res, { ...result, generated: count, type, theme }, 201);
}));

/** GET /game/items/:id — Obtenir un item par ID */
router.get('/items/:id', gameRateLimit(60), asyncRoute(async (req, res) => {
  const id = sanitize(req.params.id, 64);
  if (!id) return fail(res, 'ID invalide', 400, 'INVALID_ID');

  const result = await callAgent('etherMemory', 'get', `item:${id}`);
  if (!result) return fail(res, `Item "${id}" introuvable`, 404, 'NOT_FOUND');

  ok(res, { item: result });
}));

/** POST /game/items/search — Rechercher des items */
router.post('/items/search', gameRateLimit(30), asyncRoute(async (req, res) => {
  const { query, type, theme, rarity, limit = 50 } = req.body;

  const result = await callAgent('etherMemory', 'search', {
    prefix: 'item:',
    filters: { type, theme, rarity },
    query: sanitize(query || '', 128),
    limit: clamp(limit, 1, 200),
  });

  ok(res, { items: result?.results || [], count: result?.count || 0 });
}));

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — GANGS
// ══════════════════════════════════════════════════════════════════════════════

/** POST /game/gang/pack — Pack complet de gang */
router.post('/gang/pack', gameRateLimit(5, 60_000), asyncRoute(async (req, res) => {
  const { gangName, gangStyle = 'street', territory, members = 10 } = req.body;

  const errors = validate(req.body, {
    gangName: { required: true, type: 'string', minLength: 2, maxLength: 64 },
    gangStyle: { enum: VALID_THEMES },
    members: { type: 'number', min: 1, max: 100 },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent('forgeFactory', 'generateGangPack', {
    name: sanitize(gangName),
    style: gangStyle,
    territory: territory || null,
    members: clamp(members, 1, 100),
    id: `gang_${randomUUID().slice(0, 8)}`,
  });

  ok(res, { pack: result }, 201);
}));

/** POST /game/gang/variants — Variantes de gang */
router.post('/gang/variants', gameRateLimit(10), asyncRoute(async (req, res) => {
  const errors = validate(req.body, {
    baseGangId: { required: true, type: 'string' },
    count: { type: 'number', min: 1, max: 20 },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent('etherPrism', 'createGangVariants', req.body);
  ok(res, { ...result }, 201);
}));

/** GET /game/gang/:gangId — Info gang */
router.get('/gang/:gangId', gameRateLimit(30), asyncRoute(async (req, res) => {
  const gangId = sanitize(req.params.gangId, 64);
  if (!gangId) return fail(res, 'ID gang invalide', 400, 'INVALID_ID');

  const result = await callAgent('etherMemory', 'get', `gang:${gangId}`);
  if (!result) return fail(res, `Gang "${gangId}" introuvable`, 404, 'NOT_FOUND');

  ok(res, { gang: result });
}));

/** GET /game/gang — Lister tous les gangs */
router.get('/gang', gameRateLimit(30), asyncRoute(async (req, res) => {
  const { limit = 50, style, territory } = req.query;

  const result = await callAgent('etherMemory', 'search', {
    prefix: 'gang:',
    filters: { style, territory },
    limit: clamp(Number(limit), 1, 200),
  });

  ok(res, { gangs: result?.results || [], count: result?.count || 0 });
}));

/** DELETE /game/gang/:gangId — Supprimer un gang */
router.delete('/gang/:gangId', gameRateLimit(5), asyncRoute(async (req, res) => {
  const gangId = sanitize(req.params.gangId, 64);
  if (!gangId) return fail(res, 'ID gang invalide', 400, 'INVALID_ID');

  await callAgent('etherMemory', 'delete', `gang:${gangId}`);
  ok(res, { deleted: gangId });
}));

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — HUD
// ══════════════════════════════════════════════════════════════════════════════

/** POST /game/hud/territory — HUD territoire */
router.post('/hud/territory', gameRateLimit(20), asyncRoute(async (req, res) => {
  const errors = validate(req.body, {
    gangId: { type: 'string' },
    mapSize: { enum: ['small', 'medium', 'large', 'fullscreen'] },
    showStats: { type: 'boolean' },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent('etherUI', 'generateTerritoryHUD', req.body);
  ok(res, { hud: result });
}));

/** POST /game/hud/minimap — HUD minimap */
router.post('/hud/minimap', gameRateLimit(20), asyncRoute(async (req, res) => {
  const { style = 'default', scale = 1, showPlayers = true, showPOIs = true } = req.body;

  const result = await callAgent('etherUI', 'generateMinimap', {
    style, scale: clamp(scale, 0.5, 3.0), showPlayers, showPOIs,
  });

  ok(res, { minimap: result });
}));

/** POST /game/hud/inventory — HUD inventaire */
router.post('/hud/inventory', gameRateLimit(20), asyncRoute(async (req, res) => {
  const { theme = 'dark', slots = 40, style = 'grid' } = req.body;

  const result = await callAgent('etherUI', 'generateInventoryHUD', {
    theme,
    slots: clamp(slots, 10, 100),
    style,
  });

  ok(res, { hud: result });
}));

/** POST /game/hud/phone — HUD téléphone */
router.post('/hud/phone', gameRateLimit(10), asyncRoute(async (req, res) => {
  const { apps = [], theme = 'dark', gangId } = req.body;

  const result = await callAgent('etherUI', 'generatePhoneHUD', {
    apps, theme, gangId,
  });

  ok(res, { hud: result });
}));

/** GET /game/hud/templates — Lister les templates HUD disponibles */
router.get('/hud/templates', asyncRoute(async (req, res) => {
  const result = await callAgent('etherUI', 'process', { mission: 'get_templates' });
  ok(res, { templates: result });
}));

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — WEAVE (Connexions inter-systèmes)
// ══════════════════════════════════════════════════════════════════════════════

/** POST /game/weave — Connecter systèmes gang */
router.post('/weave', gameRateLimit(10), asyncRoute(async (req, res) => {
  const { gangId, econId, territoryId, options } = req.body;

  const errors = validate(req.body, {
    gangId: { required: true, type: 'string' },
    econId: { type: 'string' },
    territoryId: { type: 'string' },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent(
    'etherWeave', 'weaveGangEcoTerritory',
    sanitize(gangId),
    sanitize(econId || ''),
    sanitize(territoryId || ''),
    options || {}
  );

  ok(res, { ...result, woven: true }, 201);
}));

/** POST /game/weave/custom — Connexion personnalisée */
router.post('/weave/custom', gameRateLimit(10), asyncRoute(async (req, res) => {
  const { sourceId, targetId, type, bidirectional = true, config } = req.body;

  const errors = validate(req.body, {
    sourceId: { required: true, type: 'string' },
    targetId: { required: true, type: 'string' },
    type: { required: true, type: 'string' },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent('etherWeave', 'weave', {
    sourceId: sanitize(sourceId),
    targetId: sanitize(targetId),
    type: sanitize(type),
    bidirectional,
    config: config || {},
    id: randomUUID(),
  });

  ok(res, { connection: result }, 201);
}));

/** GET /game/weave/status — Statut des connexions */
router.get('/weave/status', gameRateLimit(30), asyncRoute(async (req, res) => {
  const result = await callAgent('etherWeave', 'process', { mission: 'get_status' });
  ok(res, { connections: result });
}));

/** DELETE /game/weave/:connectionId — Déconnecter */
router.delete('/weave/:connectionId', gameRateLimit(10), asyncRoute(async (req, res) => {
  const id = sanitize(req.params.connectionId, 64);
  const result = await callAgent('etherWeave', 'disconnect', id);
  ok(res, { disconnected: id, result });
}));

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — AUDIT TRAIL
// ══════════════════════════════════════════════════════════════════════════════

/** GET /game/audit — Dernières entrées d'audit */
router.get('/audit', gameRateLimit(30), asyncRoute(async (req, res) => {
  const limit = clamp(Number(req.query.limit) || 50, 1, 500);
  const action = sanitize(req.query.action || '', 64) || null;
  const actor = sanitize(req.query.actor || '', 64) || null;

  const entries = action || actor
    ? await callAgent('auditTrail', 'search', { action, actor, limit })
    : await callAgent('auditTrail', 'getLast', limit);

  ok(res, { entries: entries || [], count: (entries || []).length, limit });
}));

/** POST /game/audit/search — Recherche avancée audit */
router.post('/audit/search', gameRateLimit(20), asyncRoute(async (req, res) => {
  const { action, actor, severity, from, to, limit = 100 } = req.body;

  const result = await callAgent('auditTrail', 'search', {
    action: sanitize(action || '', 64) || null,
    actor: sanitize(actor || '', 64) || null,
    severity: sanitize(severity || '', 16) || null,
    from: from ? Number(from) : null,
    to: to ? Number(to) : null,
    limit: clamp(limit, 1, 500),
  });

  ok(res, { results: result || [], count: (result || []).length });
}));

/** POST /game/audit/record — Enregistrer une entrée */
router.post('/audit/record', gameRateLimit(30), asyncRoute(async (req, res) => {
  const { action, actor, data, severity = 'INFO' } = req.body;

  const errors = validate(req.body, {
    action: { required: true, type: 'string', minLength: 2, maxLength: 128 },
    actor: { required: true, type: 'string', minLength: 1, maxLength: 64 },
    severity: { enum: ['DEBUG', 'INFO', 'WARN', 'HIGH', 'CRITICAL'] },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const entry = await callAgent(
    'auditTrail', 'record',
    sanitize(action),
    sanitize(actor),
    data || {},
    severity
  );

  ok(res, { recorded: true, entry }, 201);
}));

/** GET /game/audit/stats — Statistiques d'audit */
router.get('/audit/stats', gameRateLimit(20), asyncRoute(async (req, res) => {
  const stats = await callAgent('auditTrail', 'getStats');
  ok(res, { stats });
}));

/** POST /game/audit/verify — Vérifier l'intégrité de la chaîne */
router.post('/audit/verify', gameRateLimit(5, 60_000), asyncRoute(async (req, res) => {
  const result = await callAgent('auditTrail', 'verify', req.body || {});
  ok(res, { integrity: result });
}));

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — SÉCURITÉ (ThirdEye)
// ══════════════════════════════════════════════════════════════════════════════

/** GET /game/security/status — Statut sécurité */
router.get('/security/status', gameRateLimit(30), asyncRoute(async (req, res) => {
  const [status, alerts, incidents] = await Promise.allSettled([
    callAgent('thirdEye', 'getStatus'),
    callAgent('thirdEye', 'getAlerts', null, false, 20),
    callAgent('thirdEye', 'getIncidents', { status: 'OPEN' }),
  ]);

  ok(res, {
    status: status.status === 'fulfilled' ? status.value : null,
    alerts: alerts.status === 'fulfilled' ? alerts.value : [],
    incidents: incidents.status === 'fulfilled' ? incidents.value : [],
  });
}));

/** POST /game/security/assess — Évaluer une action */
router.post('/security/assess', gameRateLimit(30), asyncRoute(async (req, res) => {
  const { action, context } = req.body;

  const errors = validate(req.body, {
    action: { required: true },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent('thirdEye', 'assess', action, context || {});
  ok(res, { assessment: result });
}));

/** POST /game/security/block — Bloquer une IP ou action */
router.post('/security/block', gameRateLimit(10), asyncRoute(async (req, res) => {
  const { type, value, reason, duration } = req.body;

  const errors = validate(req.body, {
    type: { required: true, enum: ['ip', 'action'] },
    value: { required: true, type: 'string' },
    reason: { type: 'string', maxLength: 256 },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  let result;
  if (type === 'ip') {
    result = await callAgent('thirdEye', 'blockIP', sanitize(value), reason, duration);
  } else {
    result = await callAgent('thirdEye', 'blockAction', sanitize(value), reason, duration);
  }

  ok(res, { blocked: true, type, value, result }, 201);
}));

/** POST /game/security/unblock — Débloquer */
router.post('/security/unblock', gameRateLimit(10), asyncRoute(async (req, res) => {
  const { type, value } = req.body;

  const errors = validate(req.body, {
    type: { required: true, enum: ['ip', 'action'] },
    value: { required: true, type: 'string' },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const method = type === 'ip' ? 'unblockIP' : 'unblockAction';
  const result = await callAgent('thirdEye', method, sanitize(value));
  ok(res, { unblocked: true, type, value, result });
}));

/** GET /game/security/alerts — Alertes de sécurité */
router.get('/security/alerts', gameRateLimit(30), asyncRoute(async (req, res) => {
  const level = sanitize(req.query.level || '', 16) || null;
  const limit = clamp(Number(req.query.limit) || 50, 1, 200);
  const resolved = req.query.resolved === 'true';

  const alerts = await callAgent('thirdEye', 'getAlerts', level, resolved, limit);
  ok(res, { alerts: alerts || [], count: (alerts || []).length });
}));

/** POST /game/security/incident/resolve — Résoudre un incident */
router.post('/security/incident/resolve', gameRateLimit(10), asyncRoute(async (req, res) => {
  const { incidentId, notes } = req.body;

  const errors = validate(req.body, {
    incidentId: { required: true, type: 'string' },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  const result = await callAgent('thirdEye', 'resolveIncident', incidentId, sanitize(notes || '', 512));
  ok(res, { resolved: true, incidentId, result });
}));

/** GET /game/security/trend — Analyse de tendances */
router.get('/security/trend', gameRateLimit(20), asyncRoute(async (req, res) => {
  const windowMs = clamp(Number(req.query.window) || 300_000, 60_000, 3_600_000);
  const trend = await callAgent('thirdEye', 'getTrendAnalysis', null, windowMs);
  ok(res, { trend });
}));

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — MÉMOIRE (EtherMemory)
// ══════════════════════════════════════════════════════════════════════════════

/** GET /game/memory — Entrées récentes */
router.get('/memory', gameRateLimit(30), asyncRoute(async (req, res) => {
  const limit = clamp(Number(req.query.limit) || 30, 1, 200);
  const [recent, stats] = await Promise.all([
    callAgent('etherMemory', 'recent', limit),
    callAgent('etherMemory', 'getStats'),
  ]);
  ok(res, { recent, stats });
}));

/** GET /game/memory/:key — Obtenir une clé spécifique */
router.get('/memory/:key', gameRateLimit(60), asyncRoute(async (req, res) => {
  const key = sanitize(req.params.key, 128);
  if (!key) return fail(res, 'Clé invalide', 400, 'INVALID_KEY');

  const value = await callAgent('etherMemory', 'get', key);
  if (value === null || value === undefined) {
    return fail(res, `Clé "${key}" introuvable`, 404, 'NOT_FOUND');
  }
  ok(res, { key, value });
}));

/** POST /game/memory/set — Écrire en mémoire */
router.post('/memory/set', gameRateLimit(30), asyncRoute(async (req, res) => {
  const { key, value, ttl } = req.body;

  const errors = validate(req.body, {
    key: { required: true, type: 'string', minLength: 1, maxLength: 128 },
    value: { required: true },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  await callAgent('etherMemory', 'set', sanitize(key), value, ttl || null);
  ok(res, { set: true, key, ttl: ttl || null }, 201);
}));

/** POST /game/memory/search — Recherche en mémoire */
router.post('/memory/search', gameRateLimit(20), asyncRoute(async (req, res) => {
  const { query, prefix, limit = 50 } = req.body;

  const result = await callAgent('etherMemory', 'search', {
    query: sanitize(query || '', 128),
    prefix: sanitize(prefix || '', 64),
    limit: clamp(limit, 1, 200),
  });

  ok(res, { results: result?.results || [], count: result?.count || 0 });
}));

/** DELETE /game/memory/:key — Supprimer une clé */
router.delete('/memory/:key', gameRateLimit(20), asyncRoute(async (req, res) => {
  const key = sanitize(req.params.key, 128);
  if (!key) return fail(res, 'Clé invalide', 400, 'INVALID_KEY');

  await callAgent('etherMemory', 'delete', key);
  ok(res, { deleted: key });
}));

/** DELETE /game/memory/clear — Vider la mémoire (admin) */
router.delete('/memory/clear', gameRateLimit(2, 60_000), asyncRoute(async (req, res) => {
  const { prefix, confirm } = req.body;

  if (confirm !== 'CONFIRM_CLEAR') {
    return fail(res, 'Confirmation requise: CONFIRM_CLEAR', 400, 'CONFIRMATION_REQUIRED');
  }

  const result = await callAgent('etherMemory', 'clear', sanitize(prefix || '', 64));
  ok(res, { cleared: true, result });
}));

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — ÉCONOMIE
// ══════════════════════════════════════════════════════════════════════════════

/** GET /game/economy/stats — Statistiques économiques */
router.get('/economy/stats', gameRateLimit(20), asyncRoute(async (req, res) => {
  const result = await callAgent('etherForge', 'process', { mission: 'get_economy_stats' });
  ok(res, { economy: result });
}));

/** POST /game/economy/transaction — Simuler une transaction */
router.post('/economy/transaction', gameRateLimit(20), asyncRoute(async (req, res) => {
  const { from, to, amount, type = 'transfer', description } = req.body;

  const errors = validate(req.body, {
    from: { required: true, type: 'string' },
    to: { required: true, type: 'string' },
    amount: { required: true, type: 'number', min: 1, max: 100_000_000 },
    type: { enum: ['transfer', 'payment', 'salary', 'fine', 'purchase', 'tax'] },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  if (from === to) return fail(res, 'Auto-transaction interdite', 400, 'SELF_TRANSACTION');

  const result = await callAgent('etherForge', 'process', {
    mission: 'economy_transaction',
    from: sanitize(from),
    to: sanitize(to),
    amount,
    type,
    description: sanitize(description || '', 256),
    id: randomUUID(),
    ts: Date.now(),
  });

  ok(res, { transaction: result }, 201);
}));

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — JOUEURS
// ══════════════════════════════════════════════════════════════════════════════

/** GET /game/players — Liste des joueurs en ligne */
router.get('/players', gameRateLimit(30), asyncRoute(async (req, res) => {
  const { job, faction, limit = 100 } = req.query;

  const result = await callAgent('etherSim', 'process', {
    mission: 'get_players',
    filters: {
      job: sanitize(job || '', 64) || null,
      faction: sanitize(faction || '', 64) || null,
    },
    limit: clamp(Number(limit), 1, 200),
  });

  ok(res, { players: result?.players || [], count: result?.count || 0 });
}));

/** GET /game/players/:id — Profil d'un joueur */
router.get('/players/:id', gameRateLimit(60), asyncRoute(async (req, res) => {
  const id = sanitize(req.params.id, 64);
  if (!id) return fail(res, 'ID invalide', 400, 'INVALID_ID');

  const result = await callAgent('etherSim', 'process', { mission: 'get_player', playerId: id });
  if (!result) return fail(res, `Joueur "${id}" introuvable`, 404, 'NOT_FOUND');

  ok(res, { player: result });
}));

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES — BRAIN
// ══════════════════════════════════════════════════════════════════════════════

/** POST /game/brain/process — Traiter une intention */
router.post('/brain/process', gameRateLimit(10, 60_000), asyncRoute(async (req, res) => {
  const { intent, context, options } = req.body;

  const errors = validate(req.body, {
    intent: { required: true, type: 'string', minLength: 2, maxLength: 5000 },
  });
  if (errors.length) return fail(res, 'Validation échouée', 400, 'VALIDATION_ERROR', errors);

  if (!brain?.process) return fail(res, 'Brain non disponible', 503, 'BRAIN_UNAVAILABLE');

  const result = await brain.process(
    sanitize(intent, 5000),
    { source: 'game_api', ...context },
    options || {}
  );

  ok(res, { result });
}));

/** GET /game/brain/status — Statut du Brain */
router.get('/brain/status', gameRateLimit(30), asyncRoute(async (req, res) => {
  if (!brain?.getStatus) return fail(res, 'Brain non disponible', 503, 'BRAIN_UNAVAILABLE');
  const status = brain.getStatus();
  ok(res, { brain: status });
}));

/** GET /game/brain/categories — Catégories disponibles */
router.get('/brain/categories', asyncRoute(async (req, res) => {
  if (!brain?.getCategories) return fail(res, 'Brain non disponible', 503, 'BRAIN_UNAVAILABLE');
  const categories = brain.getCategories();
  ok(res, { categories });
}));

/** POST /game/brain/classify — Classifier une intention */
router.post('/brain/classify', gameRateLimit(30), asyncRoute(async (req, res) => {
  const { input } = req.body;
  if (!input) return fail(res, 'Input requis', 400, 'MISSING_INPUT');
  if (!brain?.classify) return fail(res, 'Brain non disponible', 503, 'BRAIN_UNAVAILABLE');

  const result = brain.classify(sanitize(input, 2000));
  ok(res, { classification: result });
}));

// ══════════════════════════════════════════════════════════════════════════════
// 404 ROUTE
// ══════════════════════════════════════════════════════════════════════════════
router.use((req, res) => {
  fail(res, `Route game introuvable: ${req.method} ${req.path}`, 404, 'NOT_FOUND');
});

export default router;