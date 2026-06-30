/**
 * FluidSimulation.ts
 *
 * Encapsulation ultra-enrichie de three-fluid-fx pour EtherWorld QC RP.
 * Gère le cycle de vie, le redimensionnement, les paramètres de simulation,
 * la détection GPU, les présets, les événements, les statistiques avancées
 * et la dégradation gracieuse.
 *
 * @author PepiteQC / EtherWorld Team
 * @version 2.0.0
 * @date 2026-06-11
 */

import {
  Color,
  EventDispatcher,
  Texture,
  Vector2,
  WebGLRenderer,
} from 'three'
import type { FluidSimulationOptions } from 'three-fluid-fx'

// ============================================================
// TYPES & INTERFACES
// ============================================================

export type FluidProfile = 'potato' | 'performance' | 'balanced' | 'quality' | 'ultra'

export type OverlayType =
  | 'default'
  | 'artInk'
  | 'oil'
  | 'rainbowFish'
  | 'velocity'
  | 'glaze'
  | 'smoke'
  | 'colorWater'
  | 'liquidLens'
  | 'densityTint'
  | 'neon'
  | 'lava'
  | 'aurora'

export type DistortionType =
  | 'none'
  | 'simple'
  | 'chromatic'
  | 'rgbShift'
  | 'water'
  | 'waterCaustics'
  | 'barrel'
  | 'fisheye'

export type FluidEventType =
  | 'init'
  | 'dispose'
  | 'resize'
  | 'configChange'
  | 'splatAdded'
  | 'presetApplied'
  | 'profileChanged'
  | 'error'
  | 'performanceWarning'
  | 'gpuDetected'
  | 'paused'
  | 'resumed'
  | 'snapshotTaken'

export interface FluidConfig extends Omit<FluidSimulationOptions, 'profile'> {
  /** Profil de qualité */
  profile: FluidProfile
  /** Activation globale de la simulation */
  enabled: boolean
  /** Distorsion UV sur la scène */
  enableDistortion: boolean
  /** Type de distorsion */
  distortionType: DistortionType
  /** Intensité de la distorsion UV (0–2) */
  distortionIntensity: number
  /** Couche overlay couleur/traînée */
  enableOverlay: boolean
  /** Type d'overlay */
  overlayType: OverlayType
  /** Opacité de l'overlay (0–1) */
  overlayOpacity: number
  /** Nombre max de splats simultanés dans la queue */
  maxSplatQueue: number
  /** Limite FPS simulation (0 = illimité) */
  maxFPS: number
  /** Pause auto si tab caché */
  autoPauseOnHidden: boolean
  /** Réinitialisation auto sur erreur GPU */
  autoRecoverOnError: boolean
  /** Couleur de teinte globale appliquée au fluide */
  globalTint: [number, number, number] | null
  /** Facteur de turbulence supplémentaire */
  turbulenceFactor: number
  /** Activation du mode interactif souris */
  enablePointerSplats: boolean
  /** Rayon du splat de souris (override splatRadius) */
  pointerSplatRadius: number | null
  /** Force du splat souris (override splatForce) */
  pointerSplatForce: number | null
  /** Callback appelé chaque frame */
  onStep: ((frame: number, dt: number) => void) | null
}

export interface FluidState {
  velocityTexture: Texture | null
  densityTexture: Texture | null
  dyeTexture: Texture | null
  pressureTexture: Texture | null
  isInitialized: boolean
  isPaused: boolean
  resolution: { width: number; height: number }
  frameCount: number
  lastStepTime: number
  initTime: number
  totalSplats: number
  errorCount: number
  lastError: string | null
  gpuTier: 'low' | 'medium' | 'high' | 'unknown'
  activeProfile: FluidProfile
}

export interface SplatOptions {
  radius?: number
  color?: [number, number, number]
  dyeColor?: [number, number, number]
  force?: number
}

export interface SplatEntry {
  x01: number
  y01: number
  dx: number
  dy: number
  options?: SplatOptions
  addedAt: number
}

export interface FluidStats {
  fps: number
  avgFps: number
  minFps: number
  maxFps: number
  frameCount: number
  totalSplats: number
  isInitialized: boolean
  isPaused: boolean
  profile: FluidProfile
  gpuTier: string
  resolution: { width: number; height: number }
  memoryUsage: number | null
  config: FluidConfig
  uptime: number
}

export interface FluidPreset {
  name: string
  description: string
  config: Partial<FluidConfig>
}

export interface FluidEvent {
  type: FluidEventType
  timestamp: number
  data?: Record<string, unknown>
}

// ============================================================
// CONSTANTES
// ============================================================

export const DEFAULT_FLUID_CONFIG: FluidConfig = {
  profile: 'balanced',
  enabled: true,
  enableDistortion: true,
  distortionType: 'simple',
  distortionIntensity: 1.0,
  enableOverlay: true,
  overlayType: 'artInk',
  overlayOpacity: 0.7,
  curlStrength: 0.55,
  velocityDissipation: 0.985,
  densityDissipation: 0.91,
  pressureDissipation: 0.8,
  splatRadius: 0.00042,
  splatForce: 6,
  reflectWalls: true,
  enableDye: true,
  bfec: true,
  maxSplatQueue: 32,
  maxFPS: 0,
  autoPauseOnHidden: true,
  autoRecoverOnError: true,
  globalTint: null,
  turbulenceFactor: 1.0,
  enablePointerSplats: true,
  pointerSplatRadius: null,
  pointerSplatForce: null,
  onStep: null,
}

export const FLUID_PROFILE_PARAMS: Record<
  FluidProfile,
  {
    pressureIterations: number
    simResolution: number
    dyeResolution: number
    description: string
  }
> = {
  potato: { pressureIterations: 3, simResolution: 64, dyeResolution: 512, description: 'GPU ultra-faible' },
  performance: { pressureIterations: 6, simResolution: 128, dyeResolution: 512, description: 'GPU faible' },
  balanced: { pressureIterations: 12, simResolution: 256, dyeResolution: 1024, description: 'GPU moyen' },
  quality: { pressureIterations: 20, simResolution: 512, dyeResolution: 1024, description: 'GPU haut' },
  ultra: { pressureIterations: 32, simResolution: 1024, dyeResolution: 2048, description: 'GPU très haut' },
}

// ============================================================
// PRÉSETS INTÉGRÉS
// ============================================================

export const FLUID_PRESETS: Record<string, FluidPreset> = {
  etherworld: {
    name: 'EtherWorld QC',
    description: 'Preset signature EtherWorld — encre cyan magique',
    config: {
      overlayType: 'artInk',
      overlayOpacity: 0.75,
      curlStrength: 0.6,
      velocityDissipation: 0.98,
      densityDissipation: 0.90,
      splatRadius: 0.00045,
      splatForce: 7,
      enableDistortion: true,
      distortionType: 'chromatic',
      distortionIntensity: 1.2,
      globalTint: [0, 0.83, 1.0],
    },
  },
  lava: {
    name: 'Lave Cosmique',
    description: 'Fluide rouge-orange incandescent',
    config: {
      overlayType: 'lava',
      overlayOpacity: 0.85,
      curlStrength: 0.8,
      velocityDissipation: 0.97,
      densityDissipation: 0.85,
      splatForce: 9,
      globalTint: [1.0, 0.25, 0.0],
      distortionType: 'water',
      distortionIntensity: 0.8,
    },
  },
  aurora: {
    name: 'Aurore Boréale',
    description: 'Drapés verts et violets nordiques',
    config: {
      overlayType: 'aurora',
      overlayOpacity: 0.65,
      curlStrength: 0.3,
      velocityDissipation: 0.995,
      densityDissipation: 0.97,
      splatForce: 4,
      globalTint: [0.2, 1.0, 0.6],
      distortionType: 'simple',
      distortionIntensity: 0.5,
    },
  },
  neon: {
    name: 'Neon Cyberpunk',
    description: 'Fluide néon violet-rose intense',
    config: {
      overlayType: 'neon',
      overlayOpacity: 0.9,
      curlStrength: 1.0,
      velocityDissipation: 0.975,
      densityDissipation: 0.88,
      splatForce: 10,
      globalTint: [0.8, 0.0, 1.0],
      distortionType: 'rgbShift',
      distortionIntensity: 1.5,
    },
  },
  oil: {
    name: 'Nappe Pétrolière',
    description: 'Surface irisée arc-en-ciel huileux',
    config: {
      overlayType: 'oil',
      overlayOpacity: 0.8,
      curlStrength: 0.4,
      velocityDissipation: 0.99,
      densityDissipation: 0.95,
      splatForce: 5,
      distortionType: 'waterCaustics',
      distortionIntensity: 0.6,
    },
  },
  smoke: {
    name: 'Fumée Fantôme',
    description: 'Volutes grises translucides',
    config: {
      overlayType: 'smoke',
      overlayOpacity: 0.5,
      curlStrength: 0.2,
      velocityDissipation: 0.998,
      densityDissipation: 0.98,
      splatForce: 3,
      enableDistortion: false,
      globalTint: null,
    },
  },
}

