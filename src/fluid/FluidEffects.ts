/**
 * FluidEffects.ts
 * 
 * Point d'exportation principal pour le système de fluides d'EtherWorld.
 * Réunit toutes les fonctionnalités en un seul import.
 * 
 * @author PepiteQC / EtherWorld Team
 * @date 2026-06-11
 */

// Simulation principale
export { EtherFluidSimulation, etherFluid, DEFAULT_FLUID_CONFIG } from './EtherFluidSimulation'
export type { FluidConfig, FluidProfile, FluidState, OverlayType, DistortionType } from './EtherFluidSimulation'

// Effets de distorsion (Post-processing Pass)
export { FluidDistortionPass } from './FluidDistortionPass'
export type { FluidDistortionPassOptions } from './FluidDistortionPass'

// Effets de particules
export { FluidParticleSystem } from './FluidParticleSystem'
export type { FluidParticleProps } from './FluidParticleSystem'

// Masque de révélation
export { FluidRevealMask } from './FluidRevealMask'
export type { FluidRevealMaskProps } from './FluidRevealMask'

// Exemple d'intégration + hooks
export { FluidScene, FluidSceneWrapper, useEtherFluid } from './FluidIntegrationExample'

// Constantes utiles
export const FLUID_PROFILES = {
  performance: { resolution: '128²', iterations: 6, cost: '1×' },
  balanced: { resolution: '256²', iterations: 12, cost: '~6×' },
  quality: { resolution: '384²', iterations: 20, cost: '~25×' },
} as const

export const OVERLAY_TYPES = [
  'default', 'artInk', 'oil', 'rainbowFish', 'velocity',
  'glaze', 'smoke', 'colorWater', 'liquidLens', 'densityTint',
] as const

export const DISTORTION_TYPES = [
  'simple', 'chromatic', 'rgbShift', 'water', 'waterCaustics',
] as const
