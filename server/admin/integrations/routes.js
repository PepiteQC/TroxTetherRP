// C:\troxtetherworld\server\admin\integrations\routes.js
import { Router } from 'express';
import { IntegrationController } from './controller.js';

const router = Router();
const controller = new IntegrationController();

router.get('/', controller.listIntegrations.bind(controller));
router.post('/', controller.createIntegration.bind(controller));
router.get('/:id', controller.getIntegration.bind(controller));
router.put('/:id', controller.updateIntegration.bind(controller));
router.delete('/:id', controller.deleteIntegration.bind(controller));
router.post('/:id/test', controller.testIntegration.bind(controller));
router.post('/:id/toggle', controller.toggleIntegration.bind(controller));

export default router;