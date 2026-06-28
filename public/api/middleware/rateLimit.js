// C:\troxtetherworld\public\api\middleware\rateLimit.js
// Rate limiting avancé

import { createClient } from 'redis';

export class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.maxRequests || 100;
    this.maxPerIP = options.maxPerIP || 200;
    this.maxPerUser = options.maxPerUser || 50;
    this.redis = null;
    this.local = new Map();
  }

  async initialize() {
    try {
      this.redis = createClient({ url: process.env.REDIS_URL });
      await this.redis.connect();
      console.log('[RateLimit] Redis connecté');
    } catch {
      console.log('[RateLimit] Redis indisponible, mode local');
    }
  }

  middleware(options = {}) {
    const windowMs = options.windowMs || this.windowMs;
    const max = options.max || this.maxRequests;

    return async (req, res, next) => {
      const key = this._getKey(req);
      const current = await this._increment(key, windowMs);

      const headers = {
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': Math.max(0, max - current.count),
        'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000)
      };

      res.set(headers);

      if (current.count > max) {
        return res.status(429).json({
          success: false,
          error: 'Trop de requêtes',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((current.resetTime - Date.now()) / 1000)
        });
      }

      next();
    };
  }

  async _increment(key, windowMs) {
    if (this.redis) {
      return this._redisIncrement(key, windowMs);
    }
    return this._localIncrement(key, windowMs);
  }

  async _redisIncrement(key, windowMs) {
    const now = Date.now();
    const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;
    
    const count = await this.redis.incr(windowKey);
    if (count === 1) {
      await this.redis.pExpire(windowKey, windowMs);
    }

    return {
      count,
      resetTime: Math.ceil(now / windowMs) * windowMs + windowMs
    };
  }

  _localIncrement(key, windowMs) {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;
    
    const record = this.local.get(windowKey) || { count: 0, resetTime: now + windowMs };
    record.count++;
    this.local.set(windowKey, record);

    // Nettoyage
    if (this.local.size > 10000) {
      const expired = [];
      for (const [key, val] of this.local) {
        if (Date.now() > val.resetTime) expired.push(key);
      }
      expired.forEach(k => this.local.delete(k));
    }

    return record;
  }

  _getKey(req) {
    const userId = req.user?.id;
    const ip = req.ip || req.connection?.remoteAddress;
    return userId ? `user:${userId}` : `ip:${ip}`;
  }
}

export const rateLimit = new RateLimiter();