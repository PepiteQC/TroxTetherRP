// EtherWorld RP — Port-Éther
// Route API — état du monde

import { Router } from 'express';
import { JsonDatabase } from '../db/JsonDatabase';

export function worldRouter(db: JsonDatabase): Router {
  const router = Router();

  router.get('/props', (_req, res) => {
    res.json(db.getWorldProps());
  });

  router.get('/vehicles', (_req, res) => {
    res.json(db.getAllVehicles());
  });

  router.get('/players', (_req, res) => {
    const players = db.getAllPlayers().map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      job: p.job,
    }));
    res.json(players);
  });

  return router;
}