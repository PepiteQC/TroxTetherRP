// C:\troxtetherworld\public\api\routes\admin.js
// Routes administrateur complètes

import { Router } from 'express';
import db from '../../server/config/database.js';
import crypto from 'crypto';

const router = Router();

// ─── DASHBOARD ──────────────────────────────────────────────────────────────

router.get('/dashboard', async (req, res) => {
    try {
        const [players, economy, server] = await Promise.all([
            db.query('SELECT COUNT(*) as online FROM players WHERE connected = 1'),
            db.query('SELECT SUM(money) as total_money, SUM(bank) as total_bank FROM players'),
            db.query('SELECT * FROM server_metrics ORDER BY recorded_at DESC LIMIT 1')
        ]);

        res.json({
            success: true,
            data: {
                players: {
                    online: players[0].online,
                    total: (await db.query('SELECT COUNT(*) as total FROM players'))[0].total
                },
                economy: {
                    cash: economy[0].total_money || 0,
                    bank: economy[0].total_bank || 0,
                    total: (economy[0].total_money || 0) + (economy[0].total_bank || 0)
                },
                server: server[0] || {
                    cpu: 0,
                    memory: 0,
                    uptime: process.uptime()
                },
                timestamp: Date.now()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── GESTION DES JOUEURS ──────────────────────────────────────────────────

router.get('/players', async (req, res) => {
    try {
        const { page = 1, limit = 50, search, status } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM players WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (identifier LIKE ? OR id LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status === 'online') {
            query += ' AND connected = 1';
        } else if (status === 'offline') {
            query += ' AND connected = 0';
        }

        query += ' ORDER BY last_login DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const players = await db.query(query, params);
        const [total] = await db.query('SELECT COUNT(*) as total FROM players');

        res.json({
            success: true,
            data: players,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total[0].total,
                pages: Math.ceil(total[0].total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/players/:id', async (req, res) => {
    try {
        const [player] = await db.query(
            'SELECT * FROM players WHERE id = ?',
            [req.params.id]
        );
        if (!player) {
            return res.status(404).json({ success: false, error: 'Joueur non trouvé' });
        }

        // Récupérer les infos supplémentaires
        const [punishments, properties, vehicles, stats] = await Promise.all([
            db.query('SELECT * FROM punishments WHERE target_id = ? ORDER BY created_at DESC LIMIT 5', [req.params.id]),
            db.query('SELECT * FROM properties WHERE owner_id = ?', [req.params.id]),
            db.query('SELECT * FROM vehicles WHERE owner_id = ?', [req.params.id]),
            db.query('SELECT * FROM player_stats WHERE player_id = ?', [req.params.id])
        ]);

        res.json({
            success: true,
            data: {
                ...player,
                punishments,
                properties,
                vehicles,
                stats: stats[0] || null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/players/:id', async (req, res) => {
    try {
        const updates = req.body;
        const allowedFields = ['money', 'bank', 'health', 'armor', 'faction', 'faction_rank', 'job', 'job_grade', 'role'];
        
        const filteredUpdates = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            return res.status(400).json({ success: false, error: 'Aucun champ valide à mettre à jour' });
        }

        await db.query('UPDATE players SET ? WHERE id = ?', [filteredUpdates, req.params.id]);
        
        // Logger l'action
        await db.query(
            'INSERT INTO admin_logs (admin_id, action, target, details) VALUES (?, "update_player", ?, ?)',
            [req.user.id, req.params.id, JSON.stringify(filteredUpdates)]
        );

        res.json({ success: true, message: 'Joueur mis à jour' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/players/:id', async (req, res) => {
    try {
        // Backup avant suppression
        const [player] = await db.query('SELECT * FROM players WHERE id = ?', [req.params.id]);
        if (!player) {
            return res.status(404).json({ success: false, error: 'Joueur non trouvé' });
        }

        // Archive
        await db.query(
            'INSERT INTO deleted_players SELECT * FROM players WHERE id = ?',
            [req.params.id]
        );

        // Supprimer les données liées
        await Promise.all([
            db.query('DELETE FROM players WHERE id = ?', [req.params.id]),
            db.query('DELETE FROM player_stats WHERE player_id = ?', [req.params.id]),
            db.query('DELETE FROM punishments WHERE target_id = ?', [req.params.id])
        ]);

        await db.query(
            'INSERT INTO admin_logs (admin_id, action, target, details) VALUES (?, "delete_player", ?, ?)',
            [req.user.id, req.params.id, JSON.stringify(player)]
        );

        res.json({ success: true, message: 'Joueur supprimé' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── COMMANDES ────────────────────────────────────────────────────────────

router.post('/command', async (req, res) => {
    try {
        const { command, params } = req.body;
        
        // Exécuter via le brain
        const result = await req.app.get('kernel')?.commands?.execute(command, params, { 
            isAdmin: true,
            userId: req.user.id 
        });

        await db.query(
            'INSERT INTO admin_logs (admin_id, action, target, details) VALUES (?, "command", ?, ?)',
            [req.user.id, command, JSON.stringify(params)]
        );

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── LOGS ────────────────────────────────────────────────────────────────

router.get('/logs', async (req, res) => {
    try {
        const { page = 1, limit = 100, action } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM admin_logs WHERE 1=1';
        const params = [];

        if (action) {
            query += ' AND action = ?';
            params.push(action);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const logs = await db.query(query, params);
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
});

// ─── ANNONCES ─────────────────────────────────────────────────────────────

router.post('/announce', async (req, res) => {
    try {
        const { message, type = 'info', duration = 10000 } = req.body;

        // Broadcast via websocket
        const kernel = req.app.get('kernel');
        if (kernel?.bus) {
            await kernel.bus.emit('chat:announcement', {
                message,
                type,
                duration,
                author: req.user.identifier,
                timestamp: Date.now()
            }, 'high');
        }

        await db.query(
            'INSERT INTO admin_logs (admin_id, action, target, details) VALUES (?, "announce", ?, ?)',
            [req.user.id, message, type]
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── MÉTRIQUES SERVEUR ────────────────────────────────────────────────────

router.get('/metrics', async (req, res) => {
    try {
        const metrics = {
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                nodeVersion: process.version,
                platform: process.platform
            },
            game: {
                players: (await db.query('SELECT COUNT(*) as count FROM players WHERE connected = 1'))[0].count,
                properties: (await db.query('SELECT COUNT(*) as count FROM properties'))[0].count,
                vehicles: (await db.query('SELECT COUNT(*) as count FROM vehicles'))[0].count,
                factions: (await db.query('SELECT COUNT(*) as count FROM factions'))[0].count
            },
            economy: {
                totalMoney: (await db.query('SELECT SUM(money) as total FROM players'))[0].total || 0,
                totalBank: (await db.query('SELECT SUM(bank) as total FROM players'))[0].total || 0
            }
        };

        res.json({ success: true, data: metrics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── SAUVEGARDE ──────────────────────────────────────────────────────────

router.post('/save', async (req, res) => {
    try {
        const kernel = req.app.get('kernel');
        await kernel?.state?.save();
        
        await db.query(
            'INSERT INTO admin_logs (admin_id, action, target, details) VALUES (?, "save", "world", "Sauvegarde manuelle")',
            [req.user.id]
        );

        res.json({ success: true, message: 'Monde sauvegardé' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ─── Redémarrage ─────────────────────────────────────────────────────────

router.post('/restart', async (req, res) => {
    try {
        const { delay = 5000, message = 'Redémarrage du serveur...' } = req.body;

        // Annoncer
        const kernel = req.app.get('kernel');
        if (kernel?.bus) {
            await kernel.bus.emit('server:restart', {
                message,
                delay,
                timestamp: Date.now()
            }, 'critical');
        }

        // Planifier le redémarrage
        setTimeout(() => {
            process.exit(0);
        }, delay);

        res.json({ success: true, message: `Redémarrage dans ${delay}ms` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;