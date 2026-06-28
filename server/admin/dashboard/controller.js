// C:\troxtetherworld\server\admin\dashboard\controller.js
import db from '../../config/database.js';
import config from '../../config/index.js';

export class AdminController {
  async getStats(req, res) {
    try {
      const [playerCount, worldState, systemUptime] = await Promise.all([
        db.query('SELECT COUNT(*) as total FROM players WHERE connected = 1'),
        db.query('SELECT * FROM world_state ORDER BY updated_at DESC LIMIT 1'),
        db.query('SELECT value FROM system_metrics WHERE key = "uptime"')
      ]);

      res.json({
        success: true,
        data: {
          players: {
            online: playerCount[0].total,
            max: config.game.maxPlayers,
            unique: await this._getUniquePlayers()
          },
          world: worldState[0] || null,
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: '4.0.0'
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getRealtimeStats(req, res) {
    try {
      const stats = {
        players: await this._getRealtimePlayerStats(),
        performance: await this._getPerformanceStats(),
        events: await this._getEventStats()
      };
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPlayers(req, res) {
    try {
      const { page = 1, limit = 50, search, status, sort } = req.query;
      const offset = (page - 1) * limit;
      
      let query = 'SELECT * FROM players WHERE 1=1';
      const params = [];

      if (search) {
        query += ' AND (identifier LIKE ? OR id LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      if (status) {
        query += ' AND connected = ?';
        params.push(status === 'online' ? 1 : 0);
      }

      query += ` ORDER BY ${sort || 'last_seen'} DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const players = await db.query(query, params);
      const [total] = await db.query('SELECT COUNT(*) as total FROM players');

      res.json({
        success: true,
        data: players,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].total
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPlayer(req, res) {
    try {
      const [player] = await db.query('SELECT * FROM players WHERE id = ?', [req.params.id]);
      if (!player) {
        return res.status(404).json({ success: false, error: 'Joueur non trouvé' });
      }
      res.json({ success: true, data: player });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updatePlayer(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Log l'action
      await db.query(
        'INSERT INTO admin_logs (admin_id, action, target, details) VALUES (?, ?, ?, ?)',
        [req.user.id, 'update_player', id, JSON.stringify(updates)]
      );

      await db.query('UPDATE players SET ? WHERE id = ?', [updates, id]);
      
      res.json({ success: true, message: 'Joueur mis à jour' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deletePlayer(req, res) {
    try {
      const { id } = req.params;
      
      await db.query(
        'INSERT INTO admin_logs (admin_id, action, target, details) VALUES (?, ?, ?, ?)',
        [req.user.id, 'delete_player', id, 'Suppression complète']
      );

      await db.query('DELETE FROM players WHERE id = ?', [id]);
      
      res.json({ success: true, message: 'Joueur supprimé' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getWorldState(req, res) {
    try {
      const world = await db.query('SELECT * FROM world_state ORDER BY updated_at DESC LIMIT 1');
      const zones = await db.query('SELECT * FROM zones');
      const properties = await db.query('SELECT COUNT(*) as total FROM properties');
      
      res.json({
        success: true,
        data: {
          state: world[0] || {},
          zones,
          properties: properties[0].total
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateWorld(req, res) {
    try {
      const updates = req.body;
      updates.updated_at = new Date();
      updates.updated_by = req.user.id;

      await db.query('UPDATE world_state SET ? WHERE id = 1', [updates]);
      
      res.json({ success: true, message: 'Monde mis à jour' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getLogs(req, res) {
    try {
      const { page = 1, limit = 100 } = req.query;
      const offset = (page - 1) * limit;

      const logs = await db.query(
        'SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [parseInt(limit), parseInt(offset)]
      );
      const [total] = await db.query('SELECT COUNT(*) as total FROM admin_logs');

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].total
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getMetrics(req, res) {
    try {
      const metrics = await db.query(
        'SELECT * FROM system_metrics ORDER BY recorded_at DESC LIMIT 100'
      );
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPerformanceMetrics(req, res) {
    try {
      const metrics = {
        cpu: process.cpuUsage(),
        memory: process.memoryUsage(),
        heap: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100,
        uptime: process.uptime(),
        eventLoop: await this._measureEventLoop()
      };
      res.json({ success: true, data: metrics });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async _getUniquePlayers() {
    const result = await db.query(
      'SELECT COUNT(DISTINCT identifier) as total FROM players'
    );
    return result[0].total;
  }

  async _getRealtimePlayerStats() {
    const [online] = await db.query(
      'SELECT COUNT(*) as total FROM players WHERE connected = 1'
    );
    const [byFaction] = await db.query(
      'SELECT faction, COUNT(*) as count FROM players WHERE connected = 1 GROUP BY faction'
    );
    return {
      online: online[0].total,
      byFaction
    };
  }

  async _getPerformanceStats() {
    return {
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      heapUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
    };
  }

  async _getEventStats() {
    const [recent] = await db.query(
      'SELECT COUNT(*) as total FROM events WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)'
    );
    return {
      lastHour: recent[0].total
    };
  }

  _measureEventLoop() {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => resolve(Date.now() - start));
    });
  }
}