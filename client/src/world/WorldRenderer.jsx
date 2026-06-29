import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Fog } from '@react-three/drei'
import { useGameStore } from '../store/GameStateStore'
import { NeonCity } from './NeonCity'
import { PlayerModel } from './PlayerModel'
import { HUDSystem } from '../hud/HUDSystem'

export function WorldRenderer() {
  const players = useGameStore(s => s.players)
  const world   = useGameStore(s => s.world)

  return (
    <div className="relative w-full h-screen bg-[#020617]">
      
      {/* Canvas Three.js */}
      <Canvas
        shadows
        camera={{ position: [0, 15, 30], fov: 60 }}
        gl={{ antialias: true }}
      >
        {/* Ambiance neon */}
        <ambientLight intensity={0.1} />
        <pointLight 
          position={[0, 20, 0]} 
          intensity={2} 
          color="#00f5ff" 
        />
        <pointLight 
          position={[50, 10, 50]} 
          intensity={1.5} 
          color="#a855f7" 
        />
        
        {/* Atmosph ère */}
        <Stars 
          radius={200} 
          depth={50} 
          count={3000} 
          factor={4} 
          fade 
        />
        <fog attach="fog" args={['#020617', 30, 200]} />

        {/* Monde */}
        <NeonCity world={world} />

        {/* Joueurs */}
        {players.map(player => (
          <PlayerModel key={player.id} player={player} />
        ))}

        <OrbitControls 
          maxPolarAngle={Math.PI / 2.2} 
          minDistance={5} 
          maxDistance={100} 
        />
      </Canvas>

      {/* HUD par dessus */}
      <HUDSystem />
    </div>
  )
}