// ============================================================
// GPU DETECTOR
// ============================================================

function detectGPUTier(renderer: WebGLRenderer): 'low' | 'medium' | 'high' | 'unknown' {
  try {
    const gl = renderer.getContext()
    const dbgi = gl.getExtension('WEBGL_debug_renderer_info')
    if (!dbgi) return 'unknown'

    const vendor = gl.getParameter(dbgi.UNMASKED_VENDOR_WEBGL) as string
    const gpuName = gl.getParameter(dbgi.UNMASKED_RENDERER_WEBGL) as string
    const combined = `${vendor} ${gpuName}`.toLowerCase()

    if (/nvidia|rtx|gtx [789]|rx [56789]|radeon pro|apple m[23]/i.test(combined)) return 'high'
    if (/gtx [456]|rx [34]|intel iris plus|apple m1/i.test(combined)) return 'medium'
    if (/intel hd|intel uhd|mali|adreno [3456]/i.test(combined)) return 'low'
    return 'medium'
  } catch {
    return 'unknown'
  }
}

function suggestProfileFromGPU(tier: 'low' | 'medium' | 'high' | 'unknown'): FluidProfile {
  switch (tier) {
    case 'low': return 'performance'
    case 'medium': return 'balanced'
    case 'high': return 'quality'
    default: return 'balanced'
  }
}

// ============================================================
// FPS TRACKER
// ============================================================

class FPSTracker {
  private _samples: number[] = []
  private _maxSamples: number

  constructor(maxSamples = 120) {
    this._maxSamples = maxSamples
  }

  record(fps: number): void {
    this._samples.push(fps)
    if (this._samples.length > this._maxSamples) this._samples.shift()
  }

  get avg(): number { return this._samples.length ? this._samples.reduce((a, b) => a + b, 0) / this._samples.length : 0 }
  get min(): number { return this._samples.length ? Math.min(...this._samples) : 0 }
  get max(): number { return this._samples.length ? Math.max(...this._samples) : 0 }
  get last(): number { return this._samples[this._samples.length - 1] ?? 0 }

  reset(): void { this._samples = [] }
}

// ============================================================
// FLUID SIMULATION v2.0.0
// ============================================================

export class EtherFluidSimulation extends EventDispatcher {
  private _renderer: WebGLRenderer | null = null
  private _fluid: any = null
  private _config: FluidConfig = { ...DEFAULT_FLUID_CONFIG }
  private _state: FluidState = {
    velocityTexture: null,
    densityTexture: null,
    dyeTexture: null,
    pressureTexture: null,
    isInitialized: false,
    isPaused: false,
    resolution: { width: 0, height: 0 },
    frameCount: 0,
    lastStepTime: 0,
    initTime: 0,
    totalSplats: 0,
    errorCount: 0,
    lastError: null,
    gpuTier: 'unknown',
    activeProfile: 'balanced',
  }

  private _splatQueue: SplatEntry[] = []
  private _listeners: Array<() => void> = []
  private _eventHistory: FluidEvent[] = []
  private _teardownPointer: (() => void) | null = null
  private _visibilityHandler: (() => void) | null = null
  private _fps: FPSTracker = new FPSTracker()
  private _lastFrameTime: number = 0
  private _minFPSTimer: ReturnType<typeof setTimeout> | null = null
  private _initPromise: Promise<boolean> | null = null
  private _maxSplatHistory: number = 200
  private _splatHistory: SplatEntry[] = []

  // ============================================================
  // GETTERS
  // ============================================================

