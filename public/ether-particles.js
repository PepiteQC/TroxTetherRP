// ============================================================
//  ETHERWORLD PARTICLE EFFECTS — THREE.JS EMULATION LAYER
//  Additif uniquement : ne modifie pas game.js / admin.js
// ============================================================
import * as THREE from 'three'

const VERSION = '1.0.0'
const DEFAULT_POSITION = [0, 3, 0]
const MAX_SYSTEMS = 96
const MAX_REGISTERED_ASSETS = 256
const PATCH_INTERVAL_MS = 250

const now = () => performance.now()
const rand = (min = 0, max = 1) => min + Math.random() * (max - min)
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const isFiniteNumber = (value) => Number.isFinite(Number(value))

function log(message, level = 'info') {
  const prefix = '[EtherParticles]'
  if (level === 'error') console.error(prefix, message)
  else if (level === 'warning') console.warn(prefix, message)
  else console.log(prefix, message)

  if (window.troxtAdmin?.log) {
    try { window.troxtAdmin.log(`Particles: ${message}`, level) } catch {}
  }
}

function makeSpriteTexture(kind = 'soft') {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)

  if (kind === 'spark') {
    gradient.addColorStop(0.0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.28, 'rgba(255,230,140,.95)')
    gradient.addColorStop(0.62, 'rgba(255,120,20,.35)')
    gradient.addColorStop(1.0, 'rgba(255,120,20,0)')
  } else if (kind === 'smoke') {
    gradient.addColorStop(0.0, 'rgba(255,255,255,.38)')
    gradient.addColorStop(0.45, 'rgba(160,170,180,.22)')
    gradient.addColorStop(1.0, 'rgba(80,80,90,0)')
  } else if (kind === 'water') {
    gradient.addColorStop(0.0, 'rgba(220,255,255,.95)')
    gradient.addColorStop(0.4, 'rgba(90,190,255,.55)')
    gradient.addColorStop(1.0, 'rgba(40,120,255,0)')
  } else if (kind === 'blood') {
    gradient.addColorStop(0.0, 'rgba(255,70,70,.95)')
    gradient.addColorStop(0.42, 'rgba(155,0,20,.72)')
    gradient.addColorStop(1.0, 'rgba(80,0,20,0)')
  } else {
    gradient.addColorStop(0.0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.38, 'rgba(255,255,255,.58)')
    gradient.addColorStop(1.0, 'rgba(255,255,255,0)')
  }

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

const TEXTURES = {
  soft: makeSpriteTexture('soft'),
  spark: makeSpriteTexture('spark'),
  smoke: makeSpriteTexture('smoke'),
  water: makeSpriteTexture('water'),
  blood: makeSpriteTexture('blood')
}

function toVector3(value, fallback = DEFAULT_POSITION) {
  if (value instanceof THREE.Vector3) return value.clone()
  if (Array.isArray(value)) return new THREE.Vector3(Number(value[0] || 0), Number(value[1] || 0), Number(value[2] || 0))
  if (value && typeof value === 'object') {
    if (typeof value.getWorldPosition === 'function') {
      const v = new THREE.Vector3()
      value.getWorldPosition(v)
      return v
    }
    if ('x' in value || 'y' in value || 'z' in value) {
      return new THREE.Vector3(Number(value.x || 0), Number(value.y || 0), Number(value.z || 0))
    }
  }
  return new THREE.Vector3(fallback[0], fallback[1], fallback[2])
}

function getGame() {
  return window.game || null
}

function getScene() {
  return getGame()?.scene || null
}

function resolveTarget(target) {
  const game = getGame()
  if (!game) return null

  if (!target || target === 'player' || target === 'localplayer') return game.playerMesh || game.playerBody || null
  if (target instanceof THREE.Object3D || typeof target?.getWorldPosition === 'function') return target

  if (typeof target === 'number' || /^\d+$/.test(String(target))) {
    const id = Number(target)
    return game.platformMeshes?.get?.(id)?.mesh || null
  }

  if (typeof target === 'string') {
    const normalized = target.toLowerCase()
    if (normalized === 'camera') return game.camera || null
    if (normalized === 'scene') return game.scene || null
    const byName = game.scene?.getObjectByName?.(target)
    if (byName) return byName
  }

  return null
}

function getTargetPosition(target, fallback = DEFAULT_POSITION) {
  const resolved = resolveTarget(target) || target
  if (resolved?.position && resolved?.type !== 'Body') return toVector3(resolved)
  if (resolved?.position && resolved.position.x !== undefined) return toVector3(resolved.position)
  return toVector3(target, fallback)
}

function randomDirection(scale = 1, yBoost = 0) {
  const theta = Math.random() * Math.PI * 2
  const z = rand(-1, 1)
  const r = Math.sqrt(Math.max(0, 1 - z * z))
  return new THREE.Vector3(
    Math.cos(theta) * r * scale,
    (z + yBoost) * scale,
    Math.sin(theta) * r * scale
  )
}

function randomHemisphere(scale = 1, upward = true) {
  const v = randomDirection(scale)
  v.y = Math.abs(v.y) * (upward ? 1 : -1)
  return v
}

const EFFECTS = {
  explosion: {
    label: 'Explosion particules',
    count: 180,
    duration: 1.15,
    life: [0.38, 1.05],
    size: [0.18, 0.58],
    color: [0xfff2a0, 0xff8a22, 0xff3512],
    texture: 'spark',
    blending: 'additive',
    gravity: -1.2,
    damping: 0.92,
    velocity: () => randomDirection(rand(5, 15), 0.18)
  },
  fire_medium: {
    label: 'Feu moyen continu',
    count: 130,
    duration: 9,
    continuous: true,
    life: [0.45, 1.1],
    size: [0.18, 0.42],
    color: [0xfff7b0, 0xff7a12, 0xff2200],
    texture: 'spark',
    blending: 'additive',
    gravity: 1.8,
    damping: 0.82,
    spawnRadius: [0.1, 0.45],
    velocity: () => new THREE.Vector3(rand(-0.55, 0.55), rand(1.8, 4.2), rand(-0.55, 0.55))
  },
  smoke: {
    label: 'Fumée dense',
    count: 170,
    duration: 11,
    continuous: true,
    life: [1.8, 4.2],
    size: [0.55, 1.85],
    color: [0x5c6270, 0x858b96, 0x2f333d],
    texture: 'smoke',
    blending: 'normal',
    gravity: 0.5,
    damping: 0.94,
    spawnRadius: [0.05, 0.75],
    velocity: () => new THREE.Vector3(rand(-0.45, 0.45), rand(0.7, 2.0), rand(-0.45, 0.45))
  },
  blood_impact: {
    label: 'Impact sang',
    count: 95,
    duration: 1.0,
    life: [0.38, 0.9],
    size: [0.08, 0.22],
    color: [0xff3030, 0x8b0015, 0x4a000b],
    texture: 'blood',
    blending: 'normal',
    gravity: -8.5,
    damping: 0.88,
    velocity: () => randomHemisphere(rand(2.4, 8.0), true)
  },
  sparks: {
    label: 'Étincelles attachées',
    count: 90,
    duration: 4.5,
    continuous: true,
    life: [0.28, 0.75],
    size: [0.055, 0.14],
    color: [0xffffff, 0xffdf72, 0xff7b2a],
    texture: 'spark',
    blending: 'additive',
    gravity: -2.2,
    damping: 0.9,
    spawnRadius: [0, 0.16],
    velocity: () => randomDirection(rand(2.6, 7.5), 0.05)
  },
  rockettrail: {
    label: 'Traînée fusée',
    count: 155,
    duration: 7,
    continuous: true,
    life: [0.65, 1.8],
    size: [0.22, 0.9],
    color: [0xfff4bd, 0xff6521, 0x646a76],
    texture: 'smoke',
    blending: 'additive',
    gravity: 0.18,
    damping: 0.9,
    spawnRadius: [0.04, 0.34],
    velocity: () => new THREE.Vector3(rand(-0.7, 0.7), rand(-0.1, 0.9), rand(-0.7, 0.7))
  },
  water_splash: {
    label: 'Éclaboussures eau',
    count: 135,
    duration: 1.2,
    life: [0.55, 1.25],
    size: [0.08, 0.22],
    color: [0xd8ffff, 0x5ec8ff, 0x1b66ff],
    texture: 'water',
    blending: 'normal',
    gravity: -8.2,
    damping: 0.91,
    velocity: () => randomHemisphere(rand(3.0, 9.0), true)
  },
  striderbuster: {
    label: 'Effet strider',
    count: 260,
    duration: 1.65,
    life: [0.75, 1.55],
    size: [0.13, 0.44],
    color: [0xc7fbff, 0x7b6fff, 0x43e97b],
    texture: 'soft',
    blending: 'additive',
    gravity: -0.2,
    damping: 0.95,
    velocity: () => randomDirection(rand(3.5, 12.5), 0.02),
    ring: true
  }
}

