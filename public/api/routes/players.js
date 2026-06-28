// C:\troxtetherworld\public\api\routes\players.js
// Routeurs de gestion des joueurs

import { Router } from 'express';
import db from '../../server/config/database.js';

const router = Router();

// Obtenir le profil du joueur
router.get('/me', async (req, res) => {
    try {
        const [player] = await db.query(
            `SELECT id, identifier, money, bank, job, job_grade, 
                    faction, faction_rank, health, armor, 
                    position, properties, created_at, last_login,
                    play_time
             FROM players WHERE id = ?`,
            [req.user.id]
        );

        if (!player) {
            return res.status(404).json({ success: false, error: 'Joueur non trouvé' });
        }

        res.json({ success: true, data: player });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtenir un joueur par ID
router.get('/:id', async (req, res) => {
    try {
        const [player] = await db.query(
            `SELECT id, identifier, faction, faction_rank, health, armor
             FROM players WHERE id = ?`,
            [req.params.id]
        );

        if (!player) {
            return res.status(404).json({ success: false, error: 'Joueur non trouvé' });
        }

        res.json({ success: true, data: player });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mettre à jour la position
router.put('/position', async (req, res) => {
    try {
        const { position, rotation } = req.body;
        
        await db.query(
            'UPDATE players SET position = ?, rotation = ?, updated_at = NOW() WHERE id = ?',
            [JSON.stringify(position), JSON.stringify(rotation), req.user.id]
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sauvegarder l'état complet
router.put('/save', async (req, res) => {
    try {
        const { health, armor, position, inventory, metadata } = req.body;
        
        await db.query(
            `UPDATE players SET 
                health = ?, armor = ?, position = ?, 
                inventory = ?, metadata = ?,
                updated_at = NOW()
             WHERE id = ?`,
            [health, armor, JSON.stringify(position), 
             JSON.stringify(inventory), JSON.stringify(metadata),
             req.user.id]
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Inventaire
router.get('/inventory', async (req, res) => {
    try {
        const [player] = await db.query(
            'SELECT inventory FROM players WHERE id = ?',
            [req.user.id]
        );
        
        const inventory = player?.inventory ? JSON.parse(player.inventory) : [];
        res.json({ success: true, data: inventory });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/inventory', async (req, res) => {
    try {
        const { inventory } = req.body;
        await db.query(
            'UPDATE players SET inventory = ? WHERE id = ?',
            [JSON.stringify(inventory), req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Propriétés du joueur
router.get('/properties', async (req, res) => {
    try {
        const properties = await db.query(
            'SELECT * FROM properties WHERE owner_id = ?',
            [req.user.id]
        );
        res.json({ success: true, data: properties });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Véhicules du joueur
router.get('/vehicles', async (req, res) => {
    try {
        const vehicles = await db.query(
            'SELECT * FROM vehicles WHERE owner_id = ?',
            [req.user.id]
        );
        res.json({ success: true, data: vehicles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Statistiques
router.get('/stats', async (req, res) => {
    try {
        const [stats] = await db.query(
            `SELECT kills, deaths, play_time, money_earned, money_spent
             FROM player_stats WHERE player_id = ?`,
            [req.user.id]
        );
        res.json({ success: true, data: stats || { kills: 0, deaths: 0, play_time: 0, money_earned: 0, money_spent: 0 } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Liste des joueurs connectés
router.get('/online/list', async (req, res) => {
    try {
        const players = await db.query(
            'SELECT id, identifier, faction, health FROM players WHERE connected = 1'
        );
        res.json({ success: true, data: players });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;