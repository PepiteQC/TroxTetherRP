// ============================================================
// PLANET CANVAS — Three.js via React Three Fiber
// C:\TroxTServerRP\apps\troxtlab\src\components\planet\PlanetCanvas.tsx
// ============================================================

import { Canvas }          from '@react-three/fiber'
import { OrbitControls }   from '@react-three/drei'
import { Suspense }        from 'react'
import { AgentPlanet }     from './AgentPlanet'
import { useLabStore }     from '../../store/labStore'

export function PlanetCanvas() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#050510' }}>
      <Canvas
        camera={{ position: [0, 0, 600], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#050510']} />
        <ambientLight intensity={0.1} />
        <pointLight position={[0, 0, 0]} intensity={2} color="#4466ff" />
        <Suspense fallback={null}>
          <AgentPlanet />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={200}
          maxDistance={900}
          enableDamping
          dampingFactor={0.05}
        />
        <Stars />
      </Canvas>
    </div>
  )
}

function Stars() {
  const positions: number[] = []
  for (let i = 0; i < 300; i++) {
    positions.push(
      (Math.random() - 0.5) * 2000,
      (Math.random() - 0.5) * 2000,
      (Math.random() - 0.5) * 2000
    )
  }
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(positions), 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={1.5} color="#8888ff" transparent opacity={0.6} />
    </points>
  )
}
