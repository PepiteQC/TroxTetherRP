// C:\troxtetherworld\server\config\redis.js
import { createClient } from 'redis';
import config from './index.js';

class RedisClient {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    try {
      this.client = createClient({
        url: `redis://${config.redis.host}:${config.redis.port}`,
        password: config.redis.password || undefined,
        database: config.redis.db
      });

      this.client.on('error', (err) => {
        console.error('[Redis] Erreur:', err.message);
      });

      this.client.on('connect', () => {
        this.connected = true;
        console.log('[Redis] Connecté');
      });

      await this.client.connect();
      return this;
    } catch (error) {
      console.error('[Redis] Erreur connexion:', error.message);
      throw error;
    }
  }

  async get(key) {
    return this.client.get(key);
  }

  async set(key, value, ttl = null) {
    if (ttl) {
      return this.client.setEx(key, ttl, value);
    }
    return this.client.set(key, value);
  }

  async del(key) {
    return this.client.del(key);
  }

  async keys(pattern) {
    return this.client.keys(pattern);
  }

  async close() {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
      console.log('[Redis] Déconnecté');
    }
  }
}

export default new RedisClient();