  get state(): Readonly<FluidState> { return this._state }
  get config(): Readonly<FluidConfig> { return this._config }
  get fluid(): any { return this._fluid }
  get isReady(): boolean { return this._state.isInitialized && !this._state.isPaused }
  get currentFPS(): number { return this._fps.last }
  get eventHistory(): ReadonlyArray<FluidEvent> { return this._eventHistory }

  // ============================================================
  // INITIALISATION
  // ============================================================

  async init(
    renderer: WebGLRenderer,
    config?: Partial<FluidConfig>
  ): Promise<boolean> {
    // Éviter double init
    if (this._initPromise) return this._initPromise
    this._initPromise = this._doInit(renderer, config)
    const result = await this._initPromise
    this._initPromise = null
    return result
  }

  private async _doInit(
    renderer: WebGLRenderer,
    config?: Partial<FluidConfig>
  ): Promise<boolean> {
    try {
      this._config = { ...DEFAULT_FLUID_CONFIG, ...config }
      this._renderer = renderer

      // Détection GPU
      const gpuTier = detectGPUTier(renderer)
      this._state.gpuTier = gpuTier
      this._emit('gpuDetected', { tier: gpuTier })

      // Auto-sélection profil selon GPU si pas forcé
      if (!config?.profile) {
        this._config.profile = suggestProfileFromGPU(gpuTier)
      }

      this._log('info', `GPU détecté: ${gpuTier} → profil suggéré: ${this._config.profile}`)

      const { FluidSimulation, attachPointerSplats } = await import('three-fluid-fx')
      const profileParams = FLUID_PROFILE_PARAMS[this._config.profile]

      this._fluid = new FluidSimulation(renderer, {
        profile: this._config.profile as any,
        curlStrength: this._config.curlStrength,
        velocityDissipation: this._config.velocityDissipation,
        densityDissipation: this._config.densityDissipation,
        pressureDissipation: this._config.pressureDissipation,
        splatRadius: this._config.splatRadius,
        splatForce: this._config.splatForce,
        reflectWalls: this._config.reflectWalls,
        enableDye: this._config.enableDye,
        bfec: this._config.bfec,
        pressureIterations: profileParams.pressureIterations,
      })

      this._applyConfig()

      // Pointer splats
      if (this._config.enablePointerSplats) {
        this._teardownPointer = attachPointerSplats(
          renderer.domElement,
          this._fluid,
          {
            coloredStrokes: this._config.enableDye,
            radius: this._config.pointerSplatRadius ?? this._config.splatRadius,
            force: this._config.pointerSplatForce ?? this._config.splatForce,
          }
        )
      }

      // Pause auto si tab caché
      if (this._config.autoPauseOnHidden && typeof document !== 'undefined') {
        this._visibilityHandler = () => {
          if (document.hidden) this.pause()
          else this.resume()
        }
        document.addEventListener('visibilitychange', this._visibilityHandler)
      }

      this._state.isInitialized = true
      this._state.initTime = Date.now()
      this._state.activeProfile = this._config.profile
      this._updateTextures()

      this._emit('init', { profile: this._config.profile, gpuTier })
      this._log('info', `✅ FluidSimulation v${this._version} initialisée [${this._config.profile}]`)
      return true
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      this._state.lastError = msg
      this._state.errorCount++
      this._emit('error', { message: msg })
      this._log('error', `Erreur init: ${msg}`)

      if (this._config.autoRecoverOnError) {
        this._log('warn', 'Tentative de récupération avec profil "potato"...')
        if (this._config.profile !== 'potato') {
          this._config.profile = 'potato'
          return this._doInit(this._renderer!, this._config)
        }
      }
      return false
    }
  }

  private readonly _version = '2.0.0'

  // ============================================================
  // BOUCLE PRINCIPALE
  // ============================================================

