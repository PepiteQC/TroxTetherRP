import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import type { DoorZone } from "../data/quebecBuildings";

enum Controls {
  forward = "forward",
  back = "back",
  left = "left",
  right = "right",
  brake = "brake",
}

const ZONES: { zMin: number; zMax: number; name: string }[] = [
  { zMin: -950, zMax: -600, name: "Québec — Route 138 Ouest" },
  { zMin: -600, zMax: -350, name: "Donnacona · Neuville" },
  { zMin: -350, zMax: -150, name: "Cap-Santé · Grondines" },
  { zMin: -150, zMax: 150,  name: "Portneuf — Village" },
  { zMin: 150,  zMax: 400,  name: "Saint-Casimir · Batiscan" },
  { zMin: 400,  zMax: 600,  name: "Champlain — Bord du Fleuve" },
  { zMin: 600,  zMax: 950,  name: "Trois-Rivières — Approche" },
];

interface WalkerProps {
  startPosition: THREE.Vector3;
  onSpeedChange: (speed: number) => void;
  onZoneChange: (zone: string) => void;
  onEnterVehicle: () => void;
  vehiclePosition: React.MutableRefObject<THREE.Vector3>;
  saveRef?: React.MutableRefObject<THREE.Vector3>;
  buildingZones?: DoorZone[];
  onNearBuilding?: (zone: DoorZone | null) => void;
  onInteractBuilding?: (zone: DoorZone) => void;
}

export default function Walker({
  startPosition,
  onSpeedChange,
  onZoneChange,
  onEnterVehicle,
  vehiclePosition,
  saveRef,
  buildingZones,
  onNearBuilding,
  onInteractBuilding,
}: WalkerProps) {
  const walkerRef = useRef<THREE.Group>(null!);
  const facingAngle = useRef(0);
  const bobRef = useRef(0);
  const currentZone = useRef("");
  const ePressed = useRef(false);
  const nearBuildingRef = useRef<DoorZone | null>(null);

  const [, getState] = useKeyboardControls<Controls>();
  const { camera } = useThree();
  const cameraTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    if (walkerRef.current) {
      walkerRef.current.position.copy(startPosition);
      walkerRef.current.position.x += 3;
      walkerRef.current.position.y = 1.0;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyE" && !ePressed.current) {
        ePressed.current = true;
        // Building interaction takes priority
        if (nearBuildingRef.current && onInteractBuilding) {
          onInteractBuilding(nearBuildingRef.current);
          return;
        }
        // Check vehicle proximity
        if (walkerRef.current && vehiclePosition.current) {
          const dist = walkerRef.current.position.distanceTo(vehiclePosition.current);
          if (dist < 6) {
            onEnterVehicle();
          }
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyE") ePressed.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onEnterVehicle, vehiclePosition, onInteractBuilding]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    if (!walkerRef.current) return;
    const controls = getState();
    const dt = Math.min(delta, 0.05);
    const walkSpeed = 0.12;
    const turnSpeed = 2.5;

    let moving = false;

    if (controls.forward) {
      facingAngle.current = Math.atan2(
        camera.position.x - walkerRef.current.position.x,
        camera.position.z - walkerRef.current.position.z
      );
      const dir = new THREE.Vector3(Math.sin(facingAngle.current), 0, Math.cos(facingAngle.current));
      walkerRef.current.position.addScaledVector(dir, walkSpeed);
      walkerRef.current.rotation.y = facingAngle.current;
      moving = true;
    }
    if (controls.back) {
      const dir = new THREE.Vector3(Math.sin(facingAngle.current), 0, Math.cos(facingAngle.current));
      walkerRef.current.position.addScaledVector(dir, -walkSpeed * 0.7);
      moving = true;
    }
    if (controls.left) {
      facingAngle.current += turnSpeed * dt;
      walkerRef.current.rotation.y = facingAngle.current;
    }
    if (controls.right) {
      facingAngle.current -= turnSpeed * dt;
      walkerRef.current.rotation.y = facingAngle.current;
    }

    walkerRef.current.position.y = 1.0;
    walkerRef.current.position.z = Math.max(-940, Math.min(940, walkerRef.current.position.z));

    if (moving) bobRef.current += dt * 10;

    if (saveRef) saveRef.current.copy(walkerRef.current.position);

    // Building proximity detection
    if (buildingZones && buildingZones.length > 0) {
      let nearest: DoorZone | null = null;
      let nearestDist = 7;
      for (const zone of buildingZones) {
        const zp = new THREE.Vector3(...zone.pos);
        const dist = walkerRef.current.position.distanceTo(zp);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = zone;
        }
      }
      if (nearest?.id !== nearBuildingRef.current?.id) {
        nearBuildingRef.current = nearest;
        onNearBuilding?.(nearest);
      }
    }

    // Camera
    const pos = walkerRef.current.position;
    const camAngle = facingAngle.current;
    const desiredCam = new THREE.Vector3(
      pos.x + Math.sin(camAngle) * 8,
      pos.y + 4,
      pos.z + Math.cos(camAngle) * 8
    );
    camera.position.lerp(desiredCam, 0.08);
    cameraTarget.current.lerp(new THREE.Vector3(pos.x, pos.y + 1, pos.z), 0.1);
    camera.lookAt(cameraTarget.current);

    onSpeedChange(moving ? 0.06 : 0);

    const z = pos.z;
    for (const zone of ZONES) {
      if (z >= zone.zMin && z <= zone.zMax) {
        if (currentZone.current !== zone.name) {
          currentZone.current = zone.name;
          onZoneChange("🚶 " + zone.name);
        }
        break;
      }
    }
  });

  const headBob = Math.sin(bobRef.current) * 0.05;

  return (
    <group ref={walkerRef}>
      <mesh position={[0, 0 + headBob, 0]} castShadow>
        <boxGeometry args={[0.45, 0.8, 0.25]} />
        <meshLambertMaterial color="#1a3a6a" />
      </mesh>
      <mesh position={[0, 0.65 + headBob, 0]} castShadow>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshLambertMaterial color="#e8c9a0" />
      </mesh>
      <mesh position={[0, 0.86 + headBob, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.22, 8]} />
        <meshLambertMaterial color="#c82020" />
      </mesh>
      <mesh position={[0, 0.98 + headBob, 0]}>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.3, 0.1 + headBob * 0.5, 0]} castShadow>
        <boxGeometry args={[0.18, 0.65, 0.18]} />
        <meshLambertMaterial color="#1a3a6a" />
      </mesh>
      <mesh position={[0.3, 0.1 - headBob * 0.5, 0]} castShadow>
        <boxGeometry args={[0.18, 0.65, 0.18]} />
        <meshLambertMaterial color="#1a3a6a" />
      </mesh>
      <mesh position={[-0.12, -0.6 + headBob * 0.3, 0]} castShadow>
        <boxGeometry args={[0.2, 0.6, 0.2]} />
        <meshLambertMaterial color="#2a2a4a" />
      </mesh>
      <mesh position={[0.12, -0.6 - headBob * 0.3, 0]} castShadow>
        <boxGeometry args={[0.2, 0.6, 0.2]} />
        <meshLambertMaterial color="#2a2a4a" />
      </mesh>
      <mesh position={[-0.12, -0.92, 0.04]}>
        <boxGeometry args={[0.22, 0.15, 0.28]} />
        <meshLambertMaterial color="#1a1008" />
      </mesh>
      <mesh position={[0.12, -0.92, 0.04]}>
        <boxGeometry args={[0.22, 0.15, 0.28]} />
        <meshLambertMaterial color="#1a1008" />
      </mesh>
    </group>
  );
}
