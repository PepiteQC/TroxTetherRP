import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { 
  Sparkles, RefreshCw, Download, Shuffle, CheckCircle, ArrowRight, 
  MessageSquare, Save, Database, Send, History, Trash2, Loader2, Info, FileJson, User, Upload
} from 'lucide-react';

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

  // Biography story (RP)
  const [story, setStory] = useState('Un citoyen anonyme nouvellement arrivé dans le dôme cognitif.');

  // Halo Toggle
  const [showHalo, setShowHalo] = useState<boolean>(true);
  const [renderTick, setRenderTick] = useState<number>(0);

  // AI Conversational Creator States
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiTrace, setAiTrace] = useState<string[]>([]);

  // Server Characters DB
  const [savedCharacters, setSavedCharacters] = useState<any[]>([]);
  const [isLoadingSaves, setIsLoadingSaves] = useState(false);

  // Animation Action Cycle
  const [animationMode, setAnimationMode] = useState<'idle' | 'walk' | 'run'>('idle');

  // Popup spawn
  const [isSpawned, setIsSpawned] = useState(false);

  // Fetch saved characters from server
  const fetchSavedCharacters = async () => {
    setIsLoadingSaves(true);
    try {
      const res = await fetch('/api/get-characters');
      const data = await res.json();
      if (data.success) {
        setSavedCharacters(data.characters || []);
      }
    } catch (e) {
      console.error("Error fetching saved characters from server:", e);
    } finally {
      setIsLoadingSaves(false);
    }
  };

  // Load latest character state on mount if saved
  useEffect(() => {
    try {
      const stored = localStorage.getItem('troxt_latest_character');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) setName(parsed.name);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.aura) setActiveAura(parsed.aura.toLowerCase());
        if (parsed.hair) setHairStyle(parsed.hair);
        if (parsed.skinTone) setSkinTone(parsed.skinTone);
        if (parsed.eyeColor) setEyeColor(parsed.eyeColor);
        if (parsed.hairColor) setHairColor(parsed.hairColor);
        if (parsed.widthScale) setWidthScale(parsed.widthScale);
        if (parsed.heightScale) setHeightScale(parsed.heightScale);
        if (parsed.muscleScale) setMuscleScale(parsed.muscleScale);
        if (parsed.story) setStory(parsed.story);
        if (parsed.outfit) {
          const idx = OUTFITS.findIndex(o => 
            o.name.toLowerCase() === parsed.outfit.toLowerCase() || 
            o.id.toLowerCase() === parsed.outfit.toLowerCase()
          );
          if (idx !== -1) setOutfitIdx(idx);
        }
      }
    } catch (e) {
      console.error("Error loading cached character:", e);
    }
    // Also fetch saves from server
    fetchSavedCharacters();
  }, []);

  // Save character config to server database
  const handleSaveToServer = async () => {
    const charConfig = {
      name,
      gender: gender === 'M' ? 'Masculin' : 'Féminin',
      skinTone,
      eyeColor,
      hairStyle,
      hairColor,
      outfitIdx,
      aura: activeAura,
      widthScale,
      heightScale,
      muscleScale,
      story,
      job: 'Civil',
      cash: 5000,
      bank: 10000,
      status: 'Actif'
    };

    try {
      const res = await fetch('/api/save-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character: charConfig })
      });
      const data = await res.json();
      if (data.success) {
        // Trigger visual effect/alert
        fetchSavedCharacters();
        // Save to local storage for persistent reload
        localStorage.setItem('troxt_latest_character', JSON.stringify({
          ...charConfig,
          outfit: OUTFITS[outfitIdx].name
        }));
        alert(`Fiche personnage de ${name} sauvegardée avec succès sur le serveur d'archives !`);
      } else {
        alert("Erreur de sauvegarde: " + data.error);
      }
    } catch (e) {
      console.error("Error saving character:", e);
      alert("Échec de la connexion au serveur d'archives.");
    }
  };

  // Export as JSON
  const handleExportJSON = () => {
    const charData = {
      name,
      gender,
      skinTone,
      eyeColor,
      hairStyle,
      hairColor,
      outfitIdx,
      activeAura,
      widthScale,
      heightScale,
      muscleScale,
      story,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(charData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/\s+/g, '_')}_ficha.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export 3D as GLB with fallback
  const handleExportGLB = () => {
    if (!characterRef.current) {
      alert("Erreur: Le modèle 3D n'est pas encore initialisé.");
      return;
    }
    try {
      const exporter = new GLTFExporter();
      exporter.parse(
        characterRef.current,
        (gltf) => {
          const isBinary = gltf instanceof ArrayBuffer;
          const output = isBinary ? gltf : JSON.stringify(gltf, null, 2);
          const blob = new Blob([output], { type: isBinary ? 'application/octet-stream' : 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${name.replace(/\s+/g, '_')}_avatar.${isBinary ? 'glb' : 'gltf'}`;
          link.click();
          URL.revokeObjectURL(url);
        },
        (error) => {
          console.error("Error compiling GLB export:", error);
          alert("Une erreur s'est produite pendant l'exportation GLB. Téléchargement de la fiche JSON de secours...");
          handleExportJSON();
        },
        { binary: true }
      );
    } catch (e) {
      console.error("GLTFExporter parsing error, falling back to JSON:", e);
      handleExportJSON();
    }
  };

  // Import JSON Design Configuration
  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const charData = JSON.parse(evt.target?.result as string);
          importedGlbRef.current = null;
          if (charData.name) setName(charData.name);
          if (charData.gender) setGender(charData.gender);
          if (charData.skinTone) setSkinTone(charData.skinTone);
          if (charData.eyeColor) setEyeColor(charData.eyeColor);
          if (charData.hairStyle) setHairStyle(charData.hairStyle);
          if (charData.hairColor) setHairColor(charData.hairColor);
          if (charData.outfitIdx !== undefined) setOutfitIdx(charData.outfitIdx);
          if (charData.activeAura) setActiveAura(charData.activeAura);
          if (charData.widthScale !== undefined) setWidthScale(charData.widthScale);
          if (charData.heightScale !== undefined) setHeightScale(charData.heightScale);
          if (charData.muscleScale !== undefined) setMuscleScale(charData.muscleScale);
          if (charData.story) setStory(charData.story);
          
          alert("Fiche personnage JSON importée avec succès !");
        } catch (err) {
          console.error("Failed to parse JSON file:", err);
          alert("Erreur lors de l'importation JSON : Le fichier est invalide.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Import 3D GLB/GLTF Model
  const handleImportGLB = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.gltf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const loader = new GLTFLoader();
        loader.parse(
          arrayBuffer,
          '',
          (gltf) => {
            if (characterRef.current) {
              // Clear previous children
              while (characterRef.current.children.length > 0) {
                const child = characterRef.current.children[0];
                characterRef.current.remove(child);
              }

              // Set the loaded scene as a child of our character container
              const importedScene = gltf.scene;
              
              // Scale and center the imported scene dynamically to fit character height
              const box = new THREE.Box3().setFromObject(importedScene);
              const size = new THREE.Vector3();
              box.getSize(size);
              const maxDim = Math.max(size.x, size.y, size.z);
              
              if (maxDim > 0) {
                const desiredHeight = 1.8;
                const scaleFactor = desiredHeight / maxDim;
                importedScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
              }

              const center = new THREE.Vector3();
              box.getCenter(center);
              importedScene.position.y = -center.y * importedScene.scale.y + 0.9;
              
              importedGlbRef.current = importedScene;
              setRenderTick(prev => prev + 1);
              alert("Modèle 3D GLB/GLTF importé avec succès dans le visualisateur !");
            } else {
              alert("Erreur: Le container de personnage n'est pas prêt.");
            }
          },
          (error) => {
            console.error("Error parsing imported GLB:", error);
            alert("Erreur lors du décodage du fichier GLB/GLTF.");
          }
        );
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

  // Conversational generation
  const handleModelCharacterAI = async (promptText = aiPrompt) => {
    if (!promptText.trim()) return;
    setIsAiGenerating(true);
    setAiTrace(["🔍 [ETHER-PRISM] Analyse sémantique de votre description narrative..."]);

    try {
      const response = await fetch('/api/model-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText.trim() }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Une erreur s'est produite lors de l'appel API.");
      }

      const steps = [
        "🧬 [ETHER-PRISM] Décodage biométrique et création de l'identité digitale...",
        "🔬 [ETHER-PRISM] Morphologie calculée : Largeur=" + (data.character.widthScale || 1.0).toFixed(2) + ", Hauteur=" + (data.character.heightScale || 1.0).toFixed(2) + ", Muscles=" + (data.character.muscleScale || 1.0).toFixed(2),
        "🎨 [ETHER-PRISM] Palette chromatique : Peau=" + data.character.skinTone + ", Yeux=" + data.character.eyeColor + ", Cheveux=" + data.character.hairColor,
        "🎭 [ETHER-PRISM] Assemblage de la coupe (" + data.character.hairStyle + ") et de la tenue index (" + data.character.outfitIdx + ")",
        "🔮 [ETHER-WEAVE] Alignement cosmique sur l'émanation " + data.character.aura.toUpperCase(),
        "💾 [ETHER-MEMORY] Écriture de la fiche narrative dans le registre du Dôme."
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i < steps.length) {
          setAiTrace(prev => [...prev, steps[i]]);
          i++;
        } else {
          clearInterval(interval);
          importedGlbRef.current = null;
          
          // Apply state variables
          setName(data.character.name);
          setGender(data.character.gender === 'Féminin' ? 'F' : 'M');
          setSkinTone(data.character.skinTone || SKIN_TONES[0]);
          setEyeColor(data.character.eyeColor || EYE_COLORS[0]);
          setHairStyle(data.character.hairStyle || 'short');
          setHairColor(data.character.hairColor || HAIR_COLORS[2]);
          setOutfitIdx(typeof data.character.outfitIdx === 'number' ? data.character.outfitIdx : 0);
          setActiveAura(data.character.aura?.toLowerCase() || 'divine');
          setWidthScale(typeof data.character.widthScale === 'number' ? data.character.widthScale : 1.0);
          setHeightScale(typeof data.character.heightScale === 'number' ? data.character.heightScale : 1.0);
          setMuscleScale(typeof data.character.muscleScale === 'number' ? data.character.muscleScale : 1.0);
          setStory(data.character.story || 'Un citoyen mystérieux modelé par le dôme cognitif.');

          setIsAiGenerating(false);
          setAiPrompt('');
        }
      }, 500);

    } catch (err: any) {
      console.error(err);
      setAiTrace(prev => [...prev, `❌ [ERREUR] Échec de la synthèse d'agent : ${err.message}`]);
      setIsAiGenerating(false);
    }
  };

  // Quick apply of a saved character
  const handleApplySavedCharacter = (char: any) => {
    if (!char) return;
    importedGlbRef.current = null;
    setName(char.name || 'John Doe');
    setGender(char.gender === 'Féminin' ? 'F' : 'M');
    if (char.skinTone) setSkinTone(char.skinTone);
    if (char.eyeColor) setEyeColor(char.eyeColor);
    if (char.hairStyle) setHairStyle(char.hairStyle);
    if (char.hairColor) setHairColor(char.hairColor);
    if (typeof char.outfitIdx === 'number') setOutfitIdx(char.outfitIdx);
    if (char.aura) setActiveAura(char.aura.toLowerCase());
    if (typeof char.widthScale === 'number') setWidthScale(char.widthScale);
    if (typeof char.heightScale === 'number') setHeightScale(char.heightScale);
    if (typeof char.muscleScale === 'number') setMuscleScale(char.muscleScale);
    if (char.story) setStory(char.story);
  };

  // References to THREE objects to update live without re-constructing everything
  const characterRef = useRef<THREE.Group | null>(null);
  const auraPointsRef = useRef<THREE.Points | null>(null);
  const auraRingsRef = useRef<THREE.Group | null>(null);
  const importedGlbRef = useRef<THREE.Object3D | null>(null);

  // Randomize values
  const handleRandomize = () => {
    importedGlbRef.current = null;
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
    setStory("Citoyen synthétisé de manière aléatoire par le protocole de triage.");
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

      // If we have an imported GLB model, add it!
      if (importedGlbRef.current) {
        characterGroup.add(importedGlbRef.current);
        
        if (showHalo) {
          // Build golden halo above the GLB head
          const haloGeo = new THREE.TorusGeometry(0.18, 0.015, 8, 32);
          const haloMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffd700,
            emissiveIntensity: 1.0,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.9,
          });
          const haloMesh = new THREE.Mesh(haloGeo, haloMat);
          haloMesh.name = "glorious_halo";
          haloMesh.rotation.x = Math.PI / 2;
          haloMesh.position.set(0, 1.95, 0); // Position above scaled GLB model (1.8m height)

          const glowGeo = new THREE.TorusGeometry(0.18, 0.035, 8, 32);
          const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffe57f,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
          });
          const glowMesh = new THREE.Mesh(glowGeo, glowMat);
          glowMesh.name = "glorious_halo_glow";
          haloMesh.add(glowMesh);

          characterGroup.add(haloMesh);
        }
        return;
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

      // Build golden halo for procedural character if enabled
      if (showHalo) {
        const haloGeo = new THREE.TorusGeometry(0.18, 0.015, 8, 32);
        const haloMat = new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffd700,
          emissiveIntensity: 1.0,
          roughness: 0.1,
          metalness: 0.9,
          transparent: true,
          opacity: 0.9,
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        haloMesh.name = "glorious_halo";
        haloMesh.rotation.x = Math.PI / 2;
        // Position above the head of the procedural character (head.position.y is 1.25)
        haloMesh.position.set(0, 1.25 + 0.38 / 2 + 0.22, 0);

        const glowGeo = new THREE.TorusGeometry(0.18, 0.035, 8, 32);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0xffe57f,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.name = "glorious_halo_glow";
        haloMesh.add(glowMesh);

        characterGroup.add(haloMesh);
      }

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

      // Rotate/float the glorious golden halo
      const currentHalo = characterGroup.getObjectByName("glorious_halo");
      if (currentHalo) {
        currentHalo.rotation.z = elapsed * 1.5;
        const baseHeight = importedGlbRef.current ? 1.95 : (1.25 + 0.38 / 2 + 0.22);
        currentHalo.position.y = baseHeight + Math.sin(elapsed * 2.5) * 0.025;
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
  }, [skinTone, eyeColor, hairStyle, hairColor, outfitIdx, activeAura, widthScale, heightScale, muscleScale, animationMode, showHalo, renderTick]);

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
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => onNavigate('sandbox')}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/30 text-slate-300 font-bold font-mono text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition transform hover:scale-102"
          >
            ← RETOUR SANDBOX
          </button>
          <button
            onClick={handleRandomize}
            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-violet-500/30 text-slate-300 font-bold font-mono text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition transform hover:scale-102"
          >
            <Shuffle className="w-4 h-4" />
            ALÉATOIRE
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUMN 1: AI ASSISTANT & DATABASE SAVES (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* AI Conversational Assistant */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <MessageSquare className="w-5 h-5 text-violet-400" />
              <div>
                <h3 className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider">
                  Synthèse IA d'Agent
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">Modélisation narrative EtherPrism</p>
              </div>
            </div>

            {/* Prompt input */}
            <div className="flex flex-col gap-2">
              <textarea
                placeholder="Ex: Une rebelle cyborg très musclée avec de longs cheveux rouges, une combinaison tactique et une aura de feu (warlord)..."
                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-violet-500/50 resize-none placeholder-slate-600 font-mono"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={isAiGenerating}
              />
              <button
                onClick={() => handleModelCharacterAI()}
                disabled={isAiGenerating || !aiPrompt.trim()}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-900 disabled:text-slate-600 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition disabled:cursor-not-allowed"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                    SYNTHÈSE EN COURS...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    SYNTHÉTISER AVATAR IA
                  </>
                )}
              </button>
            </div>

            {/* Suggestions bubbles */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Idées de prompts:</span>
              <div className="flex flex-col gap-1.5">
                {[
                  "Gendarme gilet tactique et court militaire",
                  "Hacker cyberpunk aux dreads bleu ciel",
                  "Prêtre mystique aux yeux blancs et aura sacrée",
                  "Assassin du cartel baraqué aux yeux rouges"
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAiPrompt(sug);
                    }}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-[10px] text-left font-mono text-slate-400 transition cursor-pointer hover:border-slate-700 w-full truncate"
                  >
                    ✦ {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Trace logs */}
            {aiTrace.length > 0 && (
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 font-mono text-[9px] text-slate-400 flex flex-col gap-1 max-h-40 overflow-y-auto">
                <span className="text-violet-400 font-black">// TRACE D'EXÉCUTION DU SYSTÈME:</span>
                {aiTrace.map((tr, index) => (
                  <div key={index} className="leading-relaxed whitespace-pre-wrap">{tr}</div>
                ))}
              </div>
            )}

            {/* RP Story display if any */}
            {story && (
              <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-3 flex flex-col gap-1.5">
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" /> BIOGRAPHIE ET HISTOIRE RP :
                </span>
                <p className="text-xs text-slate-300 italic leading-relaxed font-sans select-all">
                  "{story}"
                </p>
              </div>
            )}
          </div>

          {/* Saved Characters server Database */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                    Archives du Serveur
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">Fiches stockées en DB</p>
                </div>
              </div>
              <button
                onClick={fetchSavedCharacters}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                title="Rafraîchir"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSaves ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoadingSaves ? (
              <div className="flex flex-col items-center py-6 text-slate-500 font-mono text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                Chargement de la base de données...
              </div>
            ) : savedCharacters.length === 0 ? (
              <div className="text-center py-6 text-slate-600 font-mono text-[11px] leading-relaxed">
                Aucun citoyen archivé sur le serveur.<br />Sauvegardez votre configuration actuelle !
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {savedCharacters.map((char, index) => {
                  const auraObj = AURAS.find(a => a.id === char.aura?.toLowerCase()) || AURAS[0];
                  return (
                    <div
                      key={index}
                      onClick={() => handleApplySavedCharacter(char)}
                      className="bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-indigo-500/30 rounded-xl p-3 flex flex-col gap-1 transition cursor-pointer group text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition truncate w-40">
                          {char.name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500">
                          {char.gender === 'F' || char.gender === 'Féminin' ? 'F' : 'M'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                        <span style={{ color: auraObj.color }}>●</span>
                        <span className="truncate">{auraObj.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal line-clamp-1 italic font-sans">
                        "{char.story || 'Aucun passif archivé.'}"
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* COLUMN 2: MANUAL SLIDERS PANEL (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/35 border border-slate-900/80 rounded-2xl p-6 flex flex-col gap-6 backdrop-blur-xl">
          
          {/* SEC 1: BASIC DETAILS */}
          <div>
            <h3 className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider mb-3">
              1. Identité Narrative (Manuel)
            </h3>
            <div className="grid grid-cols-1 gap-4">
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
          <div className="grid grid-cols-1 gap-6 border-t border-slate-900/80 pt-6">
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
          <div className="grid grid-cols-1 gap-6 border-t border-slate-900/80 pt-6">
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
                <span className="text-slate-500 w-24">Épaules</span>
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
                <span className="text-slate-500 w-24">Taille</span>
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
                <span className="text-slate-500 w-24">Muscle</span>
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

          {/* ORÉOLE TOGGLE */}
          <div className="border-t border-slate-900/80 pt-6">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between pointer-events-auto">
              <div className="flex flex-col">
                <span className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                  😇 Oréole Divine (Halo)
                </span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">Activer/Désactiver le halo céleste 3D (procedural & GLB)</span>
              </div>
              <button
                onClick={() => setShowHalo(!showHalo)}
                className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                  showHalo ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${
                    showHalo ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* SEC 5: AURAS */}
          <div className="border-t border-slate-900/80 pt-6">
            <h3 className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider mb-3">
              3. Aura d'Émanation Cosmique
            </h3>
            <div className="grid grid-cols-2 gap-2">
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
                  <span className="truncate">{a.name}</span>
                  <span className="text-[9px] font-normal text-slate-500 mt-0.5 line-clamp-1">{a.desc}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* COLUMN 3: RIGHT PREVIEW CANVAS PANEL (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
          
          <div className="relative bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden aspect-square w-full flex items-center justify-center bg-radial-gradient">
            <div className="absolute top-4 left-4 font-mono text-[9px] text-slate-500 uppercase z-10">
              ● APERÇU PROCEDURAL 3D
            </div>

            {/* FLOATING TOP IMPORT CONTROLS */}
            <div className="absolute top-4 right-4 flex gap-1.5 z-10">
              <button
                onClick={handleImportJSON}
                className="bg-slate-900/95 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-[9px] px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition uppercase"
                title="Importer une fiche personnage au format JSON"
              >
                <FileJson className="w-3 h-3 text-indigo-400" />
                Importer JSON
              </button>
              <button
                onClick={handleImportGLB}
                className="bg-slate-900/95 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-[9px] px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition uppercase"
                title="Importer un fichier 3D au format GLB/GLTF"
              >
                <Upload className="w-3 h-3 text-violet-400" />
                Importer GLB
              </button>
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
          <div className="flex flex-col gap-3">
            
            {/* Main Primary Create/Spawn button */}
            <button
              onClick={handleFinishCreator}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-2xl shadow-violet-600/30 hover:shadow-violet-600/50 cursor-pointer transition transform active:scale-98"
            >
              <CheckCircle className="w-4.5 h-4.5" />
              CRÉER ET APPARAÎTRE EN VILLE
            </button>

            {/* Save to Archive Database Server */}
            <button
              onClick={handleSaveToServer}
              className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Save className="w-4 h-4 text-violet-400" />
              SAUVEGARDER SUR LE SERVEUR
            </button>

            {/* Downloader Exports Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportJSON}
                className="bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-300 font-bold text-[10px] py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                title="Exporter la configuration de la fiche au format JSON"
              >
                <FileJson className="w-3.5 h-3.5 text-indigo-400" />
                EXPORTER JSON
              </button>
              <button
                onClick={handleExportGLB}
                className="bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-300 font-bold text-[10px] py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                title="Exporter l'avatar 3D au format GLB pour Blender, Unity, etc."
              >
                <Download className="w-3.5 h-3.5 text-violet-400" />
                EXPORTER GLB
              </button>
            </div>

          </div>

          <p className="text-[10px] text-slate-500 text-center font-mono">
            * Votre avatar sera stocké localement et ajouté à la base de données EtherPrism.
          </p>

        </div>

      </div>

      {/* POPUP CONFIRMATION */}
      {isSpawned && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in">
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
