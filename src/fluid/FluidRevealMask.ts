/**
 * FluidRevealMask.ts
 * 
 * Effet de masque de révélation utilisant la densité du fluide.
 * Permet de révéler progressivement des éléments cachés derrière
 * les traînées de fluide.
 * 
 * @author PepiteQC / EtherWorld Team
 * @date 2026-06-11
 */

import { useRef, useMemo, useEffect } from 'react'
import { extend, useFrame } from '@react-three/fiber'
import { Effect } from 'three/examples/jsm/postprocessing/Effect'
import * as THREE from 'three'

extend({ Effect })

export interface FluidRevealMaskProps {
  /** Texture de la couche supérieure (à masquer) */
  topTexture: THREE.Texture | null
  /** Texture de la couche inférieure (à révéler) */
  bottomTexture: THREE.Texture | null
  /** Texture de densité du fluide */
  densityTexture: THREE.Texture | null
  /** Intensité de la révélation (0-1) */
  revealIntensity?: number
  /** Facteur de lissage du masque */
  smoothness?: number
  /** Seuil de révélation */
  threshold?: number
}

/**
 * Shader de masque de révélation
 */
const revealMaskShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tTop: { value: null as THREE.Texture | null },
    tBottom: { value: null as THREE.Texture | null },
    tDensity: { value: null as THREE.Texture | null },
    revealIntensity: { value: 0.5 },
    smoothness: { value: 0.2 },
    threshold: { value: 0.1 },
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
    uniform sampler2D tTop;
    uniform sampler2D tBottom;
    uniform sampler2D tDensity;
    uniform float revealIntensity;
    uniform float smoothness;
    uniform float threshold;
    varying vec2 vUv;

    void main() {
      vec4 topColor = texture2D(tTop, vUv);
      vec4 bottomColor = texture2D(tBottom, vUv);
      float density = texture2D(tDensity, vUv).b;
      
      // Créer un masque lissé à partir de la densité
      float mask = smoothstep(threshold, threshold + smoothness, density);
      mask *= revealIntensity;
      
      // Mélanger les couches selon le masque
      vec4 finalColor = mix(topColor, bottomColor, mask);
      
      // Ajouter un effet de bordure ondulante
      float edge = smoothstep(threshold - 0.05, threshold, density) * 
                   smoothstep(threshold + smoothness + 0.05, threshold + smoothness, density);
      
      // Effet de ripple sur les bords
      vec2 ripple = vec2(
        sin(vUv.x * 20.0 + density * 5.0) * 0.002,
        cos(vUv.y * 20.0 + density * 5.0) * 0.002
      ) * edge * revealIntensity;
      
      finalColor.rgb += ripple * 10.0;
      
      gl_FragColor = finalColor;
    }
  `,
}

/**
 * Effet de masque de révélation pour React Three Fiber
 */
export const FluidRevealMask: React.FC<FluidRevealMaskProps> = ({
  topTexture,
  bottomTexture,
  densityTexture,
  revealIntensity = 0.5,
  smoothness = 0.2,
  threshold = 0.1,
}) => {
  const uniformsRef = useRef(revealMaskShader.uniforms)
  const effectRef = useRef<Effect | null>(null)

  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.tTop.value = topTexture
      uniformsRef.current.tBottom.value = bottomTexture
      uniformsRef.current.tDensity.value = densityTexture
      uniformsRef.current.revealIntensity.value = revealIntensity
      uniformsRef.current.smoothness.value = smoothness
      uniformsRef.current.threshold.value = threshold
    }
  }, [topTexture, bottomTexture, densityTexture, revealIntensity, smoothness, threshold])

  return (
    <Effect
      ref={effectRef}
      fragmentShader={revealMaskShader.fragmentShader}
      uniforms={uniformsRef.current}
    />
  )
}

export default FluidRevealMask
