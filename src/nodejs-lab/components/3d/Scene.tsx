import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Float } from "@react-three/drei";
import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import type { ExecuteResult } from "@workspace/api-client-react";

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function ExecutionNode({ result, position }: { result: ExecuteResult; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.5;
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.3;
    }
  });

  const color = result.success ? "#00ff41" : "#ff003c";
  const scale = Math.max(0.3, Math.min(2, result.duration / 200));

  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
      <mesh position={position} ref={meshRef}>
        <icosahedronGeometry args={[scale, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} wireframe />
        <pointLight distance={10} intensity={result.success ? 2 : 4} color={color} />
      </mesh>
    </Float>
  );
}

function WebGLScene({ executions }: { executions: ExecuteResult[] }) {
  const positions = useMemo(
    () =>
      executions.map(
        () =>
          [
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 10,
          ] as [number, number, number]
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executions.length]
  );

  return (
    <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 10, 30]} />
      <ambientLight intensity={0.2} />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={1} fade speed={2} />
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial color="#00ff41" wireframe transparent opacity={0.1} />
      </mesh>
      {executions.map((exe, i) => (
        <ExecutionNode key={exe.id} result={exe} position={positions[i]} />
      ))}
      <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} enableDamping dampingFactor={0.05} />
    </Canvas>
  );
}

function FallbackViz({ executions }: { executions: ExecuteResult[] }) {
  return (
    <div className="w-full h-full flex flex-col bg-black relative overflow-hidden font-mono">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #00ff41 0, #00ff41 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #00ff41 0, #00ff41 1px, transparent 1px, transparent 40px)",
        }}
      />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-3 p-4">
        <div className="text-[#00ff41] text-xs tracking-widest uppercase opacity-60 mb-2">
          EXECUTION HISTORY
        </div>
        {executions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-[#00ff41]/40 text-xs">
            <div className="w-20 h-20 border border-[#00ff41]/20 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-10 h-10 border border-[#00ff41]/40 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 border border-[#00ff41]/60 rounded-full" />
              </div>
            </div>
            <span>AWAITING INPUT</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 justify-center max-w-xs">
            {executions.slice(-12).map((exe) => {
              const color = exe.success ? "#00ff41" : "#ff003c";
              const size = Math.max(14, Math.min(44, exe.duration / 15));
              return (
                <div key={exe.id} className="flex flex-col items-center gap-1">
                  <div
                    className="rounded-full border-2"
                    style={{
                      width: size,
                      height: size,
                      borderColor: color,
                      boxShadow: `0 0 ${size / 2}px ${color}50`,
                      backgroundColor: `${color}15`,
                      animation: "pulse 2s infinite",
                    }}
                  />
                  <span className="text-[9px]" style={{ color }}>
                    {exe.duration}ms
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="absolute top-3 right-3 text-[#00ff41] text-[10px] opacity-50 uppercase tracking-widest border border-[#00ff41]/20 p-2 z-10">
        <div className="flex gap-2">
          <span>NODES:</span>
          <span>{executions.length}</span>
        </div>
        <div className="flex gap-2">
          <span>RENDER:</span>
          <span>2D</span>
        </div>
      </div>
    </div>
  );
}

export default function Scene({ executions = [] }: { executions: ExecuteResult[] }) {
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglAvailable(isWebGLAvailable());
  }, []);

  if (webglAvailable === null) {
    return <div className="w-full h-full bg-black" />;
  }

  return (
    <div className="w-full h-full relative">
      {webglAvailable ? (
        <>
          <WebGLScene executions={executions} />
          <div className="absolute top-3 right-3 pointer-events-none text-[#00ff41] font-mono text-[10px] opacity-50 uppercase tracking-widest border border-[#00ff41]/20 p-2">
            <div className="flex gap-2">
              <span>NODES:</span>
              <span>{executions.length}</span>
            </div>
            <div className="flex gap-2">
              <span>SYSTEM:</span>
              <span>ACTIVE</span>
            </div>
          </div>
        </>
      ) : (
        <FallbackViz executions={executions} />
      )}
    </div>
  );
}