  step(deltaSeconds: number): void {
    if (!this._state.isInitialized || !this._config.enabled || this._state.isPaused) return

    // Limite FPS
    if (this._config.maxFPS > 0) {
      const now = performance.now()
      const minGap = 1000 / this._config.maxFPS
      if (now - this._lastFrameTime < minGap) return
      this._lastFrameTime = now
    }

    // Vider la queue de splats
    while (this._splatQueue.length > 0) {
      const splat = this._splatQueue.shift()!
      try {
        this._fluid.addSplat(splat.x01, splat.y01, splat.dx, splat.dy, splat.options)
        this._state.totalSplats++
      } catch (e) {
        this._log('warn', `addSplat failed: ${e}`)
      }
    }

    // Appliquer turbulence supplémentaire
    if (this._config.turbulenceFactor !== 1.0 && this._fluid.curlStrength !== undefined) {
      this._fluid.curlStrength = this._config.curlStrength * this._config.turbulenceFactor
    }

    try {
      this._fluid.step(deltaSeconds)
    } catch (e) {
      this._state.errorCount++
      this._state.lastError = String(e)
      this._emit('error', { message: String(e) })
      return
    }

    // Métriques
    const now = performance.now()
    const elapsed = now - this._state.lastStepTime
    if (elapsed > 0) {
      const fps = Math.min(1000 / elapsed, 1000)
      this._fps.record(fps)

      // Avertissement performance
      if (this._fps.avg < 20 && this._state.frameCount % 120 === 0) {
        this._emit('performanceWarning', { fps: this._fps.avg, suggestion: 'Réduire le profil' })
        this._log('warn', `⚠️ FPS faible: ${this._fps.avg.toFixed(1)} — envisager profil inférieur`)
      }
    }

    this._state.frameCount++
    this._state.lastStepTime = now
    this._updateTextures()

    // Callback onStep
    this._config.onStep?.(this._state.frameCount, deltaSeconds)
  }

  // ============================================================
  // PAUSE / RESUME
  // ============================================================

  pause(): void {
    if (this._state.isPaused) return
    this._state.isPaused = true
    this._emit('paused', {})
    this._log('debug', 'Simulation mise en pause')
  }

  resume(): void {
    if (!this._state.isPaused) return
    this._state.isPaused = false
    this._lastFrameTime = performance.now()
    this._emit('resumed', {})
    this._log('debug', 'Simulation reprise')
  }

  toggle(): boolean {
    if (this._state.isPaused) this.resume()
    else this.pause()
    return !this._state.isPaused
  }

  // ============================================================
  // RESIZE
  // ============================================================

  resize(width: number, height: number): void {
    if (!this._fluid) return
    try {
      this._fluid.resize(width, height)
      this._state.resolution = { width, height }
      this._emit('resize', { width, height })
      this._log('debug', `Resize: ${width}×${height}`)
    } catch (e) {
      this._log('warn', `Resize failed: ${e}`)
    }
  }

  /** Resize automatique depuis le renderer courant */
  autoResize(): void {
    if (!this._renderer) return
    const { width, height } = this._renderer.getSize(new Vector2())
    this.resize(width, height)
  }

  // ============================================================
  // SPLATS
  // ============================================================

  addSplat(
    x01: number,
    y01: number,
    dx: number,
    dy: number,
    options?: SplatOptions
  ): void {
    if (!this._state.isInitialized) return

    if (this._splatQueue.length >= this._config.maxSplatQueue) {
      this._splatQueue.shift() // Éviction FIFO
    }

    const entry: SplatEntry = { x01, y01, dx, dy, options, addedAt: Date.now() }
    this._splatQueue.push(entry)

    // Historique
    this._splatHistory.push(entry)
    if (this._splatHistory.length > this._maxSplatHistory) this._splatHistory.shift()

    this._emit('splatAdded', { x01, y01, dx, dy })
  }

  addSplatFromMouse(
    mouseX: number,
    mouseY: number,
    prevMouseX: number,
    prevMouseY: number,
    viewportWidth: number,
    viewportHeight: number,
    options?: SplatOptions
  ): void {
    if (!this._state.isInitialized) return

    const x01 = mouseX / viewportWidth
    const y01 = 1.0 - mouseY / viewportHeight
    const dx = (mouseX - prevMouseX) / viewportWidth * this._config.splatForce
    const dy = -(mouseY - prevMouseY) / viewportHeight * this._config.splatForce

    this.addSplat(x01, y01, dx, dy, options)
  }

  addSplatAtCenter(options?: SplatOptions): void {
    this.addSplat(0.5, 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, options)
  }

  addRandomSplat(count = 1): void {
    for (let i = 0; i < count; i++) {
      this.addSplat(
        Math.random(),
        Math.random(),
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        {
          color: [Math.random(), Math.random(), Math.random()],
          dyeColor: [Math.random(), Math.random(), Math.random()],
        }
      )
    }
  }

