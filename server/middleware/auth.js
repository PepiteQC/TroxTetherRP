// C:\troxtetherworld\server\middleware\auth.js
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export const auth = (requiredPermission = null) => {
  return async (req, res, next) => {
    try {
      // Récupérer le token
      const token = req.headers.authorization?.replace('Bearer ', '') || 
                    req.cookies?.token;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Token requis'
        });
      }

      // Vérifier le token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Vérifier si banni
      const [ban] = await db.query(
        'SELECT * FROM bans WHERE player_id = ? AND status = "active" AND (expires_at IS NULL OR expires_at > NOW())',
        [decoded.id]
      );

      if (ban) {
        return res.status(403).json({
          success: false,
          error: 'Compte banni',
          ban: {
            reason: ban.reason,
            expiresAt: ban.expires_at,
            bannedBy: ban.banned_by
          }
        });
      }

      // Vérifier les permissions si nécessaire
      if (requiredPermission) {
        const hasPermission = await checkPermission(decoded.id, requiredPermission);
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: 'Permissions insuffisantes'
          });
        }
      }

      // Attacher l'utilisateur à la requête
      req.user = decoded;
      req.token = token;

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expiré',
          code: 'TOKEN_EXPIRED'
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Token invalide'
      });
    }
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
    }
  } catch (e) {
    // Pas de token = pas d'utilisateur, mais on continue
  }
  next();
};

async function checkPermission(userId, permission) {
  const [user] = await db.query(
    'SELECT permissions FROM admins WHERE player_id = ?',
    [userId]
  );
  
  if (!user) return false;
  
  const permissions = JSON.parse(user.permissions || '[]');
  return permissions.includes(permission) || permissions.includes('*');
}

export const requireAdmin = auth('admin');
export const requireMod = auth('mod');