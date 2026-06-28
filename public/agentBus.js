// ============================================================
// TROXT AGENT BUS V3
// C:\TroxTServerRP\agentBus.js
// Bus central — relie tous les agents au TroxT Lab
// ============================================================

import { EventEmitter } from 'events'

// ── Constantes ───────────────────────────────────────────────

export const OFFICIAL_AGENTS = [
  'troxt-brain',
  'third-eye',
  'intellectus',
  'ether-core',
  'ether-prism',
  'ether-forge',
  'ether-weave',
  'ether-guard',
  'ether-ui',
  'ether-lens',
  'ether-sim',
  'forge-factory',
  'ether-deploy',
  'ether-memory',
]

export const ORBIT_MAP = {
  'troxt-brain':   { orbit: 0, index: 0 },
  'third-eye':     { orbit: 1, index: 0 },
  'intellectus':   { orbit: 1, index: 1 },
  'ether-core':    { orbit: 2, index: 0 },
  'ether-prism':   { orbit: 2, index: 1 },
  'ether-forge':   { orbit: 2, index: 2 },
  'ether-weave':   { orbit: 2, index: 3 },
  'ether-guard':   { orbit: 3, index: 0 },
  'ether-ui':      { orbit: 3, index: 1 },
  'ether-lens':    { orbit: 3, index: 2 },
  'ether-sim':     { orbit: 3, index: 3 },
  'forge-factory': { orbit: 4, index: 0 },
  'ether-deploy':  { orbit: 4, index: 1 },
  'ether-memory':  { orbit: 4, index: 2 },
}

export const COLOR_MAP = {
  offline:    'GREY',
  idle:       'BLUE',
  working:    'GREEN',
  thinking:   'GREEN',
  waiting:    'YELLOW',
  paused:     'YELLOW',
  error:      'RED',
  stopped:    'GREY',
  validating: 'PURPLE',
}

// Timeout avant qu'un agent soit marqué offline (ms)
const HEARTBEAT_TIMEOUT_MS = 30_000
// Intervalle de vérification heartbeat (ms)
const HEARTBEAT_CHECK_MS   = 10_000
// Max entrées dans auditLog
const MAX_AUDIT_ENTRIES    = 500
// Max entrées dans l'historique d'un agent
const MAX_AGENT_HISTORY    = 50
// Max commandes en attente par agent
const MAX_PENDING_COMMANDS = 100

// ── AgentBus ─────────────────────────────────────────────────

class AgentBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(64)

    /** @type {Record<string, AgentState>} */
    this.agents = {}

    /** @type {Record<string, Command[]>} */
    this.commands = {}

    /** @type {AuditEntry[]} */
    this.auditLog = []

    /** @type {BusStats} */
    this.stats = {
      activeTasks:    0,
      completedToday: 0,
      blocked:        0,
      warnings:       0,
      totalEvents:    0,
    }

    this.thirdEyeLevel = 'GREEN'
    this.activeCombo   = null

    /** @type {ReturnType<typeof setInterval> | null} */
    this._heartbeatTimer = null

    // Init tous les agents officiels
    for (const id of OFFICIAL_AGENTS) {
      const orbitData = ORBIT_MAP[id] ?? { orbit: 0, index: 0 }
      this.agents[id] = this._makeAgent(id, orbitData)
      this.commands[id] = []
    }
  }

  // ── FACTORY AGENT ─────────────────────────────────────────

  /**
   * @param {string} id
   * @param {{ orbit: number, index: number }} orbitData
   */
  _makeAgent(id, orbitData) {
    return {
      id,
      name:              id,
      status:            'offline',
      color:             'GREY',
      orbit:             orbitData.orbit,
      orbitIndex:        orbitData.index,
      position:          { x: 0, y: 0, z: 0 },
      currentLoad:       0,
      lastSeen:          null,
      currentTask:       null,
      qualityScore:      null,
      thirdEyeStatus:    null,
      brainValidated:    false,
      connectionsNeeded: [],
      filesProduced:     [],
      history:           [],
    }
  }

  // ── ENREGISTREMENT AGENT ──────────────────────────────────

  /**
   * @param {string} agentId
   * @param {{ position?: {x:number,y:number,z:number} }} [meta]
   * @returns {boolean}
   */
  registerAgent(agentId, meta = {}) {
    if (!this.agents[agentId]) {
      console.warn(`[AgentBus] ⚠️  Agent non officiel ignoré: "${agentId}"`)
      return false
    }

    const agent    = this.agents[agentId]
    agent.status   = 'idle'
    agent.color    = 'BLUE'
    agent.lastSeen = new Date().toISOString()

    if (meta?.position && this._isValidPosition(meta.position)) {
      agent.position = meta.position
    }

    this._addAudit('registered', agentId, `${agentId} enregistré`)
    this._emitAgentUpdate(agentId, agent)
    this._emitTelemetry({
      agent_id:  agentId,
      type:      'registered',
      status:    'idle',
      message:   `${agentId} connecté au bus`,
      timestamp: new Date().toISOString(),
    })

    return true
  }

  // ── MISE À JOUR ÉTAT AGENT ────────────────────────────────

  /**
   * @param {string} agentId
   * @param {Partial<AgentUpdate>} update
   * @returns {boolean}
   */
  updateAgent(agentId, update = {}) {
    if (!this.agents[agentId]) {
      console.warn(`[AgentBus] updateAgent: agent inconnu "${agentId}"`)
      return false
    }

    const agent = this.agents[agentId]
    const {
      status, message, type,
      qualityScore, thirdEyeStatus, brainValidated,
      connectionsNeeded, filesProduced,
      currentTask, currentLoad, meta,
    } = update

    // Appliquer uniquement les champs fournis
    if (status !== undefined)          agent.status              = status
    if (currentTask !== undefined)     agent.currentTask         = currentTask
    if (currentLoad !== undefined)     agent.currentLoad         = Number(currentLoad) || 0
    if (qualityScore !== undefined)    agent.qualityScore        = qualityScore
    if (thirdEyeStatus !== undefined)  agent.thirdEyeStatus      = thirdEyeStatus
    if (brainValidated !== undefined)  agent.brainValidated      = Boolean(brainValidated)
    if (connectionsNeeded !== undefined) agent.connectionsNeeded = connectionsNeeded
    if (filesProduced !== undefined)   agent.filesProduced       = filesProduced
    if (meta?.combo !== undefined)     this.activeCombo          = meta.combo

    agent.color    = this._getColor(agent.status, agent.thirdEyeStatus)
    agent.lastSeen = new Date().toISOString()

    // ── Stats ─────────────────────────────────────────────
    const eventType = type || 'update'
    this.stats.totalEvents++

    switch (eventType) {
      case 'task_started':
        this.stats.activeTasks++
        break
      case 'task_completed':
        this.stats.activeTasks = Math.max(0, this.stats.activeTasks - 1)
        this.stats.completedToday++
        break
      case 'task_failed':
        this.stats.blocked++
        break
      case 'warning':
        this.stats.warnings++
        break
    }

    // ── Third Eye global ──────────────────────────────────
    if (thirdEyeStatus === 'RED') {
      this.thirdEyeLevel = 'RED'
    } else if (thirdEyeStatus === 'ORANGE' && this.thirdEyeLevel !== 'RED') {
      this.thirdEyeLevel = 'ORANGE'
    }

    // ── Historique agent ──────────────────────────────────
    agent.history.unshift({
      type:      eventType,
      status:    agent.status,
      message:   message ?? '',
      timestamp: new Date().toISOString(),
    })
    if (agent.history.length > MAX_AGENT_HISTORY) {
      agent.history.length = MAX_AGENT_HISTORY
    }

    const auditEntry = this._addAudit(eventType, agentId, message ?? '')

    this._emitAgentUpdate(agentId, agent, auditEntry)
    this._emitTelemetry({
      agent_id:         agentId,
      type:             eventType,
      status:           agent.status,
      message:          message ?? '',
      quality_score:    qualityScore,
      third_eye_status: thirdEyeStatus,
      brain_validated:  brainValidated,
      timestamp:        new Date().toISOString(),
      meta:             meta ?? {},
    })

    return true
  }

  // ── COMMANDES ─────────────────────────────────────────────

  /**
   * @param {string} agentId
   * @param {{ type: string, payload?: any }} command
   * @returns {Command | false}
   */
  pushCommand(agentId, command) {
    if (!this.commands[agentId]) {
      console.warn(`[AgentBus] pushCommand: agent inconnu "${agentId}"`)
      return false
    }

    // Limite file de commandes
    if (this.commands[agentId].length >= MAX_PENDING_COMMANDS) {
      console.warn(`[AgentBus] File pleine pour "${agentId}" (max ${MAX_PENDING_COMMANDS})`)
      return false
    }

    const cmd = {
      command_id: `cmd-${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      agent_id:   agentId,
      type:       command.type ?? 'unknown',
      payload:    command.payload ?? {},
      timestamp:  new Date().toISOString(),
    }

    this.commands[agentId].push(cmd)
    this._addAudit('command', agentId, `Commande: ${cmd.type}`, { cmd })
    this.emit('command:sent', { agentId, command: cmd })

    return cmd
  }

  /**
   * Récupère et vide la file de commandes d'un agent
   * @param {string} agentId
   * @returns {Command[]}
   */
  pullCommands(agentId) {
    const pending          = this.commands[agentId] ?? []
    this.commands[agentId] = []
    return pending
  }

  // ── STATE COMPLET ─────────────────────────────────────────

  getFullState() {
    return {
      agents:        this.agents,
      stats:         this.stats,
      thirdEyeLevel: this.thirdEyeLevel,
      activeCombo:   this.activeCombo,
      auditLog:      this.auditLog.slice(0, 50),
      timestamp:     new Date().toISOString(),
    }
  }

  // ── FORMAT TELEMETRY (compat socket.io ancien format) ─────

  getAgentsState() {
    return Object.values(this.agents).map(agent => ({
      id:           agent.id,
      name:         agent.name,
      status:       agent.status,
      color:        agent.color,
      position:     agent.position,
      orbit:        agent.orbit,
      orbitIndex:   agent.orbitIndex,
      load:         agent.currentLoad ?? 0,
      lastSeen:     agent.lastSeen,
      currentTask:  agent.currentTask,
      qualityScore: agent.qualityScore,
      history:      agent.history.slice(0, 5),
    }))
  }

  // ── STATS GLOBALES ────────────────────────────────────────

  getStats() {
    const all      = Object.values(this.agents)
    const online   = all.filter(a => a.status !== 'offline').length
    const working  = all.filter(a => a.status === 'working' || a.status === 'thinking').length

    return {
      ...this.stats,
      totalAgents:  all.length,
      onlineAgents: online,
      workingAgents: working,
      thirdEyeLevel: this.thirdEyeLevel,
    }
  }

  // ── HEARTBEAT ─────────────────────────────────────────────

  startHeartbeatMonitor(timeoutMs = HEARTBEAT_TIMEOUT_MS) {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer)
    }

    this._heartbeatTimer = setInterval(() => {
      const now = Date.now()

      for (const id of OFFICIAL_AGENTS) {
        const agent = this.agents[id]
        if (!agent || agent.status === 'offline' || !agent.lastSeen) continue

        const lastMs = new Date(agent.lastSeen).getTime()
        if (isNaN(lastMs)) continue

        if (now - lastMs > timeoutMs) {
          agent.status = 'offline'
          agent.color  = 'GREY'

          this._addAudit('offline', id, `${id} — timeout heartbeat`)
          this.emit('agent:offline', { agentId: id })
          this._emitTelemetry({
            agent_id:  id,
            type:      'offline',
            status:    'offline',
            message:   `${id} — hors ligne (timeout ${timeoutMs}ms)`,
            timestamp: new Date().toISOString(),
          })
        }
      }
    }, HEARTBEAT_CHECK_MS)

    // Ne pas bloquer l'arrêt du process
    if (this._heartbeatTimer.unref) {
      this._heartbeatTimer.unref()
    }

    return this
  }

  stopHeartbeatMonitor() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer)
      this._heartbeatTimer = null
    }
    return this
  }

  // ── RESET STATS QUOTIDIENNES ──────────────────────────────

  resetDailyStats() {
    this.stats.completedToday = 0
    this.stats.warnings       = 0
    this.stats.blocked        = 0
    return this
  }

  // ── RESET THIRD EYE ───────────────────────────────────────

  resetThirdEye() {
    this.thirdEyeLevel = 'GREEN'
    for (const agent of Object.values(this.agents)) {
      if (agent.thirdEyeStatus && agent.thirdEyeStatus !== 'GREEN') {
        agent.thirdEyeStatus = 'GREEN'
        agent.color = this._getColor(agent.status, 'GREEN')
      }
    }
    this._addAudit('thirdeye_reset', 'system', 'Third Eye réinitialisé à GREEN')
    return this
  }

  // ── DISPOSE ───────────────────────────────────────────────

  dispose() {
    this.stopHeartbeatMonitor()
    this.removeAllListeners()
  }

  // ── HELPERS PRIVÉS ────────────────────────────────────────

  _getColor(status, thirdEyeStatus) {
    if (thirdEyeStatus === 'RED')    return 'RED'
    if (thirdEyeStatus === 'ORANGE') return 'ORANGE'
    if (thirdEyeStatus === 'YELLOW') return 'YELLOW'
    return COLOR_MAP[status] ?? 'BLUE'
  }

  /**
   * @param {string} type
   * @param {string} agentId
   * @param {string} message
   * @param {any} [data]
   * @returns {AuditEntry}
   */
  _addAudit(type, agentId, message, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      agentId,
      message,
      data,
    }
    this.auditLog.unshift(entry)

    // Trim
    if (this.auditLog.length > MAX_AUDIT_ENTRIES) {
      this.auditLog.length = MAX_AUDIT_ENTRIES
    }

    return entry
  }

  _emitAgentUpdate(agentId, agent, auditEntry = null) {
    this.emit('agent:update', { agentId, agent, auditEntry })
  }

  _emitTelemetry(data) {
    this.emit('telemetry:event', data)
  }

  /**
   * @param {{ x: any, y: any, z: any }} pos
   */
  _isValidPosition(pos) {
    return (
      pos !== null &&
      typeof pos === 'object' &&
      typeof pos.x === 'number' && isFinite(pos.x) &&
      typeof pos.y === 'number' && isFinite(pos.y) &&
      typeof pos.z === 'number' && isFinite(pos.z)
    )
  }
}

// ── Singleton ────────────────────────────────────────────────

export const agentBus = new AgentBus()

// Démarrer heartbeat auto
agentBus.startHeartbeatMonitor()

// Reset stats chaque jour à minuit
const now         = new Date()
const msToMidnight = new Date(
  now.getFullYear(), now.getMonth(), now.getDate() + 1,
  0, 0, 0, 0
).getTime() - now.getTime()

setTimeout(() => {
  agentBus.resetDailyStats()
  setInterval(() => agentBus.resetDailyStats(), 24 * 60 * 60 * 1000)
}, msToMidnight)