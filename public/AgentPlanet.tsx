// ============================================================
// AGENT PLANET
// C:\TroxTServerRP\apps\troxtlab\src\components\planet\AgentPlanet.tsx
// ============================================================

import { useRef, useMemo }    from 'react'
import { useFrame }           from '@react-three/fiber'
import { Text, Sphere, Torus } from '@react-three/drei'
import * as THREE             from 'three'
import { useLabStore }        from '../../store/labStore'
import { ORBIT_RADII, ORBIT_SPEEDS, AGENT_COLORS } from '../../config/orbits'

const ORBIT_AGENTS = [
  ['troxt-brain'],
  ['third-eye', 'intellectus'],
  ['ether-core', 'ether-prism', 'ether-forge', 'ether-weave'],
  ['ether-guard', 'ether-ui', 'ether-lens', 'ether-sim'],
  ['forge-factory', 'ether-deploy', 'ether-memory']
]

export function AgentPlanet() {
  const agents       = useLabStore(s => s.agents)
  const selectedId   = useLabStore(s => s.selectedAgent)
  const selectAgent  = useLabStore(s => s.selectAgent)
  const anglesRef    = useRef<Record<string, number>>({})

  // Init angles
  useMemo(() => {
    ORBIT_AGENTS.forEach((orbitAgents, oi) => {
      orbitAgents.forEach((id, i) => {
        anglesRef.current[id] = (2 * Math.PI / orbitAgents.length) * i
      })
    })
  }, [])

  useFrame(() => {
    ORBIT_AGENTS.forEach((orbitAgents, oi) => {
      if (oi === 0) return
      const speed = ORBIT_SPEEDS[oi] || 0.001
      orbitAgents.forEach(id => {
        anglesRef.current[id] = (anglesRef.current[id] || 0) + speed
      })
    })
  })

  return (
    <group>
      {/* Orbites */}
      {ORBIT_RADII.slice(1).map((r, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.3, 8, 128]} />
          <meshBasicMaterial color="#1a1a4a" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Agents */}
      {ORBIT_AGENTS.map((orbitAgents, oi) =>
        orbitAgents.map(id => {
          const agent  = agents[id]
          const color  = agent ? (AGENT_COLORS[agent.color] || '#555577') : '#555577'
          const radius = ORBIT_RADII[oi]
          const angle  = anglesRef.current[id] || 0
          const x      = radius * Math.cos(angle)
          const z      = radius * Math.sin(angle)
          const isSelected = id === selectedId
          const isOffline  = !agent || agent.status === 'offline'
          const shortName  = id.replace('ether-', '').replace('forge-factory', 'factory').substring(0, 7)

          return (
            <group key={id} position={[x, 0, z]}>
              {/* Glow */}
              {!isOffline && (
                <mesh>
                  <sphereGeometry args={[isSelected ? 18 : 14, 16, 16]} />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.08}
                  />
                </mesh>
              )}

              {/* Noeud agent */}
              <mesh
                onClick={() => selectAgent(isSelected ? null : id)}
                onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
                onPointerOut={() => { document.body.style.cursor = 'default' }}
              >
                <sphereGeometry args={[isSelected ? 10 : 8, 32, 32]} />
                <meshStandardMaterial
                  color={isOffline ? '#1a1a2a' : color}
                  emissive={isOffline ? '#000000' : color}
                  emissiveIntensity={isOffline ? 0 : 0.5}
                  roughness={0.3}
                  metalness={0.8}
                />
              </mesh>

              {/* Anneau sélection */}
              {isSelected && (
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[13, 0.5, 8, 64]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
                </mesh>
              )}

              {/* Label */}
              <Text
                position={[0, -16, 0]}
                fontSize={6}
                color={isOffline ? '#333355' : '#aaaaee'}
                anchorX="center"
                anchorY="top"
              >
                {shortName}
              </Text>
            </group>
          )
        })
      )}

      {/* Brain au centre */}
      <BrainCore agents={agents} onClick={() => useLabStore.getState().selectAgent('troxt-brain')} />
    </group>
  )
}

function BrainCore({ agents, onClick }: any) {
  const meshRef = useRef<THREE.Mesh>(null)
  const agent   = agents['troxt-brain']
  const color   = agent ? (AGENT_COLORS[agent.color] || '#4488ff') : '#4488ff'

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.3
    }
  })

  return (
    <group>
      <mesh ref={meshRef} onClick={onClick}>
        <icosahedronGeometry args={[20, 2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          wireframe
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[28, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.05} />
      </mesh>
      <Text position={[0, 35, 0]} fontSize={8} color="#7777ff" anchorX="center">
        TROXT BRAIN
      </Text>
    </group>
  )
}
