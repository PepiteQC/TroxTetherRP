// C:\troxtetherworld\server\admin\punishments\controller.js
import { PunishmentManager } from './PunishmentManager.js';
import db from '../../config/database.js';

export class PunishmentController {
  constructor() {
    this.manager = null;
  }

  initialize(kernel) {
    this.manager = new PunishmentManager(kernel);
    this.kernel = kernel;
  }

  getTypes(req, res) {
    res.json({
      success: true,
      data: this.manager.types
    });
  }

  async getStats(req, res) {
    try {
      const stats = await this.manager.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async apply(req, res) {
    try {
      const { targetId, type, reason, duration } = req.body;
      
      if (!targetId || !type || !reason) {
        return res.status(400).json({
          success: false,
          error: 'targetId, type et reason sont requis'
        });
      }

      const punishment = await this.manager.apply(
        req.user.id,
        targetId,
        type,
        reason,
        duration
      );

      res.json({ success: true, data: punishment });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async revoke(req, res) {
    try {
      const { reason } = req.body;
      const result = await this.manager.revoke(req.params.id, req.user.id, reason);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPlayerPunishments(req, res) {
    try {
      const { page } = req.query;
      const result = await this.manager.getPlayerHistory(req.params.playerId, page);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPunishment(req, res) {
    try {
      const [punishment] = await db.query(
        'SELECT * FROM punishments WHERE id = ?',
        [req.params.id]
      );
      
      if (!punishment) {
        return res.status(404).json({ success: false, error: 'Punition non trouvée' });
      }

      res.json({ success: true, data: punishment });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}