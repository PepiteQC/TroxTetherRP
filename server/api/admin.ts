// EtherWorld RP — Port-Éther
// Route API — administration

import { Router } from 'express';
import { JsonDatabase } from '../db/JsonDatabase';

export function adminRouter(db: JsonDatabase): Router {
  const router = Router();

  router.get('/players', (_req, res) => {
    res.json(db.getAllPlayers());
  });

  router.get('/vehicles', (_req, res) => {
    res.json(db.getAllVehicles());
  });

  router.get('/properties', (_req, res) => {
    res.json(db.getAllProperties());
  });

  router.get('/transactions', (_req, res) => {
    res.json(db.getRecentTransactions(200));
  });

  router.get('/logs', (_req, res) => {
    res.json(db.getLogs(200));
  });

  router.delete('/vehicle/:id', (req, res) => {
    const deleted = db.deleteVehicle(req.params.id);
    res.json({ success: deleted });
  });

  router.delete('/player/:id', (req, res) => {
    const deleted = db.deletePlayer(req.params.id);
    res.json({ success: deleted });
  });

  return router;
}