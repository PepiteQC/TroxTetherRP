import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Float } from "@react-three/drei";
import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import type { Agent } from "@workspace/api-client-react";

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

function AgentNode({ agent, position }: { agent: Agent; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.5;
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.3;
    }
  });

  const color = agent.color || "#00ff41";

  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
      <mesh position={position} ref={meshRef}>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} wireframe />
        <pointLight distance={10} intensity={2} color={color} />
      </mesh>
    </Float>
  );
}

function WebGLScene({ agents }: { agents: Agent[] }) {
  const positions = useMemo(() => {
    return agents.map((_, i) => {
      const angle = (i / agents.length) * Math.PI * 2;
      const radius = 8 + Math.random() * 4;
      return [
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 6,
        Math.sin(angle) * radius,
      ] as [number, number, number];
    });
  }, [agents.length]);

  return (
    <Canvas camera={{ position: [0, 10, 20], fov: 60 }}>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 10, 40]} />
      <ambientLight intensity={0.2} />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={1} fade speed={2} />
      
      {/* Central TroxT Brain Node */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} wireframe transparent opacity={0.8} />
        <pointLight distance={20} intensity={3} color="#ffffff" />
      </mesh>

      {agents.map((agent, i) => (
        <AgentNode key={agent.id} agent={agent} position={positions[i]} />
      ))}
      <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} enableDamping dampingFactor={0.05} />
    </Canvas>
  );
}

function FallbackViz({ agents }: { agents: Agent[] }) {
  return (
    <div className="w-full h-full flex flex-col bg-black relative overflow-hidden font-mono">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #00ff41 0, #00ff41 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #00ff41 0, #00ff41 1px, transparent 1px, transparent 40px)",
        }}
      />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 p-4">
        <div className="text-white font-bold tracking-widest uppercase opacity-80 border border-white/20 p-4 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)] bg-white/5">
          TROXT.BRAIN CORE
        </div>
        
        {agents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-[#00ff41]/40 text-xs">
            <span>NO AGENTS CONNECTED</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-8 justify-center max-w-2xl">
            {agents.map((agent) => {
              const color = agent.color || "#00ff41";
              return (
                <div key={agent.id} className="flex flex-col items-center gap-2">
                  <div
                    className="rounded-full border-2 border-dashed"
                    style={{
                      width: 40,
                      height: 40,
                      borderColor: color,
                      boxShadow: `0 0 10px ${color}50`,
                      backgroundColor: `${color}15`,
                      animation: agent.status === 'busy' ? "pulse 1s infinite" : "none",
                    }}
                  />
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color }}>
                    {agent.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="absolute top-3 right-3 text-[#00ff41] text-[10px] opacity-50 uppercase tracking-widest border border-[#00ff41]/20 p-2 z-10">
        <div className="flex gap-2">
          <span>AGENTS:</span>
          <span>{agents.length}</span>
        </div>
        <div className="flex gap-2">
          <span>RENDER:</span>
          <span>2D</span>
        </div>
      </div>
    </div>
  );
}

export default function AgentNetwork({ agents = [] }: { agents: Agent[] }) {
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
          <WebGLScene agents={agents} />
          <div className="absolute top-3 right-3 pointer-events-none text-[#00ff41] font-mono text-[10px] opacity-50 uppercase tracking-widest border border-[#00ff41]/20 p-2">
            <div className="flex gap-2">
              <span>AGENTS:</span>
              <span>{agents.length}</span>
            </div>
            <div className="flex gap-2">
              <span>NETWORK:</span>
              <span>ONLINE</span>
            </div>
          </div>
        </>
      ) : (
        <FallbackViz agents={agents} />
      )}
    </div>
  );
}
