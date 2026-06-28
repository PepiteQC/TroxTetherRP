// C:\troxtetherworld\public\api\routes\auth.js
// Routeurs d'authentification

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../../server/config/database.js';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'troxt-etherworld-secret-2026';

// Connexion
router.post('/login', async (req, res) => {
    try {
        const { identifier, password, token: socialToken } = req.body;

        // Support multi-auth (compte local, Discord, Steam)
        let player;
        if (socialToken) {
            // Auth via token social (Discord, Steam, etc.)
            player = await authenticateSocial(socialToken);
        } else {
            // Auth locale
            player = await db.query(
                'SELECT * FROM players WHERE identifier = ? AND password = SHA2(?, 256)',
                [identifier, password]
            );
            player = player[0];
        }

        if (!player) {
            return res.status(401).json({
                success: false,
                error: 'Identifiants invalides',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Vérifier bannissement
        if (player.banned) {
            const ban = await db.query(
                'SELECT * FROM bans WHERE player_id = ? AND status = "active" AND (expires_at IS NULL OR expires_at > NOW())',
                [player.id]
            );
            if (ban[0]) {
                return res.status(403).json({
                    success: false,
                    error: 'Compte banni',
                    code: 'BANNED',
                    ban: {
                        reason: ban[0].reason,
                        expiresAt: ban[0].expires_at,
                        bannedBy: ban[0].banned_by
                    }
                });
            }
        }

        // Générer tokens
        const accessToken = jwt.sign(
            { id: player.id, identifier: player.identifier, role: player.role || 'player' },
            SECRET,
            { expiresIn: '24h' }
        );

        const refreshToken = crypto.randomBytes(32).toString('hex');

        // Sauvegarder refresh token
        await db.query(
            'UPDATE players SET refresh_token = ?, last_login = NOW() WHERE id = ?',
            [refreshToken, player.id]
        );

        res.json({
            success: true,
            data: {
                token: accessToken,
                refreshToken,
                expiresIn: 86400,
                player: {
                    id: player.id,
                    identifier: player.identifier,
                    role: player.role || 'player'
                }
            }
        });
    } catch (error) {
        console.error('[Auth] Erreur login:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Rafraîchir token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        const [player] = await db.query(
            'SELECT * FROM players WHERE refresh_token = ?',
            [refreshToken]
        );

        if (!player) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token invalide',
                code: 'INVALID_REFRESH'
            });
        }

        const newToken = jwt.sign(
            { id: player.id, identifier: player.identifier, role: player.role || 'player' },
            SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            data: { token: newToken, expiresIn: 86400 }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Inscription
router.post('/register', async (req, res) => {
    try {
        const { identifier, password, email } = req.body;

        // Vérifier si déjà existant
        const [existing] = await db.query(
            'SELECT id FROM players WHERE identifier = ? OR email = ?',
            [identifier, email]
        );

        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Identifiant ou email déjà utilisé',
                code: 'ALREADY_EXISTS'
            });
        }

        // Créer le joueur
        const playerId = `player_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
        await db.query(
            'INSERT INTO players (id, identifier, password, email, role, created_at) VALUES (?, ?, SHA2(?, 256), ?, "player", NOW())',
            [playerId, identifier, password, email]
        );

        const token = jwt.sign(
            { id: playerId, identifier, role: 'player' },
            SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            data: { token, playerId, identifier }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Déconnexion
router.post('/logout', async (req, res) => {
    try {
        await db.query(
            'UPDATE players SET refresh_token = NULL WHERE id = ?',
            [req.user?.id]
        );
        res.json({ success: true, message: 'Déconnecté' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Vérifier token
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ valid: false });
        }

        const decoded = jwt.verify(token, SECRET);
        res.json({ valid: true, user: decoded });
    } catch {
        res.status(401).json({ valid: false });
    }
});

async function authenticateSocial(token) {
    // TODO: Implémenter l'auth Discord, Steam, etc.
    return null;
}

export default router;