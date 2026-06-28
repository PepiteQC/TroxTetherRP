/**
 * config/index.ts
 * ============================================================
 * Loader central de configuration — EtherWorld Platform Tester 3D
 *
 * Combine:
 *  - .env          → secrets / valeurs qui changent par environnement
 *  - settings.json → config structurée, versionnable, partagée par l'équipe
 *
 * Valide tout au démarrage et plante avec un message clair (via EtherAudit)
 * plutôt que de laisser un serveur mal configuré rouler silencieusement.
 *
 * Usage:
 *   import { config } from './config/index.js'
 *   console.log(config.server.port)
 */

import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Types ────────────────────────────────────────────────────

interface SettingsFile {
  server: {
    name: string
    version: string
    tickRate: number
    maxEntities: number
    sandbox: boolean
  }
  world: {
    gravity: { x: number; y: number; z: number }
    bounds: { min: [number, number, number]; max: [number, number, number] }
    defaultSpawn: { x: number; y: number; z: number }
    autosaveIntervalMs: number
    worldFile: string
  }
  physics: {
    engine: string
    solverIterations: number
    broadphase: 'Naive' | 'SAP' | 'Grid'
    allowSleep: boolean
    defaultFriction: number
    defaultRestitution: number
  }
  limits: {
    maxPropsPerPlayer: number
    maxPropMass: number
    maxRopeLength: number
    maxWeldsPerProp: number
  }
  websocket: {
    path: string
    heartbeatIntervalMs: number
    maxConnections: number
    compression: boolean
  }
  logging: {
    label: string
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error'
    toFile: boolean
    dir: string
    rotateDaily: boolean
    maxFileSizeMb: number
  }
  features: Record<string, boolean>
  categories: { id: string; label: string; icon: string }[]
}

export interface EtherConfig {
  env: 'development' | 'staging' | 'production'
  host: string
  port: number
  sandbox: boolean
  admin: {
    token: string
    sessionSecret: string
  }
  cors: { origin: string }
  data: {
    dir: string
    worldFile: string
  }
  server: SettingsFile['server']
  world: SettingsFile['world']
  physics: SettingsFile['physics']
  limits: SettingsFile['limits']
  websocket: SettingsFile['websocket']
  logging: SettingsFile['logging']
  features: SettingsFile['features']
  categories: SettingsFile['categories']
}

// ── Helpers de lecture ENV ──────────────────────────────────

class ConfigError extends Error {
  constructor(message: string) {
    super(`[EtherAudit] Erreur de configuration: ${message}`)
    this.name = 'ConfigError'
  }
}

function readEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback
  if (val === undefined) {
    throw new ConfigError(`Variable d'environnement manquante: ${key} (vérifie ton .env)`)
  }
  return val
}

function readEnvInt(key: string, fallback?: number): number {
  const raw = process.env[key]
  if (raw === undefined) {
    if (fallback === undefined) {
      throw new ConfigError(`Variable d'environnement manquante: ${key}`)
    }
    return fallback
  }
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) {
    throw new ConfigError(`Variable d'environnement invalide (entier attendu): ${key}="${raw}"`)
  }
  return n
}

function readEnvBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key]
  if (raw === undefined) return fallback
  return raw.toLowerCase() === 'true' || raw === '1'
}

// ── Chargement settings.json ────────────────────────────────

function loadSettingsFile(): SettingsFile {
  const settingsPath = resolve(__dirname, '../settings.json')
  let raw: string
  try {
    raw = readFileSync(settingsPath, 'utf-8')
  } catch {
    throw new ConfigError(`Impossible de lire settings.json à ${settingsPath}`)
  }

  let parsed: SettingsFile
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new ConfigError(`settings.json n'est pas un JSON valide: ${(e as Error).message}`)
  }

  validateSettings(parsed)
  return parsed
}

// ── Validation manuelle (pas de dépendance externe requise) ──

function validateSettings(s: Partial<SettingsFile>): asserts s is SettingsFile {
  const required: (keyof SettingsFile)[] = [
    'server', 'world', 'physics', 'limits', 'websocket', 'logging', 'features',
  ]
  for (const key of required) {
    if (!s[key]) {
      throw new ConfigError(`settings.json: section "${key}" manquante`)
    }
  }

  if (s.server!.tickRate < 1 || s.server!.tickRate > 128) {
    throw new ConfigError(`server.tickRate doit être entre 1 et 128 (reçu: ${s.server!.tickRate})`)
  }

  if (!['Naive', 'SAP', 'Grid'].includes(s.physics!.broadphase)) {
    throw new ConfigError(`physics.broadphase invalide: "${s.physics!.broadphase}"`)
  }

  if (!['trace', 'debug', 'info', 'warn', 'error'].includes(s.logging!.level)) {
    throw new ConfigError(`logging.level invalide: "${s.logging!.level}"`)
  }

  const [minB, maxB] = [s.world!.bounds.min, s.world!.bounds.max]
  if (minB.some((v, i) => v >= maxB[i])) {
    throw new ConfigError(`world.bounds invalide: min doit être < max sur chaque axe`)
  }
}

// ── Build final ──────────────────────────────────────────────

function buildConfig(): EtherConfig {
  const settings = loadSettingsFile()

  const env = readEnv('NODE_ENV', 'development') as EtherConfig['env']
  if (!['development', 'staging', 'production'].includes(env)) {
    throw new ConfigError(`NODE_ENV invalide: "${env}" (attendu: development | staging | production)`)
  }

  const sandbox = readEnvBool('SANDBOX', settings.server.sandbox)
  const adminToken = readEnv('ADMIN_TOKEN', 'change-moi-en-production')

  if (env === 'production' && adminToken === 'change-moi-en-production') {
    throw new ConfigError(
      `ADMIN_TOKEN n'a pas été changé pour la production! Définis une vraie valeur secrète dans .env`
    )
  }

  return {
    env,
    host: readEnv('HOST', '0.0.0.0'),
    port: readEnvInt('PORT', 3001),
    sandbox,
    admin: {
      token: adminToken,
      sessionSecret: readEnv('SESSION_SECRET', 'change-moi-aussi-stp'),
    },
    cors: {
      origin: readEnv('CORS_ORIGIN', 'http://localhost:5173'),
    },
    data: {
      dir: readEnv('DATA_DIR', './data'),
      worldFile: readEnv('WORLD_FILE', settings.world.worldFile),
    },
    server: settings.server,
    world: settings.world,
    physics: settings.physics,
    limits: settings.limits,
    websocket: {
      ...settings.websocket,
      path: readEnv('WS_PATH', settings.websocket.path),
      heartbeatIntervalMs: readEnvInt('WS_HEARTBEAT_INTERVAL_MS', settings.websocket.heartbeatIntervalMs),
      maxConnections: readEnvInt('WS_MAX_CONNECTIONS', settings.websocket.maxConnections),
    },
    logging: {
      ...settings.logging,
      level: (readEnv('LOG_LEVEL', settings.logging.level) as SettingsFile['logging']['level']),
      toFile: readEnvBool('LOG_TO_FILE', settings.logging.toFile),
      dir: readEnv('LOG_DIR', settings.logging.dir),
    },
    features: settings.features,
    categories: settings.categories,
  }
}

// ── Export singleton ─────────────────────────────────────────

let _config: EtherConfig | null = null

export function getConfig(): EtherConfig {
  if (!_config) {
    _config = buildConfig()
  }
  return _config
}

export const config = getConfig()