  addSplatBurst(x01: number, y01: number, count = 8, radius = 0.05): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const force = 0.2 + Math.random() * 0.4
      this.addSplat(
        x01 + Math.cos(angle) * radius,
        y01 + Math.sin(angle) * radius,
        Math.cos(angle) * force,
        Math.sin(angle) * force,
        { radius: this._config.splatRadius * 2 }
      )
    }
  }

  clearSplatQueue(): void {
    this._splatQueue = []
  }

  replaySplatHistory(): void {
    for (const splat of this._splatHistory) {
      this.addSplat(splat.x01, splat.y01, splat.dx, splat.dy, splat.options)
    }
  }

  // ============================================================
  // CONFIGURATION
  // ============================================================

  updateConfig(updates: Partial<FluidConfig>): void {
    const prevProfile = this._config.profile
    this._config = { ...this._config, ...updates }

    if (this._state.isInitialized) {
      this._applyConfig()
      this._notifyListeners()
      this._emit('configChange', { updates, keys: Object.keys(updates) })

      if (updates.profile && updates.profile !== prevProfile) {
        this._emit('profileChanged', { from: prevProfile, to: updates.profile })
        this._log('info', `Profil changé: ${prevProfile} → ${updates.profile}`)
      }
    }
  }

  /** Appliquer un préset intégré ou personnalisé */
  applyPreset(nameOrPreset: string | FluidPreset): boolean {
    const preset = typeof nameOrPreset === 'string'
      ? FLUID_PRESETS[nameOrPreset]
      : nameOrPreset

    if (!preset) {
      this._log('warn', `Préset inconnu: ${nameOrPreset}`)
      return false
    }

    this.updateConfig(preset.config)
    this._emit('presetApplied', { name: preset.name })
    this._log('info', `Préset appliqué: ${preset.name}`)
    return true
  }

  /** Changer le profil de qualité à la volée */
  setProfile(profile: FluidProfile): void {
    this.updateConfig({ profile })
  }

  /** Auto-sélectionner le profil selon le GPU détecté */
  autoSelectProfile(): FluidProfile {
    const suggested = suggestProfileFromGPU(this._state.gpuTier)
    this.setProfile(suggested)
    return suggested
  }

  // ============================================================
  // TEXTURES
  // ============================================================

  getTextures(): {
    velocity: Texture | null
    density: Texture | null
    dye: Texture | null
    pressure: Texture | null
  } {
    return {
      velocity: this._state.velocityTexture,
      density: this._state.densityTexture,
      dye: this._state.dyeTexture,
      pressure: this._state.pressureTexture,
    }
  }

  getDyeTexture(): Texture | null { return this._state.dyeTexture }
  getVelocityTexture(): Texture | null { return this._state.velocityTexture }
  getDensityTexture(): Texture | null { return this._state.densityTexture }

  // ============================================================
  // SNAPSHOT
  // ============================================================

  takeSnapshot(): string | null {
    if (!this._renderer) return null
    try {
      const dataUrl = this._renderer.domElement.toDataURL('image/png')
      this._emit('snapshotTaken', { dataUrl: dataUrl.slice(0, 50) + '...' })
      return dataUrl
    } catch (e) {
      this._log('warn', `Snapshot échoué: ${e}`)
      return null
    }
  }

  // ============================================================
  // STATISTIQUES
  // ============================================================

  getStats(): FluidStats {
    const now = performance.now()
    const elapsed = now - this._state.lastStepTime
    const fps = elapsed > 0 ? Math.min(1000 / Math.max(elapsed, 16.67), 1000) : 0

    let memoryUsage: number | null = null
    try {
      const perf = performance as any
      memoryUsage = perf.memory?.usedJSHeapSize ?? null
    } catch { /* ignore */ }

    return {
      fps,
      avgFps: Math.round(this._fps.avg),
      minFps: Math.round(this._fps.min),
      maxFps: Math.round(this._fps.max),
      frameCount: this._state.frameCount,
      totalSplats: this._state.totalSplats,
      isInitialized: this._state.isInitialized,
      isPaused: this._state.isPaused,
      profile: this._config.profile,
      gpuTier: this._state.gpuTier,
      resolution: { ...this._state.resolution },
      memoryUsage,
      config: { ...this._config },
      uptime: this._state.initTime > 0 ? Date.now() - this._state.initTime : 0,
    }
  }

  getProfileInfo(): typeof FLUID_PROFILE_PARAMS[FluidProfile] {
    return FLUID_PROFILE_PARAMS[this._config.profile]
  }

  getSplatHistory(): ReadonlyArray<SplatEntry> {
    return this._splatHistory
  }

  getAvailablePresets(): string[] {
    return Object.keys(FLUID_PRESETS)
  }

  // ============================================================
  // ABONNEMENTS
  // ============================================================

  subscribe(listener: () => void): () => void {
    this._listeners.push(listener)
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener)
    }
  }

  onEvent(type: FluidEventType, handler: (event: FluidEvent) => void): () => void {
    const wrapper = (e: any) => {
      if (e.type === type) handler(e as FluidEvent)
    }
    this.addEventListener(type, wrapper)
    return () => this.removeEventListener(type, wrapper)
  }

  // ============================================================
  // DISPOSE
  // ============================================================

  dispose(): void {
    this._teardownPointer?.()
    this._teardownPointer = null

    if (this._visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._visibilityHandler)
      this._visibilityHandler = null
    }

    if (this._minFPSTimer) {
      clearInterval(this._minFPSTimer)
      this._minFPSTimer = null
    }

    try {
      this._fluid?.dispose?.()
    } catch { /* ignore */ }
    this._fluid = null

    this._state = {
      velocityTexture: null,
      densityTexture: null,
      dyeTexture: null,
      pressureTexture: null,
      isInitialized: false,
      isPaused: false,
      resolution: { width: 0, height: 0 },
      frameCount: 0,
      lastStepTime: 0,
      initTime: 0,
      totalSplats: 0,
      errorCount: 0,
      lastError: null,
      gpuTier: 'unknown',
      activeProfile: 'balanced',
    }

    this._listeners = []
    this._splatQueue = []
    this._splatHistory = []
    this._fps.reset()

    this._emit('dispose', {})
    this._log('info', 'EtherFluidSimulation disposée proprement')
  }

  // ============================================================
  // MÉTHODES PRIVÉES
  // ============================================================

  private _applyConfig(): void {
    if (!this._fluid) return

    const props: Array<keyof FluidConfig> = [
      'curlStrength', 'velocityDissipation', 'densityDissipation',
      'pressureDissipation', 'splatRadius', 'splatForce',
      'reflectWalls', 'enableDye', 'bfec',
    ]

    for (const key of props) {
      try {
        if (this._fluid[key] !== undefined) {
          (this._fluid as any)[key] = this._config[key]
        }
      } catch { /* ignore */ }
    }

    // Vorticity basée sur curl
    if (this._fluid.enableVorticity !== undefined) {
      this._fluid.enableVorticity = this._config.curlStrength > 0
    }

    // Tint global
    if (this._config.globalTint && this._fluid.tint !== undefined) {
      this._fluid.tint = new Color(...this._config.globalTint)
    }
  }

  private _updateTextures(): void {
    if (!this._fluid) return
    this._state.velocityTexture = this._fluid.velocityTexture ?? null
    this._state.densityTexture = this._fluid.densityTexture ?? null
    this._state.dyeTexture = this._fluid.dyeTexture ?? null
    this._state.pressureTexture = this._fluid.pressureTexture ?? null
  }

  private _notifyListeners(): void {
    for (const listener of this._listeners) {
      try { listener() } catch { /* ignore */ }
    }
  }

  private _emit(type: FluidEventType, data: Record<string, unknown>): void {
    const event: FluidEvent = { type, timestamp: Date.now(), data }
    this._eventHistory.push(event)
    if (this._eventHistory.length > 200) this._eventHistory.shift()
    this.dispatchEvent({ type, ...data } as any)
  }

  private _log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
    const prefix = `[EtherFluid v${this._version}]`
    switch (level) {
      case 'error': console.error(`${prefix} ❌ ${message}`); break
      case 'warn': console.warn(`${prefix} ⚠️ ${message}`); break
      case 'debug': console.debug(`${prefix} 🔍 ${message}`); break
      default: console.log(`${prefix} ℹ️ ${message}`); break
    }
  }
}

// ============================================================
// SINGLETON + EXPORT
// ============================================================

export const etherFluid = new EtherFluidSimulation()
export default etherFluid