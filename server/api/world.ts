import { Router } from 'express';

export function createWorldRouter(db) {
  const router = Router();

  // GET /api/world/props - Liste optimisée des propriétés
  router.get('/props', (_req, res) => {
    try {
      // On ne renvoie que les infos vitales pour la carte/minimap
      const props = db.getWorldProps().map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        position: p.position,
        owner: p.ownerId || null,
        price: p.price
      }));
      res.json(props);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des propriétés" });
    }
  });

  // GET /api/world/vehicles - Véhicules actifs
  router.get('/vehicles', (_req, res) => {
    try {
      const vehicles = db.getAllVehicles().map(v => ({
        id: v.id,
        model: v.model,
        plate: v.plate,
        position: v.position,
        ownerId: v.ownerId
      }));
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des véhicules" });
    }
  });

  // GET /api/world/players - Joueurs connectés (Vue publique)
  router.get('/players', (_req, res) => {
    try {
      const players = db.getAllPlayers()
        .filter(p => p.isConnected) // Supposons qu'on ne veut que les connectés
        .map(p => ({
          id: p.id,
          name: p.name,
          job: p.job,
          gang: p.gangName, // Ajout utile pour le RP
          position: p.position
        }));
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la récupération des joueurs" });
    }
  });

  return router;
}