const ASSET_ALIASES = {
  'particles/fire_01.pcf': ['fire_medium', 'smoke', 'sparks'],
  'particles/explosion.pcf': ['explosion', 'smoke'],
  'particles/water.pcf': ['water_splash'],
  'particles/electric.pcf': ['electric_arc', 'sparks']
}

class ParticleSystem {
  constructor(manager, effectName, position, options = {}) {
    this.manager = manager
    this.effectName = effectName
    this.config = { ...EFFECTS[effectName], ...(options.config || {}) }
    this.position = toVector3(position)
    this.options = options
    this.target = options.target || null
    this.createdAt = now()
    this.age = 0
    this.dead = false
    this.id = `particles_${effectName}_${Math.random().toString(36).slice(2, 9)}`
    this.count = Math.floor(options.count || this.config.count || 64)
    this.count = clamp(this.count, 1, options.maxCount || 600)

    this.positions = new Float32Array(this.count * 3)
    this.velocities = new Float32Array(this.count * 3)
    this.colors = new Float32Array(this.count * 3)
    this.sizes = new Float32Array(this.count)
    this.life = new Float32Array(this.count)
    this.maxLife = new Float32Array(this.count)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))

    this.material = new THREE.PointsMaterial({
      size: options.size || 0.24,
      map: TEXTURES[this.config.texture] || TEXTURES.soft,
      transparent: true,
      opacity: options.opacity ?? 1,
      vertexColors: true,
      depthWrite: false,
      blending: this.config.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending,
      sizeAttenuation: true
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.name = this.id
    this.points.frustumCulled = false
    this.points.position.copy(this.position)

    this.ring = null
    this.spawnAll(true)

    if (this.config.ring) this.createRing()
    this.manager.scene.add(this.points)
  }

  createRing() {
    const ringGeometry = new THREE.RingGeometry(0.25, 0.32, 96)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x92fff8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial)
    this.ring.name = `${this.id}_ring`
    this.ring.rotation.x = -Math.PI / 2
    this.ring.position.copy(this.position)
    this.manager.scene.add(this.ring)
  }

  spawnAll(stagger = false) {
    for (let i = 0; i < this.count; i++) this.spawn(i, stagger)
  }

  spawn(i, stagger = false) {
    const i3 = i * 3
    const spawnRadius = this.config.spawnRadius || [0, 0.08]
    const radius = rand(spawnRadius[0], spawnRadius[1])
    const angle = rand(0, Math.PI * 2)
    const yJitter = rand(-0.04, 0.08)

    this.positions[i3] = Math.cos(angle) * radius
    this.positions[i3 + 1] = yJitter
    this.positions[i3 + 2] = Math.sin(angle) * radius

    const velocity = (this.config.velocity || (() => randomDirection(1)))()
    const scale = this.options.scale || 1
    this.velocities[i3] = velocity.x * scale
    this.velocities[i3 + 1] = velocity.y * scale
    this.velocities[i3 + 2] = velocity.z * scale

    const colorValue = this.config.color[Math.floor(Math.random() * this.config.color.length)]
    const color = new THREE.Color(colorValue)
    this.colors[i3] = color.r
    this.colors[i3 + 1] = color.g
    this.colors[i3 + 2] = color.b

    const life = rand(this.config.life?.[0] || 0.5, this.config.life?.[1] || 1.0)
    this.maxLife[i] = life
    this.life[i] = stagger && this.config.continuous ? rand(0.02, life) : life
    this.sizes[i] = rand(this.config.size?.[0] || 0.1, this.config.size?.[1] || 0.35)
  }

  update(dt) {
    if (this.dead) return false
    this.age += dt

    if (this.target) {
      this.position.copy(getTargetPosition(this.target, [this.position.x, this.position.y, this.position.z]))
      this.points.position.copy(this.position)
    }

    const expiredEmitter = this.age > (this.options.duration || this.config.duration || 1)
    const gravity = this.config.gravity || 0
    const damping = Math.pow(this.config.damping || 0.94, dt * 60)
    let alive = 0

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3
      this.life[i] -= dt

      if (this.life[i] <= 0) {
        if (this.config.continuous && !expiredEmitter && !this.options.once) {
          this.spawn(i)
        } else {
          this.positions[i3 + 1] = -9999
          continue
        }
      }

      alive++
      this.velocities[i3 + 1] += gravity * dt
      this.velocities[i3] *= damping
      this.velocities[i3 + 1] *= damping
      this.velocities[i3 + 2] *= damping

      this.positions[i3] += this.velocities[i3] * dt
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt

      const ratio = clamp(this.life[i] / Math.max(this.maxLife[i], 0.001), 0, 1)
      const fade = this.config.continuous ? Math.sin(ratio * Math.PI) : ratio
      this.colors[i3] *= 0.997 + fade * 0.003
      this.colors[i3 + 1] *= 0.997 + fade * 0.003
      this.colors[i3 + 2] *= 0.997 + fade * 0.003
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true

    if (this.ring) {
      const t = clamp(this.age / (this.config.duration || 1), 0, 1)
      const scale = 1 + t * 12 * (this.options.scale || 1)
      this.ring.scale.setScalar(scale)
      this.ring.material.opacity = Math.max(0, 0.85 * (1 - t))
    }

    if ((!this.config.continuous && alive <= 0) || (expiredEmitter && alive <= 0)) {
      this.dispose()
      return false
    }
    return true
  }

  stop() {
    this.options.once = true
    this.config.continuous = false
  }

  dispose() {
    if (this.dead) return
    this.dead = true
    this.manager.scene.remove(this.points)
    this.geometry.dispose()
    this.material.dispose()
    if (this.ring) {
      this.manager.scene.remove(this.ring)
      this.ring.geometry.dispose()
      this.ring.material.dispose()
    }
  }
}

