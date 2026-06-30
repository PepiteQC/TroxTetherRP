import { useRef, useEffect, useMemo, memo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { setGlobal, useGameState } from "../store";

const GRAVITY = -22;
const JUMP_FORCE = 9.0;
const WALK_SPEED = 5.0;
const RUN_SPEED = 10.0;
const CAM_MIN_DIST = 3;
const CAM_MAX_DIST = 22;
const CAM_MIN_PITCH = 0.05;
const CAM_MAX_PITCH = 1.4;
const CAM_SENSITIVITY = 0.003;
const CAM_LOOK_HEIGHT = 1.5;

interface InputState {
  keys: Record<string, boolean>;
  camYaw: number; camPitch: number; camDist: number;
  isDragging: boolean; lastX: number; lastY: number;
}

function createInput(): InputState {
  return { keys: {}, camYaw: Math.PI, camPitch: 0.32, camDist: 9, isDragging: false, lastX: 0, lastY: 0 };
}

function useInput(ref: React.MutableRefObject<InputState>) {
  useEffect(() => {
    const inp = ref.current;
    const kd = (e: KeyboardEvent) => { inp.keys[e.code] = true; };
    const ku = (e: KeyboardEvent) => { inp.keys[e.code] = false; };
    const md = (e: MouseEvent) => {
      if (e.button === 2 || e.button === 1) {
        inp.isDragging = true; inp.lastX = e.clientX; inp.lastY = e.clientY;
      }
    };
    const mu = (e: MouseEvent) => { if (e.button === 2 || e.button === 1) inp.isDragging = false; };
    const mm = (e: MouseEvent) => {
      if (!inp.isDragging) return;
      inp.camYaw -= (e.clientX - inp.lastX) * CAM_SENSITIVITY;
      inp.camPitch = THREE.MathUtils.clamp(inp.camPitch + (e.clientY - inp.lastY) * CAM_SENSITIVITY * 0.75, CAM_MIN_PITCH, CAM_MAX_PITCH);
      inp.lastX = e.clientX; inp.lastY = e.clientY;
    };
    const wh = (e: WheelEvent) => {
      inp.camDist = THREE.MathUtils.clamp(inp.camDist + e.deltaY * 0.007, CAM_MIN_DIST, CAM_MAX_DIST);
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("mousedown", md);
    window.addEventListener("mouseup", mu);
    window.addEventListener("mousemove", mm);
    window.addEventListener("wheel", wh, { passive: true });
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("mousedown", md);
      window.removeEventListener("mouseup", mu);
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("wheel", wh);
    };
  }, [ref]);
}

const GEO = {
  head: new THREE.BoxGeometry(0.50, 0.50, 0.50),
  torso: new THREE.BoxGeometry(0.68, 0.80, 0.36),
  upperArm: new THREE.BoxGeometry(0.20, 0.48, 0.20),
  forearm: new THREE.BoxGeometry(0.17, 0.30, 0.17),
  hand: new THREE.BoxGeometry(0.15, 0.11, 0.15),
  upperLeg: new THREE.BoxGeometry(0.24, 0.42, 0.24),
  lowerLeg: new THREE.BoxGeometry(0.22, 0.36, 0.22),
  shoe: new THREE.BoxGeometry(0.26, 0.09, 0.34),
  hatTop: new THREE.CylinderGeometry(0.26, 0.30, 0.20, 12),
  hatBrim: new THREE.CylinderGeometry(0.40, 0.40, 0.04, 16),
  shadow: new THREE.CircleGeometry(0.55, 24),
  belt: new THREE.BoxGeometry(0.70, 0.07, 0.38),
};

const _v3A = new THREE.Vector3();
const _v3B = new THREE.Vector3();
const _v3C = new THREE.Vector3();
const _v3D = new THREE.Vector3();

export const PlayerCharacter = memo(function PlayerCharacter() {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const foreLRef = useRef<THREE.Group>(null);
  const foreRRef = useRef<THREE.Group>(null);
  const lLowRef = useRef<THREE.Group>(null);
  const lLowRRef = useRef<THREE.Group>(null);

  const inputRef = useRef<InputState>(createInput());
  const physRef = useRef({ vy: 0, grounded: true, groundY: 0, coyote: 0, impact: 0 });
  const animRef = useRef({ t: 0, spd: 0, breath: 0, bob: 0 });

  const { camera } = useThree();
  useInput(inputRef);

  const mat = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: "#e0b48a", roughness: 0.5 }),
    shirt: new THREE.MeshStandardMaterial({ color: "#2d3a5c", roughness: 0.6 }),
    shirtDark: new THREE.MeshStandardMaterial({ color: "#1e2a44", roughness: 0.65 }),
    pants: new THREE.MeshStandardMaterial({ color: "#1a3a2a", roughness: 0.55 }),
    pantsDk: new THREE.MeshStandardMaterial({ color: "#122a1e", roughness: 0.6 }),
    hat: new THREE.MeshStandardMaterial({ color: "#cc2222", roughness: 0.4, metalness: 0.08 }),
    hatBrim: new THREE.MeshStandardMaterial({ color: "#aa1818", roughness: 0.45 }),
    shoe: new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.75 }),
    belt: new THREE.MeshStandardMaterial({ color: "#2a1a0a", roughness: 0.6, metalness: 0.1 }),
    eye: new THREE.MeshBasicMaterial({ color: "#050505" }),
    eyeW: new THREE.MeshBasicMaterial({ color: "#f0f0f0" }),
    mouth: new THREE.MeshBasicMaterial({ color: "#7a4030" }),
    shadow: new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.28, depthWrite: false }),
  }), []);

  useEffect(() => () => { Object.values(mat).forEach((m) => m.dispose()); }, [mat]);

  useFrame((_state, dt) => {
    const g = groupRef.current;
    if (!g) return;
    const cdt = Math.min(dt, 0.05);
    const inp = inputRef.current;
    const phys = physRef.current;
    const anim = animRef.current;

    const isTyping = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
    const keys = isTyping ? {} as Record<string, boolean> : inp.keys;

    const run = keys["ShiftLeft"] || keys["ShiftRight"];
    const spd = run ? RUN_SPEED : WALK_SPEED;

    _v3A.set(Math.sin(inp.camYaw), 0, Math.cos(inp.camYaw));
    _v3B.crossVectors(_v3A, THREE.Object3D.DEFAULT_UP).normalize();
    _v3C.set(0, 0, 0);
    if (keys["KeyW"] || keys["ArrowUp"]) _v3C.addScaledVector(_v3A, spd * cdt);
    if (keys["KeyS"] || keys["ArrowDown"]) _v3C.addScaledVector(_v3A, -spd * cdt);
    if (keys["KeyA"] || keys["ArrowLeft"]) _v3C.addScaledVector(_v3B, -spd * cdt);
    if (keys["KeyD"] || keys["ArrowRight"]) _v3C.addScaledVector(_v3B, spd * cdt);

    const hLen = Math.sqrt(_v3C.x * _v3C.x + _v3C.z * _v3C.z);
    if (hLen > spd * cdt) { const s = (spd * cdt) / hLen; _v3C.x *= s; _v3C.z *= s; }

    const isGodMode = useGameState.getState().isGodMode;
    const flyMode = useGameState.getState().flyMode;

    if (flyMode || isGodMode) {
      if (keys["Space"]) g.position.y += RUN_SPEED * cdt;
      if (keys["ControlLeft"]) g.position.y -= RUN_SPEED * cdt;
      phys.vy = 0;
      phys.grounded = false;
    } else {
      if (phys.grounded) phys.coyote = 0.1;
      else phys.coyote = Math.max(0, phys.coyote - cdt);

      if (keys["Space"] && (phys.grounded || phys.coyote > 0)) {
        phys.vy = JUMP_FORCE; phys.grounded = false; phys.coyote = 0;
      }
      phys.vy += GRAVITY * cdt;
      g.position.y += phys.vy * cdt;

      if (g.position.y <= 0) {
        if (!phys.grounded && phys.vy < -3) phys.impact = Math.min(1, Math.abs(phys.vy) * 0.04);
        g.position.y = 0; phys.vy = 0; phys.grounded = true;
      } else if (g.position.y > 0.1) {
        phys.grounded = false;
      }
    }

    g.position.x += _v3C.x;
    g.position.z += _v3C.z;
    phys.impact *= Math.exp(-cdt * 8);

    setGlobal({ playerPos: [g.position.x, g.position.y, g.position.z] });

    const moving = hLen > 0.001;
    const tgtSpd = moving ? (run ? 1.0 : 0.55) : 0;
    anim.spd = THREE.MathUtils.lerp(anim.spd, tgtSpd, 1 - Math.exp(-cdt * 12));
    anim.breath += cdt * 1.6;
    const breathOff = Math.sin(anim.breath) * 0.007;
    const decay = Math.exp(-cdt * 6);

    if (moving && !flyMode) {
      const tgt = Math.atan2(_v3C.x, _v3C.z);
      let diff = ((tgt - g.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * 0.14;
      anim.t += cdt * (run ? 14.0 : 9.0);
      const sw = Math.sin(anim.t) * (run ? 0.70 : 0.48) * anim.spd;
      const co = Math.cos(anim.t);
      if (legLRef.current) legLRef.current.rotation.x = sw;
      if (legRRef.current) legRRef.current.rotation.x = -sw;
      if (lLowRef.current) lLowRef.current.rotation.x = Math.max(0, -co) * 0.45 * anim.spd;
      if (lLowRRef.current) lLowRRef.current.rotation.x = Math.max(0, co) * 0.45 * anim.spd;
      if (armLRef.current) armLRef.current.rotation.x = -sw * 0.8;
      if (armRRef.current) armRRef.current.rotation.x = sw * 0.8;
      if (foreLRef.current) foreLRef.current.rotation.x = -0.12 - Math.max(0, co) * 0.28 * anim.spd;
      if (foreRRef.current) foreRRef.current.rotation.x = -0.12 - Math.max(0, -co) * 0.28 * anim.spd;
      anim.bob = Math.sin(anim.t * 2) * 0.018 * anim.spd;
    } else {
      if (legLRef.current) legLRef.current.rotation.x *= decay;
      if (legRRef.current) legRRef.current.rotation.x *= decay;
      if (armLRef.current) armLRef.current.rotation.x *= decay;
      if (armRRef.current) armRRef.current.rotation.x *= decay;
      if (lLowRef.current) lLowRef.current.rotation.x *= decay;
      if (lLowRRef.current) lLowRRef.current.rotation.x *= decay;
      if (foreLRef.current) foreLRef.current.rotation.x = THREE.MathUtils.lerp(foreLRef.current.rotation.x, -0.07, 1 - decay);
      if (foreRRef.current) foreRRef.current.rotation.x = THREE.MathUtils.lerp(foreRRef.current.rotation.x, -0.07, 1 - decay);
      anim.bob *= decay;

      if (!isTyping) {
        const tgt = Math.atan2(_v3A.x, _v3A.z);
        let diff = ((tgt - g.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (diff < -Math.PI) diff += Math.PI * 2;
        g.rotation.y += diff * 0.05;
      }
    }

    if (bodyRef.current) {
      const sq = 1 - phys.impact * 0.28;
      const st = 1 + phys.impact * 0.14;
      bodyRef.current.scale.set(st, sq, st);
      bodyRef.current.position.y = breathOff;
    }
    if (headRef.current) headRef.current.position.y = 1.88 + breathOff * 1.4 + anim.bob;

    if (shadowRef.current) {
      const h = g.position.y;
      const sc = Math.max(0.3, 1 - h * 0.07);
      (shadowRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0.05, 0.28 - h * 0.025);
      shadowRef.current.scale.setScalar(sc);
      shadowRef.current.position.y = -g.position.y + 0.004;
    }

    const dist = inp.camDist;
    const pitch = inp.camPitch;
    _v3D.set(
      g.position.x - Math.sin(inp.camYaw) * Math.cos(pitch) * dist,
      g.position.y + Math.sin(pitch) * dist + 0.8,
      g.position.z - Math.cos(inp.camYaw) * Math.cos(pitch) * dist,
    );
    const lerp = 1 - Math.exp(-cdt * 10 * 0.9);
    camera.position.lerp(_v3D, lerp);
    camera.lookAt(g.position.x, g.position.y + CAM_LOOK_HEIGHT, g.position.z);
  });

  return (
    <group ref={groupRef} position={[0, 0, 2]}>
      <mesh ref={shadowRef} rotation-x={-Math.PI / 2} position-y={0.004} material={mat.shadow}>
        <primitive object={GEO.shadow} attach="geometry" />
      </mesh>

      <group ref={bodyRef}>
        <group ref={legLRef} position={[-0.16, 0.56, 0]}>
          <mesh castShadow position={[0, -0.09, 0]} material={mat.pants}><primitive object={GEO.upperLeg} attach="geometry" /></mesh>
          <group ref={lLowRef} position={[0, -0.33, 0]}>
            <mesh castShadow position={[0, -0.09, 0]} material={mat.pantsDk}><primitive object={GEO.lowerLeg} attach="geometry" /></mesh>
            <mesh castShadow position={[0, -0.28, 0.04]} material={mat.shoe}><primitive object={GEO.shoe} attach="geometry" /></mesh>
          </group>
        </group>
        <group ref={legRRef} position={[0.16, 0.56, 0]}>
          <mesh castShadow position={[0, -0.09, 0]} material={mat.pants}><primitive object={GEO.upperLeg} attach="geometry" /></mesh>
          <group ref={lLowRRef} position={[0, -0.33, 0]}>
            <mesh castShadow position={[0, -0.09, 0]} material={mat.pantsDk}><primitive object={GEO.lowerLeg} attach="geometry" /></mesh>
            <mesh castShadow position={[0, -0.28, 0.04]} material={mat.shoe}><primitive object={GEO.shoe} attach="geometry" /></mesh>
          </group>
        </group>
        <mesh castShadow position={[0, 1.12, 0]} material={mat.shirt}><primitive object={GEO.torso} attach="geometry" /></mesh>
        <mesh castShadow position={[0, 0.74, 0]} material={mat.belt}><primitive object={GEO.belt} attach="geometry" /></mesh>
        <group ref={armLRef} position={[-0.48, 1.30, 0]}>
          <mesh castShadow position={[0, -0.12, 0]} material={mat.shirt}><primitive object={GEO.upperArm} attach="geometry" /></mesh>
          <group ref={foreLRef} position={[0, -0.36, 0]}>
            <mesh castShadow position={[0, -0.07, 0]} material={mat.shirtDark}><primitive object={GEO.forearm} attach="geometry" /></mesh>
            <mesh castShadow position={[0, -0.24, 0]} material={mat.skin}><primitive object={GEO.hand} attach="geometry" /></mesh>
          </group>
        </group>
        <group ref={armRRef} position={[0.48, 1.30, 0]}>
          <mesh castShadow position={[0, -0.12, 0]} material={mat.shirt}><primitive object={GEO.upperArm} attach="geometry" /></mesh>
          <group ref={foreRRef} position={[0, -0.36, 0]}>
            <mesh castShadow position={[0, -0.07, 0]} material={mat.shirtDark}><primitive object={GEO.forearm} attach="geometry" /></mesh>
            <mesh castShadow position={[0, -0.24, 0]} material={mat.skin}><primitive object={GEO.hand} attach="geometry" /></mesh>
          </group>
        </group>

        <group ref={headRef} position={[0, 1.88, 0]}>
          <mesh castShadow material={mat.skin}><primitive object={GEO.head} attach="geometry" /></mesh>
          <mesh position={[0.12, 0.04, 0.26]} material={mat.eyeW}><boxGeometry args={[0.11, 0.085, 0.01]} /></mesh>
          <mesh position={[-0.12, 0.04, 0.26]} material={mat.eyeW}><boxGeometry args={[0.11, 0.085, 0.01]} /></mesh>
          <mesh position={[0.12, 0.04, 0.268]} material={mat.eye}><boxGeometry args={[0.065, 0.052, 0.012]} /></mesh>
          <mesh position={[-0.12, 0.04, 0.268]} material={mat.eye}><boxGeometry args={[0.065, 0.052, 0.012]} /></mesh>
          <mesh position={[0, -0.10, 0.265]} material={mat.mouth}><boxGeometry args={[0.13, 0.028, 0.01]} /></mesh>
          <mesh castShadow position={[0, 0.32, 0]} material={mat.hat}><primitive object={GEO.hatTop} attach="geometry" /></mesh>
          <mesh castShadow position={[0, 0.21, 0.05]} material={mat.hatBrim}><primitive object={GEO.hatBrim} attach="geometry" /></mesh>
        </group>
      </group>
    </group>
  );
});
