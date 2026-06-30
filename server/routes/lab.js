// server/routes/lab.js
// 🔬 Routes NodeJS Lab v2.0.0 — Télémétrie, snippets, tâches, exécution
// EtherWorld QC RP — Lab Engine Ultra
import express from 'express';
import vm from 'node:vm';

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════
const VERSION = '2.0.0';

const LIMITS = {
  executions: 200,
  snippets: 500,
  tasks: 1000,
  templates: 100,
  outputMaxLen: 50_000,     // chars
  codeMaxLen: 100_000,    // chars
  timeout: { min: 100, max: 30_000, default: 5_000 },
};

const VALID_LANGUAGES = [
  'javascript', 'typescript', 'json', 'bash', 'python',
  'sql', 'html', 'css', 'markdown', 'yaml', 'text',
];

const VALID_PRIORITIES = ['low', 'normal', 'high', 'critical'];
const VALID_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled', 'paused'];
const VALID_TASK_TYPES = ['forge', 'analyze', 'simulate', 'document', 'test', 'deploy', 'review'];

// ══════════════════════════════════════════════════════════════════════════════
// STORES IN-MEMORY
// ══════════════════════════════════════════════════════════════════════════════
const store = {
  executions: [],
  snippets: [],
  tasks: [],
  templates: [],
  bookmarks: [],
};

// Compteurs (préfixes sémantiques)
const counters = { exec: 1, snp: 1, task: 1, tpl: 1, bkm: 1 };

function nextId(prefix) {
  return `${prefix}_${String(counters[prefix]++).padStart(4, '0')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MÉTRIQUES
// ══════════════════════════════════════════════════════════════════════════════
const metrics = {
  totalExecutions: 0,
  successExecutions: 0,
  failedExecutions: 0,
  totalDurationMs: 0,
  rateLimitBlocks: 0,
  sandboxEscapes: 0,
  startedAt: Date.now(),
  languageCounts: {},
  taskCompletions: 0,
  snippetCreations: 0,
};

// ══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════════

const ok = (res, data, status = 200) =>
  res.status(status).json({ ok: true, version: VERSION, ts: Date.now(), ...data });

const fail = (res, message, status = 400, code = 'ERROR', details = null) =>
  res.status(status).json({
    ok: false, error: message, code,
    ...(details ? { details } : {}),
    ts: Date.now(),
  });

const asyncRoute = (fn) => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (err) { fail(res, err.message || 'Erreur interne', 500, err.code || 'SERVER_ERROR'); }
};

function sanitize(str, maxLen = 256) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, Number(val) || min));
}

function paginate(arr, page = 1, limit = 50) {
  const total = arr.length;
  const pages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  return {
    data: arr.slice(offset, offset + limit),
    total, pages,
    page: Number(page),
    limit: Number(limit),
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return `${Math.floor(h / 24)}j ${h % 24}h ${m % 60}m ${s % 60}s`;
}

function pushLimited(arr, item, max) {
  arr.unshift(item);
  if (arr.length > max) arr.length = max;
}

// ══════════════════════════════════════════════════════════════════════════════
// RATE LIMITER
// ══════════════════════════════════════════════════════════════════════════════
const rateLimitStore = new Map();

function rateLimit(max = 30, windowMs = 60_000) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
    entry.count++;
    rateLimitStore.set(key, entry);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', entry.resetAt);

    if (entry.count > max) {
      metrics.rateLimitBlocks++;
      return fail(res, 'Rate limit dépassé', 429, 'RATE_LIMITED', {
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
    }
    next();
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SANDBOX SÉCURISÉ
// ══════════════════════════════════════════════════════════════════════════════

const BLOCKED_PATTERNS = [
  /require\s*\(/,
  /import\s*\(/,
  /process\s*\./,
  /__proto__/,
  /constructor\s*\[/,
  /globalThis/,
  /global\s*\./,
  /\beval\b/,
  /Function\s*\(/,
  /XMLHttpRequest/,
  /fetch\s*\(/,
  /Atomics/,
  /SharedArrayBuffer/,
  /Buffer\s*\./,
  /\bfs\b/,
  /child_process/,
  /\bnet\b\./,
  /\bhttp\b\./,
];

function isSafeCode(code) {
  const violations = BLOCKED_PATTERNS
    .filter(p => p.test(code))
    .map(p => p.source);
  return { safe: violations.length === 0, violations };
}

function buildSandbox(outputRef, inputData = {}) {
  const consoleProxy = {
    log: (...args) => { outputRef.text += args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') + '\n'; },
    error: (...args) => { outputRef.text += `[ERROR] ${args.join(' ')}\n`; },
    warn: (...args) => { outputRef.text += `[WARN]  ${args.join(' ')}\n`; },
    info: (...args) => { outputRef.text += `[INFO]  ${args.join(' ')}\n`; },
    debug: (...args) => { outputRef.text += `[DEBUG] ${args.join(' ')}\n`; },
    table: (data) => { outputRef.text += JSON.stringify(data, null, 2) + '\n'; },
    clear: () => { outputRef.text = ''; },
    count: (() => {
      const counts = {};
      return (label = 'default') => {
        counts[label] = (counts[label] || 0) + 1;
        outputRef.text += `${label}: ${counts[label]}\n`;
      };
    })(),
    time: (label = 'default') => { outputRef.timers = outputRef.timers || {}; outputRef.timers[label] = Date.now(); },
    timeEnd: (label = 'default') => {
      if (outputRef.timers?.[label]) {
        outputRef.text += `${label}: ${Date.now() - outputRef.timers[label]}ms\n`;
      }
    },
  };

  return {
    console: consoleProxy,
    Date,
    Math,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
    atob: (s) => Buffer.from(s, 'base64').toString('utf8'),
    btoa: (s) => Buffer.from(s, 'utf8').toString('base64'),
    Object: {
      keys: Object.keys, values: Object.values, entries: Object.entries,
      assign: Object.assign, fromEntries: Object.fromEntries,
      freeze: Object.freeze, create: Object.create
    },
    Array: { from: Array.from, isArray: Array.isArray, of: Array.of },
    String,
    Number,
    Boolean,
    Symbol,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Promise,
    RegExp,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    undefined,
    null: null,
    Infinity,
    NaN,
    // Input data injecté
    input: inputData,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════════════════════════════════════════

router.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (res.statusCode >= 400) {
      console.warn(`[LAB] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
    }
  });
  next();
});

