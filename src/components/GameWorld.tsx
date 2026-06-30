import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameState } from '../store';

export function GroundGrid() {
  return (
    <group>
      <gridHelper args={[600, 60, "#1a4a2a", "#154020"]} position={[0, -0.04, 0]} />
      <gridHelper args={[600, 30, "#0a2a10", "#0a2a10"]} position={[0, -0.05, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#05080e" roughness={1} />
      </mesh>
    </group>
  );
}

export function FloatingParticles() {
  const count = 500;
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 100;
      p[i * 3 + 1] = Math.random() * 15;
      p[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    return p;
  }, [count]);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  const mat = useMemo(() => new THREE.PointsMaterial({
    color: '#4ade80',
    size: 0.08,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  }), []);

  const ref = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.01;
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
    }
  });

  return <points ref={ref} geometry={geom} material={mat} />;
}

export function SceneLighting() {
  const timeOfDay = useGameState(s => s.timeOfDay);

  const sunAngle = ((timeOfDay - 6) / 14) * Math.PI;
  const sunElevation = Math.max(-0.2, Math.sin(sunAngle));

  const isNight = timeOfDay < 5 || timeOfDay >= 21;
    const intensity = isNight ? 0.2 : Math.max(0.5, sunElevation * 1.5);
  
            return (
              <>
                <ambientLight intensity={isNight ? 0.15 : 0.6} color={isNight ? "#4a6c9e" : "#ffffff"} />
                <directionalLight
                  position={[20, Math.max(5, sunElevation * 30), 20]}
                  intensity={intensity}
                  color={isNight ? "#6080b0" : "#fff8e8"}
                  castShadow
                  shadow-mapSize={[2048, 2048]}
                  shadow-camera-left={-40}
                  shadow-camera-right={40}
                  shadow-camera-top={40}
                  shadow-camera-bottom={-40}
                />
                <hemisphereLight color="#c8d8f8" groundColor="#05080e" intensity={0.4} />
              </>
            );
          }
          