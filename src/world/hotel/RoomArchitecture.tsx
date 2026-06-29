// Hotel room interior — all dims in metres (human scale: belt ≈ counter height 0.9 m)
const ROOM_WIDTH = 14;
const ROOM_DEPTH = 18;
const ROOM_HEIGHT = 3.5;
const WALL_THICKNESS = 0.18;
const BATHROOM_WIDTH = 4;
const BATHROOM_DEPTH = 5;

export function RoomArchitecture() {
  return (
    <group>
      <RoomFloor />
      <RoomCeiling />
      <RoomWalls />
      <BathroomPartition />
    </group>
  );
}

function RoomFloor() {
  return (
    <group>
      {/* Main room floor — dark parquet */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#1a1615" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Parquet pattern */}
      {[...Array(10)].map((_, row) =>
        [...Array(8)].map((_, col) => (
          <mesh
            key={`${row}-${col}`}
            position={[
              -ROOM_WIDTH / 2 + 0.5 + col,
              0.001,
              -ROOM_DEPTH / 2 + 0.5 + row,
            ]}
            rotation={[-Math.PI / 2, 0, (row + col) % 2 === 0 ? 0 : Math.PI / 2]}
            receiveShadow
          >
            <planeGeometry args={[0.95, 0.2]} />
            <meshStandardMaterial
              color={(row + col) % 2 === 0 ? '#1f1b1a' : '#252120'}
              roughness={0.6}
            />
          </mesh>
        ))
      )}
      {/* Bathroom floor — tiles */}
      <mesh
        position={[-ROOM_WIDTH / 2 + BATHROOM_WIDTH / 2 + WALL_THICKNESS, 0.002, -ROOM_DEPTH / 2 + BATHROOM_DEPTH / 2 + WALL_THICKNESS]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[BATHROOM_WIDTH - 0.1, BATHROOM_DEPTH - 0.1]} />
        <meshStandardMaterial color="#374151" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Tile grid */}
      {[...Array(6)].map((_, row) =>
        [...Array(5)].map((_, col) => (
          <mesh
            key={`bath-${row}-${col}`}
            position={[-ROOM_WIDTH / 2 + 0.4 + col * 0.5, 0.003, -ROOM_DEPTH / 2 + 0.4 + row * 0.5]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.48, 0.48]} />
            <meshStandardMaterial color="#4b5563" roughness={0.2} />
          </mesh>
        ))
      )}
    </group>
  );
}

function LEDStrip({ position, width, depth, isOn }: { position: [number, number, number]; width: number; depth: number; isOn: boolean }) {
  const mat = { color: isOn ? '#fef3c7' : '#1f2937', emissive: isOn ? '#fef3c7' : '#000000', emissiveIntensity: isOn ? 0.4 : 0 };
  return (
    <group position={position}>
      <mesh position={[0, 0, depth / 2]}>
        <boxGeometry args={[width, 0.02, 0.04]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 0, -depth / 2]}>
        <boxGeometry args={[width, 0.02, 0.04]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[-width / 2, 0, 0]}>
        <boxGeometry args={[0.04, 0.02, depth]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[width / 2, 0, 0]}>
        <boxGeometry args={[0.04, 0.02, depth]} />
        <meshStandardMaterial {...mat} />
      </mesh>
    </group>
  );
}

function LEDPanel({ position, size, color }: { position: [number, number, number]; size: [number, number]; color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[size[0], 0.02, size[1]]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.8} />
    </mesh>
  );
}

function CeilingSpot({ position, isOn }: { position: [number, number, number]; isOn: boolean }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.1, 0.05, 16]} />
        <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
        <meshStandardMaterial
          color={isOn ? '#fef3c7' : '#374151'}
          emissive={isOn ? '#fef3c7' : '#000000'}
          emissiveIntensity={isOn ? 0.8 : 0}
        />
      </mesh>
    </group>
  );
}

