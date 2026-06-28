// C:\troxtetherworld\server\admin\commands\advanced\playerCommands.js
import { Command } from '../Command.js';

export const playerCommands = [
  new Command({
    name: 'kick',
    description: 'Expulser un joueur',
    category: 'player',
    permission: 'admin',
    validate: (params) => {
      const errors = [];
      if (!params.playerId) errors.push('playerId requis');
      return { valid: errors.length === 0, errors };
    },
    execute: async (params, kernel) => {
      const { playerId, reason = 'Expulsé par un admin' } = params;
      
      kernel.bus.emit('player:kick', { playerId, reason });
      
      await kernel.state.db.query(
        'INSERT INTO admin_logs (admin_id, action, target, details) VALUES (?, ?, ?, ?)',
        [params.executor, 'kick', playerId, reason]
      );
      
      return { playerId, reason };
    }
  }),

  new Command({
    name: 'ban',
    description: 'Bannir un joueur',
    category: 'player',
    permission: 'admin',
    validate: (params) => {
      const errors = [];
      if (!params.playerId) errors.push('playerId requis');
      if (!params.duration) errors.push('Durée requise (ex: 7d, 30d, perm)');
      return { valid: errors.length === 0, errors };
    },
    execute: async (params, kernel) => {
      const { playerId, duration, reason = 'Banni par un admin' } = params;
      
      const banData = {
        player_id: playerId,
        banned_by: params.executor,
        reason,
        duration,
        created_at: new Date(),
        expires_at: duration === 'perm' ? null : new Date(Date.now() + parseDuration(duration))
      };
      
      await kernel.state.db.query('INSERT INTO bans SET ?', [banData]);
      await kernel.state.db.query('UPDATE players SET banned = 1 WHERE id = ?', [playerId]);
      
      kernel.bus.emit('player:banned', { playerId, reason, duration });
      
      return { playerId, reason, duration };
    }
  }),

  new Command({
    name: 'warn',
    description: 'Avertir un joueur',
    category: 'player',
    permission: 'mod',
    validate: (params) => {
      const errors = [];
      if (!params.playerId) errors.push('playerId requis');
      if (!params.message) errors.push('Message requis');
      return { valid: errors.length === 0, errors };
    },
    execute: async (params, kernel) => {
      const { playerId, message } = params;
      
      await kernel.state.db.query(
        'INSERT INTO warnings (player_id, warned_by, message) VALUES (?, ?, ?)',
        [playerId, params.executor, message]
      );
      
      kernel.bus.emit('player:warned', { playerId, message });
      
      return { playerId, message };
    }
  })
];