// C:\troxtetherworld\server\admin\commands\advanced\economyCommands.js
import { Command } from '../Command.js';

export const economyCommands = [
  new Command({
    name: 'give_money',
    description: 'Donner de l\'argent à un joueur',
    category: 'economy',
    permission: 'admin',
    validate: (params) => {
      const errors = [];
      if (!params.playerId) errors.push('playerId requis');
      if (!params.amount || params.amount <= 0) errors.push('Montant invalide');
      return { valid: errors.length === 0, errors };
    },
    execute: async (params, kernel) => {
      const { playerId, amount, reason = 'Aucune raison' } = params;
      
      await kernel.state.db.query(
        'UPDATE players SET money = money + ? WHERE id = ?',
        [amount, playerId]
      );
      
      kernel.bus.emit('economy:money_given', {
        playerId,
        amount,
        reason,
        timestamp: Date.now()
      });
      
      return { playerId, amount, reason };
    }
  }),

  new Command({
    name: 'set_job',
    description: 'Assigner un métier à un joueur',
    category: 'economy',
    permission: 'admin',
    validate: (params) => {
      const errors = [];
      if (!params.playerId) errors.push('playerId requis');
      if (!params.job) errors.push('job requis');
      return { valid: errors.length === 0, errors };
    },
    execute: async (params, kernel) => {
      const { playerId, job, grade = 1 } = params;
      
      await kernel.state.db.query(
        'UPDATE players SET job = ?, job_grade = ? WHERE id = ?',
        [job, grade, playerId]
      );
      
      kernel.bus.emit('job:assigned', { playerId, job, grade });
      
      return { playerId, job, grade };
    }
  })
];