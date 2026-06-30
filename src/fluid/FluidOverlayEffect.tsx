/**
 * FluidOverlayEffect.tsx
 * 
 * Effet d'overlay de fluide pour EtherWorld QC RP.
 * Utilise les textures de sortie de la simulation de fluides
 * pour appliquer des effets visuels sur la scène.
 * 
 * Compatible avec React Three Fiber et EffectComposer.
 * 
 * @author PepiteQC / EtherWorld Team
 * @date 2026-06-11
 */

import { useRef, useMemo, useEffect } from 'react'
import { extend, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Effect } from 'three-stdlib'
import * as THREE from 'three'
import { etherFluid } from './EtherFluidSimulation'

extend({ EffectComposer, Effect })

export interface FluidOverlayProps {
  /** Intensité de l'effet (0-2) */
  intensity?: number
  /** Couleur de la traînée */
  overlayColor?: [number, number, number]
  /** Facteur de mélange avec la scène */
  blendFactor?: number
  /** Activer l'effet de distorsion UV */
  enableDistortion?: boolean
  /** Activer l'effet d'overlay */
  enableOverlay?: boolean
  /** Vitesse de dissipation visuelle */
  dissolveSpeed?: number
  /** Rayon de l'effet de distorsion */
  distortionRadius?: number
  /** Décalage chromatique */
  chromaticOffset?: number
  /** Activer la densité comme masque de révélation */
  enableRevealMask?: boolean
}

/**
 * Shader d'overlay de fluide personnalisé
 * Utilise les textures de vitesse et de densité pour déformer l'image
 */
const fluidOverlayShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tVelocity: { value: null as THREE.Texture | null },
    tDensity: { value: null as THREE.Texture | null },
    intensity: { value: 1.0 },
    overlayColor: { value: new THREE.Color(0.5, 0.1, 0.9) },
    blendFactor: { value: 0.5 },
    enableDistortion: { value: 1.0 },
    enableOverlay: { value: 1.0 },
    dissolveSpeed: { value: 0.95 },
    distortionRadius: { value: 0.02 },
    chromaticOffset: { value: 0.003 },
    enableRevealMask: { value: 0.0 },
  },
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tVelocity;
    uniform sampler2D tDensity;
    uniform float intensity;
    uniform vec3 overlayColor;
    uniform float blendFactor;
    uniform float enableDistortion;
    uniform float enableOverlay;
    uniform float dissolveSpeed;
    uniform float distortionRadius;
    uniform float chromaticOffset;
    uniform float enableRevealMask;
    varying vec2 vUv;

    // Fonction de bruit pour ajouter de la turbulence naturelle
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec4 sceneColor = texture2D(tDiffuse, uv);
      
      // Échantillonner les textures du fluide
      vec2 velocity = texture2D(tVelocity, uv).xy;
      vec4 density = texture2D(tDensity, uv);
      float densityValue = density.b;
      
      // --- Distorsion UV ---
      if (enableDistortion > 0.5) {
        vec2 distortion = velocity * distortionRadius * intensity;
        
        // Ajouter un peu de bruit pour la turbulence
        float n = noise(uv * 100.0 + velocity * 50.0) * 0.001;
        distortion += n;
        
        // Décalage chromatique basé sur la vélocité
        float speed = length(velocity) * intensity;
        vec2 rOffset = distortion * (1.0 + chromaticOffset * speed);
        vec2 bOffset = distortion * (1.0 - chromaticOffset * speed);
        
        // Échantillonner les canaux RGB séparément
        float r = texture2D(tDiffuse, uv + rOffset).r;
        float g = sceneColor.g;
        float b = texture2D(tDiffuse, uv + bOffset).b;
        
        sceneColor.rgb = vec3(r, g, b);
      }
      
      // --- Overlay de densité ---
      if (enableOverlay > 0.5) {
        // Mélanger la densité avec la couleur d'overlay
        vec3 overlayMix = density.rgb * overlayColor * densityValue * intensity;
        
        // Appliquer le mélange
        sceneColor.rgb = mix(
          sceneColor.rgb,
          sceneColor.rgb + overlayMix,
          blendFactor * densityValue
        );
      }
      
      // --- Masque de révélation ---
      if (enableRevealMask > 0.5) {
        // Utiliser la densité comme masque pour révéler l'overlay
        float revealMask = smoothstep(0.1, 0.5, densityValue);
        sceneColor.rgb = mix(
          sceneColor.rgb,
          sceneColor.rgb * (1.0 + revealMask * 0.3),
          revealMask * 0.5
        );
      }
      
      // --- Dissipation ---
      // Réduire progressivement l'intensité basée sur la vitesse
      float dissipationFactor = 1.0 - (1.0 - dissolveSpeed) * length(velocity) * 2.0;
      sceneColor.rgb *= clamp(dissipationFactor, 0.8, 1.0);
      
      // Tone mapping basique
      sceneColor.rgb = pow(sceneColor.rgb, vec3(1.0 / 2.2));
      
      gl_FragColor = sceneColor;
    }
  `,
}

/**
 * Effet d'overlay de fluide pour React Three Fiber
 * S'intègre dans la chaîne de post-processing
 */
export const FluidOverlayEffect: React.FC<FluidOverlayProps> = ({
  intensity = 1.0,
  overlayColor = [0.5, 0.1, 0.9],
  blendFactor = 0.5,
  enableDistortion = true,
  enableOverlay = true,
  dissolveSpeed = 0.95,
  distortionRadius = 0.02,
  chromaticOffset = 0.003,
  enableRevealMask = false,
}) => {
  const uniformsRef = useRef<{
    intensity: THREE.IUniform<number>
    overlayColor: THREE.IUniform<THREE.Color>
    blendFactor: THREE.IUniform<number>
    enableDistortion: THREE.IUniform<number>
    enableOverlay: THREE.IUniform<number>
    dissolveSpeed: THREE.IUniform<number>
    distortionRadius: THREE.IUniform<number>
    chromaticOffset: THREE.IUniform<number>
    enableRevealMask: THREE.IUniform<number>
  }>(fluidOverlayShader.uniforms as any)

  const effectRef = useRef<THREE.Effect | null>(null)
  const { size, gl } = useThree()

  const uniforms = useMemo(
    () => ({
      tDiffuse: { value: null as THREE.Texture | null },
      tVelocity: { value: null as THREE.Texture | null },
      tDensity: { value: null as THREE.Texture | null },
      intensity: { value: intensity },
      overlayColor: { value: new THREE.Color(...overlayColor) },
      blendFactor: { value: blendFactor },
      enableDistortion: { value: enableDistortion ? 1.0 : 0.0 },
      enableOverlay: { value: enableOverlay ? 1.0 : 0.0 },
      dissolveSpeed: { value: dissolveSpeed },
      distortionRadius: { value: distortionRadius },
      chromaticOffset: { value: chromaticOffset },
      enableRevealMask: { value: enableRevealMask ? 1.0 : 0.0 },
    }),
    []
  )

  useEffect(() => {
    uniforms.intensity.value = intensity
    uniforms.overlayColor.value = new THREE.Color(...overlayColor)
    uniforms.blendFactor.value = blendFactor
    uniforms.enableDistortion.value = enableDistortion ? 1.0 : 0.0
    uniforms.enableOverlay.value = enableOverlay ? 1.0 : 0.0
    uniforms.dissolveSpeed.value = dissolveSpeed
    uniforms.distortionRadius.value = distortionRadius
    uniforms.chromaticOffset.value = chromaticOffset
    uniforms.enableRevealMask.value = enableRevealMask ? 1.0 : 0.0
  }, [intensity, overlayColor, blendFactor, enableDistortion, enableOverlay, dissolveSpeed, distortionRadius, chromaticOffset, enableRevealMask])

  useFrame((_, delta) => {
    if (!uniforms) return

    // Mettre à jour les textures du fluide
    const textures = etherFluid.getTextures()
    uniforms.tVelocity.value = textures.velocity
    uniforms.tDensity.value = textures.density

    // Mettre à jour les valeurs dynamiques
    const stats = etherFluid.getStats()
    uniforms.intensity.value = intensity * (stats.isInitialized ? 1.0 : 0.0)
  })

  return (
    <Effect
      ref={effectRef}
      fragmentShader={fluidOverlayShader.fragmentShader}
      uniforms={uniforms}
    />
  )
}

export default FluidOverlayEffect
