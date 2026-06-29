import { Suspense, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { PlayerCharacter } from './components/PlayerCharacter';
import { GroundGrid, FloatingParticles, SceneLighting } from './components/GameWorld';
import { GameHUD } from './components/GameHUD';
import { BuilderPanel } from './components/builder/BuilderPanel';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { TroxTMSN } from './components/troxt/TroxTMSN';
import { EtherSpawnMenu } from './components/ui/EtherSpawnMenu';
import { InventoryPanel } from './components/ui/InventoryPanel';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { HotelBuilding } from './components/world/HotelBuilding';
import { CorridorScene } from './components/world/CorridorScene';
import { RoomArchitecture } from './components/world/RoomArchitecture';
import { QuebecRoad } from './components/world/QuebecRoad';
import { BathroomFixtures, SecurityDoor, WindowWithCurtains } from './components/world/DoorSystem';
import {
  useGameState,
  addPlaced,
  selectPlaced,
  setGlobal,
} from './store';
import type { PlacedObject } from './store';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

// ──────────────────────────────────────────────────────────────────────────────
// Placed object mesh
// ──────────────────────────────────────────────────────────────────────────────
function PlacedObjectMesh({
  obj,
  ghost = false,
}: {
  obj: Pick<PlacedObject, 'type' | 'position' | 'rotation' | 'scale' | 'id'>;
  ghost?: boolean;
}) {
  const selectedId = useGameState(s => s.selectedPlacedId);
  const isSelected = !ghost && selectedId === obj.id;
  const color = isSelected ? '#22d3ee' : '#6366f1';

  const groupProps = {
    position: obj.position,
    rotation: [0, obj.rotation, 0] as [number, number, number],
    scale: [obj.scale, obj.scale, obj.scale] as [number, number, number],
    onClick: ghost ? undefined : (e: any) => {
      e.stopPropagation();
      selectPlaced(obj.id ?? null);
    },
    castShadow: !ghost,
    receiveShadow: !ghost,
  };

  const stdMat = (c = '#6366f1') => (
    <meshStandardMaterial
      color={isSelected ? '#22d3ee' : c}
      wireframe={ghost}
      transparent={ghost || isSelected}
      opacity={ghost ? 0.45 : 1}
      emissive={isSelected ? '#164e63' : '#000000'}
    />
  );

  switch (obj.type) {
    case 'sphere':
      return <mesh {...groupProps}><sphereGeometry args={[0.5, 16, 16]} />{stdMat('#8b5cf6')}</mesh>;
    case 'cylinder':
      return <mesh {...groupProps}><cylinderGeometry args={[0.5, 0.5, 1, 12]} />{stdMat('#7c3aed')}</mesh>;
    case 'plane':
      return (
        <mesh {...groupProps} rotation={[-Math.PI / 2, 0, obj.rotation]}>
          <planeGeometry args={[2, 2]} />
          {stdMat('#5b21b6')}
        </mesh>
      );
    case 'wall':
      return <mesh {...groupProps}><boxGeometry args={[3, 2.4, 0.2]} />{stdMat('#b45309')}</mesh>;
    case 'pillar':
      return <mesh {...groupProps}><cylinderGeometry args={[0.2, 0.2, 3, 8]} />{stdMat('#92400e')}</mesh>;
    case 'ramp':
      return (
        <group {...groupProps}>
          <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 8, 0, 0]}>
            <boxGeometry args={[2, 0.2, 3]} />
            {stdMat('#a16207')}
          </mesh>
        </group>
      );
    case 'tree':
      return (
        <group {...groupProps}>
          <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.12, 0.18, 1.2, 6]} /><meshStandardMaterial color="#5d4037" wireframe={ghost} transparent={ghost} opacity={ghost ? 0.45 : 1} /></mesh>
          <mesh position={[0, 1.9, 0]}><sphereGeometry args={[0.7, 8, 8]} /><meshStandardMaterial color="#2d6a4f" wireframe={ghost} transparent={ghost} opacity={ghost ? 0.45 : 1} /></mesh>
          <mesh position={[0, 2.8, 0]}><sphereGeometry args={[0.5, 8, 8]} /><meshStandardMaterial color="#1b4332" wireframe={ghost} transparent={ghost} opacity={ghost ? 0.45 : 1} /></mesh>
        </group>
      );
    case 'rock':
      return <mesh {...groupProps} rotation={[0.3, obj.rotation, 0.1]}><dodecahedronGeometry args={[0.5, 1]} />{stdMat('#78716c')}</mesh>;
    case 'bush':
      return <mesh {...groupProps}><sphereGeometry args={[0.5, 8, 6]} />{stdMat('#15803d')}</mesh>;
    case 'arch':
      return (
        <group {...groupProps}>
          <mesh position={[-0.9, 1, 0]}><boxGeometry args={[0.3, 2, 0.3]} />{stdMat('#d97706')}</mesh>
          <mesh position={[0.9, 1, 0]}><boxGeometry args={[0.3, 2, 0.3]} />{stdMat('#d97706')}</mesh>
          <mesh position={[0, 2.05, 0]}><boxGeometry args={[2.1, 0.3, 0.3]} />{stdMat('#d97706')}</mesh>
        </group>
      );
    case 'lamp_post':
      return (
        <group {...groupProps}>
          <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.06, 0.09, 5, 6]} /><meshStandardMaterial color="#374151" metalness={0.8} wireframe={ghost} transparent={ghost} opacity={ghost ? 0.45 : 1} /></mesh>
          <mesh position={[0, 5.1, 0]}><sphereGeometry args={[0.22, 8, 8]} /><meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={ghost ? 0 : 1} wireframe={ghost} /></mesh>
          {!ghost && <pointLight position={[0, 4.9, 0]} color="#ffe4a0" intensity={0.8} distance={12} decay={2} />}
        </group>
      );
    case 'spot':
      return (
        <group {...groupProps}>
          <mesh position={[0, 0.15, 0]}><sphereGeometry args={[0.15, 8, 8]} /><meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={ghost ? 0 : 1} wireframe={ghost} /></mesh>
          {!ghost && <pointLight position={[0, 0.3, 0]} color="#ffd700" intensity={1} distance={8} decay={2} />}
        </group>
      );
    case 'neon':
      return (
        <mesh {...groupProps}>
          <boxGeometry args={[2, 0.1, 0.06]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={ghost ? 0 : 1.5} wireframe={ghost} />
        </mesh>
      );
    case 'bench':
      return (
        <group {...groupProps}>
          <mesh position={[0, 0.26, 0]}><boxGeometry args={[1.2, 0.06, 0.4]} />{stdMat('#1d4ed8')}</mesh>
          <mesh position={[-0.5, 0.13, 0]}><boxGeometry args={[0.06, 0.26, 0.4]} />{stdMat('#1e40af')}</mesh>
          <mesh position={[0.5, 0.13, 0]}><boxGeometry args={[0.06, 0.26, 0.4]} />{stdMat('#1e40af')}</mesh>
        </group>
      );
    case 'crate':
      return <mesh {...groupProps}><boxGeometry args={[0.8, 0.8, 0.8]} />{stdMat('#7c2d12')}</mesh>;
    case 'barrel':
      return <mesh {...groupProps} rotation={[Math.PI / 2, obj.rotation, 0]}><cylinderGeometry args={[0.3, 0.3, 0.7, 10]} />{stdMat('#713f12')}</mesh>;
    case 'sign':
      return <mesh {...groupProps}><boxGeometry args={[1.5, 0.8, 0.06]} />{stdMat('#0f766e')}</mesh>;
    default:
      return <mesh {...groupProps}><boxGeometry args={[1, 1, 1]} />{stdMat()}</mesh>;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Builder: invisible ground plane + ghost preview
// ──────────────────────────────────────────────────────────────────────────────
function BuilderGroundPlane() {
  const buildMode = useGameState(s => s.buildMode);
  const selectedModelType = useGameState(s => s.selectedModelType);
  const ghostRotation = useGameState(s => s.ghostRotation);
  const ghostScale = useGameState(s => s.ghostScale);
  const [ghostPos, setGhostPos] = useState<[number, number, number] | null>(null);

  if (!buildMode) return null;

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (selectedModelType) {
            const p: [number, number, number] = [e.point.x, 0, e.point.z];
            setGhostPos(p);
            setGlobal({ ghostPosition: p });
          }
        }}
        onPointerLeave={() => {
          setGhostPos(null);
          setGlobal({ ghostPosition: null });
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!selectedModelType) return;
          addPlaced({
            type: selectedModelType,
            position: [e.point.x, 0, e.point.z],
            rotation: ghostRotation,
            scale: ghostScale,
          });
        }}
      >
        <planeGeometry args={[600, 600]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {ghostPos && selectedModelType && (
        <PlacedObjectMesh
          obj={{
            id: '__ghost__',
            type: selectedModelType,
            position: ghostPos,
            rotation: ghostRotation,
            scale: ghostScale,
          }}
          ghost
        />
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// All placed objects from store
// ──────────────────────────────────────────────────────────────────────────────
function PlacedObjects() {
  const placedObjects = useGameState(s => s.placedObjects);
  return (
    <>
      {placedObjects.map(obj => (
        <PlacedObjectMesh key={obj.id} obj={obj} />
      ))}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// World scene — always rendered, elements positioned in the world
// ──────────────────────────────────────────────────────────────────────────────
function WorldScene() {
  const activeScene = useGameState(s => s.activeScene);

  return (
    <>
      <SceneLighting />
      <GroundGrid />
      <FloatingParticles />

      {/* Quebec road — runs along the Z axis */}
      <QuebecRoad position={[0, 0.01, 0]} length={200} />

      {/* Hotel — far ahead on the right */}
      <HotelBuilding position={[40, 0, -30]} rotation={[0, -Math.PI / 6, 0]} />

      {/* Corridor interior — accessible building on the left */}
      {(activeScene === 'world' || activeScene === 'corridor') && (
        <group position={[-20, 0, 10]}>
          {/* Shell: exterior walls */}
          <mesh position={[0, 1.5, 20]} castShadow receiveShadow>
            <boxGeometry args={[8, 3, 42]} />
            <meshStandardMaterial color="#1e2029" roughness={0.9} />
          </mesh>
          {/* Interior corridor */}
          <CorridorScene position={[0, 0, 0]} />
        </group>
      )}

      {/* Hotel room interior — positioned on the left */}
      {(activeScene === 'world' || activeScene === 'room') && (
        <group position={[-50, 0, 0]}>
          <RoomArchitecture />
          {/* Room furniture: bed, window, bathroom */}
          <WindowWithCurtains position={[0, 1.8, -8.9]} size={[3, 2]} />
          <WindowWithCurtains position={[6.9, 1.8, 0]} rotation={[0, Math.PI / 2, 0]} size={[3, 2]} />
          <SecurityDoor position={[0, 0, 8.8]} doorId="main" />
          <SecurityDoor position={[-5.5, 0, -3.5]} doorId="bathroom" />
          <BathroomFixtures position={[-5.5, 0, -7]} />
          {/* Simple bed */}
          <group position={[3, 0, 2]}>
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.2, 0.4, 3.2]} />
              <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.52, 0]}>
              <boxGeometry args={[2.1, 0.24, 3.0]} />
              <meshStandardMaterial color="#f5f5f5" roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.65, -1.3]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[2.0, 0.6, 0.15]} />
              <meshStandardMaterial color="#f5f5f5" roughness={0.95} />
            </mesh>
          </group>
          {/* Desk / counter at belt height 0.9m */}
          <group position={[-5, 0, 3]}>
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[1.8, 0.9, 0.7]} />
              <meshStandardMaterial color="#111827" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.905, 0]}>
              <boxGeometry args={[1.82, 0.02, 0.72]} />
              <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.5} />
            </mesh>
          </group>
          {/* TV */}
          <mesh position={[5, 1.3, -8.6]} castShadow>
            <boxGeometry args={[2.4, 1.4, 0.12]} />
            <meshStandardMaterial color="#0f172a" metalness={0.6} />
          </mesh>
          <mesh position={[5, 1.3, -8.52]}>
            <boxGeometry args={[2.2, 1.2, 0.02]} />
            <meshStandardMaterial color="#111827" emissive="#1e3a5f" emissiveIntensity={0.3} />
          </mesh>
          {/* Room ambient light */}
          <pointLight position={[0, 3, 0]} color="#fef3c7" intensity={1.2} distance={20} decay={2} />
        </group>
      )}

      <PlayerCharacter />
      <BuilderGroundPlane />
      <PlacedObjects />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Root app
// ──────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [sceneReady, setSceneReady] = useState(false);
  const handleLoadComplete = useCallback(() => setSceneReady(true), []);

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#08080e' }}>
      {!sceneReady && <LoadingScreen onComplete={handleLoadComplete} minDuration={3000} />}

      <Suspense fallback={null}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 5, -8], fov: 55 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
            failIfMajorPerformanceCaveat: false,
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFShadowMap;
          }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <fog attach="fog" args={['#0a0a14', 20, 120]} />
          <WorldScene />
          <EffectComposer>
            <Bloom intensity={0.4} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
            <Vignette eskil={false} offset={0.2} darkness={0.85} />
          </EffectComposer>
        </Canvas>
      </Suspense>

      <BuilderPanel />
      <GameHUD />
      <TroxTMSN />
      <EtherSpawnMenu />
      <InventoryPanel />
    </div>
  );
}
