import { Router } from 'express';

export function createPlayersRouter(db) {
  const router = Router();

  // GET /api/players - Tous les joueurs (avec filtres optionnels)
  router.get('/', (req, res) => {
    try {
      let players = db.getAllPlayers();
      
      // Filtrage côté serveur si query params présents
      if (req.query.job) {
        players = players.filter(p => p.job === req.query.job);
      }
      if (req.query.search) {
        const term = req.query.search.toLowerCase();
        players = players.filter(p => p.name.toLowerCase().includes(term));
      }

      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  // GET /api/players/:id - Détail d'un joueur
  router.get('/:id', (req, res) => {
    try {
      const player = db.getPlayer(req.params.id);
      if (!player) {
        return res.status(404).json({ error: 'Joueur non trouvé' });
      }
      // Masquer les données sensibles si nécessaire (ex: hash password, token)
      const safePlayer = { ...player };
      delete safePlayer.passwordHash; 
      delete safePlayer.authToken;
      
      res.json(safePlayer);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération du joueur" });
    }
  });

  // PUT /api/players/:id/cash - Modification argent (Sécurisé)
  router.put('/:id/cash', (req, res) => {
    try {
      const player = db.getPlayer(req.params.id);
      if (!player) {
        return res.status(404).json({ error: 'Joueur non trouvé' });
      }

      const { amount, operation = 'set' } = req.body; // operation: 'set', 'add', 'remove'

      if (typeof amount !== 'number' || isNaN(amount)) {
        return res.status(400).json({ error: 'Montant invalide (doit être un nombre)' });
      }

      let newCash = player.cash || 0;
      if (operation === 'add') newCash += amount;
      else if (operation === 'remove') newCash -= amount;
      else newCash = amount; // set par défaut

      if (newCash < 0) {
        return res.status(400).json({ error: 'Le solde ne peut pas être négatif' });
      }

      player.cash = Math.floor(newCash); // Entier seulement
      db.savePlayer(player);
      
      res.json({ success: true, cash: player.cash, operation });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la mise à jour du solde" });
    }
  });

  // PUT /api/players/:id/job - Changement de métier
  router.put('/:id/job', (req, res) => {
    try {
      const player = db.getPlayer(req.params.id);
      if (!player) {
        return res.status(404).json({ error: 'Joueur non trouvé' });
      }

      const { job } = req.body;
      const allowedJobs = ['unemployed', 'police', 'medic', 'mechanic', 'gang_member']; // Whitelist
      
      if (!job || !allowedJobs.includes(job)) {
        return res.status(400).json({ error: `Métier invalide. Choix: ${allowedJobs.join(', ')}` });
      }

      player.job = job;
      db.savePlayer(player);
      
      res.json({ success: true, job: player.job });
    } catch (error) {
      res.status(500).json({ error: "Erreur lors du changement de métier" });
    }
  });

  return router;
}