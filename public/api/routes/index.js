// C:\troxtetherworld\public\api\routes\index.js
// Routeur API principal

import { Router } from 'express';
import { auth, requireAdmin } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Import des routeurs
import authRoutes from './auth.js';
import playerRoutes from './players.js';
import adminRoutes from './admin.js';
import worldRoutes from './world.js';
import economyRoutes from './economy.js';
import factionRoutes from './factions.js';
import housingRoutes from './housing.js';
import vehicleRoutes from './vehicles.js';
import combatRoutes from './combat.js';
import chatRoutes from './chat.js';
import systemRoutes from './system.js';

// Routes publiques
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/system', systemRoutes);

// Routes authentifiées
router.use('/players', auth, playerRoutes);
router.use('/world', auth, worldRoutes);
router.use('/economy', auth, economyRoutes);
router.use('/factions', auth, factionRoutes);
router.use('/housing', auth, housingRoutes);
router.use('/vehicles', auth, vehicleRoutes);
router.use('/combat', auth, combatRoutes);

// Routes admin
router.use('/admin', requireAdmin, adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '4.0.0'
  });
});

export default router;