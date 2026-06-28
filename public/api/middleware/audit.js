// C:\troxtetherworld\public\api\middleware\audit.js
// Audit logging middleware

import crypto from 'crypto';

export class AuditMiddleware {
  constructor(kernel) {
    this.kernel = kernel;
    this.logs = [];
    this.maxLogs = 10000;
  }

  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      // Intercept la réponse
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        const duration = Date.now() - start;
        
        this._log({
          method: req.method,
          path: req.path,
          userId: req.user?.id,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          statusCode: res.statusCode,
          duration,
          timestamp: new Date().toISOString(),
          hash: crypto.createHash('sha256')
            .update(`${req.method}${req.path}${JSON.stringify(body)}${Date.now()}`)
            .digest('hex')
            .slice(0, 16)
        });

        return originalJson(body);
      };

      next();
    };
  }

  _log(entry) {
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  getLogs(filter = {}, limit = 100) {
    let filtered = this.logs;
    
    if (filter.method) filtered = filtered.filter(l => l.method === filter.method);
    if (filter.path) filtered = filtered.filter(l => l.path.includes(filter.path));
    if (filter.userId) filtered = filtered.filter(l => l.userId === filter.userId);
    if (filter.statusCode) filtered = filtered.filter(l => l.statusCode === filter.statusCode);
    
    return filtered.slice(0, limit);
  }
}