class ElectricArcSystem {
  constructor(manager, position, options = {}) {
    this.manager = manager
    this.position = toVector3(position)
    this.options = options
    this.target = options.target || null
    this.age = 0
    this.duration = options.duration || 0.8
    this.dead = false
    this.id = `electric_arc_${Math.random().toString(36).slice(2, 9)}`
    this.group = new THREE.Group()
    this.group.name = this.id
    this.group.position.copy(this.position)
    this.materials = []
    this.lines = []

    const arcs = options.arcs || 7
    for (let i = 0; i < arcs; i++) {
      const material = new THREE.LineBasicMaterial({
        color: i % 2 ? 0x93ffff : 0x7b6fff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      const geometry = new THREE.BufferGeometry()
      const line = new THREE.Line(geometry, material)
      this.group.add(line)
      this.lines.push(line)
      this.materials.push(material)
    }

    this.rebuild()
    this.manager.scene.add(this.group)
  }

  rebuild() {
    this.lines.forEach((line, idx) => {
      const points = []
      const length = rand(1.0, 3.4) * (this.options.scale || 1)
      const dir = randomDirection(1).normalize()
      const steps = 6 + Math.floor(rand(0, 5))
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const jitter = randomDirection(rand(0, 0.25 + t * 0.25))
        points.push(dir.clone().multiplyScalar(length * t).add(jitter))
      }
      line.geometry.dispose()
      line.geometry = new THREE.BufferGeometry().setFromPoints(points)
      line.material.opacity = 0.85 + Math.random() * 0.15
      line.rotation.y = (idx / this.lines.length) * Math.PI * 2
    })
  }

  update(dt) {
    if (this.dead) return false
    this.age += dt
    if (this.target) {
      this.position.copy(getTargetPosition(this.target, [this.position.x, this.position.y, this.position.z]))
      this.group.position.copy(this.position)
    }
    if (Math.random() < 0.45) this.rebuild()
    const ratio = clamp(this.age / this.duration, 0, 1)
    this.materials.forEach((mat) => { mat.opacity = Math.max(0, 1 - ratio) })
    if (this.age >= this.duration) {
      this.dispose()
      return false
    }
    return true
  }

  stop() {
    this.duration = Math.min(this.duration, this.age + 0.08)
  }

  dispose() {
    if (this.dead) return
    this.dead = true
    this.manager.scene.remove(this.group)
    this.lines.forEach((line) => line.geometry.dispose())
    this.materials.forEach((mat) => mat.dispose())
  }
}

class EtherParticleManager {
  constructor() {
    this.version = VERSION
    this.scene = null
    this.systems = new Set()
    this.assets = new Set()
    this.pending = []
    this.running = false
    this.lastTime = now()
    this.patchTimer = null
    this.boundGame = null
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastTime = now()
    requestAnimationFrame(() => this.tick())
    this.patchTimer = setInterval(() => this.patchGameAndAdmin(), PATCH_INTERVAL_MS)
    this.patchGameAndAdmin()
    log(`Particle manager ${VERSION} prêt`)
  }

