/**
 * TROXT — Serveur API + WebSocket
 * S'intègre À CÔTÉ du server.mjs existant — nouveau port 4200
 * Ne touche RIEN au serveur platform-tester-3d
 *
 * Usage: node troxt-server.mjs
 * Port:  4200
 */

import express         from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import Troxt           from './troxt-core.mjs';

const app    = express();
const server = createServer(app);
const wss    = new WebSocketServer({ server });
const PORT   = 4200;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ─── DÉMARRAGE TROXT ──────────────────────────────────────────────────────────
const troxt = new Troxt();
troxt.boot();

// ─── BROADCAST WEBSOCKET ──────────────────────────────────────────────────────
const wsClients = new Set();

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data, ts: new Date().toISOString() });
  wsClients.forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
}

// Écouter les événements TROXT → pousser aux clients WebSocket
troxt.on('decisions',    (d)  => broadcast('TROXT_DECISIONS',   d));
troxt.on('report',       (r)  => broadcast('TROXT_REPORT',      r));
troxt.on('agent:online', (a)  => broadcast('AGENT_ONLINE',      a));
troxt.on('agent:error',  (a)  => broadcast('AGENT_ERROR',       a));
troxt.on('agent:remind', (a)  => broadcast('AGENT_REMIND',      a));
troxt.on('task:assigned',(t)  => broadcast('TASK_ASSIGNED',     t));
troxt.on('task:completed',(t) => broadcast('TASK_COMPLETED',    t));

// ─── WEBSOCKET ────────────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  wsClients.add(ws);
  // Envoyer rapport immédiat à la connexion
  ws.send(JSON.stringify({
    type: 'TROXT_HELLO',
    data: troxt.getReport(),
    ts:   new Date().toISOString(),
  }));

  ws.on('close', () => wsClients.delete(ws));
  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'PING_AGENT' && msg.agentId) {
        troxt.forcePing(msg.agentId).then(ok => {
          ws.send(JSON.stringify({ type: 'PING_RESULT', agentId: msg.agentId, ok }));
        });
      }
    } catch (e) {}
  });
});

// ─── API REST TROXT ───────────────────────────────────────────────────────────

// Rapport global
app.get('/troxt/report', (req, res) => {
  res.json(troxt.getReport());
});

// État d'un agent
app.get('/troxt/agents', (req, res) => {
  res.json({
    agents: Object.fromEntries(
      Object.entries(troxt.agents).map(([id, a]) => [id, {
        id:         a.id,
        name:       a.name,
        icon:       a.icon,
        role:       a.role,
        status:     a.status,
        lastSeen:   a.lastSeen ? new Date(a.lastSeen).toISOString() : null,
        errorCount: a.errorCount,
        tasks:      a.tasks,
        taskQueue:  a.taskQueue,
      }])
    ),
  });
});

app.get('/troxt/agents/:id', (req, res) => {
  const status = troxt.getAgentStatus(req.params.id);
  if (!status) return res.status(404).json({ error: 'Agent inconnu' });
  res.json(status);
});

// Ping forcé
app.post('/troxt/agents/:id/ping', async (req, res) => {
  const ok = await troxt.forcePing(req.params.id);
  res.json({ agentId: req.params.id, ok, timestamp: new Date().toISOString() });
});

// Assigner une tâche
app.post('/troxt/tasks', (req, res) => {
  const { agentId, description, priority } = req.body;
  if (!agentId || !description) {
    return res.status(400).json({ error: 'agentId et description requis' });
  }
  const task = troxt.assignTask(agentId, description, priority || 'normal');
  if (!task) return res.status(404).json({ error: 'Agent inconnu' });
  res.json({ success: true, task });
});

// Compléter une tâche
app.post('/troxt/tasks/:id/complete', (req, res) => {
  const task = troxt.completeTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tâche introuvable' });
  res.json({ success: true, task });
});

// Logs récents
app.get('/troxt/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({ logs: troxt.logger.getLast(limit) });
});

// Mémoire TROXT
app.get('/troxt/memory', (req, res) => {
  res.json(troxt.memory.data);
});

// Décisions récentes
app.get('/troxt/decisions', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json({ decisions: troxt.memory.data.decisions.slice(0, limit) });
});

// ─── DÉMARRAGE ────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\x1b[35m⬡ TROXT API   → http://localhost:${PORT}/troxt/report\x1b[0m`);
  console.log(`\x1b[35m⬡ TROXT WS    → ws://localhost:${PORT}\x1b[0m`);
});

process.on('SIGINT',  () => { troxt.shutdown(); process.exit(0); });
process.on('SIGTERM', () => { troxt.shutdown(); process.exit(0); });

export default troxt;
