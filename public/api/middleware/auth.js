// C:\troxtetherworld\public\api\middleware\auth.js
// Middleware d'authentification

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'troxt-etherworld-secret-2026';

export function auth(requiredRole = null) {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || 
                    req.cookies?.token || 
                    req.query?.token;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Token requis',
          code: 'MISSING_TOKEN'
        });
      }

      const decoded = jwt.verify(token, SECRET);
      
      if (requiredRole && decoded.role !== requiredRole && decoded.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: `Rôle ${requiredRole} requis`,
          code: 'INSUFFICIENT_ROLE'
        });
      }

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
        error: 'Token invalide',
        code: 'INVALID_TOKEN'
      });
    }
  };
}

export function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function generateRefreshToken(userId) {
  return crypto.randomBytes(32).toString('hex');
}

export const requireAdmin = auth('admin');
export const requireMod = auth('mod');