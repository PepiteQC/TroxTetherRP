// C:\troxtetherworld\server\admin\scheduler\Scheduler.js
import cron from 'node-cron';
import db from '../../config/database.js';

export class Scheduler {
  constructor(kernel) {
    this.kernel = kernel;
    this.tasks = new Map();
    this.cronTasks = new Map();
    this.oneTimeTasks = new Map();
  }

  async initialize() {
    // Charger les tâches persistantes
    const tasks = await db.query('SELECT * FROM scheduled_tasks WHERE active = 1');
    
    for (const task of tasks) {
      await this.loadTask(task);
    }

    console.log(`[Scheduler] ${tasks.length} tâches chargées`);
    return this;
  }

  async createTask(data) {
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: data.name,
      description: data.description || '',
      type: data.type, // 'cron' ou 'once'
      schedule: data.schedule, // expression cron ou timestamp
      action: data.action,
      params: data.params || {},
      active: true,
      created_by: data.createdBy || 'system',
      last_run: null,
      next_run: this._calculateNextRun(data.type, data.schedule),
      created_at: new Date()
    };

    // Sauvegarder
    await db.query('INSERT INTO scheduled_tasks SET ?', [task]);

    // Démarrer
    await this.loadTask(task);

    return task;
  }

  async loadTask(task) {
    if (task.type === 'cron') {
      this._scheduleCron(task);
    } else {
      this._scheduleOnce(task);
    }
  }

  async executeTask(taskId) {
    const task = this.tasks.get(taskId) || 
                 this.oneTimeTasks.get(taskId);
    
    if (!task) {
      throw new Error(`Tâche ${taskId} non trouvée`);
    }

    try {
      console.log(`[Scheduler] Exécution: ${task.name}`);
      
      // Marquer comme running
      task.status = 'running';
      task.last_run = new Date();

      // Exécuter l'action
      const result = await this._executeAction(task);

      // Mettre à jour
      task.status = 'completed';
      task.last_result = result;

      // Logger
      await db.query(
        'INSERT INTO task_logs (task_id, status, result, executed_at) VALUES (?, ?, ?, NOW())',
        [taskId, 'completed', JSON.stringify(result)]
      );

      // Mettre à jour la tâche
      await db.query(
        'UPDATE scheduled_tasks SET last_run = NOW(), last_result = ? WHERE id = ?',
        [JSON.stringify(result), taskId]
      );

      // Émettre événement
      this.kernel.bus.emit('scheduler:task_completed', {
        taskId,
        name: task.name,
        result
      });

      // Si one-time, supprimer après exécution
      if (task.type === 'once') {
        await this.deleteTask(taskId);
      }

      return result;
    } catch (error) {
      task.status = 'failed';
      task.last_error = error.message;

      await db.query(
        'UPDATE scheduled_tasks SET last_error = ? WHERE id = ?',
        [error.message, taskId]
      );

      this.kernel.bus.emit('scheduler:task_failed', {
        taskId,
        name: task.name,
        error: error.message
      });

      throw error;
    }
  }

  async deleteTask(taskId) {
    // Arrêter si en cours
    this.stopTask(taskId);

    // Supprimer de la base
    await db.query('DELETE FROM scheduled_tasks WHERE id = ?', [taskId]);

    // Retirer de la mémoire
    this.tasks.delete(taskId);
    this.cronTasks.delete(taskId);
    this.oneTimeTasks.delete(taskId);
  }

  stopTask(taskId) {
    const cronTask = this.cronTasks.get(taskId);
    if (cronTask) {
      cronTask.stop();
      this.cronTasks.delete(taskId);
    }

    const timeout = this.oneTimeTasks.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.oneTimeTasks.delete(taskId);
    }

    this.tasks.delete(taskId);
  }

  getTasks(filter = {}) {
    let tasks = Array.from(this.tasks.values());
    
    if (filter.type) {
      tasks = tasks.filter(t => t.type === filter.type);
    }
    if (filter.active !== undefined) {
      tasks = tasks.filter(t => t.active === filter.active);
    }

    return tasks;
  }

  async getLogs(taskId, limit = 50) {
    return db.query(
      'SELECT * FROM task_logs WHERE task_id = ? ORDER BY executed_at DESC LIMIT ?',
      [taskId, parseInt(limit)]
    );
  }

  _scheduleCron(task) {
    if (this.cronTasks.has(task.id)) {
      this.cronTasks.get(task.id).stop();
    }

    const cronTask = cron.schedule(task.schedule, () => {
      this.executeTask(task.id);
    }, {
      scheduled: true,
      timezone: 'America/Montreal'
    });

    this.cronTasks.set(task.id, cronTask);
    this.tasks.set(task.id, task);

    console.log(`[Scheduler] Tâche cron programmée: ${task.name} (${task.schedule})`);
  }

  _scheduleOnce(task) {
    const delay = task.schedule - Date.now();
    
    if (delay <= 0) {
      // Déjà passé, exécuter maintenant
      setImmediate(() => this.executeTask(task.id));
      return;
    }

    const timeout = setTimeout(() => {
      this.executeTask(task.id);
    }, delay);

    this.oneTimeTasks.set(task.id, timeout);
    this.tasks.set(task.id, task);

    console.log(`[Scheduler] Tâche unique programmée: ${task.name} (dans ${Math.round(delay/1000)}s)`);
  }

  async _executeAction(task) {
    const { action, params } = task;

    switch (action) {
      case 'restart_server':
        return { action: 'restart', time: Date.now() };

      case 'save_world':
        await this.kernel.state.save();
        return { action: 'save_world', saved: true };

      case 'announce':
        this.kernel.bus.emit('chat:announcement', {
          message: params.message || 'Message automatique',
          color: params.color || '#ffffff'
        });
        return { action: 'announce', message: params.message };

      case 'reset_economy':
        // TODO: Réinitialisation économique
        return { action: 'reset_economy', completed: true };

      case 'backup_database':
        // TODO: Backup automatisé
        return { action: 'backup', completed: true };

      case 'clear_chat':
        this.kernel.bus.emit('chat:clear', {});
        return { action: 'clear_chat' };

      case 'custom':
        // Exécuter une commande personnalisée
        if (this.kernel.brain) {
          return this.kernel.brain.execute(params.command, params.args);
        }
        return { error: 'Brain non disponible' };

      default:
        throw new Error(`Action inconnue: ${action}`);
    }
  }

  _calculateNextRun(type, schedule) {
    if (type === 'cron') {
      // Utiliser la librairie pour calculer
      return cron.schedule(schedule).nextDate().toJSDate();
    } else {
      return new Date(parseInt(schedule));
    }
  }
}