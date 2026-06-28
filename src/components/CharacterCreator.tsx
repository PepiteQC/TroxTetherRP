import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sparkles, RefreshCw, Download, Shuffle, CheckCircle, ArrowRight } from 'lucide-react';

interface CharacterCreatorProps {
  onNavigate: (view: 'landing' | 'character-creator' | 'etherprism' | 'troxt-chat' | 'sandbox') => void;
}

// 12 Cosmic Auras configuration
const AURAS = [
  { id: 'divine', name: 'Divine Shield ☀️', color: 0xffd700, desc: 'Bouclier d\'or pur protecteur' },
  { id: 'void', name: 'Void Aura 🔮', color: 0x8a2be2, desc: 'Brume cosmique violette du néant' },
  { id: 'rage', name: 'Blood Rage 🩸', color: 0xff0000, desc: 'Surcharge physique écarlate' },
  { id: 'frost', name: 'Frost Nova ❄️', color: 0x00ffff, desc: 'Glace éternelle en rotation orbitale' },
  { id: 'nature', name: 'Nature Soul 🌿', color: 0x32cd32, desc: 'Feuilles sacrées d\'énergie verte' },
  { id: 'chaos', name: 'Chaos Rift 🌀', color: 0xff4500, desc: 'Fusion d\'énergie orange et rouge' },
  { id: 'lich', name: 'Lich King 💀', color: 0x4682b4, desc: 'Aura nécrotique glaciale' },
  { id: 'demon', name: 'Demon Hunter 🐍', color: 0x39ff14, desc: 'Fureur gangrenée vert fluo' },
  { id: 'bloodmage', name: 'Blood Mage 🍷', color: 0x800000, desc: 'Magie du sang et orbes de vie' },
  { id: 'archmage', name: 'Archmage ⚡', color: 0x00bfff, desc: 'Couronne d\'éclairs bleu ciel' },
  { id: 'warlord', name: 'Warlord 🔥', color: 0xff8c00, desc: 'Flammes infernales brûlantes' },
  { id: 'time', name: 'Time God ⏳', color: 0xffa500, desc: 'Chronologies et engrenages d\'or' }
];

const HAIR_STYLES = [
  { id: 'bald', name: 'Chauve' },
  { id: 'short', name: 'Court Militaire' },
  { id: 'spiky', name: 'Crête Rebelle' },
  { id: 'afro', name: 'Afro Volumineux' },
  { id: 'ponytail', name: 'Queue de Cheval' },
  { id: 'long', name: 'Long Royal' },
  { id: 'dreads', name: 'Locks Dreadlocks' },
  { id: 'cyber', name: 'Cyberpunk Sidecut' }
];

const SKIN_TONES = [
  '#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffedd5', '#fed7aa', '#1e293b'
];

const EYE_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#eab308', '#06b6d4', '#1e293b', '#ffffff'
];

const HAIR_COLORS = [
  '#090d16', '#4a3728', '#b45309', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#f43f5e', '#ffffff', '#06b6d4'
];

