// C:\troxtetherworld\server\admin\punishments\routes.js
import { Router } from 'express';
import { PunishmentController } from './controller.js';

const router = Router();
const controller = new PunishmentController();

router.get('/types', controller.getTypes.bind(controller));
router.get('/stats', controller.getStats.bind(controller));
router.post('/apply', controller.apply.bind(controller));
router.post('/revoke/:id', controller.revoke.bind(controller));
router.get('/player/:playerId', controller.getPlayerPunishments.bind(controller));
router.get('/:id', controller.getPunishment.bind(controller));

export default router;