function RoomCeiling() {
  const isOn = true;
  return (
    <group>
      <mesh position={[0, ROOM_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
      {/* Lighting tracks */}
      <mesh position={[0, ROOM_HEIGHT - 0.02, 0]}>
        <boxGeometry args={[0.12, 0.05, ROOM_DEPTH - 2]} />
        <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[-3, ROOM_HEIGHT - 0.02, 0]}>
        <boxGeometry args={[0.1, 0.04, ROOM_DEPTH - 4]} />
        <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[3, ROOM_HEIGHT - 0.02, 0]}>
        <boxGeometry args={[0.1, 0.04, ROOM_DEPTH - 4]} />
        <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.5} />
      </mesh>
      <LEDStrip position={[0, ROOM_HEIGHT - 0.08, 0]} width={ROOM_WIDTH - 1} depth={ROOM_DEPTH - 1} isOn={isOn} />
      {/* Ceiling spots 3×5 grid */}
      {([-4, 0, 4] as number[]).map((x, xi) =>
        ([-6, -3, 0, 3, 6] as number[]).map((z, zi) => (
          <CeilingSpot key={`${xi}-${zi}`} position={[x, ROOM_HEIGHT - 0.05, z]} isOn={isOn} />
        ))
      )}
      <LEDPanel position={[-5, ROOM_HEIGHT - 0.03, -6]} size={[1.5, 1]} color="#8b5cf6" />
      <LEDPanel position={[5, ROOM_HEIGHT - 0.03, -6]} size={[1.5, 1]} color="#3b82f6" />
      <LEDPanel position={[5, ROOM_HEIGHT - 0.03, 6]} size={[1.5, 1]} color="#22c55e" />
      {/* AC unit */}
      <mesh position={[4, ROOM_HEIGHT - 0.18, -7]}>
        <boxGeometry args={[1.8, 0.3, 0.45]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
      {/* Smoke detector */}
      <mesh position={[-2, ROOM_HEIGHT - 0.05, 3]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.7} />
      </mesh>
      <mesh position={[-2, ROOM_HEIGHT - 0.07, 3]}>
        <cylinderGeometry args={[0.02, 0.02, 0.02, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function Baseboards() {
  const bh = 0.1;
  const bd = 0.02;
  return (
    <group>
      <mesh position={[0, bh / 2, -ROOM_DEPTH / 2 + WALL_THICKNESS / 2 + bd / 2]}>
        <boxGeometry args={[ROOM_WIDTH - WALL_THICKNESS * 2, bh, bd]} />
        <meshStandardMaterial color="#111827" roughness={0.7} />
      </mesh>
      <mesh position={[-ROOM_WIDTH / 2 + WALL_THICKNESS / 2 + bd / 2, bh / 2, 0]}>
        <boxGeometry args={[bd, bh, ROOM_DEPTH - WALL_THICKNESS * 2]} />
        <meshStandardMaterial color="#111827" roughness={0.7} />
      </mesh>
      <mesh position={[ROOM_WIDTH / 2 - WALL_THICKNESS / 2 - bd / 2, bh / 2, 0]}>
        <boxGeometry args={[bd, bh, ROOM_DEPTH - WALL_THICKNESS * 2]} />
        <meshStandardMaterial color="#111827" roughness={0.7} />
      </mesh>
    </group>
  );
}

function CrownMolding() {
  const ms = 0.08;
  return (
    <group>
      <mesh position={[0, ROOM_HEIGHT - ms / 2, -ROOM_DEPTH / 2 + WALL_THICKNESS / 2 + ms / 2]}>
        <boxGeometry args={[ROOM_WIDTH, ms, ms]} />
        <meshStandardMaterial color="#111827" roughness={0.6} />
      </mesh>
      <mesh position={[-ROOM_WIDTH / 2 + WALL_THICKNESS / 2 + ms / 2, ROOM_HEIGHT - ms / 2, 0]}>
        <boxGeometry args={[ms, ms, ROOM_DEPTH]} />
        <meshStandardMaterial color="#111827" roughness={0.6} />
      </mesh>
      <mesh position={[ROOM_WIDTH / 2 - WALL_THICKNESS / 2 - ms / 2, ROOM_HEIGHT - ms / 2, 0]}>
        <boxGeometry args={[ms, ms, ROOM_DEPTH]} />
        <meshStandardMaterial color="#111827" roughness={0.6} />
      </mesh>
    </group>
  );
}

function RoomWalls() {
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]} castShadow receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
      {/* Front wall — left of door */}
      <mesh position={[-ROOM_WIDTH / 2 + 1.5, ROOM_HEIGHT / 2, ROOM_DEPTH / 2]} castShadow receiveShadow>
        <boxGeometry args={[3, ROOM_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
      {/* Front wall — right of door */}
      <mesh position={[ROOM_WIDTH / 2 - 1.5, ROOM_HEIGHT / 2, ROOM_DEPTH / 2]} castShadow receiveShadow>
        <boxGeometry args={[3, ROOM_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
      {/* Front wall — above door */}
      <mesh position={[0, ROOM_HEIGHT - 0.35, ROOM_DEPTH / 2]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.7, WALL_THICKNESS]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
      {/* Right wall */}
      <mesh position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>
      <Baseboards />
      <CrownMolding />
    </group>
  );
}

function BathroomPartition() {
  const wallStartX = -ROOM_WIDTH / 2 + WALL_THICKNESS;
  const wallEndX = wallStartX + BATHROOM_WIDTH;
  const wallZ = -ROOM_DEPTH / 2 + BATHROOM_DEPTH + WALL_THICKNESS;

  return (
    <group>
      <mesh position={[wallStartX + 0.5, ROOM_HEIGHT / 2, wallZ]} castShadow receiveShadow>
        <boxGeometry args={[1, ROOM_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#1f2937" roughness={0.85} />
      </mesh>
      <mesh position={[wallEndX - 0.5, ROOM_HEIGHT / 2, wallZ]} castShadow receiveShadow>
        <boxGeometry args={[1, ROOM_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#1f2937" roughness={0.85} />
      </mesh>
      <mesh position={[wallStartX + BATHROOM_WIDTH / 2, ROOM_HEIGHT - 0.35, wallZ]} castShadow receiveShadow>
        <boxGeometry args={[0.8 + 0.2, 0.7, WALL_THICKNESS]} />
        <meshStandardMaterial color="#1f2937" roughness={0.85} />
      </mesh>
      <mesh position={[wallStartX + BATHROOM_WIDTH / 2, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2 + WALL_THICKNESS]}>
        <boxGeometry args={[BATHROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#374151" roughness={0.4} />
      </mesh>
    </group>
  );
}
