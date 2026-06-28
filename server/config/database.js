// C:\troxtetherworld\server\config\database.js
import mysql from 'mysql2/promise';
import config from './index.js';

class Database {
  constructor() {
    this.pool = null;
    this.connected = false;
  }

  async connect() {
    try {
      this.pool = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.name,
        waitForConnections: true,
        connectionLimit: config.database.pool.max,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      });

      // Test la connexion
      const connection = await this.pool.getConnection();
      connection.release();
      this.connected = true;

      console.log(`[DB] Connecté à MySQL ${config.database.host}:${config.database.port}/${config.database.name}`);
      return this;
    } catch (error) {
      console.error('[DB] Erreur connexion:', error.message);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      const [results] = await this.pool.execute(sql, params);
      return results;
    } catch (error) {
      console.error('[DB] Erreur query:', error.message);
      throw error;
    }
  }

  async getConnection() {
    return this.pool.getConnection();
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
      console.log('[DB] Connexion fermée');
    }
  }
}

export default new Database();