const OUTFITS = [
  { id: 'suit', name: 'Costume Agent Noir', colors: ['#0f172a', '#e2e8f0', '#0f172a'] },
  { id: 'hoodie', name: 'Sweat Streetwear Violet', colors: ['#6d28d9', '#a78bfa', '#1e1b4b'] },
  { id: 'casual', name: 'T-Shirt Blanc Décontracté', colors: ['#ffffff', '#3b82f6', '#0f172a'] },
  { id: 'gold', name: 'Harnais Militaire Cyber', colors: ['#1e293b', '#fbbf24', '#111827'] },
  { id: 'tactical', name: 'Gilet Tactique Gendarme', colors: ['#172554', '#3b82f6', '#172554'] },
  { id: 'medic', name: 'Combinaison Secours Blanc/Rouge', colors: ['#f8fafc', '#ef4444', '#ef4444'] }
];

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onNavigate }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Form State
  const [name, setName] = useState('John Doe');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [skinTone, setSkinTone] = useState(SKIN_TONES[0]);
  const [eyeColor, setEyeColor] = useState(EYE_COLORS[0]);
  const [hairStyle, setHairStyle] = useState('short');
  const [hairColor, setHairColor] = useState(HAIR_COLORS[2]);
  const [outfitIdx, setOutfitIdx] = useState(0);
  const [activeAura, setActiveAura] = useState('divine');

  // Sliders
  const [widthScale, setWidthScale] = useState(1.0);
  const [heightScale, setHeightScale] = useState(1.0);
  const [muscleScale, setMuscleScale] = useState(1.0);

  // Animation Action Cycle
  const [animationMode, setAnimationMode] = useState<'idle' | 'walk' | 'run'>('idle');

  // Popup spawn
  const [isSpawned, setIsSpawned] = useState(false);

  // References to THREE objects to update live without re-constructing everything
  const characterRef = useRef<THREE.Group | null>(null);
  const auraPointsRef = useRef<THREE.Points | null>(null);
  const auraRingsRef = useRef<THREE.Group | null>(null);

  // Randomize values
  const handleRandomize = () => {
    const randomGender = Math.random() > 0.5 ? 'M' : 'F';
    setGender(randomGender);
    setSkinTone(SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]);
    setEyeColor(EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)]);
    setHairStyle(HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id);
    setHairColor(HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)]);
    setOutfitIdx(Math.floor(Math.random() * OUTFITS.length));
    setActiveAura(AURAS[Math.floor(Math.random() * AURAS.length)].id);
    setWidthScale(0.8 + Math.random() * 0.4);
    setHeightScale(0.85 + Math.random() * 0.3);
    setMuscleScale(0.8 + Math.random() * 0.4);
  };

  // Run ThreeJS loop
  useEffect(() => {
    if (!containerRef.current) return;

    // SCENE, CAMERA, RENDERER
    const scene = new THREE.Scene();
    scene.background = null; // transparent to see our CSS radial gradient!

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.2, 4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(400, 400);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    containerRef.current.appendChild(renderer.domElement);

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const ringLight = new THREE.PointLight(0x818cf8, 1.5, 10);
    ringLight.position.set(0, 1, 1.5);
    scene.add(ringLight);

    // CHARACTER ROOT GROUP
    const characterGroup = new THREE.Group();
    scene.add(characterGroup);
    characterRef.current = characterGroup;

    // Materials helper
    const getSkinMat = () => new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.4 });
    const getEyeMat = () => new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.1 });
    const getHairMat = () => new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.7 });

    // BODY PARTS DECLARATIONS
    let head: THREE.Mesh;
    let chest: THREE.Mesh;
    let pelvis: THREE.Mesh;
    let armLeft: THREE.Mesh;
    let armRight: THREE.Mesh;
    let legLeft: THREE.Mesh;
    let legRight: THREE.Mesh;
    let hairGroup = new THREE.Group();

    const buildAvatar = () => {
      // Clear previous parts
      while (characterGroup.children.length > 0) {
        characterGroup.remove(characterGroup.children[0]);
      }

      const outfit = OUTFITS[outfitIdx];
      const outfitPrimary = new THREE.MeshStandardMaterial({ color: outfit.colors[0], roughness: 0.5 });
      const outfitSecondary = new THREE.MeshStandardMaterial({ color: outfit.colors[1], roughness: 0.5 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: outfit.colors[2], roughness: 0.8 });

      // Build head (BoxGeometry)
      const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
      head = new THREE.Mesh(headGeo, getSkinMat());
      head.position.y = 1.25;
      characterGroup.add(head);

      // Eyes
      const eyeGeo = new THREE.BoxGeometry(0.06, 0.04, 0.04);
      const eyeL = new THREE.Mesh(eyeGeo, getEyeMat());
      eyeL.position.set(-0.09, 0.04, 0.18);
      const eyeR = new THREE.Mesh(eyeGeo, getEyeMat());
      eyeR.position.set(0.09, 0.04, 0.18);
      head.add(eyeL);
      head.add(eyeR);

      // Hair Construction Group
      hairGroup = new THREE.Group();
      head.add(hairGroup);

      if (hairStyle !== 'bald') {
        const hairMat = getHairMat();
        if (hairStyle === 'short') {
          const capGeo = new THREE.BoxGeometry(0.4, 0.15, 0.4);
          const cap = new THREE.Mesh(capGeo, hairMat);
          cap.position.y = 0.15;
          hairGroup.add(cap);
        } else if (hairStyle === 'spiky') {
          const capGeo = new THREE.BoxGeometry(0.4, 0.12, 0.4);
          const cap = new THREE.Mesh(capGeo, hairMat);
          cap.position.y = 0.15;
          hairGroup.add(cap);

          // Add spikes
          for (let i = -0.15; i <= 0.15; i += 0.08) {
            const spikeGeo = new THREE.BoxGeometry(0.04, 0.12, 0.04);
            const spike = new THREE.Mesh(spikeGeo, hairMat);
            spike.position.set(i, 0.23, 0);
            spike.rotation.z = i * -1.5;
            hairGroup.add(spike);
          }
        } else if (hairStyle === 'afro') {
          const afroGeo = new THREE.SphereGeometry(0.25, 8, 8);
          const afro = new THREE.Mesh(afroGeo, hairMat);
          afro.position.set(0, 0.18, -0.05);
          hairGroup.add(afro);
        } else if (hairStyle === 'ponytail') {
          const capGeo = new THREE.BoxGeometry(0.4, 0.15, 0.4);
          const cap = new THREE.Mesh(capGeo, hairMat);
          cap.position.y = 0.15;
          hairGroup.add(cap);

          const tailGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
          const tail = new THREE.Mesh(tailGeo, hairMat);
          tail.position.set(0, 0.05, -0.24);
          tail.rotation.x = -0.3;
          hairGroup.add(tail);
        } else if (hairStyle === 'long') {
          const capGeo = new THREE.BoxGeometry(0.4, 0.15, 0.4);
          const cap = new THREE.Mesh(capGeo, hairMat);
          cap.position.y = 0.15;
          hairGroup.add(cap);

          const sideLGeo = new THREE.BoxGeometry(0.06, 0.42, 0.4);
          const sideL = new THREE.Mesh(sideLGeo, hairMat);
          sideL.position.set(-0.19, -0.08, 0);
          const sideR = new THREE.Mesh(sideLGeo, hairMat);
          sideR.position.set(0.19, -0.08, 0);
          hairGroup.add(sideL);
          hairGroup.add(sideR);
        } else if (hairStyle === 'dreads') {
          const capGeo = new THREE.BoxGeometry(0.42, 0.12, 0.42);
          const cap = new THREE.Mesh(capGeo, hairMat);
          cap.position.y = 0.16;
          hairGroup.add(cap);

          for (let i = 0; i < 8; i++) {
            const lockGeo = new THREE.BoxGeometry(0.04, 0.38, 0.04);
            const lock = new THREE.Mesh(lockGeo, hairMat);
            const theta = (i / 8) * Math.PI * 2;
            lock.position.set(Math.cos(theta) * 0.19, -0.06, Math.sin(theta) * 0.19);
            lock.rotation.x = (Math.random() - 0.5) * 0.2;
            hairGroup.add(lock);
          }
        } else if (hairStyle === 'cyber') {
          const capGeo = new THREE.BoxGeometry(0.4, 0.18, 0.2);
          const cap = new THREE.Mesh(capGeo, hairMat);
          cap.position.set(0.04, 0.16, 0.08);
          hairGroup.add(cap);

          // Neon strip
          const neonGeo = new THREE.BoxGeometry(0.03, 0.2, 0.42);
          const neonMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
          const neon = new THREE.Mesh(neonGeo, neonMat);
          neon.position.set(-0.17, 0.1, 0);
          hairGroup.add(neon);
        }
      }

      // Build chest / shirt (BoxGeometry)
      const chestGeo = new THREE.BoxGeometry(0.55 * widthScale, 0.52, 0.32);
      chest = new THREE.Mesh(chestGeo, outfitPrimary);
      chest.position.y = 0.76;
      characterGroup.add(chest);

      // Add a cool V-neck or secondary outfit color plate on chest
      const stripeGeo = new THREE.BoxGeometry(0.12, 0.35, 0.03);
      const stripe = new THREE.Mesh(stripeGeo, outfitSecondary);
      stripe.position.set(0, 0.08, 0.16);
      chest.add(stripe);

      // Pelvis / pants top
      const pelvisGeo = new THREE.BoxGeometry(0.5 * widthScale, 0.14, 0.3);
      pelvis = new THREE.Mesh(pelvisGeo, outfitSecondary);
      pelvis.position.y = 0.45;
      characterGroup.add(pelvis);

      // ARMS
      const armGeo = new THREE.BoxGeometry(0.13 * muscleScale, 0.5, 0.13 * muscleScale);
      
      armLeft = new THREE.Mesh(armGeo, getSkinMat());
      armLeft.position.set(-0.38 * widthScale, 0.72, 0);
      characterGroup.add(armLeft);

      // sleeves top
      const sleeveLGeo = new THREE.BoxGeometry(0.16 * muscleScale, 0.22, 0.16 * muscleScale);
      const sleeveL = new THREE.Mesh(sleeveLGeo, outfitPrimary);
      sleeveL.position.y = 0.15;
      armLeft.add(sleeveL);

      armRight = new THREE.Mesh(armGeo, getSkinMat());
      armRight.position.set(0.38 * widthScale, 0.72, 0);
      characterGroup.add(armRight);

      const sleeveR = new THREE.Mesh(sleeveLGeo, outfitPrimary);
      sleeveR.position.y = 0.15;
      armRight.add(sleeveR);

      // LEGS
      const legGeo = new THREE.BoxGeometry(0.16, 0.46 * heightScale, 0.16);
      
      legLeft = new THREE.Mesh(legGeo, outfitSecondary);
      legLeft.position.set(-0.16 * widthScale, 0.18, 0);
      characterGroup.add(legLeft);

      const footLGeo = new THREE.BoxGeometry(0.18, 0.08, 0.22);
      const footL = new THREE.Mesh(footLGeo, shoeMat);
      footL.position.set(0, -0.22, 0.03);
      legLeft.add(footL);

      legRight = new THREE.Mesh(legGeo, outfitSecondary);
      legRight.position.set(0.16 * widthScale, 0.18, 0);
      characterGroup.add(legRight);

      const footR = new THREE.Mesh(footLGeo, shoeMat);
      footR.position.set(0, -0.22, 0.03);
      legRight.add(footR);

      // Adjust group overall height anchor
      characterGroup.position.y = -0.3;
    };

    buildAvatar();

    // COSMIC AURA EMITTER INITIALIZATION
    const constructAura = () => {
      // Clear previous aura
      if (auraPointsRef.current) scene.remove(auraPointsRef.current);
      if (auraRingsRef.current) scene.remove(auraRingsRef.current);

      const auraConf = AURAS.find(a => a.id === activeAura) || AURAS[0];

      // Sparkles Points Emitter
      const count = 120;
      const positions = new Float32Array(count * 3);
      const velocities: number[] = [];

      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const radius = 0.4 + Math.random() * 0.6;
        positions[i * 3] = Math.cos(theta) * radius;
        positions[i * 3 + 1] = -0.6 + Math.random() * 2.2;
        positions[i * 3 + 2] = Math.sin(theta) * radius;

        velocities.push((Math.random() - 0.5) * 0.01); // vx
        velocities.push(0.01 + Math.random() * 0.025); // vy (rises up!)
        velocities.push((Math.random() - 0.5) * 0.01); // vz
      }

      const auraGeo = new THREE.BufferGeometry();
      auraGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // Cute square glows or custom points
      const pMat = new THREE.PointsMaterial({
        color: auraConf.color,
        size: 0.065,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });

      const pMesh = new THREE.Points(auraGeo, pMat);
      scene.add(pMesh);
      auraPointsRef.current = pMesh;

      // Hologram glowing orbiting rings
      const ringsGroup = new THREE.Group();
      scene.add(ringsGroup);
      auraRingsRef.current = ringsGroup;

      const ringGeo = new THREE.RingGeometry(0.68, 0.72, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: auraConf.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending
      });

      const ring1 = new THREE.Mesh(ringGeo, ringMat);
      ring1.rotation.x = Math.PI / 2;
      ring1.position.y = 0.3;
      ringsGroup.add(ring1);

      const ring2 = new THREE.Mesh(ringGeo, ringMat);
      ring2.rotation.x = Math.PI / 2.5;
      ring2.rotation.y = 0.5;
      ring2.position.y = 0.8;
      ringsGroup.add(ring2);
    };

    constructAura();

    // DRAG ROTATE VARIABLES
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const dom = renderer.domElement;
    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      characterGroup.rotation.y += deltaX * 0.015;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => { isDragging = false; };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // ANIMATION TICK LOOP
    let clock = new THREE.Clock();
    let animFrame: number;

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Slow idle auto-spin
      if (!isDragging) {
        characterGroup.rotation.y = elapsed * 0.45;
      }

      // Animate aura sparkles rising
      if (auraPointsRef.current) {
        const posAttr = auraPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < arr.length / 3; i++) {
          arr[i * 3 + 1] += 0.015; // float up
          
          // swirl orbit slightly
          const x = arr[i * 3];
          const z = arr[i * 3 + 2];
          const theta = 0.02;
          arr[i * 3] = x * Math.cos(theta) - z * Math.sin(theta);
          arr[i * 3 + 2] = x * Math.sin(theta) + z * Math.cos(theta);

          if (arr[i * 3 + 1] > 1.8) {
            arr[i * 3 + 1] = -0.5; // reset bottom
          }
        }
        posAttr.needsUpdate = true;
      }

      // Orbiting halos rotation
      if (auraRingsRef.current) {
        auraRingsRef.current.rotation.y = elapsed * 1.5;
        auraRingsRef.current.children.forEach((ring, idx) => {
          ring.position.y += Math.sin(elapsed * 2 + idx) * 0.001;
        });
      }

      // ─── PLAYER BODY SUB-ANIMATION LOOPS ───────────────────────────
      const t = elapsed * 6; // base speed
      if (animationMode === 'idle') {
        // Subtle breathing & head bob
        if (head) head.position.y = 1.25 + Math.sin(elapsed * 2) * 0.012;
        if (chest) chest.scale.set(1, 1 + Math.sin(elapsed * 2.2) * 0.008, 1);
        if (armLeft) {
          armLeft.rotation.z = Math.sin(elapsed * 1.5) * 0.04 - 0.05;
          armLeft.rotation.x = 0;
        }
        if (armRight) {
          armRight.rotation.z = Math.sin(elapsed * 1.5) * -0.04 + 0.05;
          armRight.rotation.x = 0;
        }
        if (legLeft) legLeft.rotation.x = 0;
        if (legRight) legRight.rotation.x = 0;
      } else if (animationMode === 'walk') {
        // Standard walk cycle swing
        const angle = Math.sin(t) * 0.45;
        if (armLeft) armLeft.rotation.x = angle;
        if (armRight) armRight.rotation.x = -angle;
        if (legLeft) legLeft.rotation.x = -angle;
        if (legRight) legRight.rotation.x = angle;
        if (head) head.position.y = 1.25 + Math.abs(Math.sin(t * 2)) * 0.02;
      } else if (animationMode === 'run') {
        // High frequency body bend & arms fold
        const runT = elapsed * 11;
        const angle = Math.sin(runT) * 0.72;
        if (armLeft) {
          armLeft.rotation.x = angle;
          armLeft.rotation.z = -0.2;
        }
        if (armRight) {
          armRight.rotation.x = -angle;
          armRight.rotation.z = 0.2;
        }
        if (legLeft) legLeft.rotation.x = -angle * 0.9;
        if (legRight) legRight.rotation.x = angle * 0.9;
        if (head) head.position.y = 1.25 + Math.abs(Math.sin(runT * 2)) * 0.045;
      }

      renderer.render(scene, camera);
      animFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrame);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (renderer && renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [skinTone, eyeColor, hairStyle, hairColor, outfitIdx, activeAura, widthScale, heightScale, muscleScale, animationMode]);

  const handleFinishCreator = () => {
    setIsSpawned(true);
    // Auto add character to EtherPrism simulation
    const savedChar = {
      name,
      gender,
      aura: activeAura,
      hair: hairStyle,
      outfit: OUTFITS[outfitIdx].name,
      created_at: new Date().toLocaleString()
    };
    localStorage.setItem('troxt_latest_character', JSON.stringify(savedChar));
    
    // Auto append to mock players DB table if seeded!
    try {
      const existing = localStorage.getItem('etherprism_table_players');
      if (existing) {
        const rows = JSON.parse(existing);
        rows.push({
          id: rows.length + 1,
          name: name,
          gender: gender === 'M' ? 'Masculin' : 'Féminin',
          job: 'Civil',
          cash: 5000,
          bank: 10000,
          aura: activeAura.toUpperCase(),
          status: 'Actif'
        });
        localStorage.setItem('etherprism_table_players', JSON.stringify(rows));
      }
    } catch(e) {}
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans flex flex-col pt-20 pb-10 px-6 overflow-y-auto bg-slate-950">
      
      {/* HEADER BANNER */}
      <div className="max-w-6xl mx-auto w-full mb-8 text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <span className="text-violet-400 font-mono text-xs font-black tracking-widest uppercase block mb-1">
            // LABORATOIRE D'AVATARS SYNTHÉTIQUES
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center md:justify-start gap-2">
            Character Creator 3D
            <Sparkles className="w-5 h-5 text-violet-400" />
          </h1>
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={handleRandomize}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-violet-500/30 text-slate-300 font-bold font-mono text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition"
          >
            <Shuffle className="w-4 h-4" />
            ALÉATOIRE
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT FORM PANEL (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/35 border border-slate-900/80 rounded-2xl p-6 flex flex-col gap-6 backdrop-filter blur-xl">
          
          {/* SEC 1: BASIC DETAILS */}
          <div>
            <h3 className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider mb-3">
              1. Identité Narrative
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono text-slate-500 block mb-1.5 uppercase tracking-wider">Nom du Personnage</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-violet-500/50"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-500 block mb-1.5 uppercase tracking-wider">Genre Sexuel</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGender('M')}
                    className={`py-2.5 rounded-xl text-xs font-bold font-mono transition cursor-pointer ${
                      gender === 'M' ? 'bg-violet-600 border border-violet-400 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    MASCULIN
                  </button>
                  <button
                    onClick={() => setGender('F')}
                    className={`py-2.5 rounded-xl text-xs font-bold font-mono transition cursor-pointer ${
                      gender === 'F' ? 'bg-violet-600 border border-violet-400 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    FÉMININ
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SEC 2: SWATCHES (SKIN, HAIR, EYES) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-900/80 pt-6">
            {/* Skin */}
            <div>
              <label className="text-[11px] font-mono text-slate-500 block mb-2 uppercase tracking-wider">Teint de peau</label>
              <div className="flex flex-wrap gap-1.5">
                {SKIN_TONES.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSkinTone(color)}
                    className="w-6 h-6 rounded-full border border-slate-950 cursor-pointer transition transform hover:scale-115"
                    style={{ backgroundColor: color, boxShadow: skinTone === color ? '0 0 0 2px #a78bfa' : 'none' }}
                  />
                ))}
              </div>
            </div>

            {/* Eyes */}
            <div>
              <label className="text-[11px] font-mono text-slate-500 block mb-2 uppercase tracking-wider">Lentilles (Yeux)</label>
              <div className="flex flex-wrap gap-1.5">
                {EYE_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEyeColor(color)}
                    className="w-6 h-6 rounded-full border border-slate-950 cursor-pointer transition transform hover:scale-115"
                    style={{ backgroundColor: color, boxShadow: eyeColor === color ? '0 0 0 2px #a78bfa' : 'none' }}
                  />
                ))}
              </div>
            </div>

            {/* Hair Color */}
            <div>
              <label className="text-[11px] font-mono text-slate-500 block mb-2 uppercase tracking-wider">Couleur Cheveux</label>
              <div className="flex flex-wrap gap-1.5">
                {HAIR_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setHairColor(color)}
                    className="w-6 h-6 rounded-full border border-slate-950 cursor-pointer transition transform hover:scale-115"
                    style={{ backgroundColor: color, boxShadow: hairColor === color ? '0 0 0 2px #a78bfa' : 'none' }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* SEC 3: HAIR & OUTFITS SELECT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-900/80 pt-6">
            <div>
              <label className="text-[11px] font-mono text-slate-500 block mb-2 uppercase tracking-wider">Coupe de Cheveux</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-violet-500/50 font-semibold"
                value={hairStyle}
                onChange={(e) => setHairStyle(e.target.value)}
              >
                {HAIR_STYLES.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-500 block mb-2 uppercase tracking-wider">Garde-Robe (Outfits)</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-violet-500/50 font-semibold"
                value={outfitIdx}
                onChange={(e) => setOutfitIdx(Number(e.target.value))}
              >
                {OUTFITS.map((o, idx) => (
                  <option key={o.id} value={idx}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SEC 4: SLIDERS */}
          <div className="border-t border-slate-900/80 pt-6">
            <h3 className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider mb-4">
              2. Sliders de Modélisation Morphique
            </h3>
            <div className="flex flex-col gap-4 font-mono text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 w-28">Largeur Épaules</span>
                <input
                  type="range"
                  min="0.7"
                  max="1.4"
                  step="0.05"
                  className="flex-grow accent-violet-500"
                  value={widthScale}
                  onChange={(e) => setWidthScale(parseFloat(e.target.value))}
                />
                <span className="text-violet-400 font-bold w-12 text-right">x{widthScale.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 w-28">Taille Globale</span>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  className="flex-grow accent-violet-500"
                  value={heightScale}
                  onChange={(e) => setHeightScale(parseFloat(e.target.value))}
                />
                <span className="text-violet-400 font-bold w-12 text-right">x{heightScale.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 w-28">Masse Musculaire</span>
                <input
                  type="range"
                  min="0.7"
                  max="1.4"
                  step="0.05"
                  className="flex-grow accent-violet-500"
                  value={muscleScale}
                  onChange={(e) => setMuscleScale(parseFloat(e.target.value))}
                />
                <span className="text-violet-400 font-bold w-12 text-right">x{muscleScale.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* SEC 5: AURAS */}
          <div className="border-t border-slate-900/80 pt-6">
            <h3 className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider mb-3">
              3. Aura d'Émanation Cosmique (12 Presets)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {AURAS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActiveAura(a.id)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-left transition transform hover:scale-102 cursor-pointer flex flex-col ${
                    activeAura === a.id
                      ? 'bg-violet-600/10 border-violet-500 text-violet-200'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <span>{a.name}</span>
                  <span className="text-[9px] font-normal text-slate-500 mt-0.5 line-clamp-1">{a.desc}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT PREVIEW CANVAS PANEL (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6 sticky top-24">
          
          <div className="relative bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden aspect-square w-full flex items-center justify-center bg-radial-gradient">
            <div className="absolute top-4 left-4 font-mono text-[9px] text-slate-500 uppercase z-10">
              ● APERÇU PROCEDURAL 3D
            </div>
            
            <div ref={containerRef} className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing" />

            {/* Animation state triggers */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 border border-slate-800/80 rounded-xl px-4 py-2 flex items-center justify-between z-10">
              <span className="text-[10px] font-mono text-slate-500">CYCLE DE MARCHE:</span>
              <div className="flex gap-1.5">
                {(['idle', 'walk', 'run'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAnimationMode(mode)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold transition cursor-pointer ${
                      animationMode === mode
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <button
            onClick={handleFinishCreator}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-sm py-4 rounded-xl flex items-center justify-center gap-2 shadow-2xl shadow-violet-600/30 hover:shadow-violet-600/50 cursor-pointer transition transform active:scale-98"
          >
            <CheckCircle className="w-5 h-5" />
            CRÉER ET APPARAÎTRE EN VILLE
          </button>

          <p className="text-[10px] text-slate-500 text-center font-mono">
            * Votre avatar sera stocké localement et ajouté à la base de données EtherPrism.
          </p>

        </div>

      </div>

      {/* POPUP CONFIRMATION */}
      {isSpawned && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-filter blur-md animate-fade-in">
          <div className="bg-slate-900 border border-violet-500/30 rounded-2xl p-8 max-w-sm text-center shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-violet-600/10 border border-violet-500/30 flex items-center justify-center text-3xl mb-4 animate-bounce">
              👁️‍🗨️
            </div>
            <h2 className="text-xl font-black text-white mb-2">Citoyen {name} Modélisé !</h2>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              L'avatar de genre <b>{gender === 'M' ? 'Masculin' : 'Féminin'}</b> équipé de l'Aura <b>{activeAura.toUpperCase()}</b> a été injecté dans l'écosystème EtherWorld.
            </p>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => {
                  setIsSpawned(false);
                  onNavigate('sandbox');
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs cursor-pointer transition flex items-center justify-center gap-2"
              >
                Accéder au mode GMod Town Sandbox
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => {
                  setIsSpawned(false);
                  onNavigate('etherprism');
                }}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold py-3 rounded-xl text-xs cursor-pointer transition"
              >
                Vérifier la base de données (EtherPrism)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
