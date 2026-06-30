// server/app.js
// 🚀 Application Express EtherWorld — Version 2.0.0 Ultra
import cors from 'cors';
import express from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../shared/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// CONSTANTES
// ============================================================
const VERSION = '4.1.0';
const API_PREFIX = '/api';
const RATE_WINDOWS = new Map(); // key → { count, resetAt }
const REQUEST_LOG = [];
const MAX_REQ_LOG = 500;

// ============================================================
// MIDDLEWARES UTILITAIRES
// ============================================================

/** Injection d'un requestId unique sur chaque requête */
function requestId(req, res, next) {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  res.setHeader('X-Powered-By', `TroxT EtherWorld v${VERSION}`);
  next();
}

/** Logger structuré des requêtes */
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const entry = {
      id: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
      ip: req.ip || req.socket?.remoteAddress,
      ua: req.headers['user-agent']?.slice(0, 80),
      ts: Date.now(),
    };
    REQUEST_LOG.push(entry);
    if (REQUEST_LOG.length > MAX_REQ_LOG) REQUEST_LOG.shift();

    const level = res.statusCode >= 500 ? 'error'
      : res.statusCode >= 400 ? 'warn'
        : 'debug';
    logger[level]?.('HTTP', `${req.method} ${req.path} → ${res.statusCode} (${entry.ms}ms)`);
  });
  next();
}

/** Rate limiter simple par IP + clé */
function rateLimit(maxReqs = 100, windowMs = 60_000, keyFn = (req) => req.ip) {
  return (req, res, next) => {
    const key = `rl:${keyFn(req)}:${req.path}`;
    const now = Date.now();
    const entry = RATE_WINDOWS.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count++;
    RATE_WINDOWS.set(key, entry);

    res.setHeader('X-RateLimit-Limit', maxReqs);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxReqs - entry.count));
    res.setHeader('X-RateLimit-Reset', entry.resetAt);

    if (entry.count > maxReqs) {
      return res.status(429).json({
        error: 'Rate limit dépassé',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        code: 'RATE_LIMITED',
      });
    }
    next();
  };
}

/** Validation body JSON avec schéma minimal */
function validateBody(required = [], types = {}) {
  return (req, res, next) => {
    for (const field of required) {
      if (req.body[field] === undefined || req.body[field] === null) {
        return res.status(400).json({
          error: `Champ requis manquant: ${field}`,
          code: 'MISSING_FIELD',
          field,
        });
      }
    }
    for (const [field, type] of Object.entries(types)) {
      if (req.body[field] !== undefined && typeof req.body[field] !== type) {
        return res.status(400).json({
          error: `Champ "${field}" doit être de type ${type}`,
          code: 'INVALID_TYPE',
          field,
          expected: type,
        });
      }
    }
    next();
  };
}

/** Vérification kernel + module disponible */
function requireKernel(module = null) {
  return (req, res, next) => {
    if (!req.kernel) {
      return res.status(503).json({ error: 'Kernel non disponible', code: 'KERNEL_UNAVAILABLE' });
    }
    if (module && !req.kernel[module]) {
      return res.status(503).json({
        error: `Module "${module}" non disponible`,
        code: 'MODULE_UNAVAILABLE',
        module,
      });
    }
    next();
  };
}

/** Vérification authentification admin simple */
function requireAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
  if (!adminKey) {
    return res.status(401).json({ error: 'Authentification requise', code: 'UNAUTHORIZED' });
  }
  // Hash pour comparaison sécurisée
  const expectedHash = process.env.ADMIN_KEY_HASH;
  if (expectedHash) {
    const provided = createHash('sha256').update(adminKey).digest('hex');
    if (provided !== expectedHash) {
      return res.status(403).json({ error: 'Clé admin invalide', code: 'FORBIDDEN' });
    }
  }
  req.adminId = req.body?.adminId || 'admin';
  next();
}

/** Wrapper async pour éviter les try/catch répétitifs */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/** Réponse standardisée */
const ok = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const err = (res, message, status = 500, code = 'SERVER_ERROR', details = null) =>
  res.status(status).json({ success: false, error: message, code, ...(details ? { details } : {}) });