// ══════════════════════════════════════════════════════════════════════════════
// GET / — Info module
// ══════════════════════════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  ok(res, {
    module: 'Lab Routes',
    version: VERSION,
    uptime: formatUptime(Date.now() - metrics.startedAt),
    endpoints: {
      execution: ['POST /lab/execute', 'GET /lab/executions', 'GET /lab/executions/:id', 'DELETE /lab/executions/:id', 'GET /lab/executions/:id/replay'],
      snippets: ['GET /snippets', 'GET /snippets/:id', 'POST /snippets', 'PUT /snippets/:id', 'DELETE /snippets/:id', 'POST /snippets/:id/fork', 'POST /snippets/:id/execute'],
      tasks: ['GET /tasks', 'GET /tasks/:id', 'POST /tasks', 'PATCH /tasks/:id', 'DELETE /tasks/:id', 'POST /tasks/:id/run', 'POST /tasks/:id/clone', 'POST /tasks/bulk'],
      templates: ['GET /templates', 'GET /templates/:id', 'POST /templates', 'PUT /templates/:id', 'DELETE /templates/:id'],
      bookmarks: ['GET /bookmarks', 'POST /bookmarks', 'DELETE /bookmarks/:id'],
      stats: ['GET /lab/stats', 'GET /lab/metrics', 'GET /lab/health'],
    },
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// EXÉCUTION
// ══════════════════════════════════════════════════════════════════════════════

/** POST /lab/execute — Exécuter du code */
router.post('/lab/execute', rateLimit(20, 60_000), asyncRoute(async (req, res) => {
  const {
    code, language = 'javascript',
    timeout = LIMITS.timeout.default,
    label, tags, snippetId,
    input = {},
  } = req.body;

  // Validation
  if (!code || typeof code !== 'string') {
    return fail(res, 'Code requis', 400, 'MISSING_CODE');
  }
  if (code.length > LIMITS.codeMaxLen) {
    return fail(res, `Code trop long (max ${LIMITS.codeMaxLen} chars)`, 400, 'CODE_TOO_LONG');
  }
  if (!VALID_LANGUAGES.includes(language)) {
    return fail(res, `Langage non supporté: ${language}`, 400, 'UNSUPPORTED_LANGUAGE');
  }

  const safeTimeout = clamp(timeout, LIMITS.timeout.min, LIMITS.timeout.max);
  const execId = nextId('exec');
  const startTime = Date.now();

  let output = '';
  let error = null;
  let success = true;
  let returnValue = undefined;

  // Exécution JavaScript uniquement via VM
  if (language === 'javascript') {
    // Vérification sécurité
    const safetyCheck = isSafeCode(code);
    if (!safetyCheck.safe) {
      metrics.sandboxEscapes++;
      return fail(res, 'Code non autorisé — patterns dangereux détectés', 403, 'UNSAFE_CODE', {
        violations: safetyCheck.violations,
      });
    }

    const outputRef = { text: '', timers: {} };
    const sandbox = buildSandbox(outputRef, input);

    try {
      const context = vm.createContext(sandbox);
      const script = new vm.Script(code, {
        filename: `exec_${execId}.js`,
        lineOffset: 0,
      });

      const result = script.runInContext(context, { timeout: safeTimeout });
      output = outputRef.text;

      if (result !== undefined && !output) {
        output = typeof result === 'object'
          ? JSON.stringify(result, null, 2)
          : String(result);
      }

      returnValue = result;
    } catch (err) {
      error = err.message;
      success = false;
      output = outputRef.text + (err.message || 'Erreur inconnue');

      if (err.message.includes('timed out')) {
        error = `Timeout dépassé (${safeTimeout}ms)`;
      }
    }
  } else {
    // Autres langages : simulation
    output = `[${language.toUpperCase()}] Simulation — Exécution réelle non disponible dans cet environnement.\n\nCode analysé (${code.length} chars):\n${code.slice(0, 200)}${code.length > 200 ? '...' : ''}`;
    success = true;
  }

  // Tronquer output si trop long
  if (output.length > LIMITS.outputMaxLen) {
    output = output.slice(0, LIMITS.outputMaxLen) + '\n\n[...output tronqué]';
  }

  const duration = Date.now() - startTime;

  const execution = {
    id: execId,
    code,
    language,
    label: sanitize(label || '', 64) || null,
    tags: Array.isArray(tags) ? tags.slice(0, 10).map(t => sanitize(t, 32)) : [],
    snippetId: snippetId || null,
    input,
    output: output || (success ? '✅ Exécution complète (aucune sortie)' : ''),
    returnValue: returnValue !== undefined ? String(returnValue).slice(0, 1000) : null,
    error,
    success,
    duration,
    timeout: safeTimeout,
    safetyCheck: isSafeCode(code),
    timestamp: Date.now(),
    iso: new Date().toISOString(),
  };

  pushLimited(store.executions, execution, LIMITS.executions);

  // Métriques
  metrics.totalExecutions++;
  metrics.totalDurationMs += duration;
  if (success) metrics.successExecutions++;
  else metrics.failedExecutions++;
  metrics.languageCounts[language] = (metrics.languageCounts[language] || 0) + 1;

  ok(res, execution, success ? 200 : 400);
}));

