import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CORRIDOR_DEFAULTS, FLOOR_HEIGHT } from '../../lib/corridor-generator';

function CorridorArchitecture() {
  const cfg = CORRIDOR_DEFAULTS;
  return (
    <group>
      {/* Floor */}
      <mesh position={[0, 0, cfg.length / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[cfg.width + 1, cfg.length]} />
        <meshStandardMaterial color="#0f0f1a" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, cfg.height, cfg.length / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cfg.width + 1, cfg.length]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-cfg.width / 2, cfg.height / 2, cfg.length / 2]}>
        <boxGeometry args={[0.18, cfg.height, cfg.length]} />
        <meshStandardMaterial color="#111827" roughness={0.8} />
      </mesh>
      {/* Right wall */}
      <mesh position={[cfg.width / 2, cfg.height / 2, cfg.length / 2]}>
        <boxGeometry args={[0.18, cfg.height, cfg.length]} />
        <meshStandardMaterial color="#111827" roughness={0.8} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, cfg.height / 2, -0.5]}>
        <boxGeometry args={[cfg.width + 0.5, cfg.height, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.85} />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, cfg.height / 2, cfg.length + 0.5]}>
        <boxGeometry args={[cfg.width + 0.5, cfg.height, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.85} />
      </mesh>
      {/* Carpet runner */}
      <mesh position={[0, 0.005, cfg.length / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.5, cfg.length]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.95} />
      </mesh>
      {/* Ceiling LED strip */}
      <mesh position={[0, cfg.height - 0.02, cfg.length / 2]}>
        <boxGeometry args={[0.1, 0.02, cfg.length]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.5} />
      </mesh>
      {/* Floor skirting */}
      {([-cfg.width / 2 + 0.09, cfg.width / 2 - 0.09] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.05, cfg.length / 2]}>
          <boxGeometry args={[0.02, 0.1, cfg.length]} />
          <meshStandardMaterial color="#1f2937" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function ApartmentDoor({
  position,
  rotation,
  isLocked,
  lightOn,
  doorColor,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  isLocked: boolean;
  lightOn: boolean;
  doorColor: string;
}) {
  const ledRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Door frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.9, 2.1, 0.08]} />
        <meshStandardMaterial color={doorColor} metalness={0.2} roughness={0.7} />
      </mesh>
      {/* Door panel */}
      <mesh position={[0, 0, 0.02]} castShadow>
        <boxGeometry args={[0.8, 2, 0.04]} />
        <meshStandardMaterial color={doorColor} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Room number dot */}
      <mesh position={[0.08, 0.7, 0.06]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={0.8} />
      </mesh>
      {/* Lock LED */}
      <mesh ref={ledRef} position={[0.3, 0.7, 0.05]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial
          color={isLocked ? '#ef4444' : '#22c55e'}
          emissive={isLocked ? '#ef4444' : '#22c55e'}
          emissiveIntensity={0.8}
        />
      </mesh>
      {/* Handle */}
      <mesh position={[-0.25, 0, 0.05]}>
        <boxGeometry args={[0.04, 0.15, 0.03]} />
        <meshStandardMaterial color="#6b7280" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Peephole */}
      <mesh position={[0, 0.55, 0.05]}>
        <cylinderGeometry args={[0.015, 0.015, 0.02, 8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
      </mesh>
      {lightOn && (
        <pointLight position={[0, 0, -0.3]} intensity={0.3} color="#fef3c7" distance={2} />
      )}
    </group>
  );
}

function CorridorLight({ position, intensity, color }: { position: [number, number, number]; intensity: number; color: string }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.12, 0.06, 8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.04, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={1} />
      </mesh>
      <pointLight position={[0, -0.1, 0]} intensity={intensity} color={color} distance={6} />
    </group>
  );
}

function CorridorPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.3, 8]} />
        <meshStandardMaterial color="#374151" roughness={0.9} />
      </mesh>
      {([0, 72, 144, 216, 288] as number[]).map((angle, i) => (
        <mesh
          key={i}
          position={[
            Math.sin((angle * Math.PI) / 180) * 0.04,
            0.4 + i * 0.02,
            Math.cos((angle * Math.PI) / 180) * 0.04,
          ]}
          rotation={[0.3, (angle * Math.PI) / 180, 0.2]}
        >
          <boxGeometry args={[0.06, 0.15, 0.015]} />
          <meshStandardMaterial color="#15803d" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function CorridorBench({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.04, 0.35]} />
        <meshStandardMaterial color="#1f2937" metalness={0.3} roughness={0.7} />
      </mesh>
      {([[-0.35, 0.12, 0.12], [0.35, 0.12, 0.12], [-0.35, 0.12, -0.12], [0.35, 0.12, -0.12]] as [number, number, number][]).map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.02, 0.02, 0.24, 6]} />
          <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

const DOOR_COLORS = ['#374151', '#4b5563', '#6b7280', '#1f2937', '#111827'];
const CORRIDOR_WIDTH = 4;
const CORRIDOR_LENGTH = 40;
const DOOR_SPACING = 4;

export function CorridorScene({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const corridorApartments = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const side = i % 2 === 0 ? 'left' : 'right';
      const index = Math.floor(i / 2);
      const zPos = -CORRIDOR_LENGTH / 2 + index * DOOR_SPACING + DOOR_SPACING;
      return {
        id: `apt-${i}`,
        number: String(i + 1).padStart(2, '0'),
        position: [
          side === 'left' ? -CORRIDOR_WIDTH / 2 + 0.5 : CORRIDOR_WIDTH / 2 - 0.5,
          FLOOR_HEIGHT / 2,
          zPos,
        ] as [number, number, number],
        rotation: [0, side === 'left' ? Math.PI / 2 : -Math.PI / 2, 0] as [number, number, number],
        isLocked: i % 3 !== 0,
        lightOn: i % 2 === 0,
        doorColor: DOOR_COLORS[i % DOOR_COLORS.length],
      };
    });
  }, []);

  const corridorLights = useMemo(() => {
    const numLights = Math.floor(CORRIDOR_LENGTH / DOOR_SPACING);
    return Array.from({ length: numLights }, (_, i) => {
      const zPos = -CORRIDOR_LENGTH / 2 + (i + 1) * DOOR_SPACING;
      const side = i % 2 === 0 ? 'left' : 'right';
      return {
        id: `light-${i}`,
        position: [
          side === 'left' ? -CORRIDOR_WIDTH / 2 + 0.8 : CORRIDOR_WIDTH / 2 - 0.8,
          FLOOR_HEIGHT - 0.2,
          zPos,
        ] as [number, number, number],
        intensity: 0.8 + (i % 3) * 0.2,
        color: '#fef3c7',
      };
    });
  }, []);

  const decor = useMemo(() => [
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `plant-${i}`,
      type: 'plant' as const,
      position: [-CORRIDOR_WIDTH / 2 + 0.5, 0, -CORRIDOR_LENGTH / 2 + 2 + i * 8] as [number, number, number],
    })),
    { id: 'bench-1', type: 'bench' as const, position: [0, 0, 10] as [number, number, number] },
    { id: 'bench-2', type: 'bench' as const, position: [0, 0, -10] as [number, number, number] },
  ], []);

  return (
    <group position={position}>
      <CorridorArchitecture />
      {corridorApartments.map(door => (
        <ApartmentDoor
          key={door.id}
          position={door.position}
          rotation={door.rotation}
          isLocked={door.isLocked}
          lightOn={door.lightOn}
          doorColor={door.doorColor}
        />
      ))}
      {corridorLights.map(light => (
        <CorridorLight key={light.id} position={light.position} intensity={light.intensity} color={light.color} />
      ))}
      {decor.map(item =>
        item.type === 'plant'
          ? <CorridorPlant key={item.id} position={item.position} />
          : <CorridorBench key={item.id} position={item.position} />
      )}
      {/* Floor sign "CORRIDOR" */}
      <mesh position={[0, 2.8, 0]}>
        <boxGeometry args={[1.5, 0.3, 0.02]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}
