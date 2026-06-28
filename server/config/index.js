// C:\troxtetherworld\server\config\index.js
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000'),
  host: process.env.HOST || '0.0.0.0',

  // Base de données
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'troxt',
    password: process.env.DB_PASSWORD || 'troxt_pass',
    name: process.env.DB_NAME || 'troxt_etherworld',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '20')
    }
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0')
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'troxt-etherworld-super-secret-key-2026',
    expiresIn: process.env.JWT_EXPIRES || '24h',
    refreshExpiresIn: '7d'
  },

  // Admin
  admin: {
    apiKey: process.env.ADMIN_API_KEY || 'troxt-admin-key',
    apiUrl: process.env.ADMIN_API_URL || 'http://localhost:4000/admin',
    dashboardPath: '/admin/dashboard',
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  },

  // Sécurité
  security: {
    bcryptRounds: 12,
    rateLimitWindow: 15 * 60 * 1000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '200'),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  },

  // Jeu
  game: {
    tickRate: parseInt(process.env.TICK_RATE || '20'), // ticks/sec
    autoSaveInterval: 15000, // 15 secondes
    maxPlayers: parseInt(process.env.MAX_PLAYERS || '200'),
    worldName: process.env.WORLD_NAME || 'TroxT EtherWorld'
  },

  // Paths
  paths: {
    root: resolve(__dirname, '..'),
    server: resolve(__dirname, '..'),
    client: resolve(__dirname, '../../client'),
    admin: resolve(__dirname, '../admin'),
    uploads: resolve(__dirname, '../admin/storage'),
    logs: resolve(__dirname, '../logs')
  }
};

export default config;