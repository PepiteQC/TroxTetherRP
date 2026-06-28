// C:\troxtetherworld\server\admin\scheduler\routes.js
import { Router } from 'express';
import { SchedulerController } from './controller.js';

const router = Router();
const controller = new SchedulerController();

router.get('/', controller.listTasks.bind(controller));
router.post('/', controller.createTask.bind(controller));
router.get('/:id', controller.getTask.bind(controller));
router.put('/:id', controller.updateTask.bind(controller));
router.delete('/:id', controller.deleteTask.bind(controller));
router.post('/:id/execute', controller.executeNow.bind(controller));
router.get('/:id/logs', controller.getTaskLogs.bind(controller));
router.get('/stats/summary', controller.getStats.bind(controller));

export default router;