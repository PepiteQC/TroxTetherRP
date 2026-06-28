export type RecognitionCategory =
  | "shape" | "material" | "color" | "animation"
  | "mood" | "modifier" | "scene" | "count" | "effect";

export interface Recognition {
  token: string;
  label: string;
  category: RecognitionCategory;
  hex?: string;
}

export type GeometryType =
  | "sphere" | "box" | "torus" | "torusKnot" | "cone"
  | "cylinder" | "octahedron" | "icosahedron" | "dodecahedron"
  | "tetrahedron" | "capsule" | "circle" | "plane" | "ring" | "lathe";

export interface GeometryDef {
  type: GeometryType;
  args: number[];
}

export interface MaterialDef {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  metalness: number;
  roughness: number;
  wireframe: boolean;
  transparent: boolean;
  opacity: number;
  transmission?: number;
  iridescence?: number;
  thickness?: number;
  textureKey?: string; // for procedural textures
}

export type AnimateType = "none" | "spin" | "float" | "orbit" | "pulse" | "wave" | "breathe";
export type SceneType = "single" | "cluster" | "orbital" | "ring" | "helix" | "grid" | "galaxy" | "vortex";
export type QualityLevel = "fast" | "balanced" | "high";

export interface ObjectDef {
  geometry: GeometryDef;
  material: MaterialDef;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  scaleXYZ?: [number, number, number];
  animate: AnimateType;
  animSpeed: number;
}

export interface ParticleDef {
  count: number;
  color: string;
  size: number;
  spread: number;
  mode: "ambient" | "galaxy" | "vortex" | "rain";
}

export interface SceneConfig {
  sceneType: SceneType;
  objects: ObjectDef[];
  particles: ParticleDef | null;
  fogColor: string | null;
  ambientColor: string;
  lightColor: string;
  lightColor2: string;
  background: string;
  recognitions: Recognition[];
  isBlueprint?: boolean;
  blueprintLabel?: string;
}

// ── Pipeline Types ──
export interface ProcessedItem {
  id: string;
  filename: string;
  type: string;
  polygons: number;
  timestamp: string;
  status: "queued" | "processing" | "ready" | "error";
}

export interface PipelineConfig {
  autoProcess: boolean;
  autoExport: boolean;
  autoBackup: boolean;
  quality: "draft" | "standard" | "hd";
  namingPattern: string;
}

// ── Character Customization Types ──
export interface CharacterState {
  gender: "male" | "female";
  name: string;
  nationality: string;
  skin: number;
  faceShape: number;
  eyeColor: number;
  noseBridge: number;
  noseSize: number;
  faceWidth: number;
  cheekH: number;
  jawWidth: number;
  eyeSize: number;
  eyeSpacing: number;
  lipSize: number;
  hairStyle: number;
  hairColor: number;
  facialHair: number;
  bodyType: number;
  height: number;
  muscular: number;
  fatness: number;
  topStyle: number;
  topColor: number;
  pantsStyle: number;
  pantsColor: number;
  shoesStyle: number;
  shoesColor: number;
  glassesStyle: number;
  hatStyle: number;
  jewelryStyle: number;
  glassesColor: number;
  hatColor: number;
  activeAura: string | null;
}

// ── Sandbox Game State Types ──
export interface PlayerState {
  cash: number;
  inventory: {
    seed: number;
    weed: number;
    [key: string]: number;
  };
  plants: {
    id: string;
    position: [number, number, number];
    stage: 'seed' | 'sprout' | 'medium' | 'mature';
    water: number;
    growth: number;
  }[];
  houses: {
    'villa_nova': boolean;
    'loft_industriel': boolean;
    [key: string]: boolean;
  };
  activeMount: 'hoverboard' | 'broom' | null;
  mountPos: [number, number, number] | null;
}

