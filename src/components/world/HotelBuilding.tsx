import { useRef, useMemo } from 'react';
import * as THREE from 'three';

const FLOORS = 4;
const FLOOR_H = 3.6;
const BLDG_W = 20;
const BLDG_D = 12;
const BLDG_TOTAL_H = FLOORS * FLOOR_H;

function HotelSign({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Scaffold frame */}
      <mesh position={[0, -0.6, 0]} castShadow>
        <boxGeometry args={[4.2, 0.1, 0.8]} />
        <meshStandardMaterial color="#333" metalness={0.8} />
      </mesh>
      <mesh position={[-1.8, -1.2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 4]} />
        <meshStandardMaterial color="#444" metalness={0.7} />
      </mesh>
      <mesh position={[1.8, -1.2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 4]} />
        <meshStandardMaterial color="#444" metalness={0.7} />
      </mesh>
      {/* Billboard backing */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[4.4, 1.2, 0.25]} />
        <meshStandardMaterial color="#1a1c22" roughness={0.9} />
      </mesh>
      {/* Red neon HOTEL */}
      <mesh position={[0, 0, 0.15]}>
        <boxGeometry args={[3.8, 0.8, 0.05]} />
        <meshStandardMaterial color="#ff2233" emissive="#ff0022" emissiveIntensity={0.2} />
      </mesh>
      <pointLight position={[0, 0.5, 1]} color="#ff1133" intensity={0.5} distance={10} decay={2} />
    </group>
  );
}

function Antenna({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.08, 4.2, 6]} />
        <meshStandardMaterial color="#2d3436" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={0.4} />
      </mesh>
      <pointLight position={[0, 2.1, 0]} color="#ff0000" intensity={0.5} distance={10} decay={2} />
    </group>
  );
}

function HotelWindows() {
  const windowArray = useMemo(() => {
    const arr: Array<{ floor: number; x: number; glowColor: string; isOff: boolean }> = [];
    const glows = ['#ffd97d', '#ffecb3', '#ffe0b2', '#80deea', '#ffcc80', '#b2dfdb'];
    let gi = 0;
    for (let floor = 0; floor < FLOORS; floor++) {
      if (floor !== 0) {
        for (const x of [-8, -5, -2, 2, 5, 8]) {
          arr.push({
            floor,
            x,
            glowColor: glows[gi % glows.length],
            isOff: (floor === 1 && x === 5) || (floor === 3 && x === -2) || (floor === 2 && x === -8),
          });
          gi++;
        }
      }
    }
    return arr;
  }, []);

  return (
    <group>
      {windowArray.map((w, idx) => {
        const y = w.floor * FLOOR_H + FLOOR_H / 2;
        return (
          <group key={idx}>
            <mesh position={[w.x, y, BLDG_D / 2 + 0.02]}>
              <boxGeometry args={[1.8, 1.8, 0.05]} />
              <meshStandardMaterial
                color={w.isOff ? '#0f1115' : w.glowColor}
                emissive={w.isOff ? '#000000' : w.glowColor}
                emissiveIntensity={w.isOff ? 0 : 0.6}
                transparent
                opacity={0.8}
                metalness={0.2}
                roughness={0.1}
              />
            </mesh>
            <mesh position={[w.x, y, BLDG_D / 2 + 0.04]}>
              <boxGeometry args={[1.92, 1.92, 0.03]} />
              <meshStandardMaterial color="#1e272e" roughness={0.7} />
            </mesh>
            {!w.isOff && (
              <pointLight position={[w.x, y, BLDG_D / 2 + 0.6]} color={w.glowColor} intensity={0.5} distance={5} decay={2} />
            )}
          </group>
        );
      })}
    </group>
  );
}

function Balconies() {
  return (
    <group>
      {([1, 2, 3] as number[]).map((floor) =>
        ([-6.5, 0, 6.5] as number[]).map((x, idx) => (
          <group key={`${floor}-${idx}`} position={[x, floor * FLOOR_H + 0.1, BLDG_D / 2]}>
            <mesh position={[0, 0, 1.2]} castShadow receiveShadow>
              <boxGeometry args={[3.2, 0.15, 2.4]} />
              <meshStandardMaterial color="#40434a" roughness={0.9} flatShading />
            </mesh>
            <mesh position={[0, 0.45, 2.35]} castShadow>
              <boxGeometry args={[3.2, 0.9, 0.06]} />
              <meshStandardMaterial color="#ff8800" transparent opacity={0.6} roughness={0.1} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.92, 2.35]}>
              <boxGeometry args={[3.25, 0.05, 0.08]} />
              <meshStandardMaterial color="#ffa500" emissive="#ff5500" emissiveIntensity={0.6} />
            </mesh>
            {([-1.58, 1.58] as number[]).map((bx, sideIdx) => (
              <mesh key={sideIdx} position={[bx, 0.45, 1.2]}>
                <boxGeometry args={[0.04, 0.9, 2.3]} />
                <meshStandardMaterial color="#1e272e" metalness={0.7} />
              </mesh>
            ))}
          </group>
        ))
      )}
    </group>
  );
}