  setScene(scene) {
    if (!scene || this.scene === scene) return
    this.scene = scene
    this.flushPending()
  }

  ensureScene() {
    const scene = getScene()
    if (scene) this.setScene(scene)
    return this.scene
  }

  flushPending() {
    if (!this.scene || this.pending.length === 0) return
    const queued = this.pending.splice(0)
    queued.forEach((item) => {
      if (item.type === 'effect') this.effect(item.name, item.position, item.options)
      if (item.type === 'attach') this.attach(item.name, item.target, item.options)
    })
  }

  tick() {
    if (!this.running) return
    this.ensureScene()
    const t = now()
    const dt = clamp((t - this.lastTime) / 1000, 0, 0.05)
    this.lastTime = t

    this.systems.forEach((system) => {
      if (!system.update(dt)) this.systems.delete(system)
    })

    requestAnimationFrame(() => this.tick())
  }

  addSystem(system) {
    if (this.systems.size >= MAX_SYSTEMS) {
      const oldest = this.systems.values().next().value
      if (oldest) {
        oldest.dispose()
        this.systems.delete(oldest)
      }
    }
    this.systems.add(system)
    return system
  }

  effect(name, position = DEFAULT_POSITION, options = {}) {
    const effectName = this.normalizeEffectName(name)
    if (!this.ensureScene()) {
      this.pending.push({ type: 'effect', name: effectName, position, options })
      log(`Effet ${effectName} en attente de scène`, 'warning')
      return null
    }

    const pos = position == null ? getTargetPosition('player') : getTargetPosition(position)
    let system
    if (effectName === 'electric_arc') system = new ElectricArcSystem(this, pos, options)
    else system = new ParticleSystem(this, effectName, pos, options)

    this.addSystem(system)
    this.emit('effect', { name: effectName, position: pos.toArray(), options })
    return system
  }

