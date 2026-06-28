import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

type ActionName = "Idle" | "Walk" | "Run" | "Jump";

export function PlayableAdminStickman({ action = "Idle" as ActionName }) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF("/models/characters/admin_stickman_fighter.glb");
  const { actions } = useAnimations(gltf.animations, group);
  const current = useRef<ActionName>("Idle");

  useEffect(() => {
    const next = actions[action];
    const prev = actions[current.current];
    if (!next) return;
    next.reset().fadeIn(0.16).play();
    if (prev && prev !== next) prev.fadeOut(0.16);
    current.current = action;
    return () => { next.fadeOut(0.12); };
  }, [action, actions]);

  useFrame(() => {
    // Ici tu peux brancher ton contrôleur WASD/caméra.
  });

  return <primitive ref={group} object={gltf.scene} />;
}

useGLTF.preload("/models/characters/admin_stickman_fighter.glb");
