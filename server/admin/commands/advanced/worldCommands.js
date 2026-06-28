// C:\troxtetherworld\server\admin\commands\advanced\worldCommands.js
import { Command } from '../Command.js';

export const worldCommands = [
  new Command({
    name: 'set_time',
    description: 'Changer l\'heure du monde',
    category: 'world',
    permission: 'admin',
    validate: (params) => {
      const errors = [];
      if (params.hour < 0 || params.hour > 23) errors.push('Heure invalide (0-23)');
      if (params.minute < 0 || params.minute > 59) errors.push('Minute invalide (0-59)');
      return { valid: errors.length === 0, errors };
    },
    execute: async (params) => {
      const { hour = 12, minute = 0 } = params;
      return { hour, minute, timeString: `${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}` };
    }
  }),

  new Command({
    name: 'set_weather',
    description: 'Changer la météo',
    category: 'world',
    permission: 'admin',
    validate: (params) => {
      const validWeather = ['sunny', 'rainy', 'cloudy', 'storm', 'snow', 'fog'];
      const errors = [];
      if (!validWeather.includes(params.weather)) {
        errors.push(`Météo invalide. Options: ${validWeather.join(', ')}`);
      }
      return { valid: errors.length === 0, errors };
    },
    execute: async (params, kernel) => {
      const { weather } = params;
      
      await kernel.state.db.query(
        'UPDATE world_state SET weather = ?, updated_at = NOW() WHERE id = 1',
        [weather]
      );
      
      kernel.bus.emit('world:weather_changed', { weather });
      return { weather };
    }
  }),

  new Command({
    name: 'spawn_vehicle',
    description: 'Faire apparaître un véhicule',
    category: 'world',
    permission: 'admin',
    validate: (params) => {
      const errors = [];
      if (!params.model) errors.push('Modèle de véhicule requis');
      return { valid: errors.length === 0, errors };
    },
    execute: async (params, kernel) => {
      const { model, position = { x: 0, y: 0, z: 0 }, color = '#ffffff' } = params;
      
      const vehicleId = `veh_${Date.now()}`;
      await kernel.state.db.query(
        'INSERT INTO vehicles (id, model, position, color, spawned_by) VALUES (?, ?, ?, ?, ?)',
        [vehicleId, model, JSON.stringify(position), color, params.executor]
      );
      
      kernel.bus.emit('vehicle:spawned', { id: vehicleId, model, position, color });
      
      return { id: vehicleId, model, position, color };
    }
  })
];