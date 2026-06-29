// ============================================================
//  TROXTAVATAR3D.tsx — Neural Core 3D optimisé
// ============================================================

import React, { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface TroxTAvatar3DProps {
  isThinking?: boolean
  consciousnessLevel?: number
  isOnline?: boolean
  onClick?: () => void
}

// ═══════════════════════════════════════════════════════════
//  Neural Brain Mesh
// ═══════════════════════════════════════════════════════════
function NeuralBrain({
  isThinking,
  consciousnessLevel,
  isOnline
}: {
  isThinking: boolean
  consciousnessLevel: number
  isOnline: boolean
}) {
  const refs = {
    group: useRef<THREE.Group>(null),
    core: useRef<THREE.Mesh>(null),
    inner: useRef<THREE.Mesh>(null),
    ring1: useRef<THREE.Mesh>(null),
    ring2: useRef<THREE.Mesh>(null),
    particles: useRef<THREE.Points>(null),
    light: useRef<THREE.PointLight>(null)
  }

  // Couleurs pré-calculées
  const { baseColor, thinkColor, onlineColor } = useMemo(
    () => ({
      baseColor: new THREE.Color('#7b6fff'),
      thinkColor: new THREE.Color('#ff6b6b'),
      onlineColor: new THREE.Color('#44ff88')
    }),
    []
  )

  // Particules
  const particleCount = 120

  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const r = 1.8 + Math.random() * 1.2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])

  const particleColors = useMemo(() => {
    const col = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const c = new THREE.Color().setHSL(0.7 + Math.random() * 0.15, 0.8, 0.6)
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return col
  }, [])

  // Animation
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const speed = 0.5 + (consciousnessLevel / 10) * 1.5

    const g = refs.group.current
    const core = refs.core.current
    const inner = refs.inner.current
    const r1 = refs.ring1.current
    const r2 = refs.ring2.current
    const pts = refs.particles.current
    const light = refs.light.current

    if (g) {
      g.rotation.y = t * 0.15 * speed
      g.rotation.x = Math.sin(t * 0.1) * 0.1
    }

    if (core) {
      const mat = core.material as THREE.MeshStandardMaterial
      const target = isThinking ? thinkColor : isOnline ? baseColor : onlineColor
      mat.color.lerp(target, 0.05)
      mat.emissive.lerp(target, 0.05)

      const pulse = isThinking ? 1 + Math.sin(t * 8) * 0.15 : 1 + Math.sin(t * 2) * 0.08
      core.scale.setScalar(pulse)
    }

    if (inner) {
      const mat = inner.material as THREE.MeshBasicMaterial
      mat.opacity = 0.15 + Math.sin(t * 3) * 0.05
      inner.scale.setScalar(1.2 + Math.sin(t * 1.5) * 0.1)
    }

    if (r1) {
      r1.rotation.x = t * 0.3 * speed
      r1.rotation.y = t * 0.5 * speed
    }

    if (r2) {
      r2.rotation.x = -t * 0.4 * speed
      r2.rotation.z = t * 0.2 * speed
    }

    if (pts) {
      pts.rotation.y = -t * 0.08 * speed
      pts.rotation.z = Math.sin(t * 0.2) * 0.05
    }

    if (light) {
      light.intensity = isThinking
        ? 2.5 + Math.sin(t * 12) * 1.0
        : 1.5 + Math.sin(t * 4) * 0.5
    }
  })

  return (
    <group ref={refs.group}>
      {/* Core */}
      <mesh ref={refs.core}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={0.6}
          metalness={0.9}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Wireframe */}
      <mesh>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial
          color="#aaddff"
          wireframe
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Inner glow */}
      <mesh ref={refs.inner}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Rings */}
      <mesh ref={refs.ring1}>
        <torusGeometry args={[1.6, 0.015, 16, 100]} />
        <meshBasicMaterial color="#7b6fff" transparent opacity={0.4} />
      </mesh>

      <mesh ref={refs.ring2} rotation={[Math.PI / 3, 0, Math.PI / 6]}>
        <torusGeometry args={[2.0, 0.012, 16, 100]} />
        <meshBasicMaterial color="#ffaa44" transparent opacity={0.25} />
      </mesh>

      {/* Particles */}
      <points ref={refs.particles}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleCount}
            array={particleColors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>

      {/* Lights */}
      <pointLight ref={refs.light} color={baseColor} intensity={1.5} distance={8} />
      <ambientLight intensity={0.3} />
    </group>
  )
}

// ═══════════════════════════════════════════════════════════
//  Export Component
// ═══════════════════════════════════════════════════════════
export const TroxTAvatar3D: React.FC<TroxTAvatar3DProps> = ({
  isThinking = false,
  consciousnessLevel = 5,
  isOnline = true,
  onClick
}) => {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const statusColor = isThinking ? '#ff6b6b' : isOnline ? '#44ff88' : '#ff4444'
  const glowSize = hovered ? 30 : 20

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Ouvrir TroxT Agent"
      style={{
        position: 'relative',
        width: '140px',
        height: '140px',
        cursor: 'pointer',
        borderRadius: '50%',
        transition: 'all 0.15s ease',
        transform: pressed ? 'scale(0.95)' : hovered ? 'scale(1.12)' : 'scale(1)',
        outline: 'none',
        userSelect: 'none'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setPressed(false)
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onClick={() => {
        setPressed(false)
        onClick?.()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          inset: '-8px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${statusColor}22 0%, transparent 70%)`,
          transition: 'all 0.3s ease',
          filter: `blur(${glowSize}px)`,
          pointerEvents: 'none'
        }}
      />

      {/* Canvas */}
      <Canvas
        style={{
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          position: 'relative',
          zIndex: 2,
          pointerEvents: 'none'
        }}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
      >
        <NeuralBrain
          isThinking={isThinking}
          consciousnessLevel={consciousnessLevel}
          isOnline={isOnline}
        />
      </Canvas>

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          bottom: '-22px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 3
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 800,
            color: hovered ? '#7b6fff' : '#aaa',
            letterSpacing: '2px',
            transition: 'color 0.3s'
          }}
        >
          TROXT
        </div>
        <div
          style={{
            fontSize: '9px',
            color: isThinking ? '#ff6b6b' : '#555',
            marginTop: '2px',
            transition: 'color 0.3s'
          }}
        >
          {isThinking ? 'Réflexion...' : 'Neural Core'}
        </div>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: '-36px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10,12,24,0.95)',
            border: '1px solid rgba(123,111,255,0.25)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '11px',
            color: '#bbaaff',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
          }}
        >
          Cliquer pour ouvrir l'Agent TroxT
        </div>
      )}
    </div>
  )
}

export default TroxTAvatar3D

