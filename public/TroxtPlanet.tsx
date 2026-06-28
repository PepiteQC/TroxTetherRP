import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';

function TroxtCore() {
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.y += 0.005;
    }
  });

  return (
    <Sphere ref={mesh} args={[1, 32, 32]}>
      <meshStandardMaterial 
        color="#00ffcc" 
        emissive="#0044aa" 
        emissiveIntensity={0.5} 
        wireframe={true} 
      />
    </Sphere>
  );
}

export default function TroxtPlanet() {
  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00ffcc" />
        <TroxtCore />
        <OrbitControls enableDamping dampingFactor={0.05} minDistance={2} maxDistance={10} />
      </Canvas>
    </div>
  );
}