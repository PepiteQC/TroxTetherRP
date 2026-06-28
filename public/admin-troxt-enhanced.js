// ============================================================
//  ETHERWORLD ADMIN — TROXT ENHANCED EXTENSION
//  Additif uniquement : ne remplace pas public/admin.js
// ============================================================
;(function () {
  'use strict'

  if (window.__ETHERWORLD_ADMIN_TROXT_ENHANCED__) return
  window.__ETHERWORLD_ADMIN_TROXT_ENHANCED__ = true

  const VERSION = '3.0.0-enhanced'
  const CACHE_TTL_MS = 1750
  const REQUEST_TIMEOUT_MS = 6500
  const TELEMETRY_INTERVAL_MS = 2000
  const METRICS_INTERVAL_MS = 3500
  const MAX_CONSOLE_LINES = 120

  const now = () => Date.now()
  const hasDOM = () => typeof document !== 'undefined'
  const $ = (selector, root = document) => root.querySelector(selector)
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector))

  function escapeHTML(value) {
    const div = document.createElement('div')
    div.textContent = value == null ? '' : String(value)
    return div.innerHTML
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
  }

  function formatMs(ms) {
    if (!Number.isFinite(ms)) return '—'
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  function formatTime(ts) {
    if (!ts) return '—'
    return new Date(ts).toLocaleTimeString()
  }

  function stableStringify(value) {
    try {
      return JSON.stringify(value, Object.keys(value || {}).sort())
    } catch {
      return String(value)
    }
  }

  class AdminTroxTEnhanced {
    constructor() {
      this.admin = null
      this.cache = new Map()
      this.inFlight = new Map()
      this.consoleLines = []
      this.telemetryTimer = null
      this.metricsTimer = null
      this.lastMetrics = null
      this.lastWorld = null
      this.lastCommandResult = null
      this.lastSyncAt = 0
      this.fps = 60
      this.frameCount = 0
      this.frameStartedAt = performance.now()
      this.stats = {
        requests: 0,
        failures: 0,
        cacheHits: 0,
        events: 0,
        avgLatency: 0,
        lastLatency: 0,
        lastError: null,
        bridgeOnline: false
      }
    }

    init() {
      if (!hasDOM()) return
      this.admin = window.adminPanel || null
      if (!this.admin) {
        this.log('AdminPanel non disponible. Nouvelle tentative...', 'warning')
        setTimeout(() => this.init(), 250)
        return
      }

      this.injectCSS()
      this.injectTroxTTab()
      this.patchAdminPanel()
      this.installBridge()
      this.bindTroxTEvents()
      this.startFPSMonitor()
      this.startTelemetry()

      this.log(`Extension TroxT Admin ${VERSION} initialisée`, 'success')
      this.emit('ready', { version: VERSION })
    }

    // ========================================================
    //  API HAUTE PERFORMANCE — cache + timeout + déduplication
    // ========================================================
    request(path, options = {}) {
      const method = (options.method || 'GET').toUpperCase()
      const bodyKey = options.body ? stableStringify(options.body) : ''
      const cacheKey = `${method}:${path}:${bodyKey}`
      const canCache = method === 'GET' && options.cache !== false
      const cached = this.cache.get(cacheKey)

      if (canCache && cached && now() - cached.createdAt < (options.ttl || CACHE_TTL_MS)) {
        this.stats.cacheHits++
        return Promise.resolve(cached.data)
      }

      if (canCache && this.inFlight.has(cacheKey)) {
        return this.inFlight.get(cacheKey)
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || REQUEST_TIMEOUT_MS)
      const startedAt = performance.now()

      const promise = fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      })
        .then(async (res) => {
          const latency = performance.now() - startedAt
          this.recordLatency(latency)

          if (!res.ok) {
            const text = await res.text().catch(() => '')
            throw new Error(`HTTP ${res.status}${text ? ` — ${text.slice(0, 160)}` : ''}`)
          }

          const data = await res.json().catch(() => ({}))
          if (canCache) this.cache.set(cacheKey, { data, createdAt: now() })
          return data
        })
        .catch((err) => {
          this.stats.failures++
          this.stats.lastError = String(err?.message || err)
          this.log(`API ${method} ${path} échoué: ${this.stats.lastError}`, 'error')
          throw err
        })
        .finally(() => {
          clearTimeout(timeoutId)
          this.inFlight.delete(cacheKey)
          this.stats.requests++
        })

      if (canCache) this.inFlight.set(cacheKey, promise)
      return promise
    }

    recordLatency(latency) {
      this.stats.lastLatency = latency
      this.stats.avgLatency = this.stats.avgLatency
        ? this.stats.avgLatency * 0.82 + latency * 0.18
        : latency
    }

    clearCache() {
      this.cache.clear()
      this.log('Cache admin vidé', 'info')
      this.renderTroxTTab()
    }

    // ========================================================
    //  BRIDGE TROXT — commandes et événements
    // ========================================================
    installBridge() {
      const bridge = {
        version: VERSION,
        execute: (command, payload) => this.executeCommand(command, payload),
        metrics: () => this.fetchMetrics(true),
        world: () => this.fetchWorld(true),
        players: () => this.request('/api/admin/players', { cache: false }),
        logs: (severity = 'all', limit = 80) => this.request(`/api/admin/logs?limit=${limit}&severity=${encodeURIComponent(severity)}`, { cache: false }),
        snapshots: () => this.request('/api/admin/snapshots', { cache: false }),
        backup: (description) => this.createBackup(description),
        server: (action) => this.serverAction(action),
        clearCache: () => this.clearCache(),
        getStatus: () => this.getBridgeStatus(),
        emit: (type, payload) => this.emit(type, payload),
        log: (message, level) => this.log(message, level)
      }

      window.EtherWorldAdminBridge = bridge
      window.troxtAdmin = bridge
      this.stats.bridgeOnline = true
    }

    bindTroxTEvents() {
      window.addEventListener('troxt:admin:command', (event) => {
        const detail = event.detail || {}
        this.executeCommand(detail.command || detail.type || detail, detail.payload)
      })

      window.addEventListener('etherworld:admin:refresh', () => {
        this.refreshAll(true)
      })

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseTelemetry()
        } else {
          this.startTelemetry()
          if (this.admin?.visible) this.refreshAll(false)
        }
      })
    }

    emit(type, payload = {}) {
      this.stats.events++
      const detail = {
        source: 'etherworld-admin-enhanced',
        type,
        timestamp: now(),
        payload
      }

      window.dispatchEvent(new CustomEvent('etherworld:admin:event', { detail }))
      window.dispatchEvent(new CustomEvent('troxt:admin:event', { detail }))

      // Pont optionnel vers un éventuel bus global TroxT déjà présent.
      if (window.troxt?.perceive) {
        try {
          window.troxt.perceive({
            source: 'admin-panel',
            modality: 'system',
            payload: detail,
            timestamp: detail.timestamp,
            urgency: type === 'error' ? 0.9 : 0.45
          })
        } catch (err) {
          this.log(`Pont window.troxt indisponible: ${err}`, 'warning')
        }
      }

      return detail
    }

    getBridgeStatus() {
      return {
        version: VERSION,
        online: this.stats.bridgeOnline,
        adminVisible: Boolean(this.admin?.visible),
        activeTab: this.admin?.activeTab || null,
        fps: this.fps,
        cacheSize: this.cache.size,
        inFlight: this.inFlight.size,
        stats: { ...this.stats },
        lastSyncAt: this.lastSyncAt,
        lastMetrics: this.lastMetrics,
        lastWorld: this.lastWorld
      }
    }

    // ========================================================
    //  UI — Onglet TroxT additif
    // ========================================================
    injectTroxTTab() {
      const tabs = $('.admin-tabs')
      const body = $('.admin-body')
      if (!tabs || !body) return

      if (!$('[data-tab="troxt"]', tabs)) {
        const tab = document.createElement('button')
        tab.className = 'admin-tab admin-tab-troxt'
        tab.dataset.tab = 'troxt'
        tab.textContent = '🧠 TroxT'
        tab.addEventListener('click', () => this.switchToTroxT())
        tabs.appendChild(tab)
      }

      if (!$('#tab-troxt')) {
        const content = document.createElement('div')
        content.className = 'admin-tab-content'
        content.id = 'tab-troxt'
        content.innerHTML = this.getTroxTTabHTML()
        body.appendChild(content)
      }

      this.bindTroxTTabEvents()
      this.renderTroxTTab()
    }

    getTroxTTabHTML() {
      return `
        <div class="troxt-admin-head">
          <div>
            <div class="admin-section-title">TroxT Neural Admin Bridge</div>
            <div class="troxt-admin-sub">Contrôle additif, cache intelligent, diagnostics et commandes admin sans remplacer le panel existant.</div>
          </div>
          <span id="troxt-bridge-status" class="troxt-pill online">Bridge</span>
        </div>

        <div class="troxt-grid" id="troxt-metrics-grid">
          ${this.troxCard('Latency', '—', 'troxt-latency')}
          ${this.troxCard('FPS', '—', 'troxt-fps')}
          ${this.troxCard('Cache', '0', 'troxt-cache')}
          ${this.troxCard('Events', '0', 'troxt-events')}
        </div>

        <div class="admin-section">
          <div class="admin-section-title">Command Center</div>
          <div class="troxt-command-row">
            <input id="troxt-command-input" class="troxt-command-input" type="text" placeholder="Ex: metrics, players, logs, backup, pause, resume, save, world, weather storm, time 18" />
            <button id="troxt-command-run" class="admin-btn primary">Run</button>
          </div>
          <div class="troxt-quick-actions">
            <button class="troxt-action" data-command="metrics">📊 Metrics</button>
            <button class="troxt-action" data-command="players">👥 Players</button>
            <button class="troxt-action" data-command="world">🌍 World</button>
            <button class="troxt-action" data-command="logs">📋 Logs</button>
            <button class="troxt-action" data-command="backup">📦 Backup</button>
            <button class="troxt-action" data-command="save">💾 Save</button>
            <button class="troxt-action warn" data-command="pause">⏸ Pause</button>
            <button class="troxt-action ok" data-command="resume">▶ Resume</button>
            <button class="troxt-action" data-command="clear-cache">🧹 Cache</button>
          </div>
        </div>

        <div class="admin-section">
          <div class="admin-section-title">Live Intelligence</div>
          <div id="troxt-live-state" class="troxt-live-state"></div>
        </div>

        <div class="admin-section">
          <div class="admin-section-title">Bridge Console</div>
          <div id="troxt-console" class="troxt-console"></div>
        </div>
      `
    }

    troxCard(label, value, id) {
      return `
        <div class="troxt-card">
          <div class="troxt-card-value" id="${id}">${escapeHTML(value)}</div>
          <div class="troxt-card-label">${escapeHTML(label)}</div>
        </div>
      `
    }

    bindTroxTTabEvents() {
      const run = $('#troxt-command-run')
      const input = $('#troxt-command-input')
      if (run && !run.dataset.bound) {
        run.dataset.bound = 'true'
        run.addEventListener('click', () => this.runInputCommand())
      }
      if (input && !input.dataset.bound) {
        input.dataset.bound = 'true'
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') this.runInputCommand()
        })
      }

      $$('.troxt-action').forEach((btn) => {
        if (btn.dataset.bound) return
        btn.dataset.bound = 'true'
        btn.addEventListener('click', () => this.executeCommand(btn.dataset.command))
      })
    }

    switchToTroxT() {
      if (this.admin?.switchTab) this.admin.switchTab('troxt')
      else this.manualSwitchTab('troxt')
    }

    manualSwitchTab(tab) {
      $$('.admin-tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab))
      $$('.admin-tab-content').forEach((content) => content.classList.remove('active'))
      const content = $(`#tab-${tab}`)
      if (content) content.classList.add('active')
    }

    renderTroxTTab() {
      const latency = $('#troxt-latency')
      const fps = $('#troxt-fps')
      const cache = $('#troxt-cache')
      const events = $('#troxt-events')
      const live = $('#troxt-live-state')
      const status = $('#troxt-bridge-status')

      if (latency) latency.textContent = formatMs(this.stats.avgLatency)
      if (fps) fps.textContent = String(Math.round(this.fps))
      if (cache) cache.textContent = `${this.cache.size}/${this.stats.cacheHits}`
      if (events) events.textContent = String(this.stats.events)
      if (status) {
        status.textContent = this.stats.bridgeOnline ? 'Bridge Online' : 'Bridge Offline'
        status.classList.toggle('online', this.stats.bridgeOnline)
      }

      if (live) {
        const m = this.lastMetrics || {}
        const w = this.lastWorld || {}
        live.innerHTML = `
          ${this.infoLine('Server', m.server_status || w.server_status || '—')}
          ${this.infoLine('Players', m.player_count ?? w.player_count ?? '—')}
          ${this.infoLine('Platforms', m.platform_count ?? w.platform_count ?? '—')}
          ${this.infoLine('Memory', m.memory ? `${m.memory.used_mb} MB / ${m.memory.percent}%` : '—')}
          ${this.infoLine('Weather', w.weather || '—')}
          ${this.infoLine('World Time', w.time_of_day != null ? `${w.time_of_day}h` : '—')}
          ${this.infoLine('Avg Latency', formatMs(this.stats.avgLatency))}
          ${this.infoLine('Last Sync', formatTime(this.lastSyncAt))}
        `
      }

      this.renderConsole()
    }

    infoLine(key, value) {
      return `<div class="troxt-info-line"><span>${escapeHTML(key)}</span><strong>${escapeHTML(value)}</strong></div>`
    }

    renderConsole() {
      const consoleEl = $('#troxt-console')
      if (!consoleEl) return
      consoleEl.innerHTML = this.consoleLines
        .slice(-MAX_CONSOLE_LINES)
        .map((line) => `
          <div class="troxt-console-line ${line.level}">
            <span>${escapeHTML(formatTime(line.ts))}</span>
            <b>${escapeHTML(line.level.toUpperCase())}</b>
            <em>${escapeHTML(line.message)}</em>
          </div>
        `)
        .join('')
      consoleEl.scrollTop = consoleEl.scrollHeight
    }

    // ========================================================
    //  PATCH RUNTIME — sans modifier admin.js
    // ========================================================
    patchAdminPanel() {
      if (!this.admin || this.admin.__troxtEnhancedPatched) return
      const admin = this.admin
      const ext = this

      const originalLoadTab = admin.loadTab?.bind(admin)
      admin.loadTab = function (tab) {
        if (tab === 'troxt') {
          ext.renderTroxTTab()
          ext.refreshAll(false)
          return
        }
        return originalLoadTab ? originalLoadTab(tab) : undefined
      }

      const originalShow = admin.show?.bind(admin)
      admin.show = function () {
        const result = originalShow ? originalShow() : undefined
        ext.startTelemetry()
        ext.refreshAll(false)
        ext.emit('panel.show', { activeTab: admin.activeTab })
        return result
      }

      const originalHide = admin.hide?.bind(admin)
      admin.hide = function () {
        const result = originalHide ? originalHide() : undefined
        ext.pauseTelemetry()
        ext.emit('panel.hide', {})
        return result
      }

      const originalSwitchTab = admin.switchTab?.bind(admin)
      admin.switchTab = function (tab) {
        if (tab === 'troxt') {
          admin.activeTab = tab
          ext.manualSwitchTab(tab)
          ext.renderTroxTTab()
          ext.refreshAll(false)
          ext.emit('tab.switch', { tab })
          return
        }
        const result = originalSwitchTab ? originalSwitchTab(tab) : undefined
        ext.emit('tab.switch', { tab })
        return result
      }

      admin.__troxtEnhancedPatched = true
    }

    // ========================================================
    //  TÉLÉMÉTRIE
    // ========================================================
    startTelemetry() {
      if (document.hidden) return

      if (!this.telemetryTimer) {
        this.telemetryTimer = setInterval(() => this.renderTroxTTab(), TELEMETRY_INTERVAL_MS)
      }
      if (!this.metricsTimer) {
        this.metricsTimer = setInterval(() => {
          if (!this.admin?.visible || document.hidden) return
          this.refreshAll(false)
        }, METRICS_INTERVAL_MS)
      }
    }

    pauseTelemetry() {
      if (this.telemetryTimer) clearInterval(this.telemetryTimer)
      if (this.metricsTimer) clearInterval(this.metricsTimer)
      this.telemetryTimer = null
      this.metricsTimer = null
    }

    startFPSMonitor() {
      const tick = (timestamp) => {
        this.frameCount++
        const elapsed = timestamp - this.frameStartedAt
        if (elapsed >= 1000) {
          this.fps = clamp((this.frameCount * 1000) / elapsed, 0, 240)
          this.frameCount = 0
          this.frameStartedAt = timestamp
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    async refreshAll(force) {
      try {
        await Promise.allSettled([
          this.fetchMetrics(force),
          this.fetchWorld(force)
        ])
        this.lastSyncAt = now()
        this.renderTroxTTab()
      } catch (err) {
        this.log(`Refresh échoué: ${err}`, 'error')
      }
    }

    async fetchMetrics(force = false) {
      const data = await this.request('/api/admin/metrics', { cache: !force })
      this.lastMetrics = data
      this.emit('metrics', data)
      return data
    }

    async fetchWorld(force = false) {
      const data = await this.request('/api/admin/world', { cache: !force })
      this.lastWorld = data
      this.emit('world', data)
      return data
    }

    // ========================================================
    //  COMMANDES ADMIN
    // ========================================================
    async runInputCommand() {
      const input = $('#troxt-command-input')
      const command = input?.value?.trim()
      if (!command) return
      input.value = ''
      await this.executeCommand(command)
    }

    async executeCommand(command, payload) {
      const raw = typeof command === 'string' ? command.trim() : String(command || '')
      if (!raw) return null

      const [verbRaw, ...args] = raw.split(/\s+/)
      const verb = verbRaw.toLowerCase()
      this.log(`Commande: ${raw}`, 'info')
      this.emit('command.received', { command: raw, payload })

      try {
        let result
        switch (verb) {
          case 'metrics':
          case 'metric':
          case 'stats':
            result = await this.fetchMetrics(true)
            break

          case 'players':
          case 'player':
            result = await this.request('/api/admin/players', { cache: false })
            break

          case 'world':
            result = await this.fetchWorld(true)
            break

          case 'logs':
          case 'log':
            result = await this.request('/api/admin/logs?limit=80&severity=all', { cache: false })
            break

          case 'snapshots':
          case 'snapshot':
            result = await this.request('/api/admin/snapshots', { cache: false })
            break

          case 'backup':
            result = await this.createBackup(args.join(' ') || payload?.description)
            break

          case 'pause':
          case 'resume':
          case 'save':
            result = await this.serverAction(verb)
            break

          case 'clear-cache':
          case 'cache':
            this.clearCache()
            result = { success: true, message: 'Cache cleared' }
            break

          case 'weather':
            result = await this.patchWorld({ weather: args[0] || payload?.weather || 'sunny' })
            break

          case 'time':
            result = await this.patchWorld({ time_of_day: Number(args[0] ?? payload?.time ?? 12) })
            break

          case 'help':
          default:
            result = this.help()
            break
        }

        this.lastCommandResult = result
        this.log(`Résultat ${verb}: ${this.shortResult(result)}`, 'success')
        this.emit('command.result', { command: raw, result })
        this.renderTroxTTab()
        return result
      } catch (err) {
        this.log(`Commande échouée ${raw}: ${err?.message || err}`, 'error')
        this.emit('command.error', { command: raw, error: String(err?.message || err) })
        return null
      }
    }

    async serverAction(action) {
      const data = await this.request(`/api/admin/server/${encodeURIComponent(action)}`, {
        method: 'POST',
        body: {},
        cache: false
      })
      this.cache.clear()
      if (this.admin?.notify) this.admin.notify(`Server ${action} done`, 'success')
      if (this.admin?.loadMetrics) this.admin.loadMetrics()
      return data
    }

    async createBackup(description) {
      const data = await this.request('/api/admin/snapshots', {
        method: 'POST',
        body: {
          type: 'backup',
          description: description || `TroxT backup ${new Date().toLocaleTimeString()}`
        },
        cache: false
      })
      this.cache.clear()
      if (this.admin?.notify) this.admin.notify('TroxT backup created!', 'success')
      if (this.admin?.loadSnapshots) this.admin.loadSnapshots()
      return data
    }

    async patchWorld(patch) {
      const clean = { ...patch }
      if (clean.time_of_day != null && !Number.isFinite(clean.time_of_day)) clean.time_of_day = 12
      if (clean.time_of_day != null) clean.time_of_day = clamp(clean.time_of_day, 0, 24)

      const data = await this.request('/api/admin/world', {
        method: 'PATCH',
        body: clean,
        cache: false
      })
      this.cache.clear()
      await this.fetchWorld(true)
      if (window.game && clean.time_of_day != null) window.game.updateTimeOfDay(clean.time_of_day)
      if (window.game && clean.weather) window.game.updateWeather(clean.weather)
      if (this.admin?.notify) this.admin.notify('World updated by TroxT bridge', 'success')
      return data
    }

    help() {
      return {
        success: true,
        commands: [
          'metrics',
          'players',
          'world',
          'logs',
          'snapshots',
          'backup [description]',
          'pause',
          'resume',
          'save',
          'weather sunny|cloudy|rainy|snowy|fog|storm',
          'time 0-24',
          'clear-cache'
        ]
      }
    }

    shortResult(result) {
      if (!result) return 'vide'
      if (result.success != null) return `success=${result.success}`
      if (result.player_count != null) return `${result.player_count} players / ${result.platform_count} platforms`
      if (Array.isArray(result.players)) return `${result.players.length} players`
      if (Array.isArray(result.logs)) return `${result.logs.length} logs`
      if (Array.isArray(result.snapshots)) return `${result.snapshots.length} snapshots`
      return 'ok'
    }

    log(message, level = 'info') {
      this.consoleLines.push({ ts: now(), level, message: String(message) })
      while (this.consoleLines.length > MAX_CONSOLE_LINES) this.consoleLines.shift()
      this.renderConsole()
      if (level === 'error') console.warn('[Admin TroxT]', message)
    }

    injectCSS() {
      if ($('#admin-troxt-enhanced-style')) return
      const style = document.createElement('style')
      style.id = 'admin-troxt-enhanced-style'
      style.textContent = `
        .admin-tab-troxt.active { color:#b9a7ff !important; background:rgba(123,111,255,0.2) !important; }
        .troxt-admin-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:14px; }
        .troxt-admin-sub { color:#777; font-size:12px; line-height:1.45; max-width:300px; }
        .troxt-pill { padding:4px 10px; border-radius:999px; font-size:10px; text-transform:uppercase; letter-spacing:.8px; border:1px solid rgba(255,255,255,.1); color:#888; white-space:nowrap; }
        .troxt-pill.online { background:rgba(68,255,136,.12); border-color:rgba(68,255,136,.25); color:#6f9; box-shadow:0 0 16px rgba(68,255,136,.08); }
        .troxt-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:16px; }
        .troxt-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:10px 8px; text-align:center; }
        .troxt-card-value { color:#fff; font-size:17px; font-weight:800; font-family:Consolas, monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .troxt-card-label { color:#666; font-size:9px; text-transform:uppercase; letter-spacing:.8px; margin-top:4px; }
        .troxt-command-row { display:grid; grid-template-columns:1fr auto; gap:8px; }
        .troxt-command-input { width:100%; box-sizing:border-box; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.1); background:rgba(0,0,0,.28); color:#e8e8ff; outline:none; font-family:Consolas, monospace; font-size:12px; }
        .troxt-command-input:focus { border-color:rgba(123,111,255,.55); box-shadow:0 0 0 3px rgba(123,111,255,.12); }
        .troxt-quick-actions { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:8px; }
        .troxt-action { padding:7px 8px; border-radius:8px; border:1px solid rgba(255,255,255,.09); background:rgba(255,255,255,.04); color:#aaa; cursor:pointer; font-size:11px; font-family:inherit; transition:all .16s ease; }
        .troxt-action:hover { transform:translateY(-1px); background:rgba(123,111,255,.14); color:#d9d2ff; border-color:rgba(123,111,255,.35); }
        .troxt-action.ok { color:#6f9; }
        .troxt-action.warn { color:#fa8; }
        .troxt-live-state { display:flex; flex-direction:column; gap:6px; }
        .troxt-info-line { display:flex; justify-content:space-between; gap:10px; padding:6px 8px; border-radius:7px; background:rgba(255,255,255,.03); font-size:12px; }
        .troxt-info-line span { color:#888; }
        .troxt-info-line strong { color:#ddd; font-family:Consolas, monospace; font-weight:600; text-align:right; }
        .troxt-console { height:180px; overflow:auto; border-radius:10px; border:1px solid rgba(255,255,255,.08); background:rgba(0,0,0,.25); padding:7px; }
        .troxt-console-line { display:grid; grid-template-columns:68px 54px 1fr; gap:6px; padding:3px 4px; font-size:10.5px; font-family:Consolas, monospace; border-radius:5px; }
        .troxt-console-line:hover { background:rgba(255,255,255,.04); }
        .troxt-console-line span { color:#555; }
        .troxt-console-line b { color:#7af; font-style:normal; }
        .troxt-console-line em { color:#bbb; font-style:normal; word-break:break-word; }
        .troxt-console-line.success b { color:#6f9; }
        .troxt-console-line.warning b { color:#fa8; }
        .troxt-console-line.error b { color:#f77; }
        @media (max-width: 640px) {
          .admin-panel { width:calc(100vw - 24px) !important; right:12px !important; bottom:76px !important; }
          .troxt-grid { grid-template-columns:repeat(2,1fr); }
          .troxt-quick-actions { grid-template-columns:repeat(2,1fr); }
        }
      `
      document.head.appendChild(style)
    }
  }

  function boot() {
    const enhanced = new AdminTroxTEnhanced()
    window.adminTroxTEnhanced = enhanced
    enhanced.init()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true })
  } else {
    boot()
  }
})()
