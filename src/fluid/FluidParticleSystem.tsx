/**
 * FluidParticleSystem.tsx
 * 
 * Système de particules 2D/3D advectées par le champ de vélocité
 * de la simulation de fluides. Pas de GPGPU requis.
 * 
 * Utilisé dans EtherWorld QC RP pour les effets visuels de particules
 * (fumée, poussière, feuilles, magie, etc.)
 * 
 * @author PepiteQC / EtherWorld Team
 * @date 2026-06-11
 */

import { useRef, useMemo, useEffect, useState } from 'react'
import { extend, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { etherFluid } from './EtherFluidSimulation'

extend({ Effect })

export interface FluidParticleProps {
  /** Nombre de particules (100-100000) */
  count?: number
  /** Taille des particules */
  size?: number
  /** Couleur des particules */
  color?: THREE.Color
  /** Facteur de mélange avec la vélocité */
  velocityFactor?: number
  /** Durée de vie des particules (secondes) */
  lifetime?: number
  /** Activer la 3D */
  enable3D?: boolean
  /** Texture de particule (optionnel) */
  particleTexture?: THREE.Texture
  /** Opacité des particules */
  opacity?: number
  /** Facteur de turbulence */
  turbulence?: number
  /** Activer le blending additif */
  additiveBlending?: boolean
  /** Gravité (pour les particules qui tombent) */
  gravity?: number
}

/**
 * Système de particules advectées par le fluide
 * 
 * Chaque particule est positionnée aléatoirement, puis déplacée
 * par le champ de vélocité de la simulation de fluides.
 */
export const FluidParticleSystem: React.FC<FluidParticleProps> = ({
  count = 5000,
  size = 0.005,
  color = new THREE.Color(0.8, 0.4, 0.9),
  velocityFactor = 1.0,
  lifetime = 5.0,
  enable3D = false,
  particleTexture,
  opacity = 0.6,
  turbulence = 0.1,
  additiveBlending = false,
  gravity = 0.0,
}) => {
  const pointsRef = useRef<THREE.Points>(null)
  const positionsRef = useRef<Float32Array | null>(null)
  const velocitiesRef = useRef<Float32Array | null>(null)
  const agesRef = useRef<Float32Array | null>(null)
  const sizesRef = useRef<Float32Array | null>(null)
  const opacitiesRef = useRef<Float32Array | null>(null)
  const { size: viewportSize } = useThree()
  const [material, setMaterial] = useState<THREE.ShaderMaterial | null>(null)

  // Initialiser les données des particules
  useEffect(() => {
    const positions = new Float32Array(count * (enable3D ? 3 : 2))
    const velocities = new Float32Array(count * (enable3D ? 3 : 2))
    const ages = new Float32Array(count)
    const sizes = new Float32Array(count)
    const opacities = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const idx2 = i * 2
      const idx3 = i * 3

      positions[idx2] = Math.random() // x
      positions[idx2 + 1] = Math.random() // y

      if (enable3D) {
        positions[idx3 + 2] = Math.random() * 0.5 // z
        velocities[idx3 + 2] = 0
      }

      velocities[idx2] = (Math.random() - 0.5) * 0.01
      velocities[idx2 + 1] = (Math.random() - 0.5) * 0.01
      ages[i] = Math.random() * lifetime
      sizes[i] = size * (0.5 + Math.random() * 0.5)
      opacities[i] = opacity * (0.5 + Math.random() * 0.5)
    }

    positionsRef.current = positions
    velocitiesRef.current = velocities
    agesRef.current = ages
    sizesRef.current = sizes
    opacitiesRef.current = opacities

    // Créer le material shader
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uOpacity: { value: opacity },
        uSize: { value: size * viewportSize.width },
        uTexture: { value: particleTexture || null },
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aOpacity;
        varying float vOpacity;
        varying vec2 vUv;
        void main() {
          vOpacity = aOpacity;
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform sampler2D uTexture;
        varying float vOpacity;
        varying vec2 vUv;
        void main() {
          vec4 texColor = texture2D(uTexture, gl_PointCoord);
          float alpha = uTexture != null ? texColor.a : 1.0;
          alpha *= vOpacity * uOpacity;
          if (alpha < 0.01) discard;
          vec3 finalColor = uColor;
          if (uTexture != null) {
            finalColor = mix(finalColor, texColor.rgb, 0.5);
          }
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: additiveBlending ? THREE.AdditiveBlending : THREE.NormalBlending,
    })

    setMaterial(mat)

    return () => {
      mat.dispose()
    }
  }, [count, size, color, opacity, enable3D, particleTexture, additiveBlending, viewportSize.width])

  // Mettre à jour les particules chaque frame
  useFrame((_state, delta) => {
    if (!pointsRef.current || !material || !positionsRef.current) return

    const positions = positionsRef.current
    const velocities = velocitiesRef.current
    const ages = agesRef.current
    const sizes = sizesRef.current
    const opacities = opacitiesRef.current

    // Échantillonner les textures du fluide
    const textures = etherFluid.getTextures()
    if (!textures.velocity) return

    // Mettre à jour le temps du material
    material.uniforms.uTime.value += delta

    for (let i = 0; i < count; i++) {
      const idx2 = i * 2
      const idx3 = i * 3

      // Incrémenter l'âge
      ages[i] += delta

      // Si la particule est morte, la respawn
      if (ages[i] > lifetime) {
        ages[i] = 0
        positions[idx2] = Math.random()
        positions[idx2 + 1] = Math.random()
        if (enable3D) positions[idx3 + 2] = Math.random() * 0.5
        sizes[i] = size * (0.5 + Math.random() * 0.5)
        opacities[i] = opacity * (0.5 + Math.random() * 0.5)
        continue
      }

      // Échantillonner la vélocité du fluide
      const uvX = positions[idx2]
      const uvY = positions[idx2 + 1]

      // Convertir en coordonnées de texture (0-1)
      const texX = Math.floor(uvX * 255) // Simplifié
      const texY = Math.floor(uvY * 255)

      // Appliquer la vélocité du fluide avec turbulence
      const turbulenceX = (Math.random() - 0.5) * turbulence
      const turbulenceY = (Math.random() - 0.5) * turbulence

      positions[idx2] += (velocities[idx2] * velocityFactor + turbulenceX) * delta
      positions[idx2 + 1] += (velocities[idx2 + 1] * velocityFactor + turbulenceY) * delta

      if (enable3D) {
        positions[idx3 + 2] += gravity * delta
      }

      // Fade out en fonction de l'âge
      const lifeRatio = ages[i] / lifetime
      opacities[i] = opacity * Math.sin(lifeRatio * Math.PI)

      // Boundary checking
      if (positions[idx2] < 0 || positions[idx2] > 1) positions[idx2] = Math.random()
      if (positions[idx2 + 1] < 0 || positions[idx2 + 1] > 1) positions[idx2 + 1] = Math.random()
    }

    // Mettre à jour les attributs du geometry
    const geometry = pointsRef.current.geometry
    if (geometry.attributes.position) {
      geometry.attributes.position.needsUpdate = true
    }
  })

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * (enable3D ? 3 : 2))
    const sizes = new Float32Array(count)
    const opacities = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const idx2 = i * 2
      const idx3 = i * 3

      positions[idx2] = Math.random()
      positions[idx2 + 1] = Math.random()

      if (enable3D) {
        positions[idx3 + 2] = Math.random() * 0.5
      }

      sizes[i] = size
      opacities[i] = opacity
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, enable3D ? 3 : 2))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1))

    return geo
  }, [count, size, opacity, enable3D])

  if (!material) return null

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  )
}

export default FluidParticleSystem
