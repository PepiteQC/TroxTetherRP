interface QuebecRoadProps {
  position?: [number, number, number];
  length?: number;
}

export function QuebecRoad({ position = [0, 0, 0], length = 50 }: QuebecRoadProps) {
  return (
    <group position={position}>
      {/* Asphalt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, length]} />
        <meshStandardMaterial color="#333333" roughness={0.9} />
      </mesh>

      {/* Double yellow centre lines (Québec style) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.3, 0.01, 0]}>
        <planeGeometry args={[0.15, length]} />
        <meshStandardMaterial color="#ffdd00" emissive="#ffdd00" emissiveIntensity={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.3, 0.01, 0]}>
        <planeGeometry args={[0.15, length]} />
        <meshStandardMaterial color="#ffdd00" emissive="#ffdd00" emissiveIntensity={0.3} />
      </mesh>

      {/* White edge lines */}
      {([-5.8, 5.8] as number[]).map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 0]}>
          <planeGeometry args={[0.2, length]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} />
        </mesh>
      ))}

      {/* Street lamps */}
      {Array.from({ length: Math.floor(length / 10) }, (_, i) => (
        <group key={i} position={[6.5, 0, -length / 2 + i * 10]}>
          <mesh position={[0, 5, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 10, 8]} />
            <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[2, 9.8, 0]}>
            <boxGeometry args={[3, 0.1, 0.1]} />
            <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[3.5, 9.5, 0]}>
            <boxGeometry args={[1, 0.3, 0.5]} />
            <meshStandardMaterial color="#ffffee" emissive="#ffffee" emissiveIntensity={0.5} />
          </mesh>
          <pointLight position={[3.5, 9.2, 0]} intensity={0.8} color="#ffdd88" distance={15} decay={2} />
        </group>
      ))}

      {/* Gravel shoulders */}
      {([-7, 7] as number[]).map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.003, 0]}>
          <planeGeometry args={[2, length]} />
          <meshStandardMaterial color="#665544" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}