function LobbyEntrance() {
  return (
    <group position={[0, 0, BLDG_D / 2]}>
      {/* Glass facade */}
      <mesh position={[0, 1.6, 0.02]} castShadow>
        <boxGeometry args={[14, 3.2, 0.05]} />
        <meshStandardMaterial color="#88d8ff" transparent opacity={0.45} metalness={0.2} roughness={0.05} />
      </mesh>
      {([-7, -3.5, 0, 3.5, 7] as number[]).map((x, idx) => (
        <mesh key={idx} position={[x, 1.6, 0.04]}>
          <boxGeometry args={[0.15, 3.2, 0.06]} />
          <meshStandardMaterial color="#111111" metalness={0.6} />
        </mesh>
      ))}
      {/* Canopy */}
      <mesh position={[0, 3.3, 2.5]} castShadow receiveShadow>
        <boxGeometry args={[7, 0.25, 5]} />
        <meshStandardMaterial color="#2d3436" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 3.16, 2.5]}>
        <boxGeometry args={[6.6, 0.02, 4.6]} />
        <meshStandardMaterial color="#fff6e0" emissive="#fff6e0" emissiveIntensity={0.2} />
      </mesh>
      <pointLight position={[0, 3.1, 2.5]} color="#fff8e0" intensity={0.5} distance={12} decay={2} />
      {/* Columns */}
      {([-3.2, 3.2] as number[]).map((x, idx) => (
        <mesh key={idx} position={[x, 1.5, 4.6]} castShadow>
          <cylinderGeometry args={[0.14, 0.16, 3.0, 6]} />
          <meshStandardMaterial color="#7f8c8d" metalness={0.6} roughness={0.4} flatShading />
        </mesh>
      ))}
      {/* Main entrance door */}
      <mesh position={[0, 1.4, 0.08]}>
        <boxGeometry args={[2.4, 2.8, 0.06]} />
        <meshStandardMaterial color="#ffbb00" transparent opacity={0.6} metalness={0.4} />
      </mesh>
      {/* Decorative planters */}
      {([-4.5, 4.5] as number[]).map((x, idx) => (
        <group key={idx} position={[x, 0, 2.0]}>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.4, 0.7, 6]} />
            <meshStandardMaterial color="#7f8c8d" flatShading />
          </mesh>
          <mesh position={[0, 0.8, 0]} castShadow>
            <sphereGeometry args={[0.55, 6, 6]} />
            <meshStandardMaterial color="#2d6a4f" roughness={1.0} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ParkedCars() {
  const cars = [
    { x: -7, z: 12, ry: 0, color: '#1b2a4a' },
    { x: -3.5, z: 12.5, ry: 0.06, color: '#a51c1c' },
    { x: 3.5, z: 12, ry: 0, color: '#2d3436' },
    { x: 7, z: 13, ry: -0.05, color: '#f39c12' },
  ];
  return (
    <group>
      {cars.map((c, idx) => (
        <group key={idx} position={[c.x, 0, c.z]} rotation={[0, c.ry, 0]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[1.8, 0.7, 4.0]} />
            <meshStandardMaterial color={c.color} roughness={0.4} metalness={0.2} flatShading />
          </mesh>
          <mesh position={[0, 0.95, -0.2]} castShadow>
            <boxGeometry args={[1.6, 0.5, 2.4]} />
            <meshStandardMaterial color={c.color} roughness={0.5} flatShading />
          </mesh>
          <mesh position={[0, 0.88, 0.9]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[1.4, 0.55, 0.05]} />
            <meshStandardMaterial color="#0d2535" transparent opacity={0.6} />
          </mesh>
          {([[-0.95, 0.28, 1.2], [0.95, 0.28, 1.2], [-0.95, 0.28, -1.2], [0.95, 0.28, -1.2]] as [number, number, number][]).map((wp, wIdx) => (
            <mesh key={wIdx} position={wp} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.3, 0.3, 0.18, 6]} />
              <meshStandardMaterial color="#111" roughness={0.98} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function HotelBuilding({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Main building core */}
      <mesh position={[0, BLDG_TOTAL_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BLDG_W, BLDG_TOTAL_H, BLDG_D]} />
        <meshStandardMaterial color="#2d313a" roughness={0.92} flatShading />
      </mesh>
      {/* Floor separators */}
      {Array.from({ length: FLOORS }).map((_, fIdx) => (
        <mesh key={fIdx} position={[0, fIdx * FLOOR_H + fIdx * 0.05, 0.08]} castShadow receiveShadow>
          <boxGeometry args={[BLDG_W + 0.4, 0.25, BLDG_D + 0.4]} />
          <meshStandardMaterial color="#1e2024" roughness={0.9} flatShading />
        </mesh>
      ))}
      {/* Side pillars */}
      {([-BLDG_W / 2 - 0.1, BLDG_W / 2 + 0.1] as number[]).map((x, idx) => (
        <mesh key={idx} position={[x, BLDG_TOTAL_H / 2, 0]} castShadow>
          <boxGeometry args={[0.3, BLDG_TOTAL_H, BLDG_D + 0.1]} />
          <meshStandardMaterial color="#8b251e" roughness={0.8} />
        </mesh>
      ))}
      {/* Roof cap */}
      <mesh position={[0, BLDG_TOTAL_H + 0.3, 0]} castShadow>
        <boxGeometry args={[BLDG_W + 0.5, 0.4, BLDG_D + 0.5]} />
        <meshStandardMaterial color="#111216" roughness={0.9} />
      </mesh>
      <Antenna position={[8, BLDG_TOTAL_H + 2.1, -2]} />
      <HotelSign position={[0, BLDG_TOTAL_H + 1.2, 2]} />
      <HotelWindows />
      <Balconies />
      <LobbyEntrance />

      {/* Outdoor parking lot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 14]} receiveShadow>
        <planeGeometry args={[28, 18]} />
        <meshStandardMaterial color="#22242a" roughness={0.88} />
      </mesh>
      {([-9, -5.5, -2, 2, 5.5, 9] as number[]).map((x, idx) => (
        <mesh key={idx} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 11]}>
          <planeGeometry args={[0.1, 4.5]} />
          <meshBasicMaterial color="#ffbb00" transparent opacity={0.5} />
        </mesh>
      ))}
      {/* Parking lights */}
      {([-10, 10] as number[]).map((x, idx) => (
        <group key={idx} position={[x, 0, 19]}>
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 7.0, 6]} />
            <meshStandardMaterial color="#2d3436" metalness={0.8} />
          </mesh>
          <mesh position={[0, 7.05, -0.4]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.3, 0.15, 1.2]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[0, 6.96, -0.4]}>
            <boxGeometry args={[0.26, 0.02, 0.9]} />
            <meshStandardMaterial color="#fff6e0" emissive="#fff6e0" emissiveIntensity={0.5} />
          </mesh>
          <pointLight position={[0, 6.8, -0.4]} color="#fff0d0" intensity={0.5} distance={15} decay={2} />
        </group>
      ))}
      <ParkedCars />
      {/* Driveway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[6, 12]} />
        <meshStandardMaterial color="#1e2025" roughness={0.9} />
      </mesh>
    </group>
  );
}
