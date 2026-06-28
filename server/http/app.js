import express from 'express';
import { existsSync } from 'node:fs';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../shared/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ kernel }) {
  const app = express();

  // ── Middlewares ────────────────────────────────────────────────────────────
  app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'] }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Servir le frontend React/Three.js ─────────────────────────────────────
  const publicDir = path.join(__dirname, '../../dist');
  const publicFallback = path.join(__dirname, '../../public');
  app.use(express.static(publicDir));
  app.use(express.static(publicFallback));

  // ── API Health ─────────────────────────────────────────────────────────────
  app.get('/api/health', (req, res) => {
    const stats = kernel.brain?.getStats() || {};
    res.json({
      status: 'OK',
      server: 'TroxT EtherWorld v4.0.0',
      brain: stats,
      uptime: process.uptime(),
      ts: new Date().toISOString(),
    });
  });

  // ── API Brain Execute ──────────────────────────────────────────────────────
  app.post('/api/brain/execute', async (req, res) => {
    try {
      const { intent, context } = req.body;
      if (!intent) return res.status(400).json({ error: 'intent manquant' });
      if (!kernel.brain) return res.status(503).json({ error: 'Brain non disponible' });

      const result = await kernel.brain.process({ intent, context: context || { source: 'api' } });
      res.json({ success: true, result });
    } catch (err) {
      logger.error('API', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── API Brain Stats ────────────────────────────────────────────────────────
  app.get('/api/brain/stats', (req, res) => {
    res.json(kernel.brain?.getStats() || { error: 'Brain non disponible' });
  });

  // ── API World — Joueurs ────────────────────────────────────────────────────
  app.get('/api/world/players', (req, res) => {
    const players = kernel.memory.get('players');
    res.json({ players: players ? Array.from(players.values()) : [], count: players?.size || 0 });
  });

  // ── API World — Jobs ──────────────────────────────────────────────────────
  app.get('/api/world/jobs', (req, res) => {
    res.json({ jobs: kernel.memory.get('jobs') || [] });
  });

  // ── API World — Factions ──────────────────────────────────────────────────
  app.get('/api/world/factions', (req, res) => {
    res.json({ factions: kernel.memory.get('factions') || [] });
  });

  // ── API World — Items ─────────────────────────────────────────────────────
  app.get('/api/world/items', (req, res) => {
    res.json({ items: kernel.memory.get('items') || [] });
  });

  // ── API World — Properties ────────────────────────────────────────────────
  app.get('/api/world/properties', (req, res) => {
    const properties = kernel.memory.get('properties');
    res.json({ properties: properties ? Array.from(properties.values()) : [] });
  });

  // ── API World — Vehicles ──────────────────────────────────────────────────
  app.get('/api/world/vehicles', (req, res) => {
    const vehicles = kernel.memory.get('vehicles');
    res.json({ vehicles: vehicles ? Array.from(vehicles.values()) : [] });
  });

  // ── API World — State (meteo, heure) ──────────────────────────────────────
  app.get('/api/world/state', (req, res) => {
    res.json(kernel.memory.get('worldState') || {});
  });

  // ── API Schema — Ether-Prism ───────────────────────────────────────────────
  app.get('/api/world/schema', (req, res) => {
    res.json({ schemas: kernel.memory.get('rpSchemas') || [] });
  });

  app.post('/api/world/schema', async (req, res) => {
    try {
      const { type, data } = req.body;
      const schemas = kernel.memory.get('rpSchemas') || [];
      const schema = { id: 'schema_' + Date.now(), type, data, createdAt: Date.now() };
      schemas.push(schema);
      kernel.memory.set('rpSchemas', schemas);
      await kernel.bus.emit('schema.created', schema);
      res.json({ success: true, schema });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── API Admin Command ─────────────────────────────────────────────────────
  app.post('/api/admin/command', async (req, res) => {
    try {
      const { command, args, adminId } = req.body;
      logger.info('Admin', `Commande "${command}" par ${adminId}`);
      const result = await kernel.brain?.process({ intent: command, context: { source: 'admin', adminId, args } });
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Fallback SPA ──────────────────────────────────────────────────────────
  app.get('*', (req, res) => {
    const indexDist = path.join(__dirname, '../../dist/index.html');
    const indexPublic = path.join(__dirname, '../../public/index.html');
    if (existsSync(indexDist)) {
      res.sendFile(indexDist);
    } else if (existsSync(indexPublic)) {
      res.sendFile(indexPublic);
    } else {
      res.status(200).send('TroxT EtherWorld API — Lance: npm run dev');
    }
  });

  return app;
}

