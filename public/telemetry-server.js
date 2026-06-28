// ============================================================
// TROXT TELEMETRY SERVER V2
// C:\TroxTServerRP\telemetry-server.js
// Serveur de télémétrie — HTTP + WebSocket + REST
// Se branche sur agentBus sans toucher au server principal
// ============================================================

import { agentBus } from './agentBus.js'
import http         from 'http'
import { WebSocketServer } from 'ws'
import express      from 'express'
import cors         from 'cors'

const app    = express()
const server = http.createServer(app)
const wss    = new WebSocketServer({ server })

app.use(cors())
app.use(express.json())

const ALLOWED_COMMANDS = [
  'assign_task', 'pause', 'resume', 'stop',
  'ask_status', 'request_score', 'sync_team',
  'escalate_brain', 'trigger_sim', 'deploy_now'
]

// ── BROADCAST WEBSOCKET ────────────────────────────────────
function broadcast(data) {
  const msg = JSON.stringify(data)
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg)
  })
}

// ── ÉCOUTE DU BUS ─────────────────────────────────────────
agentBus.on('agent:update', ({ agentId, agent, auditEntry }) => {
  broadcast({
    type:          'AGENT_UPDATE',
    agent_id:      agentId,
    agent,
    thirdEyeLevel: agentBus.thirdEyeLevel,
    stats:         agentBus.stats,
    activeCombo:   agentBus.activeCombo,
    auditEntry:    auditEntry || null
  })
})

agentBus.on('agent:offline', ({ agentId }) => {
  broadcast({
    type:      'AGENT_OFFLINE',
    agent_id:  agentId,
    timestamp: new Date().toISOString()
  })
})

agentBus.on('command:sent', ({ agentId, command }) => {
  broadcast({
    type:     'COMMAND_SENT',
    agent_id: agentId,
    command
  })
})

// ── REST API ───────────────────────────────────────────────

// POST /events — agent envoie son état
app.post('/events', (req, res) => {
  const event = req.body
  const { agent_id } = event

  if (!agent_id) {
    return res.status(400).json({ error: 'agent_id requis' })
  }

  // Si agent pas encore enregistré, on l'enregistre
  if (agentBus.agents[agent_id] &&
      agentBus.agents[agent_id].status === 'offline') {
    agentBus.registerAgent(agent_id)
  }

  agentBus.updateAgent(agent_id, {
    status:            event.status,
    type:              event.type,
    message:           event.message,
    qualityScore:      event.quality_score,
    thirdEyeStatus:    event.third_eye_status,
    brainValidated:    event.brain_validated,
    connectionsNeeded: event.connections_needed,
    filesProduced:     event.files_produced,
    currentTask:       event.task_id,
    meta:              event.meta || {}
  })

  res.json({ ok: true })
})

// GET /agents — état de tous les agents
app.get('/agents', (req, res) => {
  res.json(agentBus.agents)
})

// GET /agents/:id — état d'un agent
app.get('/agents/:agent_id', (req, res) => {
  const agent = agentBus.agents[req.params.agent_id]
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  res.json(agent)
})

// GET /agents/:id/commands — agent récupère ses commandes
app.get('/agents/:agent_id/commands', (req, res) => {
  const cmds = agentBus.pullCommands(req.params.agent_id)
  res.json(cmds)
})

// POST /commands — envoyer une commande à un agent
app.post('/commands', (req, res) => {
  const { agent_id, type, payload, priority, authorized_by } = req.body

  if (type === 'ALL_PAUSE') {
    const { OFFICIAL_AGENTS } = agentBus
    Object.keys(agentBus.commands).forEach(id => {
      agentBus.pushCommand(id, { type: 'pause', source: 'TroxTLab' })
    })
    broadcast({ type: 'ALL_PAUSE', timestamp: new Date().toISOString() })
    return res.json({ ok: true })
  }

  if (!agentBus.agents[agent_id]) {
    return res.status(404).json({ error: 'Agent non reconnu' })
  }

  if (!ALLOWED_COMMANDS.includes(type)) {
    return res.status(400).json({ error: 'Commande non autorisée', allowed: ALLOWED_COMMANDS })
  }

  const cmd = agentBus.pushCommand(agent_id, {
    type,
    priority:      priority || 'normal',
    payload:       payload || {},
    authorized_by: authorized_by || 'TroxTLab',
    source:        'TroxTLab'
  })

  res.json({ ok: true, command: cmd })
})

// GET /status — état global du système
app.get('/status', (req, res) => {
  const online = Object.values(agentBus.agents)
    .filter(a => a.status !== 'offline').length

  res.json({
    system:        'TroxT-RP',
    lab_version:   '2.0',
    timestamp:     new Date().toISOString(),
    thirdEyeLevel: agentBus.thirdEyeLevel,
    activeCombo:   agentBus.activeCombo,
    stats:         agentBus.stats,
    agentsOnline:  online,
    agentsTotal:   Object.keys(agentBus.agents).length
  })
})

// GET /audit — log complet
app.get('/audit', (req, res) => {
  res.json(agentBus.auditLog.slice(0, 100))
})

// GET /telemetry — format legacy socket.io compatible
app.get('/telemetry', (req, res) => {
  res.json(agentBus.getAgentsState())
})

// ── WEBSOCKET ──────────────────────────────────────────────
wss.on('connection', (ws) => {
  console.log('[TroxT Lab] UI connectee')

  // Envoie état complet à la connexion
  ws.send(JSON.stringify({
    type: 'FULL_STATE',
    ...agentBus.getFullState()
  }))

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg)
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }))
      }
    } catch(e) {}
  })

  ws.on('close', () => {
    console.log('[TroxT Lab] UI deconnectee')
  })
})

// ── HEARTBEAT MONITOR ──────────────────────────────────────
agentBus.startHeartbeatMonitor(30000)

// ── START ──────────────────────────────────────────────────
const PORT = process.env.TROXTLAB_PORT || 4242

server.listen(PORT, () => {
  console.log('')
  console.log('  ╔══════════════════════════════════════════╗')
  console.log('  ║       TROXT TELEMETRY SERVER V2          ║')
  console.log('  ║   Observatoire des Agents TroxT RP       ║')
  console.log('  ╠══════════════════════════════════════════╣')
  console.log(`  ║  HTTP  → http://localhost:${PORT}            ║`)
  console.log(`  ║  WS    → ws://localhost:${PORT}              ║`)
  console.log('  ║  Status: GREEN ✓                         ║')
  console.log('  ╚══════════════════════════════════════════╝')
  console.log('')
})

export { server, wss, app }