/** GET /lab/executions — Liste des exécutions */
router.get('/lab/executions', rateLimit(60), asyncRoute(async (req, res) => {
  const { page = 1, limit = 20, language, success, tag } = req.query;

  let results = [...store.executions];
  if (language) results = results.filter(e => e.language === language);
  if (success !== undefined) results = results.filter(e => e.success === (success === 'true'));
  if (tag) results = results.filter(e => e.tags?.includes(tag));

  const paged = paginate(results, Number(page), clamp(Number(limit), 1, 100));
  ok(res, paged);
}));

/** GET /lab/executions/:id — Détail d'une exécution */
router.get('/lab/executions/:id', asyncRoute(async (req, res) => {
  const exec = store.executions.find(e => e.id === req.params.id);
  if (!exec) return fail(res, 'Exécution introuvable', 404, 'NOT_FOUND');
  ok(res, { execution: exec });
}));

/** DELETE /lab/executions/:id — Supprimer une exécution */
router.delete('/lab/executions/:id', rateLimit(20), asyncRoute(async (req, res) => {
  const idx = store.executions.findIndex(e => e.id === req.params.id);
  if (idx === -1) return fail(res, 'Exécution introuvable', 404, 'NOT_FOUND');
  const [removed] = store.executions.splice(idx, 1);
  ok(res, { deleted: removed.id });
}));

/** DELETE /lab/executions — Vider l'historique */
router.delete('/lab/executions', rateLimit(5, 60_000), asyncRoute(async (req, res) => {
  const { confirm } = req.body;
  if (confirm !== 'CONFIRM') return fail(res, 'Confirmation requise', 400, 'CONFIRM_REQUIRED');
  const count = store.executions.length;
  store.executions.length = 0;
  ok(res, { cleared: count });
}));

/** POST /lab/executions/:id/replay — Rejouer une exécution */
router.post('/lab/executions/:id/replay', rateLimit(10, 60_000), asyncRoute(async (req, res) => {
  const exec = store.executions.find(e => e.id === req.params.id);
  if (!exec) return fail(res, 'Exécution introuvable', 404, 'NOT_FOUND');

  // Rejouer via la route principale
  req.body = { code: exec.code, language: exec.language, timeout: exec.timeout, label: `replay:${exec.id}` };
  // Déléguer à l'handler d'exécution
  const fakeRes = {
    _data: null,
    status: (s) => ({ json: (d) => { fakeRes._data = d; } }),
    json: (d) => { fakeRes._data = d; },
  };
  ok(res, { replayed: true, original: exec.id, note: 'Utilisez POST /lab/execute avec le même code' });
}));

// ══════════════════════════════════════════════════════════════════════════════
// STATS & MÉTRIQUES
// ══════════════════════════════════════════════════════════════════════════════

/** GET /lab/stats — Statistiques du lab */
router.get('/lab/stats', rateLimit(60), (req, res) => {
  const execs = store.executions;
  const total = execs.length;
  const success = execs.filter(e => e.success).length;
  const totalMs = execs.reduce((s, e) => s + e.duration, 0);

  const byLanguage = {};
  const byDay = {};

  for (const e of execs) {
    byLanguage[e.language] = (byLanguage[e.language] || 0) + 1;
    const day = new Date(e.timestamp).toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }

  const slowest = [...execs].sort((a, b) => b.duration - a.duration).slice(0, 5);
  const fastest = [...execs].sort((a, b) => a.duration - b.duration).slice(0, 5);

  ok(res, {
    counts: {
      snippets: store.snippets.length,
      tasks: store.tasks.length,
      executions: total,
      templates: store.templates.length,
      bookmarks: store.bookmarks.length,
    },
    execution: {
      total,
      success,
      failed: total - success,
      successRate: total > 0 ? Math.round((success / total) * 100) : 100,
      avgDuration: total > 0 ? Math.round(totalMs / total) : 0,
      totalMs,
    },
    byLanguage,
    byDay: Object.entries(byDay).slice(-14),
    slowest: slowest.map(e => ({ id: e.id, duration: e.duration, language: e.language })),
    fastest: fastest.map(e => ({ id: e.id, duration: e.duration, language: e.language })),
    recentExecutions: execs.slice(0, 20),
  });
});

