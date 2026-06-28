// ═══════════════════════════════════════════════════════════════════════════════════
//  FURNITURE RENDERER — Affiche tous les meubles du catalogue EtherPrism
//  Lit le catalogue, charge les modèles, gère les interactions
// ═══════════════════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';

// ── TYPE POUR LE CATALOGUE ──
interface FurnitureItem {
  id: string;
  name: string;
  type: string;
  category: string;
  model: string;
  scale: number[];
  mass: number;
  interactive?: boolean;
  sittable?: boolean;
  sleepable?: boolean;
  lockable?: boolean;
  storage?: any;
  material?: string;
  style?: string;
  price: number;
  mountable?: string;
  foldable?: boolean;
  nested?: boolean;
  adjustable?: boolean;
  electric?: boolean;
  cookable?: boolean;
  playable?: boolean;
  hasWater?: boolean;
  reclinable?: boolean;
  rollable?: boolean;
  hasLighting?: boolean;
}

// ── PROPS DU RENDU ──
interface FurnitureRendererProps {
  modelId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: [number, number, number];
  metadata?: Record<string, any>;
  catalog?: Record<string, FurnitureItem>;
}

// ═══════════════════════════════════════════════════════════════════════════════════
//  FURNITURE RENDERER
// ═══════════════════════════════════════════════════════════════════════════════════

export const FurnitureRenderer: React.FC<FurnitureRendererProps> = ({
  modelId,
  position,
  rotation,
  scale = [1, 1, 1],
  metadata,
  catalog = {}
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  
  // ── RECHERCHE DANS LE CATALOGUE ──
  const itemData: FurnitureItem | undefined = useMemo(() => {
    // Cherche dans tous les catalogues
    for (const [key, items] of Object.entries(catalog)) {
      if (Array.isArray(items)) {
        const found = items.find((i: any) => i.id === modelId);
        if (found) return found;
      }
    }
    return undefined;
  }, [modelId, catalog]);
  
  // ── SI MODÈLE 3D ──
  const isModel = modelId.startsWith('models/');
  
  if (isModel) {
    return (
      <FurnitureModel
        modelPath={modelId}
        position={position}
        rotation={rotation}
        scale={scale as [number, number, number]}
        itemData={itemData}
        isHovered={isHovered}
        setIsHovered={setIsHovered}
      />
    );
  }
  
  // ── RENDU PRIMITIF PAR CATÉGORIE ──
  return (
    <FurniturePrimitive
      modelId={modelId}
      position={position}
      rotation={rotation}
      scale={scale as [number, number, number]}
      itemData={itemData}
      isHovered={isHovered}
      isSelected={isSelected}
      setIsHovered={setIsHovered}
      setIsSelected={setIsSelected}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════
//  FURNITURE MODEL — Chargement d'un modèle 3D
// ═══════════════════════════════════════════════════════════════════════════════════

const FurnitureModel: React.FC<{
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  itemData?: FurnitureItem;
  isHovered: boolean;
  setIsHovered: (v: boolean)// ═══════════════════════════════════════════════════════════════════════════════════
//  FURNITURE MODEL — Chargement d'un modèle 3D
// ═══════════════════════════════════════════════════════════════════════════════════

const FurnitureModel: React.FC<{
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  itemData?: FurnitureItem;
  isHovered: boolean;
  setIsHovered: (v: boolean) => void;
}> = ({ modelPath, position, rotation, scale, itemData, isHovered, setIsHovered }) => {
  
  // Chargement du modèle GLB
  const gltf = useLoader(GLTFLoader, modelPath);
  
  // Clone pour permettre les instances multiples
  const scene = useMemo(() => gltf.scene.clone(), [gltf]);
  
  return (
    <primitive
      object={scene}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      {/* Highlight au survol */}
      {isHovered && (
        <mesh position={[0, (itemData?.scale?.[1] || 1) / 2, 0]}>
          <boxGeometry args={[(itemData?.scale?.[0] || 1) * 1.1, (itemData?.scale?.[1] || 1) * 1.1, (itemData?.scale?.[2] || 1) * 1.1]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.15} wireframe />
        </mesh>
      )}
    </primitive>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════
//  FURNITURE PRIMITIVE — Rendu par formes géométriques
// ═══════════════════════════════════════════════════════════════════════════════════

const FurniturePrimitive: React.FC<{
  modelId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  itemData?: FurnitureItem;
  isHovered: boolean;
  isSelected: boolean;
  setIsHovered: (v: boolean) => void;
  setIsSelected: (v: boolean) => void;
}> = ({ modelId, position, rotation, scale, itemData, isHovered, isSelected, setIsHovered, setIsSelected }) => {
  
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Détermine la forme et la couleur selon la catégorie
  const { geometry, color, size } = useMemo(() => {
    const category = itemData?.category || 'default';
    const cat = category.toLowerCase();
    
    let geom: THREE.BufferGeometry;
    let col: string = '#8B7355';
    let sz: number[] = [1, 1, 1];
    
    // ── CANAPÉS ──
    if (cat.includes('sofa') || cat.includes('couch')) {
      geom = new THREE.BoxGeometry(2.2, 0.6, 0.9);
      col = '#4a6fa5';
      sz = [2.2, 0.6, 0.9];
    }
    // ── CHAISES ──
    else if (cat.includes('chair') || cat.includes('stool') || cat.includes('seat')) {
      geom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      col = '#8B4513';
      sz = [0.5, 0.5, 0.5];
    }
    // ── LITS ──
    else if (cat.includes('bed')) {
      geom = new THREE.BoxGeometry(1.8, 0.4, 2.1);
      col = '#f5f5dc';
      sz = [1.8, 0.4, 2.1];
    }
    // ── TABLES ──
    else if (cat.includes('table') || cat.includes('desk')) {
      geom = new THREE.BoxGeometry(1.2, 0.1, 0.8);
      col = '#A0522D';
      sz = [1.2, 0.1, 0.8];
    }
    // ── RANGEMENT ──
    else if (cat.includes('storage') || cat.includes('dresser') || cat.includes('wardrobe') || cat.includes('cabinet') || cat.includes('chest')) {
      geom = new THREE.BoxGeometry(0.8, 1.8, 0.5);
      col = '#8B7355';
      sz = [0.8, 1.8, 0.5];
    }
    // ── DÉCORATION ──
    else {
      geom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      col = '#cccccc';
      sz = [0.5, 0.5, 0.5];
    }
    
    return { geometry: geom, color: col, size: sz };
  }, [itemData]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={position}
      rotation={rotation as [number, number, number]}
      scale={scale}
      castShadow
      receiveShadow
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onClick={() => setIsSelected(!isSelected)}
    >
      <meshStandardMaterial 
        color={isHovered ? '#00ff88' : color} 
        roughness={0.7} 
        metalness={0.1}
        transparent={isHovered}
        opacity={isHovered ? 0.85 : 1}
      />
      
      {/* Nom de l'objet au survol */}
      {isHovered && itemData && (
        <Html distanceFactor={2} center>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color: '#00ff88',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            border: '1px solid #00ff88'
          }}>
            {itemData.name} — ${itemData.price}
          </div>
        </Html>
      )}
    </mesh>
  );
};