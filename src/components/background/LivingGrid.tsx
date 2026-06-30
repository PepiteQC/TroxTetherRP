import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';

export const LivingGrid: React.FC = () => {
  const gridRef = useRef<any>(null);

  useFrame((state) => {
    if (gridRef.current) {
      // Simulate forward movement across the infinite grid
      gridRef.current.position.z = (state.clock.elapsedTime * 2) % 1;
    }
  });

  return (
    <group position={[0, -2.5, 0]}>
      <Grid
        ref={gridRef}
        infiniteGrid
        fadeDistance={50}
        cellColor={new THREE.Color('#06b6d4')}
        sectionColor={new THREE.Color('#4f46e5')}
        sectionSize={2}
        cellSize={0.5}
        cellThickness={0.5}
        sectionThickness={1}
      />
      {/* Dark plane below grid for better contrast */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="#02040a" transparent opacity={0.9} />
      </mesh>
    </group>
  );
};