  attach(name, target = 'player', options = {}) {
    const effectName = this.normalizeEffectName(name)
    const resolved = resolveTarget(target) || target
    if (!this.ensureScene()) {
      this.pending.push({ type: 'attach', name: effectName, target, options })
      log(`Effet attaché ${effectName} en attente de scène`, 'warning')
      return null
    }

    const pos = getTargetPosition(resolved)
    const mergedOptions = { ...options, target: resolved, duration: options.duration || (effectName === 'electric_arc' ? 0.85 : 6) }
    const system = effectName === 'electric_arc'
      ? new ElectricArcSystem(this, pos, mergedOptions)
      : new ParticleSystem(this, effectName, pos, mergedOptions)

    this.addSystem(system)
    this.emit('attach', { name: effectName, target: String(target), options: mergedOptions })
    return system
  }

  stopAll(name) {
    const effectName = name ? this.normalizeEffectName(name) : null
    this.systems.forEach((system) => {
      if (!effectName || system.effectName === effectName || system.id?.startsWith(effectName)) system.stop?.()
    })
    this.emit('stop', { name: effectName || 'all' })
  }

  clear() {
    this.systems.forEach((system) => system.dispose())
    this.systems.clear()
    this.pending.length = 0
    this.emit('clear', {})
  }

  addParticles(path) {
    if (!path) return false
    const normalized = String(path).replace(/\\/g, '/').toLowerCase()
    if (this.assets.size >= MAX_REGISTERED_ASSETS) this.assets.clear()
    this.assets.add(normalized)

    const aliases = ASSET_ALIASES[normalized] || []
    log(`PCF émulé chargé: ${normalized}${aliases.length ? ` → ${aliases.join(', ')}` : ''}`)
    this.emit('asset.loaded', { path: normalized, emulated: true, aliases })
    return true
  }

  listEffects() {
    return Object.entries(EFFECTS).map(([id, config]) => ({ id, label: config.label }))
  }

  normalizeEffectName(name) {
    const raw = String(name || 'explosion').toLowerCase().trim()
    const aliases = {
      fire: 'fire_medium',
      medium_fire: 'fire_medium',
      electric: 'electric_arc',
      arc: 'electric_arc',
      blood: 'blood_impact',
      splash: 'water_splash',
      water: 'water_splash',
      strider: 'striderbuster',
      strider_buster: 'striderbuster',
      rocket: 'rockettrail',
      trail: 'rockettrail',
      spark: 'sparks'
    }
    const normalized = aliases[raw] || raw
    return EFFECTS[normalized] ? normalized : 'explosion'
  }

  parsePosition(args) {
    const numbers = args.filter(isFiniteNumber).map(Number)
    if (numbers.length >= 3) return [numbers[0], numbers[1], numbers[2]]
    return getTargetPosition('player').toArray()
  }

