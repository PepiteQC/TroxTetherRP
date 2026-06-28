// C:\troxtetherworld\server\admin\commands\advanced\factionCommands.js
import { Command } from '../Command.js';

export const factionCommands = [
  new Command({
    name: 'create_faction',
    description: 'Créer une faction/gang',
    category: 'faction',
    permission: 'admin',
    validate: (params) => {
      const errors = [];
      if (!params.name) errors.push('Nom requis');
      if (!params.type) errors.push('Type requis (gang, police, ems, etc)');
      return { valid: errors.length === 0, errors };
    },
    execute: async (params, kernel) => {
      const { name, type, color = '#ff0000', maxMembers = 50, territory = {} } = params;
      
      const factionId = `faction_${Date.now()}`;
      await kernel.state.db.query(
        'INSERT INTO factions (id, name, type, color, max_members, territory) VALUES (?, ?, ?, ?, ?, ?)',
        [factionId, name, type, color, maxMembers, JSON.stringify(territory)]
      );
      
      kernel.bus.emit('faction:created', {
        id: factionId,
        name,
        type,
        color
      });
      
      return { id: factionId, name, type, color };
    }
  }),

  new Command({
    name: 'add_faction_member',
    description: 'Ajouter un membre à une faction',
    category: 'faction',
    permission: 'admin',
    validate: (params) => {
      const errors = [];
      if (!params.factionId) errors.push('factionId requis');
      if (!params.playerId) errors.push('playerId requis');
      return { valid: errors.length === 0, errors };
    },
    execute: async (params, kernel) => {
      const { factionId, playerId, rank = 'member' } = params;
      
      await kernel.state.db.query(
        'UPDATE players SET faction = ?, faction_rank = ? WHERE id = ?',
        [factionId, rank, playerId]
      );
      
      kernel.bus.emit('faction:member_added', { factionId, playerId, rank });
      
      return { factionId, playerId, rank };
    }
  })
];