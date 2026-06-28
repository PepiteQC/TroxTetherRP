// C:\troxtetherworld\server\kernel\intellectus\bootstrap.js
// Point d'entrée pour intégrer Intellectus dans le kernel

import Intellectus from './index.js';
import config from '../../config/index.js';

export async function bootstrapIntellectus(kernel) {
  const intellectus = new Intellectus({
    bus: {
      maxHistory: 200,
      debug: config.env === 'development'
    },
    contracts: {
      maxFailedAttempts: 5,
      lockoutDuration: 300000
    },
    memory: {
      maxVersions: 50,
      ttl: 7200000 // 2 heures
    },
    thirdEye: kernel.thirdEye || null
  });

  await intellectus.initialize();

  // Remplacer les modules du kernel par Intellectus
  kernel.bus = intellectus.bus;
  kernel.contracts = intellectus.contracts;
  kernel.memory = intellectus.memory;
  kernel.scheduler = intellectus.scheduler;
  kernel.commands = intellectus.commands;
  
  // Marquer Intellectus comme module
  kernel.intellectus = intellectus;

  // Enregistrer les commandes système
  _registerSystemCommands(intellectus.commands, kernel);
  
  // Démarrer les tâches automatiques
  _startAutoTasks(intellectus.scheduler, kernel);

  console.log('[Bootstrap] Intellectus intégré au kernel');
  
  return intellectus;
}

function _registerSystemCommands(commands, kernel) {
  // Sauvegarde du monde
  commands.register('save_world', async (params) => {
    await kernel.state.save();
    return { saved: true, timestamp: Date.now() };
  }, { permission: 'admin' });

  // Stats serveur
  commands.register('server_stats', async () => {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      players: kernel.players?.size || 0,
      intellectus: kernel.intellectus?.getStatus()
    };
  }, { permission: 'admin' });

  // Nettoyage mémoire
  commands.register('clear_cache', async () => {
    kernel.memory.versions = [];
    return { cleared: true };
  }, { permission: 'admin' });

  // Redémarrage scheduler
  commands.register('restart_scheduler', async () => {
    kernel.scheduler.stopAll();
    _startAutoTasks(kernel.scheduler, kernel);
    return { restarted: true };
  }, { permission: 'admin' });
}

function _startAutoTasks(scheduler, kernel) {
  // Auto-save toutes les 15 secondes
  scheduler.every('auto_save', 15000, async () => {
    await kernel.state?.save();
  });

  // Stats toutes les minutes
  scheduler.every('stats_report', 60000, async () => {
    const stats = {
      players: kernel.players?.size || 0,
      memory: process.memoryUsage().heapUsed,
      uptime: process.uptime()
    };
    
    await kernel.bus?.emit('system:stats', stats, 'low');
  });

  // Cleanup des sessions expirées toutes les 5 minutes
  scheduler.every('session_cleanup', 300000, async () => {
    // Nettoyage des vieilles versions mémoire
    kernel.memory.versions = kernel.memory.versions.slice(0, 20);
  });
}