  executeCommand(command, payload = {}) {
    const raw = String(command || '').trim()
    const parts = raw.split(/\s+/).filter(Boolean)
    const action = (parts[0] || 'particle').toLowerCase()
    const sub = (parts[1] || payload.name || 'explosion').toLowerCase()

    if (['stop', 'clear'].includes(sub) || ['stop-particles', 'clear-particles'].includes(action)) {
      if (sub === 'clear' || action === 'clear-particles') this.clear()
      else this.stopAll(parts[2])
      return { success: true, action: sub, active: this.systems.size }
    }

    if (sub === 'list' || action === 'list-particles') {
      return { success: true, effects: this.listEffects(), assets: Array.from(this.assets) }
    }

    if (sub === 'load' || action === 'load-particles') {
      const path = parts.slice(2).join(' ') || payload.path || 'particles/fire_01.pcf'
      return { success: this.addParticles(path), path }
    }

    if (sub === 'attach') {
      const name = parts[2] || payload.name || 'sparks'
      const target = parts[3] || payload.target || 'player'
      const system = this.attach(name, target, payload.options || {})
      return { success: Boolean(system), action: 'attach', name, target, active: this.systems.size }
    }

    const name = ['particle', 'particles', 'fx', 'effect'].includes(action) ? sub : action
    const position = payload.position || this.parsePosition(parts.slice(2))
    const system = this.effect(name, position, payload.options || {})
    return { success: Boolean(system), action: 'effect', name: this.normalizeEffectName(name), position, active: this.systems.size }
  }

  patchGameAndAdmin() {
    const game = getGame()
    if (game && game !== this.boundGame) {
      this.boundGame = game
      this.setScene(game.scene)
      game.AddParticles = (path) => this.addParticles(path)
      game.ParticleEffect = (name, position, angle, entity, options) => this.effect(name, position || entity || DEFAULT_POSITION, options || {})
      game.ParticleEffectAttach = (name, attachTypeOrTarget, entity, attachmentId, options) => this.attach(name, entity || attachTypeOrTarget || 'player', options || {})
      game.particles = this
      log('API particules attachée à window.game')
    }

    const bridge = window.troxtAdmin || window.EtherWorldAdminBridge
    if (bridge && !bridge.__etherParticlesPatched) {
      const originalExecute = typeof bridge.execute === 'function' ? bridge.execute.bind(bridge) : null
      bridge.execute = (command, payload) => {
        const first = String(command || '').trim().split(/\s+/)[0]?.toLowerCase()
        if (['particle', 'particles', 'fx', 'effect', 'load-particles', 'list-particles', 'stop-particles', 'clear-particles'].includes(first)) {
          return this.executeCommand(command, payload)
        }
        return originalExecute ? originalExecute(command, payload) : null
      }
      bridge.particles = this
      bridge.__etherParticlesPatched = true
      log('Commandes particules branchées au bridge TroxT/Admin')
    }
  }

  emit(type, payload) {
    const detail = {
      source: 'ether-particles',
      version: VERSION,
      type,
      timestamp: Date.now(),
      payload
    }
    window.dispatchEvent(new CustomEvent('etherworld:particles:event', { detail }))
    window.dispatchEvent(new CustomEvent('troxt:particles:event', { detail }))
  }
}

const manager = new EtherParticleManager()

// API globale compatible style Source/GMod, mais émulée en Three.js.
window.EtherParticles = manager
window.ParticleEffect = (name, position, angle, entity, options) => manager.effect(name, position || entity || DEFAULT_POSITION, options || {})
window.ParticleEffectAttach = (name, attachTypeOrTarget, entity, attachmentId, options) => manager.attach(name, entity || attachTypeOrTarget || 'player', options || {})

// Proxy game.AddParticles si window.game n’est pas encore prêt.
window.gameAddParticles = (path) => manager.addParticles(path)

window.addEventListener('etherworld:particle:effect', (event) => {
  const d = event.detail || {}
  manager.effect(d.name || 'explosion', d.position || DEFAULT_POSITION, d.options || {})
})

window.addEventListener('troxt:particle:effect', (event) => {
  const d = event.detail || {}
  manager.effect(d.name || 'explosion', d.position || DEFAULT_POSITION, d.options || {})
})

window.addEventListener('troxt:particle:attach', (event) => {
  const d = event.detail || {}
  manager.attach(d.name || 'sparks', d.target || 'player', d.options || {})
})

manager.start()

// Préchargement logique des noms PCF demandés.
manager.addParticles('particles/fire_01.pcf')
