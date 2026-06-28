// C:\troxtetherworld\server\admin\dashboard\routes.js
import { Router } from 'express';
import { AdminController } from './controller.js';

const router = Router();
const controller = new AdminController();

// Statistiques générales
router.get('/stats', controller.getStats.bind(controller));
router.get('/stats/realtime', controller.getRealtimeStats.bind(controller));

// Gestion des joueurs
router.get('/players', controller.getPlayers.bind(controller));
router.get('/players/:id', controller.getPlayer.bind(controller));
router.put('/players/:id', controller.updatePlayer.bind(controller));
router.delete('/players/:id', controller.deletePlayer.bind(controller));

// Gestion du monde
router.get('/world', controller.getWorldState.bind(controller));
router.put('/world', controller.updateWorld.bind(controller));

// Logs système
router.get('/logs', controller.getLogs.bind(controller));
router.get('/logs/:type', controller.getLogsByType.bind(controller));

// Métriques
router.get('/metrics', controller.getMetrics.bind(controller));
router.get('/metrics/performance', controller.getPerformanceMetrics.bind(controller));

export default router;