// ============================================================
// HELPERS MÉMOIRE
// ============================================================
function getMemory(kernel, key, fallback = null) {
  try { return kernel.memory?.get(key) ?? fallback; }
  catch { return fallback; }
}

function setMemory(kernel, key, value) {
  try { kernel.memory?.set(key, value); return true; }
  catch { return false; }
}

function mapToArray(value) {
  if (!value) return [];
  if (value instanceof Map) return Array.from(value.values());
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return Object.values(value);
  return [];
}

// ============================================================
// FACTORY PRINCIPALE
// ============================================================
export function createApp({ kernel }) {

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // ── Injection kernel sur req ────────────────────────────────────────────
  app.use((req, _, next) => { req.kernel = kernel; next(); });

  // ── Middlewares globaux ─────────────────────────────────────────────────
  app.use(requestId);
  app.use(requestLogger);

  app.use(cors({
    origin: (origin, cb) => {
      const allowed = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4173',
        ...(process.env.CORS_ORIGINS?.split(',') || []),
      ];
      if (!origin || allowed.includes(origin)) return cb(null, true);
      cb(new Error(`CORS bloqué: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Headers sécurité
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // ── Fichiers statiques ──────────────────────────────────────────────────
  const distDir = path.join(__dirname, '../../dist');
  const publicDir = path.join(__dirname, '../../public');

  const staticOpts = { maxAge: '1h', etag: true, lastModified: true };
  if (existsSync(distDir)) app.use(express.static(distDir, staticOpts));
  if (existsSync(publicDir)) app.use(express.static(publicDir, staticOpts));

  // ============================================================
  // ROUTER API
  // ============================================================
  const api = express.Router();
  api.use(rateLimit(300, 60_000)); // 300 req/min par défaut

  // ── Healthcheck ───────────────────────────────────────────────────────
  api.get('/health', (req, res) => {
    const brain = req.kernel.brain;
    const stats = brain?.getStats?.() || {};
    const memory = process.memoryUsage();

    ok(res, {
      status: 'OK',
      server: `TroxT EtherWorld v${VERSION}`,
      version: VERSION,
      uptime: process.uptime(),
      brain: {
        available: !!brain,
        ...stats,
      },
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
      },
      pid: process.pid,
      nodeVersion: process.version,
      ts: new Date().toISOString(),
    });
  });

  // ── Ping léger ────────────────────────────────────────────────────────
  api.get('/ping', (_, res) => res.json({ pong: true, ts: Date.now() }));

  // ── Status complet ────────────────────────────────────────────────────
  api.get('/status', requireKernel(), (req, res) => {
    ok(res, {
      kernel: {
        agents: req.kernel.bus?.getAgents?.() || [],
        modules: req.kernel.memory?.size || 0,
      },
      requests: {
        total: REQUEST_LOG.length,
        recent: REQUEST_LOG.slice(-10).map(r => ({
          method: r.method, path: r.path, status: r.status, ms: r.ms,
        })),
      },
      rateLimiter: {
        tracked: RATE_WINDOWS.size,
      },
    });
  });

  // ── Métriques serveur ─────────────────────────────────────────────────
  api.get('/metrics', (req, res) => {
    const byStatus = {};
    const byPath = {};
    const byMethod = {};
    let totalMs = 0;

    for (const r of REQUEST_LOG) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byPath[r.path] = (byPath[r.path] || 0) + 1;
      byMethod[r.method] = (byMethod[r.method] || 0) + 1;
      totalMs += r.ms;
    }

    ok(res, {
      totalRequests: REQUEST_LOG.length,
      avgResponseMs: REQUEST_LOG.length ? Math.round(totalMs / REQUEST_LOG.length) : 0,
      byStatus,
      byMethod,
      topPaths: Object.entries(byPath)
        .sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([path, count]) => ({ path, count })),
      uptime: process.uptime(),
      ts: Date.now(),
    });
  });

  // ── Logs requêtes ─────────────────────────────────────────────────────
  api.get('/logs', requireAdmin, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, MAX_REQ_LOG);
    const status = req.query.status ? parseInt(req.query.status) : null;
    let logs = REQUEST_LOG.slice(-limit * 2);
    if (status) logs = logs.filter(r => r.status === status);
    ok(res, { logs: logs.slice(-limit), total: REQUEST_LOG.length });
  });

  // ──────────────────────────────────────────────────────────────────────
  // BRAIN
  // ──────────────────────────────────────────────────────────────────────
  const brainRouter = express.Router();

  brainRouter.post('/execute',
    rateLimit(60, 60_000),
    requireKernel('brain'),
    validateBody(['intent'], { intent: 'string' }),
    asyncHandler(async (req, res) => {
      const { intent, context = {} } = req.body;
      const result = await req.kernel.brain.process({
        intent,
        context: { source: 'api', requestId: req.id, ...context },
      });
      ok(res, { result });
    })
  );

  brainRouter.get('/stats', requireKernel(), (req, res) => {
    ok(res, { stats: req.kernel.brain?.getStats?.() || {} });
  });

  brainRouter.get('/status', requireKernel(), (req, res) => {
    ok(res, { status: req.kernel.brain?.getStatus?.() || {} });
  });

  brainRouter.post('/reset',
    requireAdmin,
    requireKernel('brain'),
    asyncHandler(async (req, res) => {
      await req.kernel.brain.reset?.();
      logger.warn('Brain', `Reset déclenché par ${req.adminId}`);
      ok(res, { reset: true, ts: Date.now() });
    })
  );

  api.use('/brain', brainRouter);

  // ──────────────────────────────────────────────────────────────────────
  // WORLD
  // ──────────────────────────────────────────────────────────────────────
  const worldRouter = express.Router();
  worldRouter.use(requireKernel());

  // Players
  worldRouter.get('/players', (req, res) => {
    const players = getMemory(req.kernel, 'players');
    const arr = mapToArray(players);
    const limit = parseInt(req.query.limit) || arr.length;
    const offset = parseInt(req.query.offset) || 0;
    const filter = req.query.filter;
    let result = arr;

    if (filter) result = result.filter(p =>
      JSON.stringify(p).toLowerCase().includes(filter.toLowerCase())
    );

    ok(res, {
      players: result.slice(offset, offset + limit),
      total: result.length,
      limit,
      offset,
    });
  });

  worldRouter.get('/players/:id', (req, res) => {
    const players = getMemory(req.kernel, 'players');
    const arr = mapToArray(players);
    const player = arr.find(p => p.id === req.params.id || p.playerId === req.params.id);
    if (!player) return err(res, 'Joueur non trouvé', 404, 'PLAYER_NOT_FOUND');
    ok(res, { player });
  });

  // Jobs
  worldRouter.get('/jobs', (req, res) => {
    const jobs = getMemory(req.kernel, 'jobs', []);
    ok(res, { jobs: mapToArray(jobs), count: Array.isArray(jobs) ? jobs.length : 0 });
  });

  // Factions
  worldRouter.get('/factions', (req, res) => {
    const factions = getMemory(req.kernel, 'factions', []);
    ok(res, { factions: mapToArray(factions), count: Array.isArray(factions) ? factions.length : 0 });
  });

  worldRouter.get('/factions/:id', (req, res) => {
    const factions = mapToArray(getMemory(req.kernel, 'factions', []));
    const faction = factions.find(f => f.id === req.params.id);
    if (!faction) return err(res, 'Faction non trouvée', 404, 'FACTION_NOT_FOUND');
    ok(res, { faction });
  });

  // Items
  worldRouter.get('/items', (req, res) => {
    const items = mapToArray(getMemory(req.kernel, 'items', []));
    const category = req.query.category;
    const result = category ? items.filter(i => i.category === category) : items;
    ok(res, { items: result, count: result.length });
  });

  worldRouter.get('/items/:id', (req, res) => {
    const items = mapToArray(getMemory(req.kernel, 'items', []));
    const item = items.find(i => i.id === req.params.id);
    if (!item) return err(res, 'Item non trouvé', 404, 'ITEM_NOT_FOUND');
    ok(res, { item });
  });

  // Properties
  worldRouter.get('/properties', (req, res) => {
    const props = mapToArray(getMemory(req.kernel, 'properties'));
    ok(res, { properties: props, count: props.length });
  });

  worldRouter.get('/properties/:id', (req, res) => {
    const props = mapToArray(getMemory(req.kernel, 'properties'));
    const property = props.find(p => p.id === req.params.id);
    if (!property) return err(res, 'Propriété non trouvée', 404, 'PROPERTY_NOT_FOUND');
    ok(res, { property });
  });

  // Vehicles
  worldRouter.get('/vehicles', (req, res) => {
    const vehicles = mapToArray(getMemory(req.kernel, 'vehicles'));
    const type = req.query.type;
    const result = type ? vehicles.filter(v => v.type === type) : vehicles;
    ok(res, { vehicles: result, count: result.length });
  });

  worldRouter.get('/vehicles/:id', (req, res) => {
    const vehicles = mapToArray(getMemory(req.kernel, 'vehicles'));
    const vehicle = vehicles.find(v => v.id === req.params.id);
    if (!vehicle) return err(res, 'Véhicule non trouvé', 404, 'VEHICLE_NOT_FOUND');
    ok(res, { vehicle });
  });

  // World State (météo, heure, etc.)
  worldRouter.get('/state', (req, res) => {
    ok(res, { state: getMemory(req.kernel, 'worldState', {}) });
  });

  worldRouter.patch('/state',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const current = getMemory(req.kernel, 'worldState', {});
      const updated = { ...current, ...req.body, updatedAt: Date.now() };
      setMemory(req.kernel, 'worldState', updated);
      await req.kernel.bus?.broadcast?.({ type: 'world.state.updated', data: updated });
      ok(res, { state: updated });
    })
  );

  // Events monde
  worldRouter.get('/events', (req, res) => {
    const events = mapToArray(getMemory(req.kernel, 'worldEvents', []));
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    ok(res, { events: events.slice(-limit), count: events.length });
  });

  worldRouter.post('/events',
    validateBody(['type'], { type: 'string' }),
    asyncHandler(async (req, res) => {
      const event = {
        id: randomUUID(),
        type: req.body.type,
        data: req.body.data || {},
        source: req.body.source || 'api',
        timestamp: Date.now(),
      };
      const events = getMemory(req.kernel, 'worldEvents', []);
      events.push(event);
      if (events.length > 1000) events.shift();
      setMemory(req.kernel, 'worldEvents', events);
      await req.kernel.bus?.broadcast?.({ type: 'world.event', data: event });
      ok(res, { event }, 201);
    })
  );

  // Statistiques monde globales
  worldRouter.get('/stats', (req, res) => {
    const players = mapToArray(getMemory(req.kernel, 'players'));
    const vehicles = mapToArray(getMemory(req.kernel, 'vehicles'));
    const properties = mapToArray(getMemory(req.kernel, 'properties'));
    const factions = mapToArray(getMemory(req.kernel, 'factions'));
    const items = mapToArray(getMemory(req.kernel, 'items'));
    const events = mapToArray(getMemory(req.kernel, 'worldEvents', []));
    const state = getMemory(req.kernel, 'worldState', {});

    ok(res, {
      world: {
        players: { total: players.length, online: players.filter(p => p.online).length },
        vehicles: { total: vehicles.length },
        properties: { total: properties.length },
        factions: { total: factions.length },
        items: { total: items.length },
        events: { total: events.length, recent: events.slice(-5).length },
        state: { weather: state.weather, time: state.time },
      },
    });
  });

  api.use('/world', worldRouter);

  // ──────────────────────────────────────────────────────────────────────
  // SCHEMAS RP
  // ──────────────────────────────────────────────────────────────────────
  const schemaRouter = express.Router();
  schemaRouter.use(requireKernel());

  schemaRouter.get('/', (req, res) => {
    const schemas = getMemory(req.kernel, 'rpSchemas', []);
    const type = req.query.type;
    const result = type ? schemas.filter(s => s.type === type) : schemas;
    ok(res, { schemas: result, count: result.length });
  });

  schemaRouter.get('/:id', (req, res) => {
    const schemas = getMemory(req.kernel, 'rpSchemas', []);
    const schema = schemas.find(s => s.id === req.params.id);
    if (!schema) return err(res, 'Schéma non trouvé', 404, 'SCHEMA_NOT_FOUND');
    ok(res, { schema });
  });

  schemaRouter.post('/',
    validateBody(['type'], { type: 'string' }),
    asyncHandler(async (req, res) => {
      const { type, data = {} } = req.body;
      const schema = {
        id: `schema_${Date.now()}_${randomUUID().slice(0, 8)}`,
        type,
        data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        author: req.body.author || 'api',
        version: 1,
      };
      const schemas = getMemory(req.kernel, 'rpSchemas', []);
      schemas.push(schema);
      setMemory(req.kernel, 'rpSchemas', schemas);
      await req.kernel.bus?.emit?.('schema.created', schema);
      ok(res, { schema }, 201);
    })
  );

  schemaRouter.put('/:id',
    asyncHandler(async (req, res) => {
      const schemas = getMemory(req.kernel, 'rpSchemas', []);
      const idx = schemas.findIndex(s => s.id === req.params.id);
      if (idx === -1) return err(res, 'Schéma non trouvé', 404, 'SCHEMA_NOT_FOUND');

      schemas[idx] = {
        ...schemas[idx],
        ...req.body,
        id: schemas[idx].id,
        updatedAt: Date.now(),
        version: (schemas[idx].version || 1) + 1,
      };
      setMemory(req.kernel, 'rpSchemas', schemas);
      await req.kernel.bus?.emit?.('schema.updated', schemas[idx]);
      ok(res, { schema: schemas[idx] });
    })
  );

  schemaRouter.delete('/:id',
    requireAdmin,
    asyncHandler(async (req, res) => {
      const schemas = getMemory(req.kernel, 'rpSchemas', []);
      const filtered = schemas.filter(s => s.id !== req.params.id);
      if (filtered.length === schemas.length) {
        return err(res, 'Schéma non trouvé', 404, 'SCHEMA_NOT_FOUND');
      }
      setMemory(req.kernel, 'rpSchemas', filtered);
      await req.kernel.bus?.emit?.('schema.deleted', { id: req.params.id });
      ok(res, { deleted: req.params.id });
    })
  );

  api.use('/world/schema', schemaRouter);

  // ──────────────────────────────────────────────────────────────────────
  // AGENTS
  // ──────────────────────────────────────────────────────────────────────
  const agentsRouter = express.Router();
  agentsRouter.use(requireKernel());

  agentsRouter.get('/', (req, res) => {
    const agents = req.kernel.bus?.getAllAgentStats?.() || {};
    ok(res, { agents, count: Object.keys(agents).length });
  });

  agentsRouter.get('/:name', (req, res) => {
    const stats = req.kernel.bus?.getAgentStats?.(req.params.name);
    if (!stats) return err(res, 'Agent non trouvé', 404, 'AGENT_NOT_FOUND');
    ok(res, { agent: stats });
  });

  agentsRouter.post('/:name/send',
    rateLimit(30, 60_000),
    requireAdmin,
    asyncHandler(async (req, res) => {
      const result = await req.kernel.bus?.send?.(req.params.name, req.body);
      if (!result) return err(res, 'Envoi échoué', 500, 'SEND_FAILED');
      ok(res, { result });
    })
  );

  agentsRouter.get('/:name/health', asyncHandler(async (req, res) => {
    const agent = req.kernel.bus?.getAgent?.(req.params.name);
    if (!agent) return err(res, 'Agent non trouvé', 404, 'AGENT_NOT_FOUND');
    const status = agent.getStatus?.() || { name: req.params.name };
    ok(res, { health: status });
  }));

  api.use('/agents', agentsRouter);

  // ──────────────────────────────────────────────────────────────────────
  // ADMIN
  // ──────────────────────────────────────────────────────────────────────
  const adminRouter = express.Router();
  adminRouter.use(requireAdmin);
  adminRouter.use(rateLimit(30, 60_000));
  adminRouter.use(requireKernel());

  adminRouter.post('/command',
    validateBody(['command'], { command: 'string' }),
    asyncHandler(async (req, res) => {
      const { command, args = {}, adminId = req.adminId } = req.body;
      logger.info('Admin', `Commande "${command}" par ${adminId} [${req.id}]`);

      const result = await req.kernel.brain?.process({
        intent: command,
        context: { source: 'admin', adminId, args, requestId: req.id },
      });

      ok(res, { result, command, adminId });
    })
  );

  adminRouter.post('/broadcast',
    validateBody(['type'], { type: 'string' }),
    asyncHandler(async (req, res) => {
      const packet = { type: req.body.type, data: req.body.data || {}, source: 'admin' };
      const result = await req.kernel.bus?.broadcast?.(packet);
      ok(res, { broadcasted: true, packet, result });
    })
  );

  adminRouter.get('/memory', (req, res) => {
    const keys = req.kernel.memory?.keys
      ? [...req.kernel.memory.keys()]
      : [];
    const sizes = keys.reduce((acc, k) => {
      try { acc[k] = JSON.stringify(req.kernel.memory.get(k))?.length || 0; } catch { acc[k] = 0; }
      return acc;
    }, {});
    ok(res, { keys, sizes, count: keys.length });
  });

  adminRouter.get('/memory/:key', (req, res) => {
    const value = getMemory(req.kernel, req.params.key);
    ok(res, { key: req.params.key, value });
  });

  adminRouter.put('/memory/:key',
    asyncHandler(async (req, res) => {
      setMemory(req.kernel, req.params.key, req.body.value);
      ok(res, { key: req.params.key, updated: true });
    })
  );

  adminRouter.delete('/memory/:key', (req, res) => {
    req.kernel.memory?.delete?.(req.params.key);
    ok(res, { key: req.params.key, deleted: true });
  });

  adminRouter.post('/gc', (req, res) => {
    // Nettoyage rate limiter stale
    const now = Date.now();
    let cleaned = 0;
    for (const [k, v] of RATE_WINDOWS) {
      if (v.resetAt < now) { RATE_WINDOWS.delete(k); cleaned++; }
    }
    REQUEST_LOG.splice(0, Math.max(0, REQUEST_LOG.length - 100));
    ok(res, { cleaned, rateLimiterSize: RATE_WINDOWS.size, logSize: REQUEST_LOG.length });
  });

  adminRouter.get('/info', (req, res) => {
    ok(res, {
      version: VERSION,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
      env: process.env.NODE_ENV || 'development',
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    });
  });

  api.use('/admin', adminRouter);

  // ──────────────────────────────────────────────────────────────────────
  // CHARACTERS (EtherPrisma)
  // ──────────────────────────────────────────────────────────────────────
  const charsRouter = express.Router();
  charsRouter.use(requireKernel());

  charsRouter.get('/', (req, res) => {
    const chars = mapToArray(getMemory(req.kernel, 'characters', []));
    ok(res, { characters: chars, count: chars.length });
  });

  charsRouter.get('/:id', (req, res) => {
    const chars = mapToArray(getMemory(req.kernel, 'characters', []));
    const char = chars.find(c => c.id === req.params.id);
    if (!char) return err(res, 'Personnage non trouvé', 404, 'CHARACTER_NOT_FOUND');
    ok(res, { character: char });
  });

  charsRouter.post('/',
    validateBody(['name'], { name: 'string' }),
    asyncHandler(async (req, res) => {
      const character = {
        id: randomUUID(),
        name: req.body.name,
        data: req.body.data || {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const chars = getMemory(req.kernel, 'characters', []);
      chars.push(character);
      setMemory(req.kernel, 'characters', chars);
      await req.kernel.bus?.emit?.('character.created', character);
      ok(res, { character }, 201);
    })
  );

  charsRouter.put('/:id',
    asyncHandler(async (req, res) => {
      const chars = getMemory(req.kernel, 'characters', []);
      const idx = chars.findIndex(c => c.id === req.params.id);
      if (idx === -1) return err(res, 'Personnage non trouvé', 404, 'CHARACTER_NOT_FOUND');

      chars[idx] = { ...chars[idx], ...req.body, id: chars[idx].id, updatedAt: Date.now() };
      setMemory(req.kernel, 'characters', chars);
      ok(res, { character: chars[idx] });
    })
  );

  charsRouter.delete('/:id',
    asyncHandler(async (req, res) => {
      const chars = getMemory(req.kernel, 'characters', []);
      const filtered = chars.filter(c => c.id !== req.params.id);
      if (filtered.length === chars.length) {
        return err(res, 'Personnage non trouvé', 404, 'CHARACTER_NOT_FOUND');
      }
      setMemory(req.kernel, 'characters', filtered);
      ok(res, { deleted: req.params.id });
    })
  );

  // Alias public (utilisé par le frontend existant)
  api.get('/get-characters', requireKernel(), (req, res) => {
    const chars = mapToArray(getMemory(req.kernel, 'characters', []));
    ok(res, { characters: chars, count: chars.length });
  });

  api.use('/characters', charsRouter);

  // ──────────────────────────────────────────────────────────────────────
  // MONTAGE ROUTER API
  // ──────────────────────────────────────────────────────────────────────
  app.use(API_PREFIX, api);

  // ──────────────────────────────────────────────────────────────────────
  // GESTION ERREURS GLOBALE
  // ──────────────────────────────────────────────────────────────────────

  // 404 API
  app.use(`${API_PREFIX}/*`, (req, res) => {
    err(res, `Route API introuvable: ${req.method} ${req.path}`, 404, 'NOT_FOUND');
  });

  // Erreurs Express (dont CORS)
  app.use((error, req, res, next) => {
    logger.error('APP', `[${req.id}] ${error.message}`);

    if (error.message?.includes('CORS')) {
      return res.status(403).json({ success: false, error: 'CORS bloqué', code: 'CORS_BLOCKED' });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ success: false, error: 'Payload trop grand', code: 'PAYLOAD_TOO_LARGE' });
    }
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ success: false, error: 'JSON invalide', code: 'INVALID_JSON' });
    }

    err(res, error.message || 'Erreur interne', 500, 'SERVER_ERROR');
  });

  // ──────────────────────────────────────────────────────────────────────
  // FALLBACK SPA
  // ──────────────────────────────────────────────────────────────────────
  app.get('*', (req, res) => {
    const candidates = [
      path.join(__dirname, '../../dist/index.html'),
      path.join(__dirname, '../../public/index.html'),
    ];

    for (const file of candidates) {
      if (existsSync(file)) {
        res.setHeader('Cache-Control', 'no-cache');
        return res.sendFile(file);
      }
    }

    // Fallback HTML inline si aucun build trouvé
    res.status(200).send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TroxT EtherWorld v${VERSION}</title>
  <style>
    body { background: #01020a; color: #00d4ff; font-family: 'Courier New', monospace;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; flex-direction: column; gap: 16px; }
    h1   { font-size: 2rem; letter-spacing: 6px; text-shadow: 0 0 30px #00d4ff; }
    p    { color: #7a8a9a; font-size: 0.9rem; letter-spacing: 2px; }
    code { background: #05080f; padding: 8px 16px; border: 1px solid rgba(0,212,255,0.2);
           border-radius: 4px; display: block; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>⟨ ETHERWORLD ⟩</h1>
  <p>TroxT Server v${VERSION} — API opérationnelle</p>
  <code>pnpm dev → http://localhost:5173</code>
  <p style="margin-top:24px;color:#4a5a70">
    API: <a href="/api/health" style="color:#00d4ff">/api/health</a>
  </p>
</body>
</html>`);
  });

  return app;
}

// ============================================================
// EXPORT UTILITAIRES (réutilisables)
// ============================================================
export { asyncHandler, err, getMemory, mapToArray, ok, rateLimit, requireAdmin, requireKernel, setMemory, validateBody };
