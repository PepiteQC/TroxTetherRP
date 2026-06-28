// EtherWorld RP — Port-Éther
// Route API — gestion des joueurs

import { Router } from 'express';
import { JsonDatabase } from '../db/JsonDatabase';

export function playersRouter(db: JsonDatabase): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(db.getAllPlayers());
  });

  router.get('/:id', (req, res) => {
    const player = db.getPlayer(req.params.id);
    if (!player) {
      res.status(404).json({ error: 'Joueur non trouvé' });
      return;
    }
    res.json(player);
  });

  router.put('/:id/cash', (req, res) => {
    const player = db.getPlayer(req.params.id);
    if (!player) {
      res.status(404).json({ error: 'Joueur non trouvé' });
      return;
    }
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount < 0) {
      res.status(400).json({ error: 'Montant invalide' });
      return;
    }
    player.cash = amount;
    db.savePlayer(player);
    res.json({ success: true, cash: player.cash });
  });

  router.put('/:id/job', (req, res) => {
    const player = db.getPlayer(req.params.id);
    if (!player) {
      res.status(404).json({ error: 'Joueur non trouvé' });
      return;
    }
    const { job } = req.body;
    if (!job) {
      res.status(400).json({ error: 'Job requis' });
      return;
    }
    player.job = job;
    db.savePlayer(player);
    res.json({ success: true, job: player.job });
  });

  return router;
}