/** GET /lab/metrics — Métriques détaillées */
router.get('/lab/metrics', rateLimit(30), (req, res) => {
  ok(res, {
    ...metrics,
    uptime: Date.now() - metrics.startedAt,
    uptimeHuman: formatUptime(Date.now() - metrics.startedAt),
    successRate: metrics.totalExecutions > 0
      ? Math.round((metrics.successExecutions / metrics.totalExecutions) * 100)
      : 100,
    avgDurationMs: metrics.totalExecutions > 0
      ? Math.round(metrics.totalDurationMs / metrics.totalExecutions)
      : 0,
    storeSize: {
      executions: store.executions.length,
      snippets: store.snippets.length,
      tasks: store.tasks.length,
      templates: store.templates.length,
    },
    limits: LIMITS,
    version: VERSION,
  });
});

/** GET /lab/health — Santé du lab */
router.get('/lab/health', (req, res) => {
  const errorRate = metrics.totalExecutions > 0
    ? metrics.failedExecutions / metrics.totalExecutions
    : 0;

  const healthy = errorRate < 0.5 && metrics.sandboxEscapes < 10;

  ok(res, {
    healthy,
    status: healthy ? 'OK' : 'DEGRADED',
    errorRate: Math.round(errorRate * 100),
    sandboxEscapes: metrics.sandboxEscapes,
    rateLimitBlocks: metrics.rateLimitBlocks,
    uptime: formatUptime(Date.now() - metrics.startedAt),
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SNIPPETS
// ══════════════════════════════════════════════════════════════════════════════

/** GET /snippets — Lister les snippets */
router.get('/snippets', rateLimit(60), (req, res) => {
  const { language, tag, q, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;

  let results = [...store.snippets];

  if (language) results = results.filter(s => s.language === language);
  if (tag) results = results.filter(s => s.tags.includes(tag));
  if (q) {
    const query = q.toLowerCase();
    results = results.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.code.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query)
    );
  }

  // Tri
  results.sort((a, b) => {
    const va = a[sortBy] || '';
    const vb = b[sortBy] || '';
    return order === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const paged = paginate(results, Number(page), clamp(Number(limit), 1, 100));
  ok(res, { ...paged, languages: VALID_LANGUAGES });
});

/** GET /snippets/:id — Détail snippet */
router.get('/snippets/:id', asyncRoute(async (req, res) => {
  const snippet = store.snippets.find(s => s.id === req.params.id);
  if (!snippet) return fail(res, 'Snippet introuvable', 404, 'NOT_FOUND');
  // Incrémenter vues
  snippet.views = (snippet.views || 0) + 1;
  ok(res, { snippet });
}));

/** POST /snippets — Créer un snippet */
router.post('/snippets', rateLimit(20), asyncRoute(async (req, res) => {
  const { title, code, language = 'javascript', tags, description, isPublic = true, templateId } = req.body;

  if (!code || typeof code !== 'string') return fail(res, 'Code requis', 400, 'MISSING_CODE');
  if (code.length > LIMITS.codeMaxLen) return fail(res, 'Code trop long', 400, 'CODE_TOO_LONG');
  if (!VALID_LANGUAGES.includes(language)) return fail(res, 'Langage invalide', 400, 'INVALID_LANGUAGE');

  const snippet = {
    id: nextId('snp'),
    title: sanitize(title || 'Untitled', 128),
    code,
    language,
    description: sanitize(description || '', 512),
    tags: Array.isArray(tags) ? tags.slice(0, 10).map(t => sanitize(t, 32)) : [],
    isPublic,
    templateId: templateId || null,
    views: 0,
    execCount: 0,
    forkCount: 0,
    forkedFrom: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  pushLimited(store.snippets, snippet, LIMITS.snippets);
  metrics.snippetCreations++;
  ok(res, { snippet }, 201);
}));

/** PUT /snippets/:id — Mettre à jour un snippet */
router.put('/snippets/:id', rateLimit(20), asyncRoute(async (req, res) => {
  const snippet = store.snippets.find(s => s.id === req.params.id);
  if (!snippet) return fail(res, 'Snippet introuvable', 404, 'NOT_FOUND');

  const { title, code, language, tags, description, isPublic } = req.body;

  if (code !== undefined) {
    if (typeof code !== 'string' || code.length > LIMITS.codeMaxLen) {
      return fail(res, 'Code invalide', 400, 'INVALID_CODE');
    }
    snippet.code = code;
    // Historique des versions
    if (!snippet.history) snippet.history = [];
    snippet.history.unshift({
      code: snippet.code,
      updatedAt: snippet.updatedAt,
    });
    if (snippet.history.length > 10) snippet.history.length = 10;
  }

  if (title) snippet.title = sanitize(title, 128);
  if (language && VALID_LANGUAGES.includes(language)) snippet.language = language;
  if (tags) snippet.tags = Array.isArray(tags) ? tags.slice(0, 10).map(t => sanitize(t, 32)) : snippet.tags;
  if (description !== undefined) snippet.description = sanitize(description, 512);
  if (isPublic !== undefined) snippet.isPublic = Boolean(isPublic);

  snippet.updatedAt = new Date().toISOString();
  ok(res, { snippet });
}));

/** DELETE /snippets/:id — Supprimer un snippet */
router.delete('/snippets/:id', rateLimit(20), asyncRoute(async (req, res) => {
  const idx = store.snippets.findIndex(s => s.id === req.params.id);
  if (idx === -1) return fail(res, 'Snippet introuvable', 404, 'NOT_FOUND');
  const [removed] = store.snippets.splice(idx, 1);
  ok(res, { deleted: removed.id });
}));

/** POST /snippets/:id/fork — Forker un snippet */
router.post('/snippets/:id/fork', rateLimit(10), asyncRoute(async (req, res) => {
  const source = store.snippets.find(s => s.id === req.params.id);
  if (!source) return fail(res, 'Snippet introuvable', 404, 'NOT_FOUND');

  const fork = {
    ...source,
    id: nextId('snp'),
    title: `Fork: ${source.title}`,
    forkedFrom: source.id,
    forkCount: 0,
    views: 0,
    execCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  source.forkCount = (source.forkCount || 0) + 1;
  pushLimited(store.snippets, fork, LIMITS.snippets);
  ok(res, { snippet: fork }, 201);
}));

/** POST /snippets/:id/execute — Exécuter un snippet directement */
router.post('/snippets/:id/execute', rateLimit(10, 60_000), asyncRoute(async (req, res) => {
  const snippet = store.snippets.find(s => s.id === req.params.id);
  if (!snippet) return fail(res, 'Snippet introuvable', 404, 'NOT_FOUND');
  if (snippet.language !== 'javascript') {
    return fail(res, `Exécution non disponible pour ${snippet.language}`, 400, 'UNSUPPORTED_EXECUTION');
  }

  snippet.execCount = (snippet.execCount || 0) + 1;

  // Déléguer à la logique d'exécution
  req.body = {
    code: snippet.code,
    language: snippet.language,
    snippetId: snippet.id,
    label: `snippet:${snippet.id}`,
    input: req.body.input || {},
  };

  // Réutiliser la logique — appel interne
  const safetyCheck = isSafeCode(snippet.code);
  if (!safetyCheck.safe) return fail(res, 'Code non autorisé', 403, 'UNSAFE_CODE');

  const outputRef = { text: '', timers: {} };
  const context = vm.createContext(buildSandbox(outputRef, req.body.input));
  const startTime = Date.now();
  let error = null, success = true;

  try {
    vm.runInContext(snippet.code, context, { timeout: 5000 });
  } catch (err) {
    error = err.message;
    success = false;
  }

  const result = {
    id: nextId('exec'),
    snippetId: snippet.id,
    output: outputRef.text || (success ? '✅ Exécution complète' : ''),
    error,
    success,
    duration: Date.now() - startTime,
    timestamp: Date.now(),
  };

  pushLimited(store.executions, result, LIMITS.executions);
  metrics.totalExecutions++;
  if (success) metrics.successExecutions++;
  else metrics.failedExecutions++;

  ok(res, result);
}));

/** GET /snippets/tags — Tous les tags disponibles */
router.get('/snippets/tags', (req, res) => {
  const tagCount = {};
  for (const s of store.snippets) {
    for (const t of s.tags) {
      tagCount[t] = (tagCount[t] || 0) + 1;
    }
  }
  const tags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  ok(res, { tags });
});

// ══════════════════════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════════════════════

/** GET /tasks — Lister les tâches */
router.get('/tasks', rateLimit(60), (req, res) => {
  const { agent, status, priority, type, q, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;

  let results = [...store.tasks];

  if (agent && agent !== 'all') results = results.filter(t => t.agentId === agent);
  if (status && status !== 'all') results = results.filter(t => t.status === status);
  if (priority && priority !== 'all') results = results.filter(t => t.priority === priority);
  if (type && type !== 'all') results = results.filter(t => t.type === type);
  if (q) {
    const query = q.toLowerCase();
    results = results.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.mission.toLowerCase().includes(query) ||
      t.agentId.toLowerCase().includes(query)
    );
  }

  results.sort((a, b) => {
    const va = a[sortBy] || '';
    const vb = b[sortBy] || '';
    return order === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const paged = paginate(results, Number(page), clamp(Number(limit), 1, 100));
  ok(res, {
    ...paged,
    filters: { agents: [...new Set(store.tasks.map(t => t.agentId))], statuses: VALID_STATUSES, priorities: VALID_PRIORITIES },
  });
});

/** GET /tasks/:id — Détail tâche */
router.get('/tasks/:id', asyncRoute(async (req, res) => {
  const task = store.tasks.find(t => t.id === req.params.id);
  if (!task) return fail(res, 'Tâche introuvable', 404, 'NOT_FOUND');
  ok(res, { task });
}));

/** POST /tasks — Créer une tâche */
router.post('/tasks', rateLimit(30), asyncRoute(async (req, res) => {
  const {
    agentId, agentName, title, mission, priority = 'normal',
    context, input, expectedOutput, rules, dependencies,
    type, tags, snippetId, dueAt, estimatedMs,
  } = req.body;

  if (!agentId || typeof agentId !== 'string') return fail(res, 'agentId requis', 400, 'MISSING_AGENT');
  if (!mission || typeof mission !== 'string') return fail(res, 'mission requise', 400, 'MISSING_MISSION');
  if (!VALID_PRIORITIES.includes(priority)) return fail(res, 'Priorité invalide', 400, 'INVALID_PRIORITY');
  if (type && !VALID_TASK_TYPES.includes(type)) return fail(res, 'Type invalide', 400, 'INVALID_TYPE');

  const task = {
    id: nextId('task'),
    agentId: sanitize(agentId, 64),
    agentName: sanitize(agentName || (agentId.charAt(0).toUpperCase() + agentId.slice(1)), 64),
    title: sanitize(title || 'Untitled Task', 128),
    mission: sanitize(mission, 2000),
    priority,
    type: type || 'forge',
    status: 'pending',
    context: sanitize(context || '', 1000),
    input: input || {},
    expectedOutput: sanitize(expectedOutput || '', 500),
    rules: Array.isArray(rules) ? rules.slice(0, 20).map(r => sanitize(r, 256)) : [],
    dependencies: Array.isArray(dependencies) ? dependencies : [],
    tags: Array.isArray(tags) ? tags.slice(0, 10).map(t => sanitize(t, 32)) : [],
    snippetId: snippetId || null,
    dueAt: dueAt ? Number(dueAt) : null,
    estimatedMs: estimatedMs ? Number(estimatedMs) : null,
    progress: 0,
    attempts: 0,
    result: null,
    error: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  pushLimited(store.tasks, task, LIMITS.tasks);
  ok(res, { task }, 201);
}));

/** PATCH /tasks/:id — Mettre à jour une tâche */
router.patch('/tasks/:id', rateLimit(30), asyncRoute(async (req, res) => {
  const task = store.tasks.find(t => t.id === req.params.id);
  if (!task) return fail(res, 'Tâche introuvable', 404, 'NOT_FOUND');

  const { status, priority, progress, result, error, ...rest } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return fail(res, `Statut invalide: ${status}`, 400, 'INVALID_STATUS');
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return fail(res, `Priorité invalide: ${priority}`, 400, 'INVALID_PRIORITY');
  }

  // Transitions d'état
  if (status) {
    if (status === 'running' && !task.startedAt) task.startedAt = new Date().toISOString();
    if (status === 'completed' && !task.completedAt) {
      task.completedAt = new Date().toISOString();
      metrics.taskCompletions++;
    }
    task.status = status;
  }
  if (priority !== undefined) task.priority = priority;
  if (progress !== undefined) task.progress = clamp(progress, 0, 100);
  if (result !== undefined) task.result = result;
  if (error !== undefined) task.error = sanitize(error, 512);

  // Champs autorisés à mettre à jour librement
  const allowedFields = ['title', 'mission', 'context', 'input', 'expectedOutput', 'rules', 'tags', 'dueAt', 'estimatedMs'];
  for (const field of allowedFields) {
    if (rest[field] !== undefined) task[field] = rest[field];
  }

  task.updatedAt = new Date().toISOString();
  ok(res, { task });
}));

/** DELETE /tasks/:id — Supprimer une tâche */
router.delete('/tasks/:id', rateLimit(20), asyncRoute(async (req, res) => {
  const idx = store.tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return fail(res, 'Tâche introuvable', 404, 'NOT_FOUND');
  const [removed] = store.tasks.splice(idx, 1);
  ok(res, { deleted: removed.id });
}));

/** POST /tasks/:id/run — Démarrer une tâche */
router.post('/tasks/:id/run', rateLimit(10, 60_000), asyncRoute(async (req, res) => {
  const task = store.tasks.find(t => t.id === req.params.id);
  if (!task) return fail(res, 'Tâche introuvable', 404, 'NOT_FOUND');
  if (task.status === 'running') return fail(res, 'Tâche déjà en cours', 409, 'ALREADY_RUNNING');

  task.status = 'running';
  task.startedAt = new Date().toISOString();
  task.attempts = (task.attempts || 0) + 1;
  task.updatedAt = new Date().toISOString();

  ok(res, { task, message: 'Tâche démarrée' });
}));

/** POST /tasks/:id/cancel — Annuler une tâche */
router.post('/tasks/:id/cancel', rateLimit(20), asyncRoute(async (req, res) => {
  const task = store.tasks.find(t => t.id === req.params.id);
  if (!task) return fail(res, 'Tâche introuvable', 404, 'NOT_FOUND');

  task.status = 'cancelled';
  task.updatedAt = new Date().toISOString();
  ok(res, { task });
}));

/** POST /tasks/:id/clone — Cloner une tâche */
router.post('/tasks/:id/clone', rateLimit(10), asyncRoute(async (req, res) => {
  const source = store.tasks.find(t => t.id === req.params.id);
  if (!source) return fail(res, 'Tâche introuvable', 404, 'NOT_FOUND');

  const clone = {
    ...source,
    id: nextId('task'),
    title: `Clone: ${source.title}`,
    status: 'pending',
    progress: 0,
    attempts: 0,
    result: null,
    error: null,
    startedAt: null,
    completedAt: null,
    clonedFrom: source.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  pushLimited(store.tasks, clone, LIMITS.tasks);
  ok(res, { task: clone }, 201);
}));

/** POST /tasks/bulk — Créer plusieurs tâches */
router.post('/tasks/bulk', rateLimit(5, 60_000), asyncRoute(async (req, res) => {
  const { tasks: taskList } = req.body;
  if (!Array.isArray(taskList) || taskList.length === 0) {
    return fail(res, 'tasks[] requis', 400, 'MISSING_TASKS');
  }
  if (taskList.length > 50) {
    return fail(res, 'Maximum 50 tâches à la fois', 400, 'TOO_MANY_TASKS');
  }

  const created = [];
  const errors = [];

  for (let i = 0; i < taskList.length; i++) {
    const t = taskList[i];
    if (!t.agentId || !t.mission) {
      errors.push({ index: i, error: 'agentId et mission requis' });
      continue;
    }
    const task = {
      id: nextId('task'),
      agentId: sanitize(t.agentId, 64),
      agentName: sanitize(t.agentName || t.agentId, 64),
      title: sanitize(t.title || 'Bulk Task', 128),
      mission: sanitize(t.mission, 2000),
      priority: VALID_PRIORITIES.includes(t.priority) ? t.priority : 'normal',
      type: VALID_TASK_TYPES.includes(t.type) ? t.type : 'forge',
      status: 'pending',
      context: sanitize(t.context || '', 1000),
      input: t.input || {},
      expectedOutput: sanitize(t.expectedOutput || '', 500),
      rules: Array.isArray(t.rules) ? t.rules.slice(0, 20) : [],
      dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
      tags: Array.isArray(t.tags) ? t.tags.slice(0, 10) : [],
      progress: 0, attempts: 0, result: null, error: null,
      startedAt: null, completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    pushLimited(store.tasks, task, LIMITS.tasks);
    created.push(task);
  }

  ok(res, { created, errors, count: created.length }, 201);
}));

/** GET /tasks/stats — Statistiques des tâches */
router.get('/tasks/stats', rateLimit(30), (req, res) => {
  const byStatus = {};
  const byAgent = {};
  const byPriority = {};
  const byType = {};

  for (const t of store.tasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byAgent[t.agentId] = (byAgent[t.agentId] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    if (t.type) byType[t.type] = (byType[t.type] || 0) + 1;
  }

  const completed = store.tasks.filter(t => t.status === 'completed');
  const avgMs = completed.length > 0
    ? Math.round(completed.reduce((s, t) => {
      if (t.startedAt && t.completedAt) {
        return s + (new Date(t.completedAt) - new Date(t.startedAt));
      }
      return s;
    }, 0) / completed.length)
    : 0;

  ok(res, {
    total: store.tasks.length,
    byStatus,
    byAgent,
    byPriority,
    byType,
    avgCompletionMs: avgMs,
    completionRate: store.tasks.length > 0
      ? Math.round(((byStatus.completed || 0) / store.tasks.length) * 100)
      : 0,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

/** GET /templates — Lister les templates */
router.get('/templates', rateLimit(60), (req, res) => {
  const { language, type } = req.query;
  let results = [...store.templates];
  if (language) results = results.filter(t => t.language === language);
  if (type) results = results.filter(t => t.type === type);
  ok(res, { templates: results, count: results.length });
});

/** GET /templates/:id — Détail template */
router.get('/templates/:id', asyncRoute(async (req, res) => {
  const tpl = store.templates.find(t => t.id === req.params.id);
  if (!tpl) return fail(res, 'Template introuvable', 404, 'NOT_FOUND');
  ok(res, { template: tpl });
}));

/** POST /templates — Créer un template */
router.post('/templates', rateLimit(10), asyncRoute(async (req, res) => {
  const { name, description, code, language, type, variables, tags } = req.body;

  if (!name || !code) return fail(res, 'name et code requis', 400, 'MISSING_FIELDS');
  if (!VALID_LANGUAGES.includes(language || 'javascript')) {
    return fail(res, 'Langage invalide', 400, 'INVALID_LANGUAGE');
  }

  const template = {
    id: nextId('tpl'),
    name: sanitize(name, 128),
    description: sanitize(description || '', 512),
    code,
    language: language || 'javascript',
    type: type || 'snippet',
    variables: Array.isArray(variables) ? variables : [],
    tags: Array.isArray(tags) ? tags.slice(0, 10).map(t => sanitize(t, 32)) : [],
    useCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  pushLimited(store.templates, template, LIMITS.templates);
  ok(res, { template }, 201);
}));

/** PUT /templates/:id — Mettre à jour un template */
router.put('/templates/:id', rateLimit(10), asyncRoute(async (req, res) => {
  const tpl = store.templates.find(t => t.id === req.params.id);
  if (!tpl) return fail(res, 'Template introuvable', 404, 'NOT_FOUND');

  const { name, description, code, language, variables, tags } = req.body;
  if (name) tpl.name = sanitize(name, 128);
  if (description !== undefined) tpl.description = sanitize(description, 512);
  if (code) tpl.code = code;
  if (language && VALID_LANGUAGES.includes(language)) tpl.language = language;
  if (variables) tpl.variables = variables;
  if (tags) tpl.tags = tags.slice(0, 10).map(t => sanitize(t, 32));
  tpl.updatedAt = new Date().toISOString();

  ok(res, { template: tpl });
}));

/** DELETE /templates/:id — Supprimer un template */
router.delete('/templates/:id', rateLimit(10), asyncRoute(async (req, res) => {
  const idx = store.templates.findIndex(t => t.id === req.params.id);
  if (idx === -1) return fail(res, 'Template introuvable', 404, 'NOT_FOUND');
  const [removed] = store.templates.splice(idx, 1);
  ok(res, { deleted: removed.id });
}));

/** POST /templates/:id/apply — Appliquer un template → créer snippet */
router.post('/templates/:id/apply', rateLimit(10), asyncRoute(async (req, res) => {
  const tpl = store.templates.find(t => t.id === req.params.id);
  if (!tpl) return fail(res, 'Template introuvable', 404, 'NOT_FOUND');

  const { values = {}, title } = req.body;

  // Remplacer les variables dans le code
  let code = tpl.code;
  for (const [key, val] of Object.entries(values)) {
    code = code.replaceAll(`{{${key}}}`, String(val));
  }

  const snippet = {
    id: nextId('snp'),
    title: sanitize(title || `${tpl.name} — Applied`, 128),
    code,
    language: tpl.language,
    description: `Généré depuis template: ${tpl.name}`,
    tags: [...tpl.tags, `template:${tpl.id}`],
    templateId: tpl.id,
    views: 0, execCount: 0, forkCount: 0, forkedFrom: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tpl.useCount = (tpl.useCount || 0) + 1;
  pushLimited(store.snippets, snippet, LIMITS.snippets);
  ok(res, { snippet, template: tpl.id }, 201);
}));

// ══════════════════════════════════════════════════════════════════════════════
// BOOKMARKS
// ══════════════════════════════════════════════════════════════════════════════

/** GET /bookmarks — Lister les bookmarks */
router.get('/bookmarks', rateLimit(60), (req, res) => {
  ok(res, { bookmarks: store.bookmarks, count: store.bookmarks.length });
});

/** POST /bookmarks — Créer un bookmark */
router.post('/bookmarks', rateLimit(20), asyncRoute(async (req, res) => {
  const { targetId, targetType, label, note } = req.body;

  if (!targetId || !targetType) return fail(res, 'targetId et targetType requis', 400, 'MISSING_FIELDS');
  if (!['snippet', 'task', 'execution', 'template'].includes(targetType)) {
    return fail(res, 'targetType invalide', 400, 'INVALID_TYPE');
  }

  // Vérifier que la cible existe
  const storeKey = `${targetType}s`;
  const exists = store[storeKey]?.find(i => i.id === targetId);
  if (!exists) return fail(res, `${targetType} introuvable`, 404, 'NOT_FOUND');

  // Éviter les doublons
  if (store.bookmarks.some(b => b.targetId === targetId)) {
    return fail(res, 'Déjà en favoris', 409, 'ALREADY_BOOKMARKED');
  }

  const bookmark = {
    id: nextId('bkm'),
    targetId,
    targetType,
    label: sanitize(label || exists.title || exists.id, 128),
    note: sanitize(note || '', 256),
    createdAt: new Date().toISOString(),
  };

  pushLimited(store.bookmarks, bookmark, 200);
  ok(res, { bookmark }, 201);
}));

/** DELETE /bookmarks/:id — Supprimer un bookmark */
router.delete('/bookmarks/:id', rateLimit(20), asyncRoute(async (req, res) => {
  const idx = store.bookmarks.findIndex(b => b.id === req.params.id);
  if (idx === -1) return fail(res, 'Bookmark introuvable', 404, 'NOT_FOUND');
  const [removed] = store.bookmarks.splice(idx, 1);
  ok(res, { deleted: removed.id });
}));

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT GLOBAL
// ══════════════════════════════════════════════════════════════════════════════

/** GET /lab/export — Exporter tout le store */
router.get('/lab/export', rateLimit(3, 60_000), (req, res) => {
  ok(res, {
    export: {
      version: VERSION,
      exportedAt: new Date().toISOString(),
      store: {
        executions: store.executions.length,
        snippets: store.snippets.length,
        tasks: store.tasks.length,
        templates: store.templates.length,
        bookmarks: store.bookmarks.length,
      },
      data: store,
    },
  });
});

/** POST /lab/import — Importer des données */
router.post('/lab/import', rateLimit(2, 60_000), asyncRoute(async (req, res) => {
  const { data, confirm } = req.body;
  if (confirm !== 'CONFIRM_IMPORT') return fail(res, 'Confirmation requise', 400, 'CONFIRM_REQUIRED');
  if (!data) return fail(res, 'Données manquantes', 400, 'MISSING_DATA');

  const counts = {};
  for (const [key, arr] of Object.entries(data)) {
    if (store[key] && Array.isArray(arr)) {
      store[key].push(...arr.slice(0, LIMITS[key] || 100));
      counts[key] = arr.length;
    }
  }

  ok(res, { imported: true, counts });
}));

// ── 404 ──────────────────────────────────────────────────────────────────────
router.use((req, res) => {
  fail(res, `Route lab introuvable: ${req.method} ${req.path}`, 404, 'NOT_FOUND');
});

export default router;