// C:\troxtetherworld\server\admin\punishments\PunishmentManager.js
import db from '../../config/database.js';
import config from '../../config/index.js';

export class PunishmentManager {
  constructor(kernel) {
    this.kernel = kernel;
    this.types = {
      warn: { label: 'Avertissement', duration: null, color: '#ffc107' },
      mute: { label: 'Mute', duration: 3600000, color: '#ff9800' },
      kick: { label: 'Expulsion', duration: null, color: '#f44336' },
      ban: { label: 'Bannissement', duration: 86400000, color: '#d32f2f' },
      tempban: { label: 'Ban Temporaire', duration: 604800000, color: '#9c27b0' },
      permban: { label: 'Ban Permanent', duration: null, color: '#000000' }
    };
  }

  async apply(adminId, targetId, type, reason, duration = null) {
    // Valider le type
    if (!this.types[type]) {
      throw new Error(`Type de punition invalide: ${type}`);
    }

    // Vérifier que la cible existe
    const target = await this._getTarget(targetId);
    if (!target) {
      throw new Error('Joueur non trouvé');
    }

    const punishment = {
      id: `pun_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      admin_id: adminId,
      target_id: targetId,
      type,
      reason,
      duration: duration || this.types[type].duration,
      status: 'active',
      created_at: new Date(),
      expires_at: duration ? new Date(Date.now() + duration) : null
    };

    // Sauvegarder
    await db.query('INSERT INTO punishments SET ?', [punishment]);

    // Logger
    await db.query(
      'INSERT INTO admin_logs (admin_id, action, target, details) VALUES (?, ?, ?, ?)',
      [adminId, `punish_${type}`, targetId, reason]
    );

    // Exécuter l'action
    await this._executePunishment(punishment);

    // Émettre événement
    this.kernel.bus.emit('player:punished', {
      playerId: targetId,
      type,
      reason,
      duration: punishment.duration
    });

    return punishment;
  }

  async revoke(punishmentId, adminId, reason) {
    const [punishment] = await db.query(
      'SELECT * FROM punishments WHERE id = ? AND status = "active"',
      [punishmentId]
    );

    if (!punishment) {
      throw new Error('Punition non trouvée ou déjà révoquée');
    }

    await db.query(
      'UPDATE punishments SET status = "revoked", revoked_by = ?, revoked_reason = ?, revoked_at = NOW() WHERE id = ?',
      [adminId, reason, punishmentId]
    );

    // Si c'était un ban, dé-bannir
    if (['ban', 'tempban', 'permban'].includes(punishment.type)) {
      await db.query(
        'UPDATE players SET banned = 0 WHERE id = ?',
        [punishment.target_id]
      );
    }

    this.kernel.bus.emit('player:unpunished', {
      playerId: punishment.target_id,
      type: punishment.type,
      reason
    });

    return { success: true };
  }

  async checkPlayer(playerId) {
    const punishments = await db.query(
      `SELECT * FROM punishments 
       WHERE target_id = ? AND status = "active" 
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`,
      [playerId]
    );

    return punishments;
  }

  async getPlayerHistory(playerId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    
    const [punishments, total] = await Promise.all([
      db.query(
        'SELECT * FROM punishments WHERE target_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [playerId, parseInt(limit), parseInt(offset)]
      ),
      db.query(
        'SELECT COUNT(*) as total FROM punishments WHERE target_id = ?',
        [playerId]
      )
    ]);

    return {
      punishments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0].total
      }
    };
  }

  async getStats() {
    const [stats] = await db.query(`
      SELECT 
        type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as last24h
      FROM punishments
      GROUP BY type
    `);

    return stats;
  }

  async _getTarget(targetId) {
    const [player] = await db.query('SELECT * FROM players WHERE id = ?', [targetId]);
    return player || null;
  }

  async _executePunishment(punishment) {
    switch (punishment.type) {
      case 'kick':
        this.kernel.bus.emit('player:kick', {
          playerId: punishment.target_id,
          reason: punishment.reason
        });
        break;

      case 'ban':
      case 'tempban':
      case 'permban':
        await db.query(
          'UPDATE players SET banned = 1 WHERE id = ?',
          [punishment.target_id]
        );
        this.kernel.bus.emit('player:ban', {
          playerId: punishment.target_id,
          reason: punishment.reason,
          expiresAt: punishment.expires_at
        });
        break;

      case 'mute':
        this.kernel.bus.emit('player:mute', {
          playerId: punishment.target_id,
          reason: punishment.reason,
          duration: punishment.duration
        });
        break;

      case 'warn':
        this.kernel.bus.emit('player:warn', {
          playerId: punishment.target_id,
          reason: punishment.reason
        });
        break;
    }
  }
}