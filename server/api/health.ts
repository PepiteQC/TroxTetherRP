import { Router } from 'express';
import os from 'os';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'EtherWorld RP API',
    version: '3.0.0',
    uptime: process.uptime(),
    timestamp: Date.now(),
    system: {
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuLoad: os.loadavg()[0],
      platform: os.platform()
    }
  });
});