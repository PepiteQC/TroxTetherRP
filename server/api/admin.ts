import { Router } from 'express';

// Middleware simple pour simuler une vérification admin
const requireAdmin = (req, res, next) => {
  const apiKey = req.headers['x-admin-key'];
  // Dans un vrai projet, vérifier un JWT ou une session
  if (apiKey !== process.env.ADMIN_SECRET_KEY && apiKey !== 'super-secret-key') {
    return res.status(403).json({ error: 'Accès interdit : Clé admin manquante ou invalide' });
  }
  next();
};

export function createAdminRouter(db) {
  const router = Router();

  // Appliquer la protection à toutes les routes admin
  router.use(requireAdmin);

  // GET /api/admin/dashboard - Vue d'ensemble rapide
  router.get('/dashboard', (_req, res) => {
    res.json({
      playersCount: db.getAllPlayers().length,
      vehiclesCount: db.getAllVehicles().length,
      propertiesCount: db.getAllProperties().length,
      recentLogs: db.getLogs(10),
      timestamp: Date.now()
    });
  });

  // GET /api/admin/transactions - Historique financier
  router.get('/transactions', (_req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    res.json(db.getRecentTransactions(Math.min(limit, 500))); // Max 500 pour perf
  });

  // DELETE /api/admin/vehicle/:id - Suppression véhicule
  router.delete('/vehicle/:id', (req, res) => {
    try {
      const success = db.deleteVehicle(req.params.id);
      if (success) {
        res.json({ success: true, message: 'Véhicule supprimé' });
      } else {
        res.status(404).json({ error: 'Véhicule non trouvé' });
      }
    } catch (error) {
      res.status(500).json({ error: "Erreur suppression" });
    }
  });

  // DELETE /api/admin/player/:id - Suppression joueur (Hard Delete)
  router.delete('/player/:id', (req, res) => {
    try {
      const success = db.deletePlayer(req.params.id);
      if (success) {
        res.json({ success: true, message: 'Joueur supprimé définitivement' });
      } else {
        res.status(404).json({ error: 'Joueur non trouvé' });
      }
    } catch (error) {
      res.status(500).json({ error: "Erreur suppression" });
    }
  });
  
  // POST /api/admin/broadcast - Envoyer un message global (Exemple d'ajout utilitaire)
  router.post('/broadcast', (req, res) => {
    const { message, type = 'info' } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });
    
    // Ici, on appellerait l'AgentBus pour diffuser le message aux clients
    // await agentBus.broadcast({ type: 'admin_message', content: message });
    
    res.json({ success: true, sent: true });
  });

  return router;
}