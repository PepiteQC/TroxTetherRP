// C:\troxtetherworld\server\admin\commands\advanced\debugCommands.js
import { Command } from '../Command.js';

export const debugCommands = [
  new Command({
    name: 'reload_module',
    description: 'Recharger un module',
    category: 'debug',
    permission: 'admin',
    validate: (params) => {
      const errors = [];
      if (!params.module) errors.push('Nom du module requis');
      return { valid: errors.length === 0, errors };
    },
    execute: async (params, kernel) => {
      const { module } = params;
      // TODO: Implémenter le hot-reload
      console.log(`[Debug] Rechargement du module: ${module}`);
      return { module, status: 'reloaded' };
    }
  }),

  new Command({
    name: 'toggle_debug',
    description: 'Activer/désactiver le mode debug',
    category: 'debug',
    permission: 'admin',
    execute: async (params, kernel) => {
      kernel.debug = !kernel.debug;
      return { debug: kernel.debug };
    }
  })
];