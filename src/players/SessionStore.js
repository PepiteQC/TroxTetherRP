// server/src/players/SessionStore.js
export class SessionStore {
  constructor(redisClient) {
    this.redis = redisClient;
    this.prefix = 'session:';
    this.ttl = 3600; // 1h avant expiration session
  }

  async create(playerId, data) {
    const key = `${this.prefix}${playerId}`;
    await this.redis.set(key, JSON.stringify({
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }), 'EX', this.ttl);
  }

  async update(playerId, partialData) {
    const key = `${this.prefix}${playerId}`;
    const existing = await this.get(playerId);
    if (!existing) return;
    
    await this.redis.set(key, JSON.stringify({
      ...existing,
      ...partialData,
      updatedAt: Date.now()
    }), 'EX', this.ttl);
  }

  async get(playerId) {
    const key = `${this.prefix}${playerId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getAll() {
    const keys = await this.redis.keys(`${this.prefix}*`);
    const sessions = new Map();
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const playerId = key.replace(this.prefix, '');
        sessions.set(playerId, JSON.parse(data));
      }
    }
    
    return sessions;
  }

  async delete(playerId) {
    const key = `${this.prefix}${playerId}`;
    await this.redis.del(key);
  }

  async extendTTL(playerId, ttl = this.ttl) {
    const key = `${this.prefix}${playerId}`;
    await this.redis.expire(key, ttl);
  }
}