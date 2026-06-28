// EtherWorld RP — Port-Éther
// Route API — santé du serveur

import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'EtherWorld RP — Port-Éther',
    version: '0.1.0',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});