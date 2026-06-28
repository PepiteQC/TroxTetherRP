// C:\troxtetherworld\server\admin\scheduler\controller.js
import { Scheduler } from './Scheduler.js';
import db from '../../config/database.js';

export class SchedulerController {
  constructor() {
    this.scheduler = null;
    this.kernel = null;
  }

  initialize(kernel) {
    this.scheduler = new Scheduler(kernel);
    this.kernel = kernel;
  }

  async listTasks(req, res) {
    try {
      const { type, active } = req.query;
      const tasks = await db.query('SELECT * FROM scheduled_tasks ORDER BY created_at DESC');
      
      // Enrichir avec le statut runtime
      const enriched = tasks.map(task => ({
        ...task,
        runtime_status: this.scheduler.tasks.has(task.id) ? 'running' : 'stopped'
      }));

      res.json({ success: true, data: enriched });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createTask(req, res) {
    try {
      const task = await this.scheduler.createTask({
        ...req.body,
        createdBy: req.user.id
      });
      res.json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getTask(req, res) {
    try {
      const [task] = await db.query(
        'SELECT * FROM scheduled_tasks WHERE id = ?',
        [req.params.id]
      );
      
      if (!task) {
        return res.status(404).json({ success: false, error: 'Tâche non trouvée' });
      }

      // Ajouter les logs récents
      const logs = await this.scheduler.getLogs(req.params.id, 10);
      task.recent_logs = logs;

      res.json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      await db.query('UPDATE scheduled_tasks SET ? WHERE id = ?', [updates, id]);
      
      // Si la tâche tourne, la recharger
      if (this.scheduler.tasks.has(id)) {
        this.scheduler.stopTask(id);
        const [task] = await db.query('SELECT * FROM scheduled_tasks WHERE id = ?', [id]);
        await this.scheduler.loadTask(task);
      }

      res.json({ success: true, message: 'Tâche mise à jour' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteTask(req, res) {
    try {
      await this.scheduler.deleteTask(req.params.id);
      res.json({ success: true, message: 'Tâche supprimée' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async executeNow(req, res) {
    try {
      const result = await this.scheduler.executeTask(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getTaskLogs(req, res) {
    try {
      const logs = await this.scheduler.getLogs(req.params.id);
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getStats(req, res) {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN type = 'cron' THEN 1 ELSE 0 END) as cron,
          SUM(CASE WHEN type = 'once' THEN 1 ELSE 0 END) as once
        FROM scheduled_tasks
      `);

      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}