/**
 * FluidDistortionPass.ts
 * 
 * Pass de distorsion de fluide compatible avec EffectComposer de three.js.
 * Permet d'appliquer différentes distorsions UV basées sur le champ de
 * vitesse de la simulation de fluides.
 * 
 * @author PepiteQC / EtherWorld Team
 * @date 2026-06-11
 */

import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'
import * as THREE from 'three'

export interface FluidDistortionPassOptions {
  /** Type de distorsion */
  type?: 'simple' | 'chromatic' | 'rgbShift' | 'water' | 'waterCaustics'
  /** Intensité de la distorsion (0-2) */
  intensity?: number
  /** Rayon de distorsion UV */
  radius?: number
  /** Facteur de mélange */
  blendFactor?: number
  /** Décalage chromatique (pour chromatic uniquement) */
  chromaticOffset?: number
  /** Vitesse de l'animation (pour water/waterCaustics) */
  animationSpeed?: number
  /** Fréquence des vagues (pour water/waterCaustics) */
  waveFrequency?: number
}

const DEFAULT_OPTIONS: Required<FluidDistortionPassOptions> = {
  type: 'simple',
  intensity: 1.0,
  radius: 0.02,
  blendFactor: 0.5,
  chromaticOffset: 0.003,
  animationSpeed: 0.5,
  waveFrequency: 2.0,
}

/**
 * Shader pour la distorsion UV simple
 */
const simpleDistortionShader = {
  uniforms: {
    tDiffuse: { value: null },
    tVelocity: { value: null },
    tDensity: { value: null },
    intensity: { value: 1.0 },
    radius: { value: 0.02 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tVelocity;
    uniform sampler2D tDensity;
    uniform float intensity;
    uniform float radius;
    varying vec2 vUv;

    void main() {
      vec2 velocity = texture2D(tVelocity, vUv).xy;
      float density = texture2D(tDensity, vUv).b;
      
      vec2 distortion = velocity * radius * intensity;
      vec2 distortedUv = vUv + distortion;
      
      vec4 color = texture2D(tDiffuse, distortedUv);
      color.rgb += density * intensity * 0.1;
      
      gl_FragColor = color;
    }
  `,
}

/**
 * Shader pour la distorsion chromatique
 */
const chromaticDistortionShader = {
  uniforms: {
    tDiffuse: { value: null },
    tVelocity: { value: null },
    tDensity: { value: null },
    intensity: { value: 1.0 },
    radius: { value: 0.02 },
    chromaticOffset: { value: 0.003 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tVelocity;
    uniform sampler2D tDensity;
    uniform float intensity;
    uniform float radius;
    uniform float chromaticOffset;
    varying vec2 vUv;

    void main() {
      vec2 velocity = texture2D(tVelocity, vUv).xy;
      float speed = length(velocity) * intensity;
      
      vec2 offsetR = velocity * radius *: