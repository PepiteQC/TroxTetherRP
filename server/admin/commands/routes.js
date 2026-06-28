// C:\troxtetherworld\server\admin\commands\routes.js
import { Router } from 'express';
import { CommandController } from './controller.js';

const router = Router();
const controller = new CommandController();

router.get('/', controller.listCommands.bind(controller));
router.post('/execute', controller.executeCommand.bind(controller));
router.get('/history', controller.getHistory.bind(controller));
router.post('/:name', controller.executeByName.bind(controller));

export default router;