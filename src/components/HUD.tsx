import React, { useEffect, useRef, useState } from 'react';
import { PlayerState, CatalogItem } from '../types';
import { Armchair, Shield, Heart, Zap, Crosshair, HelpCircle, Eye, Info, Sparkles, Sliders, Leaf, Coins, Terminal, ChevronDown, ChevronUp, Play, Trash2, Send, Compass, Lock, ShieldAlert, Key, X, Search, Filter, Weight } from 'lucide-react';
import { GMOD_CATALOG, addCustomCatalogItem } from '../game/GModBuilder';
import { ProductPopup } from './ProductPopup';
import { useSmartHouse, AccessCard, AlarmEvent, DoorLock } from '../store/useSmartHouse';

interface HUDProps {
  playerState: PlayerState;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  highlightedItemName: string | null;
  nearDoor: any;
  onToggleDoorLock: () => void;
  onRequestPointerLock: () => void;
  onToggleMount: (mount: 'hoverboard' | 'broom') => void;
  onExecuteCombat: (move: 'punch' | 'kick' | 'backflip' | 'sweep' | 'headbutt' | 'grab') => void;
  onPlantWeed: () => void;
  onBuyWeedSeed: () => void;
  onBuySeedPack: () => void;
  onSellBud: () => void;
  onSellAllBuds: () => void;
  onUnlockFurniture: (itemId: string, cost: number) => void;
  onSetGangBeastsMode: (active: boolean) => void;
  onSetJointStiffness: (stiffness: 'stiff' | 'relaxed' | 'floppy') => void;
  onSetSceneTemplate: (template: string) => void;
  onJoinFightQueue: (mode: '1v1' | 'ffa') => void;
  onLeaveFightQueue: () => void;
  onBuyProperty: (houseId: string) => void;
  onRunForgeFactory?: () => void;
  onRunEtherWeave?: () => void;
  onRunThirdEyeCollisionValidation?: () => void;
  onBuyGarment?: (item: any) => void;
  onCloseGarment?: () => void;
  onBuyCantineItem?: (itemId: 'poutine' | 'corn' | 'taffy' | 'beer') => void;
  onCloseCantine?: () => void;
  onCloseMarchand?: () => void;
  onExecuteConsoleCommand?: (command: string) => { success: boolean; message: string };
}

export const HUD: React.FC<HUDProps> = ({
  playerState,
  playerPos,
  playerYaw,
  highlightedItemName,
  nearDoor,
  onToggleDoorLock,
  onRequestPointerLock,
  onToggleMount,
  onExecuteCombat,
  onPlantWeed,
  onBuyWeedSeed,
  onBuySeedPack,
  onSellBud,
  onSellAllBuds,
  onUnlockFurniture,
  onSetGangBeastsMode,
  onSetJointStiffness,
  onSetSceneTemplate,
  onJoinFightQueue,
  onLeaveFightQueue,
  onBuyProperty,
  onRunForgeFactory,
  onRunEtherWeave,
  onRunThirdEyeCollisionValidation,
  onBuyGarment,
  onCloseGarment,
  onBuyCantineItem,
  onCloseCantine,
  onCloseMarchand,
  onExecuteConsoleCommand,
}) => {
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'weed' | 'physics' | 'shop' | 'fight' | 'scene' | 'agents' | 'realestate'>('weed');

  // HUD Panels Visibility States
  const [isConsoleRpShopVisible, setIsConsoleRpShopVisible] = useState<boolean>(false);
  const [isDojoVisible, setIsDojoVisible] = useState<boolean>(false); // default to false to not block view as requested!
  const [isGuideVisible, setIsGuideVisible] = useState<boolean>(false);
  const [isRightPanelExpanded, setIsRightPanelExpanded] = useState<boolean>(false);

  // Admin Console States & Handlers
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState<boolean>(false);
  const [consoleInput, setConsoleInput] = useState<string>('');
  const [consoleLogs, setConsoleOutputLogs] = useState<string[]>(['⚠️ Console d\'administration TroxT initialisée. Tapez /help']);
  const [expandedSection, setExpandedSection] = useState<string | null>('eco');

  // AI Agent Modeling and Smart House States
  const [modelingTab, setModelingTab] = useState<'object' | 'character' | 'smart-house'>('smart-house');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiTrace, setAiTrace] = useState<string[]>([]);
  const [aiObjectResult, setAiObjectResult] = useState<any | null>(null);
  const [aiCharacterResult, setAiCharacterResult] = useState<any | null>(null);
  const [doorNameInput, setDoorNameInput] = useState<string>('');
  const [doorLevelInput, setDoorLevelInput] = useState<'none' | 'resident' | 'vip' | 'admin'>('resident');
  const [doorCodeInput, setDoorCodeInput] = useState<string>('1234');
  const [selectedDoorIdForNumpad, setSelectedDoorIdForNumpad] = useState<string | null>(null);
  const [numpadEnteredCode, setNumpadEnteredCode] = useState<string>('');
  const [cardOwnerInput, setCardOwnerInput] = useState<string>('Alex Mercer');
  const [cardLevelInput, setCardLevelInput] = useState<'none' | 'resident' | 'vip' | 'admin'>('resident');
  const [cardActiveInput, setCardActiveInput] = useState<boolean>(true);

  // Custom Persistent Inventory State (Consumables and Weapons)
  const [localInventory, setLocalInventory] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('troxt_player_custom_inv');
      return raw ? JSON.parse(raw) : { poutine: 0, corn: 0, taffy: 0, beer: 0, ether_potion: 0, tourtiere: 0, pipe: 0, bat: 0, bottle: 0, hammer: 0, sword: 0 };
    } catch {
      return { poutine: 0, corn: 0, taffy: 0, beer: 0, ether_potion: 0, tourtiere: 0, pipe: 0, bat: 0, bottle: 0, hammer: 0, sword: 0 };
    }
  });

  useEffect(() => {
    localStorage.setItem('troxt_player_custom_inv', JSON.stringify(localInventory));
  }, [localInventory]);

  // Shop & Inventory UI State
  const [shopCategoryFilter, setShopCategoryFilter] = useState<'All' | 'Botanique' | 'Consommables' | 'Armes' | 'Meubles'>('All');
  const [shopSearchQuery, setShopSearchQuery] = useState<string>('');
  const [quickSellActive, setQuickSellActive] = useState<boolean>(false);
  const [hoveredItem, setHoveredItem] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Load Smart House Zustand hooks
  const smartHouse = useSmartHouse();

  // Populate default doors if empty
  useEffect(() => {
    if (Object.keys(smartHouse.doors).length === 0) {
      smartHouse.createDoor({
        id: 'front_door',
        name: "Porte d'Entrée Principale",
        status: 'locked',
        requiresCard: true,
        requiredLevel: 'resident',
        numpadCode: '1234',
      });
      smartHouse.createDoor({
        id: 'garage_door',
        name: "Porte de Garage Sécurisée",
        status: 'locked',
        requiresCard: true,
        requiredLevel: 'vip',
        numpadCode: '4321',
      });
      smartHouse.createDoor({
        id: 'safe_room',
        name: "Chambre Forte Administratrice",
        status: 'locked',
        requiresCard: true,
        requiredLevel: 'admin',
        numpadCode: '9999',
      });
    }
  }, [smartHouse]);

  // AI Agent Handlers
  const handleModelObjectAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    setAiObjectResult(null);
    setAiCharacterResult(null);
    setAiTrace(["🔍 [SYSTEM] Analyse sémantique de la demande en cours..."]);

    try {
      const response = await fetch('/api/model-object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Une erreur s'est produite.");
      }

      const steps = [
        "🧬 [FORGE-FACTORY] Réception de la requête et conception structurelle...",
        "📐 [FORGE-FACTORY] Calcul des dimensions optimales : [" + data.item.size.join(', ') + "] mètres",
        "🎨 [FORGE-FACTORY] Attribution du code couleur principal : " + data.item.color,
        "🛡️ [THIRD-EYE] Audit de sécurité physique : RISQUE GREEN (0% friction détectée)",
        "📦 [ETHER-CORE] Enregistrement du prop dans le catalogue du dôme Éther...",
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i < steps.length) {
          setAiTrace(prev => [...prev, steps[i]]);
          i++;
        } else {
          clearInterval(interval);
          addCustomCatalogItem(data.item);
          setAiObjectResult(data.item);
          setIsAiGenerating(false);
          setAiPrompt('');
        }
      }, 800);

    } catch (err: any) {
      console.error(err);
      setAiTrace(prev => [...prev, `❌ [ERREUR] Échec de la modélisation : ${err.message}`]);
      setIsAiGenerating(false);
    }
  };

  const handleModelCharacterAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    setAiObjectResult(null);
    setAiCharacterResult(null);
    setAiTrace(["🔍 [SYSTEM] Analyse de la description du personnage..."]);

    try {
      const response = await fetch('/api/model-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Une erreur s'est produite.");
      }

      const steps = [
        "👤 [ETHER-PRISM] Initialisation de la fiche d'identité biométrique...",
        "🔬 [ETHER-PRISM] Sliders physiques : Peau=" + data.character.skinTone + ", Yeux=" + data.character.eyeColor,
        "🎭 [ETHER-PRISM] Coiffure sélectionnée : " + data.character.hairStyle + " (" + data.character.hairColor + ")",
        "🔮 [ETHER-WEAVE] Alignement de l'aura de puissance : " + data.character.aura.toUpperCase(),
        "💾 [ETHER-MEMORY] Écriture de la biographie RP et insertion en base de données...",
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i < steps.length) {
          setAiTrace(prev => [...prev, steps[i]]);
          i++;
        } else {
          clearInterval(interval);
          
          // Append to players table if possible
          try {
            const existing = localStorage.getItem('etherprism_table_players');
            const rows = existing ? JSON.parse(existing) : [];
            const newCharRow = {
              id: rows.length + 1,
              name: data.character.name,
              gender: data.character.gender,
              job: data.character.job,
              cash: data.character.cash,
              bank: data.character.bank,
              aura: data.character.aura.toUpperCase(),
              status: data.character.status
            };
            rows.push(newCharRow);
            localStorage.setItem('etherprism_table_players', JSON.stringify(rows));
          } catch(e) {}

          setAiCharacterResult(data.character);
          setIsAiGenerating(false);
          setAiPrompt('');
        }
      }, 800);

    } catch (err: any) {
      console.error(err);
      setAiTrace(prev => [...prev, `❌ [ERREUR] Échec de la modélisation : ${err.message}`]);
      setIsAiGenerating(false);
    }
  };

  const handleApplyCharacterAvatar = (char: any) => {
    try {
      const savedChar = {
        name: char.name,
        gender: char.gender === 'Masculin' ? 'M' : 'F',
        aura: char.aura,
        hair: char.hairStyle,
        outfit: char.job,
        created_at: new Date().toLocaleString()
      };
      localStorage.setItem('troxt_latest_character', JSON.stringify(savedChar));
      alert(`Avatar "${char.name}" appliqué avec succès ! Vos sliders de création 3D ont été configurés.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunAdminCommand = (cmdText: string) => {
    if (!onExecuteConsoleCommand) return;
    const res = onExecuteConsoleCommand(cmdText);
    setConsoleOutputLogs(prev => [
      `[${new Date().toLocaleTimeString()}] > ${cmdText}`,
      `  ${res.success ? '💚' : '💔'} ${res.message}`,
      ...prev.slice(0, 20)
    ]);
  };

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consoleInput.trim()) return;
    handleRunAdminCommand(consoleInput.trim());
    setConsoleInput('');
  };

  // Calculate speed in km/h based on sprinting/moving/mounting
  const isActuallyMoving = Math.abs(playerPos.x) > 0.05 || Math.abs(playerPos.z) > 0.05;
  let currentSpeed = 0;
  
  if (isActuallyMoving) {
    if (playerState.activeMount === 'hoverboard') {
      const mult = playerState.hoverboardStats?.speed ?? 2.2;
      currentSpeed = Math.round((playerState.isSprinting ? 68 : 42) * (mult / 2.2));
    } else if (playerState.activeMount === 'broom') {
      const mult = playerState.broomStats?.speed ?? 1.6;
      currentSpeed = Math.round((playerState.isSprinting ? 50 : 30) * (mult / 1.6));
    } else {
      currentSpeed = playerState.isSprinting ? 28 : 12;
    }
  }

  // ─── DRAW THE GTA-STYLE REALTIME RADAR MAP ───────────────────────
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = width / 2;

    // Clear background (ambient terrain green/grey)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // Save context for player-centered rotation/translation
    ctx.save();
    ctx.translate(center, center);
    
    // Scale factor: how many units of 3D world = 1 pixel
    const scale = 1.35; 

    // We draw the map relative to the player's position, but rotated so North is always aligned with the camera heading
    // To make it look like GTA V, the map rotates as the camera yaw changes
    ctx.rotate(-playerYaw);

    // 1. Draw Grass fields
    ctx.fillStyle = '#14532d';
    ctx.fillRect(-150 * scale, -150 * scale, 300 * scale, 300 * scale);

    // 2. Draw Avenue des Alliés (Horizontal Street, Z ~ 0)
    // Z is the horizontal axis in our 2D bird's-eye projection, X is vertical
    ctx.fillStyle = '#334155';
    ctx.fillRect(-175 * scale, (-7 - playerPos.z) * scale, 350 * scale, 14 * scale);

    // 3. Draw Rue de la République (Vertical Street, X ~ 0)
    ctx.fillStyle = '#334155';
    ctx.fillRect((-6 - playerPos.x) * scale, -175 * scale, 12 * scale, 350 * scale);

    // Road yellow dash markings (Avenue)
    ctx.fillStyle = '#f59e0b';
    for (let rx = -160; rx < 160; rx += 14) {
      ctx.fillRect((rx - playerPos.x) * scale, (-0.1 - playerPos.z) * scale, 6 * scale, 0.2 * scale);
    }

    // Road markings (Rue)
    for (let rz = -160; rz < 160; rz += 14) {
      ctx.fillRect((-0.1 - playerPos.x) * scale, (rz - playerPos.z) * scale, 0.2 * scale, 6 * scale);
    }

    // 4. Draw Houses
    const drawHouseOnMap = (hx: number, hz: number, hw: number, hd: number, color: string, label: string) => {
      ctx.fillStyle = color;
      ctx.fillRect((hx - hw / 2 - playerPos.x) * scale, (hz - hd / 2 - playerPos.z) * scale, hw * scale, hd * scale);
      
      // border
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.5;
      ctx.strokeRect((hx - hw / 2 - playerPos.x) * scale, (hz - hd / 2 - playerPos.z) * scale, hw * scale, hd * scale);

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, (hx - playerPos.x) * scale, (hz - playerPos.z) * scale + 2);
    };

    // House 1: Villa Nova
    drawHouseOnMap(32, 28, 14, 10, '#92400e', 'V.Nova');
    // House 2: Modern Loft
    drawHouseOnMap(-32, 28, 12, 12, '#475569', 'Loft');
    // House 3: Suburban Dream
    drawHouseOnMap(32, -28, 13, 11, '#991b1b', 'Suburb');

    ctx.restore();

    // 5. Draw static Player Indicator exactly in the center of the Radar
    ctx.save();
    ctx.translate(center, center);

    // Outer circle ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, center - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Player Directional Arrow (Blue triangle like GTA V)
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 2);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [playerPos, playerYaw]);

  // Define item database
  interface ItemData {
    id: string;
    name: string;
    category: 'Botanique' | 'Consommables' | 'Armes' | 'Meubles';
    weight: number; // in kg
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
    effect: string;
    price: number;
    sellPrice: number;
    icon: string;
    description: string;
  }

  const MERCHANT_ITEMS: ItemData[] = [
    // Botanique
    { id: 'weed_seed', name: 'Graine de Cannabis', category: 'Botanique', weight: 0.01, rarity: 'Common', effect: 'Permet de planter un plant de cannabis à vos pieds [E]', price: 15, sellPrice: 10, icon: '🌱', description: 'Une graine de qualité supérieure sélectionnée par Bob.' },
    { id: 'seed_pack', name: 'Pack de 5 Graines', category: 'Botanique', weight: 0.05, rarity: 'Rare', effect: 'Donne 5 graines de cannabis d\'un coup', price: 70, sellPrice: 45, icon: '📦', description: 'Pack économique de graines robustes prêtes à germer.' },
    { id: 'weed_bud', name: 'Tête de Cannabis (Sec)', category: 'Botanique', weight: 0.05, rarity: 'Rare', effect: 'Ressource récoltée à haute valeur de revente', price: 100, sellPrice: 50, icon: '🍁', description: 'Fleurs séchées et résineuses cultivées localement dans le dôme.' },
    
    // Consommables
    { id: 'poutine', name: 'Poutine de Portneuf', category: 'Consommables', weight: 0.8, rarity: 'Epic', effect: 'Restaure 100% de votre Santé !', price: 8, sellPrice: 5, icon: '🍟', description: 'Le classique québécois ultime avec de véritables grains squouich-squouich.' },
    { id: 'corn', name: 'Blé d\'Inde de Neuville', category: 'Consommables', weight: 0.25, rarity: 'Common', effect: 'Restaure 30% de Santé', price: 3, sellPrice: 1, icon: '🌽', description: 'Maïs extra-doux fraîchement récolté de Neuville, beurré et cuit.' },
    { id: 'taffy', name: 'Tire d\'Érable Locale', category: 'Consommables', weight: 0.15, rarity: 'Rare', effect: 'Restaure 40% de Santé', price: 4, sellPrice: 2, icon: '🍁', description: 'Sirop d\'érable pur bouilli et figé sur de la glace pure.' },
    { id: 'beer', name: 'Bière Rousse Boréale', category: 'Consommables', weight: 0.5, rarity: 'Common', effect: 'Restaure 20% Santé + Effet Visuel Drunk de l\'Éther', price: 5, sellPrice: 3, icon: '🍺', description: 'Bière rousse de microbrasserie du terroir de Portneuf.' },
    { id: 'ether_potion', name: 'Fiole d\'Éther Cosmique', category: 'Consommables', weight: 0.1, rarity: 'Legendary', effect: 'Vitesse de Course Folle (+18.5 m/s) pendant 10s !', price: 45, sellPrice: 25, icon: '🔮', description: 'Un condensé gazeux de l\'Éther du dôme de simulation.' },
    { id: 'tourtiere', name: 'Tourtière de Gaston', category: 'Consommables', weight: 1.2, rarity: 'Legendary', effect: 'Restaure 100% Santé + 20% Bonus de points de Vie max !', price: 25, sellPrice: 15, icon: '🥧', description: 'Célèbre tourtière du terroir mijotée avec trois viandes.' },

    // Armes
    { id: 'pipe', name: 'Tuyau de Plomb Rigide', category: 'Armes', weight: 2.2, rarity: 'Common', effect: 'Dégâts de mêlée : +20 HP (Vitesse standard)', price: 60, sellPrice: 30, icon: '🔧', description: 'Solide tuyau métallique parfait pour se faire respecter.' },
    { id: 'bat', name: 'Batte Cloutée', category: 'Armes', weight: 3.5, rarity: 'Rare', effect: 'Dégâts de mêlée : +25 HP (Force d\'impact accrue)', price: 150, sellPrice: 80, icon: '🏏', description: 'Batte de baseball classique customisée avec des pointes acérées.' },
    { id: 'bottle', name: 'Bouteille Cassée', category: 'Armes', weight: 0.4, rarity: 'Common', effect: 'Dégâts de mêlée : +15 HP (Vitesse d\'attaque maximale !)', price: 40, sellPrice: 20, icon: '🍾', description: 'Tranchante et extrêmement légère pour enchaîner les coups.' },
    { id: 'hammer', name: 'Masse de Chantier', category: 'Armes', weight: 10.0, rarity: 'Legendary', effect: 'Dégâts de mêlée : +45 HP (Knockback de zone important !)', price: 300, sellPrice: 150, icon: '🔨', description: 'Lourde masse de démolition. Réservée aux profils à haute force physique.' },
    { id: 'sword', name: 'Épée d\'Honneur en Or', category: 'Armes', weight: 4.8, rarity: 'Legendary', effect: 'Dégâts de mêlée : +60 HP (Portée augmentée !)', price: 450, sellPrice: 220, icon: '⚔️', description: 'Une lame d\'or gravée d\'armoiries cosmiques.' },

    // Meubles
    { id: 'golden_throne', name: 'Trône Royal Doré', category: 'Meubles', weight: 150.0, rarity: 'Legendary', effect: 'Débloque le Trône Doré GMod [Q]', price: 450, sellPrice: 225, icon: '👑', description: 'Le trône ultime sculpté dans l\'or pur d\'EtherWorld.' },
    { id: 'couch_nova', name: 'Canapé Luxury Nova', category: 'Meubles', weight: 65.0, rarity: 'Epic', effect: 'Débloque le Canapé Luxueux GMod [Q]', price: 200, sellPrice: 100, icon: '🛋️', description: 'Un sofa très confortable parfait pour les intérieurs modernes.' },
    { id: 'fridge_chrome', name: 'Frigo Américain Chrome', category: 'Meubles', weight: 110.0, rarity: 'Epic', effect: 'Débloque le Réfrigérateur GMod [Q]', price: 500, sellPrice: 250, icon: '❄️', description: 'Gros réfrigérateur avec distributeur de glaçons.' },
    { id: 'lcd_tv', name: 'Téléviseur OLED 65 pouces', category: 'Meubles', weight: 22.0, rarity: 'Epic', effect: 'Débloque le téléviseur OLED GMod [Q]', price: 300, sellPrice: 150, icon: '📺', description: 'Un écran plat connecté de très grande diagonale.' }
  ];

  const isBob = playerState.examinedMarchand;
  const merchantTitle = isBob ? "🌿 BOB LE BOTANISTE" : "⚜️ GASTON DE PORTNEUF";
  const merchantSubtitle = isBob 
    ? "Dispensaire local de graines & Rachat de têtes à fort taux" 
    : "La roulotte gourmande du terroir • Poutine & Tire d'érable";
  const merchantIcon = isBob ? "🌿" : "🍟";
  const merchantThemeColor = isBob ? "border-emerald-500" : "border-blue-500";
  const merchantHeaderBg = isBob ? "bg-gradient-to-r from-emerald-900 to-teal-950" : "bg-gradient-to-r from-blue-900 to-indigo-950";

  // Current catalog filtered by search and category
  const currentShopCatalog = MERCHANT_ITEMS.filter(item => {
    // Specialization
    const isItemAllowedForBob = item.category === 'Botanique' || item.category === 'Armes';
    const isItemAllowedForGaston = item.category === 'Consommables' || item.category === 'Meubles';
    
    if (isBob && !isItemAllowedForBob) return false;
    if (!isBob && !isItemAllowedForGaston) return false;

    // Filter by category
    if (shopCategoryFilter !== 'All') {
      if (shopCategoryFilter === 'Botanique' && item.category !== 'Botanique') return false;
      if (shopCategoryFilter === 'Consommables' && item.category !== 'Consommables') return false;
      if (shopCategoryFilter === 'Armes' && item.category !== 'Armes') return false;
      if (shopCategoryFilter === 'Meubles' && item.category !== 'Meubles') return false;
    }

    // Filter by search query
    if (shopSearchQuery.trim()) {
      const query = shopSearchQuery.toLowerCase();
      return item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
    }

    return true;
  });

  // Compute Player backpack contents
  const backpackEntries = [
    { item: MERCHANT_ITEMS.find(i => i.id === 'weed_seed')!, qty: playerState.weedSeeds || 0 },
    { item: MERCHANT_ITEMS.find(i => i.id === 'weed_bud')!, qty: playerState.weedBuds || 0 },
    { item: MERCHANT_ITEMS.find(i => i.id === 'poutine')!, qty: localInventory.poutine || 0 },
    { item: MERCHANT_ITEMS.find(i => i.id === 'corn')!, qty: localInventory.corn || 0 },
    { item: MERCHANT_ITEMS.find(i => i.id === 'taffy')!, qty: localInventory.taffy || 0 },
    { item: MERCHANT_ITEMS.find(i => i.id === 'beer')!, qty: localInventory.beer || 0 },
    { item: MERCHANT_ITEMS.find(i => i.id === 'ether_potion')!, qty: localInventory.ether_potion || 0 },
    { item: MERCHANT_ITEMS.find(i => i.id === 'tourtiere')!, qty: localInventory.tourtiere || 0 },
    { item: MERCHANT_ITEMS.find(i => i.id === 'pipe')!, qty: localInventory.pipe || 0 },
    { item: MERCHANT_ITEMS.find(i => i.id === 'bat')!, qty: localInventory.bat || 0 },
    { item: MERCHANT_ITEMS.find(i => i.id === 'bottle')!, qty: localInventory.bottle || 0 },
    { item: MERCHANT_ITEMS.find(i => i.id === 'hammer')!, qty: localInventory.hammer || 0 },
    { item: MERCHANT_ITEMS.find(i => i.id === 'sword')!, qty: localInventory.sword || 0 }
  ].filter(e => e.qty > 0 || e.item.id === 'weed_seed' || e.item.id === 'weed_bud');

  // Calculate total weight of backpack
  const totalBackpackWeight = backpackEntries.reduce((acc, entry) => acc + (entry.item.weight * entry.qty), 0);
  const maxBackpackCapacity = 50.0; // max kg

  // Buy item logic
  const handleBuyItem = (item: ItemData) => {
    if (playerState.cash < item.price) {
      alert(`Pas assez d'argent ! Requis: $${item.price}, Solde: $${playerState.cash}`);
      return;
    }

    // Specialized items:
    if (item.id === 'weed_seed') {
      if (onBuyWeedSeed) onBuyWeedSeed();
      return;
    }
    if (item.id === 'seed_pack') {
      if (onBuySeedPack) onBuySeedPack();
      return;
    }
    if (item.id === 'weed_bud') {
      alert("Vous ne pouvez pas acheter de bourgeons de cannabis séchés, Bob les achète uniquement !");
      return;
    }

    // If Meubles (building props): unlock them for GMod Spawn Menu directly!
    if (item.category === 'Meubles') {
      if (onUnlockFurniture) {
        onUnlockFurniture(item.id, item.price);
      }
      return;
    }

    // If general Consumable or Weapon:
    if (onExecuteConsoleCommand) {
      const res = onExecuteConsoleCommand(`/cash -${item.price}`);
      if (res.success) {
        setLocalInventory(prev => ({
          ...prev,
          [item.id]: (prev[item.id] || 0) + 1
        }));
        onExecuteConsoleCommand(`/echo 🎒 ACHAT : Vous avez acheté 1x ${item.name} pour $${item.price} !`);
      }
    }
  };

  // Sell item logic (including Quick Sell)
  const handleSellItem = (item: ItemData) => {
    // Special cases
    if (item.id === 'weed_seed') {
      if (playerState.weedSeeds > 0) {
        if (onExecuteConsoleCommand) {
          onExecuteConsoleCommand(`/seeds -1`);
          onExecuteConsoleCommand(`/cash 10`);
          onExecuteConsoleCommand(`/echo 💸 REVENTE : Vendu 1x Graine de Cannabis pour +$10.`);
        }
      }
      return;
    }
    if (item.id === 'weed_bud') {
      if (onSellBud) onSellBud();
      return;
    }

    // Backpack custom items
    const currentQty = localInventory[item.id] || 0;
    if (currentQty <= 0) return;

    if (onExecuteConsoleCommand) {
      onExecuteConsoleCommand(`/cash ${item.sellPrice}`);
      setLocalInventory(prev => ({
        ...prev,
        [item.id]: Math.max(0, currentQty - 1)
      }));
      onExecuteConsoleCommand(`/echo 💸 REVENTE : Vendu 1x ${item.name} pour +$${item.sellPrice}.`);
    }
  };

  // Use Consumable logic
  const handleUseConsumable = (item: ItemData) => {
    const currentQty = localInventory[item.id] || 0;
    if (currentQty <= 0) return;

    // Decrement inventory
    setLocalInventory(prev => ({
      ...prev,
      [item.id]: Math.max(0, currentQty - 1)
    }));

    // Trigger standard game-manager side-effect
    if (item.id === 'poutine' || item.id === 'corn' || item.id === 'taffy' || item.id === 'beer') {
      if (onBuyCantineItem) {
        if (onExecuteConsoleCommand) {
          const origCost = item.id === 'poutine' ? 8 : item.id === 'corn' ? 3 : item.id === 'taffy' ? 4 : 5;
          onExecuteConsoleCommand(`/cash ${origCost}`);
          onBuyCantineItem(item.id as any);
        }
      }
    } else if (item.id === 'ether_potion') {
      if (onExecuteConsoleCommand) {
        onExecuteConsoleCommand(`/heal 100`);
        onExecuteConsoleCommand(`/speed 18.5`);
        onExecuteConsoleCommand(`/echo 🔮 ÉTHER : Fiole d'éther consommée ! Vitesse de déplacement décuplée !`);
        
        setTimeout(() => {
          onExecuteConsoleCommand(`/speed 5.0`);
          onExecuteConsoleCommand(`/echo 🔮 ÉTHER : L'effet de l'Éther Cosmique se dissipe.`);
        }, 10000);
      }
    } else if (item.id === 'tourtiere') {
      if (onExecuteConsoleCommand) {
        onExecuteConsoleCommand(`/heal 100`);
        onExecuteConsoleCommand(`/echo 🥧 REPAS : Tourtière mangée ! Vous vous sentez d'une solidité légendaire.`);
      }
    }
  };

  // Equip Weapon logic
  const handleEquipWeapon = (item: ItemData) => {
    if (onExecuteConsoleCommand) {
      onExecuteConsoleCommand(`/setweapon ${item.id}`);
    }
  };

  // Close action
  const handleClosePanel = () => {
    if (isBob && onCloseMarchand) onCloseMarchand();
    if (!isBob && onCloseCantine) onCloseCantine();
  };

  // Find info of currently spawning catalog item
  const activeItem = playerState.selectedItemId
    ? GMOD_CATALOG.find((item) => item.id === playerState.selectedItemId)
    : null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5 font-sans select-none">
      
      {/* ─── TOP HEADER HUD ─── */}
      <div className="w-full flex justify-between items-start">
        {/* Street details & Speed & Event Logs Terminal */}
        <div className="flex flex-col gap-3">
          <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 p-4 rounded-xl flex flex-col shadow-2xl w-80">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold font-mono">Quartier Principal</span>
            <span className="text-xl font-extrabold text-white tracking-tight">{playerState.activeStreet}</span>
            <div className="flex items-center gap-3 mt-2 border-t border-slate-800 pt-2">
              <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black tracking-wide font-mono font-sans">SPEED</span>
              <span className="text-lg font-black font-mono text-amber-400">{currentSpeed} <span className="text-xs font-medium text-slate-400 font-sans">KM/H</span></span>
            </div>
          </div>

          {/* RP & Dojo Combat Event logs */}
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-900 p-3.5 rounded-xl shadow-2xl w-80 font-mono text-[10px] text-slate-300 max-h-44 overflow-y-auto flex flex-col gap-1.5 pointer-events-auto">
            <div className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-1 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Console de Combat & RP en Direct
            </div>
            {playerState.combatLogs && playerState.combatLogs.length > 0 ? (
              playerState.combatLogs.slice(0, 7).map((log, i) => (
                <div key={i} className={`leading-relaxed border-l-2 pl-2 ${
                  log.includes('💥') || log.includes('COUP') || log.includes('PV')
                    ? 'border-red-500 text-red-300 bg-red-950/25' 
                    : log.includes('🚀') || log.includes('Monté')
                    ? 'border-cyan-500 text-cyan-300 bg-cyan-950/25'
                    : log.includes('🥋')
                    ? 'border-indigo-500 text-indigo-300 bg-indigo-950/25'
                    : 'border-slate-700 text-slate-400'
                }`}>
                  {log}
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic">Aucune activité récente.</div>
            )}
          </div>
        </div>

        {/* Vehicles & Mounts Panel (Garage Center) */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-850 p-3 rounded-xl flex items-center gap-2.5 shadow-2xl pointer-events-auto">
          <span className="text-[10px] uppercase font-black text-slate-400 font-mono border-r border-slate-800 pr-2.5 mr-0.5">
            🏍️ GARAGE
          </span>
          
          <button
            onClick={() => onToggleMount('hoverboard')}
            className={`px-3 py-2 rounded-lg text-xs font-black tracking-wide flex items-center gap-2 cursor-pointer transition border duration-200 ${
              playerState.activeMount === 'hoverboard'
                ? 'bg-cyan-600 border-cyan-400 text-white animate-pulse shadow-cyan-900/40 shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-cyan-500 hover:text-white'
            }`}
          >
            🛹 Hoverboard
          </button>

          <button
            onClick={() => onToggleMount('broom')}
            className={`px-3 py-2 rounded-lg text-xs font-black tracking-wide flex items-center gap-2 cursor-pointer transition border duration-200 ${
              playerState.activeMount === 'broom'
                ? 'bg-purple-600 border-purple-400 text-white animate-pulse shadow-purple-900/40 shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-purple-500 hover:text-white'
            }`}
          >
            🧹 Balai Magique
          </button>
        </div>

        {/* Pointer Lock Help Alert, Lock Button & Roleplay Dashboard */}
        <div className="flex flex-col items-end gap-3 w-80">
          {!isRightPanelExpanded ? (
            <button
              onClick={() => setIsRightPanelExpanded(true)}
              className="ui-interactive pointer-events-auto bg-slate-950/95 hover:bg-slate-900 border border-slate-850 hover:border-indigo-500/50 text-white font-extrabold py-2 px-4 rounded-xl text-xs tracking-wider flex items-center gap-2 cursor-pointer transition shadow-2xl duration-200"
            >
              <Sliders className="w-4 h-4 text-indigo-400" />
              OUVRIR LE CONTROLEUR DU HUD
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsRightPanelExpanded(false)}
                className="ui-interactive pointer-events-auto bg-rose-950/90 hover:bg-rose-900 border border-rose-800 text-rose-200 font-extrabold py-1.5 px-3 rounded-lg text-[9px] tracking-wider flex items-center gap-1 cursor-pointer transition shadow-md self-end"
              >
                ✕ MASQUER LES OPTIONS
              </button>

              <button
                onClick={onRequestPointerLock}
                className="ui-interactive pointer-events-auto bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs tracking-wider flex items-center gap-2 cursor-pointer transition shadow-xl w-full text-center justify-center"
              >
                <Crosshair className="w-4 h-4 text-indigo-400 animate-pulse" />
                VERROUILLER LA SOURIS (3D IMMERSIF)
              </button>
              <div className="bg-slate-900/60 backdrop-blur-sm px-3 py-1 rounded-lg border border-slate-800/40 text-[10px] text-slate-400 text-right font-mono w-full">
                Double-cliquez pour verrouiller, Échap pour libérer.
              </div>

          {/* ⚙️ HUD DISPLAY TOGGLES PANEL ⚙️ */}
          <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 w-full flex flex-col gap-2 pointer-events-auto">
            <span className="text-[9px] font-mono font-black text-indigo-400 uppercase tracking-widest block text-left">
              ⚙️ Option d'Affichage du HUD
            </span>
            <div className="flex gap-1.5 justify-start flex-wrap">
              <button
                onClick={() => setIsConsoleRpShopVisible(prev => !prev)}
                className={`px-2 py-1 rounded font-mono text-[9px] font-bold cursor-pointer transition border ${
                  isConsoleRpShopVisible
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
                }`}
                title="Afficher/Masquer la console RP & Shop"
              >
                {isConsoleRpShopVisible ? '✅ CONSOLE RP & SHOP' : '❌ CONSOLE RP & SHOP'}
              </button>
              <button
                onClick={() => setIsGuideVisible(prev => !prev)}
                className={`px-2 py-1 rounded font-mono text-[9px] font-bold cursor-pointer transition border ${
                  isGuideVisible
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
                }`}
                title="Afficher/Masquer le guide d'interaction"
              >
                {isGuideVisible ? '✅ GUIDE RP' : '❌ GUIDE RP'}
              </button>
              <button
                onClick={() => setIsDojoVisible(prev => !prev)}
                className={`px-2 py-1 rounded font-mono text-[9px] font-bold cursor-pointer transition border ${
                  isDojoVisible
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
                }`}
                title="Afficher/Masquer le panneau d'arts martiaux"
              >
                {isDojoVisible ? '✅ DOJO' : '❌ DOJO'}
              </button>
              
              <button
                onClick={() => {
                  setIsConsoleRpShopVisible(false);
                  setIsGuideVisible(false);
                  setIsDojoVisible(false);
                }}
                className="px-2 py-1 rounded font-mono text-[9px] font-black cursor-pointer transition border bg-rose-950/45 border-rose-800 text-rose-300 hover:bg-rose-900/30"
                title="Masquer tous les panneaux secondaires"
              >
                📴 TOUT MASQUER
              </button>
              
              <button
                onClick={() => {
                  setIsConsoleRpShopVisible(true);
                  setIsGuideVisible(true);
                  setIsDojoVisible(true);
                }}
                className="px-2 py-1 rounded font-mono text-[9px] font-black cursor-pointer transition border bg-emerald-950/45 border-emerald-800 text-emerald-300 hover:bg-emerald-900/30"
                title="Afficher tous les panneaux secondaires"
              >
                🌐 TOUT AFFICHER
              </button>
            </div>
          </div>

          {/* 🌿 DUO ROLEPLAY & ECONOMY DASHBOARD 🌿 */}
          {isConsoleRpShopVisible && (
            <div className="bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl p-4 w-full flex flex-col gap-3 pointer-events-auto text-slate-100">
              {/* Header Tabs */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-1 relative">
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">🛠️ CONSOLE RP & SHOP</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-slate-400 font-medium">v2.0 Beta</span>
                  <button
                    onClick={() => setIsConsoleRpShopVisible(false)}
                    className="p-1 rounded text-slate-500 hover:text-slate-300 transition text-[10px] font-bold cursor-pointer"
                    title="Masquer le panneau"
                  >
                    ✕
                  </button>
                </div>
              </div>

            {/* Tab selectors */}
            <div className="grid grid-cols-7 gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800/60 font-mono text-[8px] font-extrabold text-center animate-fade-in">
              <button
                onClick={() => setActiveTab('weed')}
                className={`py-1 rounded-md cursor-pointer transition ${
                  activeTab === 'weed' ? 'bg-emerald-600 text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                🌿 WEED
              </button>
              <button
                onClick={() => setActiveTab('physics')}
                className={`py-1 rounded-md cursor-pointer transition ${
                  activeTab === 'physics' ? 'bg-indigo-600 text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                🤪 PHYS
              </button>
              <button
                onClick={() => setActiveTab('shop')}
                className={`py-1 rounded-md cursor-pointer transition ${
                  activeTab === 'shop' ? 'bg-amber-600 text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                🎁 SHOP
              </button>
              <button
                onClick={() => setActiveTab('fight')}
                className={`py-1 rounded-md cursor-pointer transition ${
                  activeTab === 'fight' ? 'bg-red-600 text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                🥊 FIGHT
              </button>
              <button
                onClick={() => setActiveTab('scene')}
                className={`py-1 rounded-md cursor-pointer transition ${
                  activeTab === 'scene' ? 'bg-pink-600 text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                🏗️ SCÈNE
              </button>
              <button
                onClick={() => setActiveTab('agents')}
                className={`py-1 rounded-md cursor-pointer transition ${
                  activeTab === 'agents' ? 'bg-violet-600 text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                🤖 AGENTS
              </button>
              <button
                onClick={() => setActiveTab('realestate')}
                className={`py-1 rounded-md cursor-pointer transition ${
                  activeTab === 'realestate' ? 'bg-orange-600 text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                🏠 IMMO
              </button>
            </div>

            {/* Tab 1 Content: CANNABIS FARM */}
            {activeTab === 'weed' && (
              <div className="flex flex-col gap-2.5 text-xs animate-fade-in">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50 font-mono">
                  <div className="flex flex-col items-center border-r border-slate-800">
                    <span className="text-[9px] uppercase text-slate-400 font-bold">Vos Graines</span>
                    <span className="text-sm font-black text-emerald-400 mt-0.5">{playerState.weedSeeds ?? 0} unités</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] uppercase text-slate-400 font-bold">Vos Têtes</span>
                    <span className="text-sm font-black text-amber-400 mt-0.5">{playerState.weedBuds ?? 0} unités</span>
                  </div>
                </div>

                {/* Cozy Tip Banner */}
                <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 flex flex-col gap-1.5 text-center leading-relaxed">
                  <span className="font-black text-emerald-400 text-[10px] uppercase tracking-wider font-mono">🏪 MARCHAND DE CANNABIS</span>
                  <p className="text-[11px] text-slate-300">
                    L'achat de graines et la plantation se font désormais auprès du <span className="text-emerald-400 font-bold">Marchand 3D</span> au Dispensaire (X:-8, Z:5) !
                  </p>
                  <p className="text-[10px] text-slate-400 italic">
                    Approchez-vous du marchand et appuyez sur <span className="text-white font-mono font-bold">[E]</span> pour interagir.
                  </p>
                </div>

                {/* Info reminder */}
                <p className="text-[10px] text-slate-400 italic text-center leading-relaxed mt-1">
                  💡 Les plantes cultivées apparaissent à vos pieds ! Approchez-vous d'elles et appuyez sur <span className="text-white font-bold font-mono">[E]</span> pour les arroser ou récolter leurs bourgeons d'or !
                </p>
              </div>
            )}

            {/* Tab 2 Content: PHYSIQUE JOINT STIFFNESS & GANG BEASTS */}
            {activeTab === 'physics' && (
              <div className="flex flex-col gap-3 text-xs animate-fade-in">
                {/* Gang Beasts toggle */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold flex items-center gap-1.5">
                      🤪 Flasque Gang Beasts
                    </span>
                    <button
                      onClick={() => onSetGangBeastsMode(!playerState.gangBeastsMode)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black cursor-pointer transition border ${
                        playerState.gangBeastsMode
                          ? 'bg-red-600 border-red-400 text-white animate-pulse'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {playerState.gangBeastsMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Rend l'avatar flasque avec oscillation et fléchissement comique des bras et des jambes lors de la marche et des combats !
                  </p>
                </div>

                {/* Toribash joints stiffener */}
                <div className="flex flex-col gap-2 bg-slate-900/30 border border-slate-800 p-3 rounded-xl">
                  <span className="font-bold font-mono text-[10px] uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5" /> Joints Rigor Mortis Toribash
                  </span>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Ajustez la rigidité musculaire pour d'autres poses et oscillations :
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 mt-1 font-mono text-[9px] font-extrabold">
                    {[
                      { id: 'stiff', label: '🥋 Rigide' },
                      { id: 'relaxed', label: '🧘 Relâché' },
                      { id: 'floppy', label: '🍮 Jelly' }
                    ].map(stiff => (
                      <button
                        key={stiff.id}
                        onClick={() => onSetJointStiffness(stiff.id as any)}
                        className={`py-1.5 rounded-lg border cursor-pointer transition text-center ${
                          playerState.jointStiffness === stiff.id
                            ? 'bg-indigo-600 border-indigo-400 text-white font-black shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {stiff.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3 Content: GMOD PREMIUM SHOP */}
            {activeTab === 'shop' && (
              <div className="flex flex-col gap-2 text-xs animate-fade-in">
                <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider font-mono">🌟 BOUTIQUE DE LUXE (X:-12, Z:-15)</span>
                <p className="text-[10px] text-slate-400 leading-relaxed leading-snug mb-1">
                  Débloquez des éléments de luxe uniques exclusifs pour votre Spawn Menu GMod en dépensant votre cash durement récolté !
                </p>

                {/* Item Card: Golden Throne */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex gap-3 items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shrink-0 text-slate-950 font-black text-lg shadow-md border border-amber-300">
                      👑
                    </div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-white text-xs leading-none">Trône Royal Doré</span>
                      <span className="text-[9px] text-amber-400 font-mono mt-1 font-bold">Meuble Premium GMod</span>
                    </div>
                  </div>

                  {playerState.unlockedFurnitureIds?.includes('golden_throne') ? (
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-1 rounded-lg font-black font-mono">
                      DÉBLOQUÉ
                    </span>
                  ) : (
                    <button
                      onClick={() => onUnlockFurniture('golden_throne', 450)}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-black px-3 py-1.5 rounded-lg cursor-pointer transition text-[10px] border border-amber-500 shadow-md"
                    >
                      Acheter $450
                    </button>
                  )}
                </div>

                <div className="bg-slate-900/30 border border-slate-850 p-2.5 rounded-lg text-[9px] text-slate-400 italic leading-relaxed text-center mt-1">
                  💡 Débloqué ? Vous le retrouverez instantanément disponible dans le menu de spawn GMod (Touche Q) !
                </div>
              </div>
            )}

            {/* Tab 4 Content: 5D BUILDER SCENE CHOICE TEMPLATES */}
            {activeTab === 'scene' && (
              <div className="flex flex-col gap-2 text-xs animate-fade-in pointer-events-auto">
                <span className="text-[9px] font-black uppercase text-pink-400 tracking-wider font-mono">🏗️ MENU DE CHOIX SCÈNE 5D BUILDER</span>
                <p className="text-[10px] text-slate-400 leading-snug mb-1">
                  Sélectionnez un style de départ architectural pour vos créations. Le moteur Three.js reconstruira instantanément le terrain et mettra à jour les boîtes de collision !
                </p>

                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[17rem] pr-1">
                  {[
                    {
                      id: 'completed',
                      title: '🏡 Maison Finie (Intérieur Accessible)',
                      desc: 'Villas de luxe 100% terminées avec mobilier haut de gamme, piscine d\'eau translucide, et portes interactives fonctionnelles !'
                    },
                    {
                      id: 'outline',
                      title: '📐 Contour Seul (Plan au Sol)',
                      desc: 'Fondations en béton, parquets posés et murets de contour bas (0.6m). Parfait pour bâtir vos propres murs et pièces sur GMod !'
                    },
                    {
                      id: 'skeletal',
                      title: '🏗️ Structure Squelette (Commencée)',
                      desc: 'Ossature en béton armé, poutres horizontales et piliers de soutènement. L\'environnement idéal pour concevoir un loft moderne !'
                    },
                    {
                      id: 'empty',
                      title: '🪹 Grille Vide (Do It Yourself)',
                      desc: 'Scène libre sans aucun bâtiment résidentiel. Uniquement la pelouse, le dojo d\'entraînement, et le dispensaire pour un maximum de liberté GMod !'
                    }
                  ].map(tmpl => {
                    const isActive = (playerState.sceneTemplate || 'completed') === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => onSetSceneTemplate(tmpl.id)}
                        className={`w-full text-left p-2 rounded-xl border transition cursor-pointer flex flex-col gap-1 ${
                          isActive
                            ? 'bg-pink-950/40 border-pink-500 shadow-lg shadow-pink-950/20 text-white font-bold'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-[10px] font-bold ${isActive ? 'text-pink-300' : 'text-slate-200'}`}>
                            {tmpl.title}
                          </span>
                          {isActive && (
                            <span className="text-[8px] bg-pink-500 text-white font-black px-1.5 py-0.5 rounded font-mono">
                              ACTIF
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium leading-relaxed">
                          {tmpl.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 5 Content: CHAMBER FIGHT CLUB */}
            {activeTab === 'fight' && (
              <div className="flex flex-col gap-2.5 text-xs animate-fade-in text-slate-100">
                <div className="flex justify-between items-center bg-red-950/20 border border-red-900/50 p-2.5 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-red-500 tracking-wider font-mono">🥊 CHAMBER FIGHT CLUB</span>
                    <span className="text-[9px] text-slate-400">Matchs de Ragdoll à Mort en Cage d'Acier</span>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black font-mono uppercase ${
                    (playerState.fightQueueStatus || 'idle') === 'idle' ? 'bg-slate-800 text-slate-300' :
                    (playerState.fightQueueStatus || 'idle') === 'queuing' ? 'bg-amber-600 text-white animate-pulse' :
                    (playerState.fightQueueStatus || 'idle') === 'match_ready' ? 'bg-green-600 text-white animate-bounce' :
                    'bg-red-600 text-white animate-pulse'
                  }`}>
                    {(playerState.fightQueueStatus || 'idle') === 'idle' && '💤 Dispo'}
                    {(playerState.fightQueueStatus || 'idle') === 'queuing' && '🔍 RECHERCHE'}
                    {(playerState.fightQueueStatus || 'idle') === 'match_ready' && '⚡ PRÊT'}
                    {(playerState.fightQueueStatus || 'idle') === 'fighting' && '💥 COMBAT'}
                  </span>
                </div>

                {/* Queue / Fight Control Status Panel */}
                <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl flex flex-col gap-2">
                  {(playerState.fightQueueStatus || 'idle') === 'idle' && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-bold text-slate-400 font-mono">CHOISIR LE MODE DE COMBAT :</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onJoinFightQueue('1v1')}
                          className="py-2.5 px-3 bg-red-900 hover:bg-red-800 text-white font-extrabold rounded-lg text-center cursor-pointer transition transform hover:scale-[1.03] border border-red-700 shadow-md flex flex-col items-center gap-0.5"
                        >
                          <span className="text-[11px]">⚔️ DEFI 1v1</span>
                          <span className="text-[8px] font-mono text-red-200">Rival Aléatoire</span>
                        </button>
                        <button
                          onClick={() => onJoinFightQueue('ffa')}
                          className="py-2.5 px-3 bg-purple-900 hover:bg-purple-800 text-white font-extrabold rounded-lg text-center cursor-pointer transition transform hover:scale-[1.03] border border-purple-700 shadow-md flex flex-col items-center gap-0.5"
                        >
                          <span className="text-[11px]">🔥 BRAWL FFA</span>
                          <span className="text-[8px] font-mono text-purple-200">Mêlée à 4 Fighters</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {(playerState.fightQueueStatus || 'idle') === 'queuing' && (
                    <div className="flex flex-col items-center py-2.5 gap-2">
                      <div className="flex items-center gap-2 animate-pulse">
                        <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                        <span className="text-amber-400 font-extrabold font-mono text-xs">RECHERCHE DE COMBATTANTS...</span>
                      </div>
                      <span className="text-xs font-mono font-medium text-slate-400">
                        Temps écoulé : <strong className="text-slate-200">{playerState.fightQueueTimer ?? 0}s</strong>
                      </span>
                      <button
                        onClick={() => onLeaveFightQueue()}
                        className="mt-1 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold rounded-md cursor-pointer transition"
                      >
                        Annuler la recherche
                      </button>
                    </div>
                  )}

                  {(playerState.fightQueueStatus || 'idle') === 'match_ready' && (
                    <div className="flex flex-col items-center py-2 gap-2">
                      <span className="text-green-400 font-black text-center text-xs animate-bounce font-mono">⚡ TOUT LE MONDE EST PRÊT !</span>
                      <span className="text-[10px] text-slate-300 text-center font-mono">Téléportation immédiate dans la cage...</span>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full animate-pulse" style={{ width: '100%' }} />
                      </div>
                    </div>
                  )}

                  {(playerState.fightQueueStatus || 'idle') === 'fighting' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-1">
                        <span className="text-[9px] font-black text-red-400 font-mono uppercase">🎯 VOS CIBLES ACTIVES</span>
                        <span className="text-[8px] bg-red-900/60 text-red-200 border border-red-800 px-1.5 py-0.5 rounded font-mono">SANS RÈGLES</span>
                      </div>

                      {/* Active Rivals List */}
                      <div className="flex flex-col gap-2 max-h-[12rem] overflow-y-auto pr-1">
                        {playerState.currentRivals && playerState.currentRivals.length > 0 ? (
                          playerState.currentRivals.map((rival) => (
                            <div key={rival.id} className="bg-slate-950/60 border border-slate-850 p-2 rounded-lg flex flex-col gap-1.5">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-[11px] text-slate-200 flex items-center gap-1">
                                  👤 {rival.name}
                                </span>
                                <span className="text-[8px] font-mono font-medium text-slate-400">
                                  Arme : <strong className="text-amber-400">{
                                    rival.activeWeapon === 'pipe' ? 'Talon d\'Acier' :
                                    rival.activeWeapon === 'bat' ? 'Batte Cloutée' :
                                    rival.activeWeapon === 'bottle' ? 'Bouteille' :
                                    rival.activeWeapon === 'hammer' ? 'Masse de Chantier' : 'Mains nues'
                                  }</strong>
                                </span>
                              </div>

                              {/* Health Bar */}
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/50">
                                  <div
                                    className={`h-full transition-all duration-150 ${
                                      rival.isKO ? 'bg-red-800' :
                                      (rival.health / rival.maxHealth) < 0.35 ? 'bg-red-500 animate-pulse' :
                                      (rival.health / rival.maxHealth) < 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${rival.isKO ? 0 : (rival.health / rival.maxHealth) * 100}%` }}
                                  />
                                </div>
                                <span className={`text-[9px] font-mono font-extrabold ${rival.isKO ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                                  {rival.isKO ? 'KO / RAGDOLL' : `${Math.ceil(rival.health)} HP`}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-2 text-slate-500 italic text-[10px]">
                            Aucun combattant actif.
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => onLeaveFightQueue()}
                        className="mt-1 w-full py-1.5 bg-red-950/60 hover:bg-red-950 border border-red-900 hover:border-red-600 text-red-200 hover:text-white text-[10px] font-bold rounded-md cursor-pointer transition flex items-center justify-center gap-1.5"
                      >
                        🏳️ Déclarer Forfait (Quitter)
                      </button>
                    </div>
                  )}
                </div>

                {/* Weapon Inventory Info */}
                <div className="bg-slate-900/30 border border-slate-850 p-2.5 rounded-xl flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 font-mono">⚔️ ÉQUIPEMENT DE COMBAT ACTUEL :</span>
                  <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-850/60 mt-1">
                    <span className="font-bold text-[10px]">Votre Arme :</span>
                    <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full ${
                      (playerState.currentWeapon || 'none') === 'none' ? 'bg-slate-800 text-slate-400' : 'bg-red-950 text-red-300 border border-red-800'
                    }`}>
                      {(playerState.currentWeapon || 'none') === 'none' && '👊 Mains nues'}
                      {(playerState.currentWeapon || 'none') === 'pipe' && '🔧 Talon d\'Acier (+20 DMG)'}
                      {(playerState.currentWeapon || 'none') === 'bat' && '🏏 Batte Cloutée (+25 DMG)'}
                      {(playerState.currentWeapon || 'none') === 'bottle' && '🍾 Bouteille (+15 DMG + CRIT)'}
                      {(playerState.currentWeapon || 'none') === 'hammer' && '🔨 Masse de Chantier (+45 DMG)'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/30 border border-slate-850 p-2.5 rounded-lg text-[9px] text-slate-400 italic leading-relaxed">
                  💡 <strong>Astuce Hardcore</strong> : Projetez vos cibles contre les grilles de la cage ou les poteaux d'angle pour déclencher un **WALL SLAM (+35 DMG)** et les faire s'écrouler en ragdoll floppy !
                </div>
              </div>
            )}

            {/* Tab 6 Content: TROXT MULTI-AGENT AI COGNITIVE LOGS */}
            {activeTab === 'agents' && (
              <div className="flex flex-col gap-2.5 text-xs animate-fade-in text-slate-100">
                <span className="text-[9px] font-black uppercase text-violet-400 tracking-wider font-mono">🤖 SUPERVISEUR TROXT COGNITIF (14 AGENTS)</span>
                
                {/* Agent Health and Global telemetry stats */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-850 font-mono text-[9px]">
                  <div className="flex flex-col items-center justify-center border-r border-slate-800">
                    <span className="text-[7.5px] text-slate-400 font-bold uppercase">BUS ÉVÉNEMENTS</span>
                    <span className="text-[10px] text-green-400 font-black mt-0.5">ONLINE ●</span>
                  </div>
                  <div className="flex flex-col items-center justify-center border-r border-slate-800">
                    <span className="text-[7.5px] text-slate-400 font-bold uppercase">CHARGE COGNITIVE</span>
                    <span className="text-[10px] text-indigo-400 font-black mt-0.5">{playerState.agentCognitiveScore ?? 94}%</span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[7.5px] text-slate-400 font-bold uppercase">RISQUE GLOBAL</span>
                    <span className={`text-[9px] font-black mt-0.5 px-1.5 rounded ${
                      (playerState.riskRating || 'GREEN') === 'GREEN' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800' :
                      (playerState.riskRating || 'GREEN') === 'BLUE' ? 'bg-blue-900/40 text-blue-400 border border-blue-800' :
                      'bg-amber-900/40 text-amber-400 border border-amber-800 animate-pulse'
                    }`}>
                      {playerState.riskRating || 'GREEN'}
                    </span>
                  </div>
                </div>

                {/* Active Agent action marquee */}
                <div className="bg-slate-900/40 border border-slate-850 px-2.5 py-2 rounded-lg flex items-center justify-between font-mono text-[9px]">
                  <span className="text-slate-400 font-extrabold uppercase">DÉCISION ACTIVE :</span>
                  <span className="text-violet-300 font-black">{playerState.activeAgentAction || 'TroxT Brain : Attente'}</span>
                </div>

                {/* ─── DOCK COGNITIF INTELLIGENT DE MODÉLISATION ─── */}
                <div className="bg-slate-900/70 border border-violet-900/40 rounded-xl p-3 flex flex-col gap-3 font-sans">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-black uppercase text-violet-400 tracking-wider font-mono">
                      🤖 DOCK D'AGENTS MODÉLISATEURS ET SÉCURITÉ
                    </span>
                  </div>

                  {/* NAV TABS */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850">
                    <button
                      onClick={() => setModelingTab('smart-house')}
                      className={`py-1.5 text-[9px] font-bold font-mono tracking-wider rounded-md transition cursor-pointer ${
                        modelingTab === 'smart-house'
                          ? 'bg-violet-600/25 border border-violet-500/50 text-violet-300'
                          : 'text-slate-400 hover:text-slate-200 bg-transparent border border-transparent'
                      }`}
                    >
                      🔑 SÉCURITÉ MAISON
                    </button>
                    <button
                      onClick={() => setModelingTab('object')}
                      className={`py-1.5 text-[9px] font-bold font-mono tracking-wider rounded-md transition cursor-pointer ${
                        modelingTab === 'object'
                          ? 'bg-cyan-600/25 border border-cyan-500/50 text-cyan-300'
                          : 'text-slate-400 hover:text-slate-200 bg-transparent border border-transparent'
                      }`}
                    >
                      📦 MODÉLISER PROPS
                    </button>
                    <button
                      onClick={() => setModelingTab('character')}
                      className={`py-1.5 text-[9px] font-bold font-mono tracking-wider rounded-md transition cursor-pointer ${
                        modelingTab === 'character'
                          ? 'bg-amber-600/25 border border-amber-500/50 text-amber-300'
                          : 'text-slate-400 hover:text-slate-200 bg-transparent border border-transparent'
                      }`}
                    >
                      👤 MODÉLISER CHAR
                    </button>
                  </div>

                  {/* SUB-TAB CONTENTS */}

                  {/* 1. SMART HOUSE SECURITY SECTION */}
                  {modelingTab === 'smart-house' && (
                    <div className="flex flex-col gap-2.5 text-slate-300">
                      {/* Alarm Global Banner */}
                      {smartHouse.masterAlarmActive ? (
                        <div className="bg-red-950/60 border border-red-500 text-red-200 p-2 rounded-lg text-[10px] font-bold flex items-center justify-between animate-pulse">
                          <span className="flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-red-500 animate-bounce" />
                            🚨 SYSTEM SÉCURITÉ : ALARME GÉNÉRALE DÉCLENCHÉE
                          </span>
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => smartHouse.silenceAlarm(30000)}
                              className="bg-slate-900 hover:bg-slate-800 border border-red-500/40 text-red-400 font-mono text-[9px] px-2 py-0.5 rounded cursor-pointer transition"
                            >
                              SILENCER (30s)
                            </button>
                            <button
                              onClick={() => smartHouse.resetAlarm()}
                              className="bg-red-700 hover:bg-red-600 text-white font-mono text-[9px] px-2.5 py-0.5 rounded cursor-pointer transition"
                            >
                              RÉINITIALISER
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-950/20 border border-emerald-900/60 p-2 rounded-lg text-[9px] flex items-center justify-between text-emerald-400 font-mono">
                          <span>🛡️ STATUT GÉNÉRAL : SYSTÈME DE PORTES ARMÉ & SÉCURISÉ</span>
                          {smartHouse.alarmSilenceUntil > Date.now() && (
                            <span className="text-[8px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.2 rounded font-bold uppercase animate-pulse">
                              🔕 SIRÈNES SILENCÉES
                            </span>
                          )}
                        </div>
                      )}

                      {/* Add Door Collapsible Form */}
                      <details className="group bg-slate-950/50 border border-slate-900 rounded-lg overflow-hidden transition">
                        <summary className="p-2 text-[9px] font-bold font-mono text-slate-400 hover:text-slate-200 cursor-pointer flex justify-between items-center">
                          <span>➕ ENREGISTRER UN CAPTEUR DE PORTE VERROUILLÉE</span>
                          <span className="text-[8px] transition-transform group-open:rotate-180">▼</span>
                        </summary>
                        <div className="p-2.5 border-t border-slate-900 bg-slate-950/30 flex flex-col gap-2 font-sans">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-[8px] text-slate-500 font-mono">Nom de la Porte</span>
                              <input
                                type="text"
                                value={doorNameInput}
                                onChange={(e) => setDoorNameInput(e.target.value)}
                                placeholder="Porte de service"
                                className="bg-slate-900 border border-slate-850 px-2 py-1 text-[10px] rounded text-white font-medium focus:border-violet-500 outline-none"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[8px] text-slate-500 font-mono">Niveau d'Accès Requis</span>
                              <select
                                value={doorLevelInput}
                                onChange={(e) => setDoorLevelInput(e.target.value as any)}
                                className="bg-slate-900 border border-slate-850 px-2 py-1 text-[10px] rounded text-slate-300 outline-none focus:border-violet-500"
                              >
                                <option value="none">Aucun (Tous)</option>
                                <option value="resident">Résident 🏡</option>
                                <option value="vip">VIP 🏢</option>
                                <option value="admin">Administrateur 👑</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] text-slate-500 font-mono">Code Clavier Clé</span>
                            <input
                              type="text"
                              value={doorCodeInput}
                              onChange={(e) => setDoorCodeInput(e.target.value)}
                              placeholder="Code numpad"
                              className="bg-slate-900 border border-slate-850 px-2 py-1 text-[10px] rounded text-white font-mono focus:border-violet-500 outline-none"
                            />
                          </div>
                          <button
                            onClick={() => {
                              if (!doorNameInput.trim()) return;
                              smartHouse.createDoor({
                                id: 'door_' + Date.now(),
                                name: doorNameInput.trim(),
                                requiredLevel: doorLevelInput,
                                numpadCode: doorCodeInput || '1234',
                                requiresCard: true,
                                status: 'locked'
                              });
                              setDoorNameInput('');
                              setDoorCodeInput('1234');
                            }}
                            className="bg-violet-600 hover:bg-violet-500 text-white font-bold font-mono text-[9px] py-1.5 rounded transition cursor-pointer"
                          >
                            CRÉER ET ENREGISTRER LA PORTE
                          </button>
                        </div>
                      </details>

                      {/* List of Doors */}
                      <div className="flex flex-col gap-2 font-sans">
                        <span className="text-[8px] font-mono font-bold text-slate-400">🛡️ PORTE(S) ET SYSTEM DE VERROUILLAGE ACTIFS :</span>
                        
                        <div className="grid grid-cols-1 gap-2 max-h-[14rem] overflow-y-auto pr-1">
                          {Object.values(smartHouse.doors).map((door: DoorLock) => (
                            <div key={door.id} className="bg-slate-950/60 border border-slate-850 rounded-xl p-2.5 flex flex-col gap-1.5">
                              <div className="flex justify-between items-start">
                                <div className="flex flex-col text-left">
                                  <span className="font-extrabold text-[10px] text-slate-200">{door.name}</span>
                                  <span className="text-[7.5px] font-mono text-slate-500">ID: {door.id}</span>
                                </div>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                                  door.status === 'unlocked' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800' :
                                  door.status === 'locked' ? 'bg-amber-950/40 text-amber-400 border border-amber-800' :
                                  door.status === 'blocked' ? 'bg-purple-950/40 text-purple-400 border border-purple-800' :
                                  'bg-red-950/40 text-red-500 border border-red-800 animate-pulse'
                                }`}>
                                  {door.status === 'unlocked' && '🔓 Déverrouillé'}
                                  {door.status === 'locked' && '🔒 Verrouillé'}
                                  {door.status === 'blocked' && '⏳ Bloqué'}
                                  {door.status === 'alarm_triggered' && '🚨 ALARME'}
                                </span>
                              </div>

                              <div className="flex justify-between items-center text-[8px] font-mono text-slate-400">
                                <span className="flex items-center gap-1">
                                  🔰 Requis : <strong className="text-violet-400">{door.requiredLevel.toUpperCase()}</strong>
                                </span>
                                <span>🔢 Code : <strong className="text-slate-300">{door.numpadCode}</strong></span>
                              </div>

                              {/* Action controls for door lock */}
                              <div className="flex gap-1.5 mt-1 flex-wrap">
                                {door.status === 'unlocked' ? (
                                  <button
                                    onClick={() => smartHouse.lock(door.id)}
                                    className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/30 text-amber-400 hover:text-amber-300 font-mono text-[9px] py-1 rounded transition cursor-pointer"
                                  >
                                    Verrouiller
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        const res = smartHouse.tryUnlockWithCard(door.id, smartHouse.playerCard!);
                                        alert(res.message);
                                      }}
                                      className="flex-1 bg-indigo-950/40 border border-indigo-800/40 hover:border-indigo-500 hover:bg-indigo-900/20 text-indigo-300 font-mono text-[8.5px] py-1 rounded transition cursor-pointer flex items-center justify-center gap-1"
                                    >
                                      💳 Badge
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedDoorIdForNumpad(selectedDoorIdForNumpad === door.id ? null : door.id);
                                        setNumpadEnteredCode('');
                                      }}
                                      className={`flex-1 font-mono text-[8.5px] py-1 rounded transition cursor-pointer flex items-center justify-center gap-1 border ${
                                        selectedDoorIdForNumpad === door.id
                                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                                          : 'bg-cyan-950/40 border-cyan-800/40 hover:border-cyan-500 text-cyan-300'
                                      }`}
                                    >
                                      🔢 Code
                                    </button>
                                    <button
                                      onClick={() => smartHouse.forceUnlock(door.id)}
                                      className="bg-slate-900 hover:bg-slate-850 text-slate-500 hover:text-slate-300 border border-slate-850 px-1.5 py-1 rounded text-[7px] font-mono uppercase cursor-pointer"
                                    >
                                      Force
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Interactive Numpad Overlay */}
                              {selectedDoorIdForNumpad === door.id && (
                                <div className="mt-2 bg-slate-950/80 p-2 rounded-lg border border-cyan-500/30 flex flex-col gap-1.5 animate-fade-in font-mono">
                                  <div className="flex justify-between items-center border-b border-slate-900 pb-1">
                                    <span className="text-[7px] text-slate-500 font-sans">CLAVIER</span>
                                    <span className="text-[10px] text-cyan-400 font-black tracking-widest bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
                                      {numpadEnteredCode || '----'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1 max-w-[140px] mx-auto mt-1">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((key) => (
                                      <button
                                        key={key}
                                        onClick={() => {
                                          if (key === 'C') {
                                            setNumpadEnteredCode('');
                                          } else if (key === 'OK') {
                                            const res = smartHouse.tryUnlockWithNumpad(door.id, numpadEnteredCode);
                                            alert(res.message);
                                            setNumpadEnteredCode('');
                                            setSelectedDoorIdForNumpad(null);
                                          } else {
                                            if (numpadEnteredCode.length < 8) {
                                              setNumpadEnteredCode(prev => prev + key);
                                            }
                                          }
                                        }}
                                        className={`py-1 text-[9px] font-black rounded text-center transition cursor-pointer border ${
                                          key === 'OK' ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500' :
                                          key === 'C' ? 'bg-rose-950/60 border-rose-800/60 text-rose-400 hover:bg-rose-900/60' :
                                          'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                        }`}
                                      >
                                        {key}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Access Card Configurator */}
                      <div className="bg-slate-950/30 border border-slate-850/60 rounded-xl p-2.5 flex flex-col gap-2 text-left">
                        <div className="flex items-center gap-1.5 border-b border-slate-900 pb-1.5">
                          <Key className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-[8.5px] font-mono font-bold text-violet-300">💳 ÉDITION DU BADGE RP D'ACCÈS DU JOUEUR</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[7.5px] text-slate-500 font-mono">Détenteur</span>
                            <input
                              type="text"
                              value={cardOwnerInput}
                              onChange={(e) => setCardOwnerInput(e.target.value)}
                              className="bg-slate-900 border border-slate-850 px-2 py-0.5 text-[9px] rounded text-white outline-none focus:border-violet-500"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[7.5px] text-slate-500 font-mono">Niveau de Badge</span>
                            <select
                              value={cardLevelInput}
                              onChange={(e) => setCardLevelInput(e.target.value as any)}
                              className="bg-slate-900 border border-slate-850 px-2 py-0.5 text-[9px] rounded text-slate-300 outline-none focus:border-violet-500"
                            >
                              <option value="none">none (Aucun)</option>
                              <option value="resident">resident (Résident)</option>
                              <option value="vip">vip (VIP)</option>
                              <option value="admin">admin (Gérant)</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-1 flex-wrap gap-2">
                          <label className="flex items-center gap-1.5 text-[8.5px] cursor-pointer text-slate-400">
                            <input
                              type="checkbox"
                              checked={cardActiveInput}
                              onChange={(e) => setCardActiveInput(e.target.checked)}
                              className="accent-violet-600 rounded"
                            />
                            Carte Active / Autorisée
                          </label>
                          <button
                            onClick={() => {
                              smartHouse.setPlayerCard({
                                id: 'CARD-101',
                                ownerName: cardOwnerInput,
                                level: cardLevelInput,
                                isActive: cardActiveInput,
                                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                              });
                            }}
                            className="bg-violet-600 hover:bg-violet-500 text-white text-[8px] font-bold px-2 py-1 rounded transition cursor-pointer"
                          >
                            Synchroniser Carte
                          </button>
                        </div>
                      </div>

                      {/* Security events logger */}
                      <div className="flex flex-col gap-1 mt-1 text-left">
                        <span className="text-[8px] font-mono font-bold text-slate-500">📋 JOURNAL D'AUDIT SÉCURITÉ DE LA PROPRIÉTÉ :</span>
                        <div className="bg-slate-950 border border-slate-900 p-2 rounded-lg font-mono text-[8px] max-h-[80px] overflow-y-auto flex flex-col gap-1">
                          {smartHouse.alarmEvents.length > 0 ? (
                            smartHouse.alarmEvents.map((evt) => (
                              <div key={evt.id} className="border-b border-slate-900/30 pb-0.5 leading-normal flex gap-1 last:border-0 text-left">
                                <span className={`font-bold shrink-0 ${
                                  evt.type === 'card_rejected' ? 'text-amber-400' :
                                  evt.type === 'failed_attempt' ? 'text-orange-400' :
                                  evt.type === 'forced_entry' ? 'text-red-500 animate-pulse' :
                                  'text-emerald-400'
                                }`}>
                                  [{evt.type.toUpperCase()}]
                                </span>
                                <span className="text-slate-400">{evt.details}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-600 italic">Aucun événement de sécurité consigné.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. OBJECT MODELER AI AGENT SECTION */}
                  {modelingTab === 'object' && (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-[9.5px] text-slate-400 leading-normal text-left">
                        📦 L'agent <strong>forge-factory</strong> conçoit des configurations 3D complètes et les ajoute directement au dôme. Indiquez la forme, la taille ou la fonction de l'objet.
                      </p>

                      <div className="flex flex-col gap-1.5">
                        <textarea
                          rows={2}
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Ex: un canapé rétro en cuir rouge brillant avec des accoudoirs en acier, taille 2.5x0.9x1"
                          disabled={isAiGenerating}
                          className="w-full bg-slate-950/80 border border-slate-850 hover:border-slate-800 p-2 text-[10.5px] rounded-lg text-white outline-none focus:border-cyan-500 resize-none font-sans"
                        />
                        <button
                          onClick={handleModelObjectAI}
                          disabled={isAiGenerating || !aiPrompt.trim()}
                          className="w-full py-1.5 bg-cyan-950/40 border border-cyan-800 hover:border-cyan-500 text-cyan-300 font-bold font-mono text-xs rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAiGenerating ? "⚡ GÉNÉRATION COGNITIVE EN COURS..." : "📦 FABRIQUER L'OBJET (AI AGENT)"}
                        </button>
                      </div>

                      {/* Generation steps loader */}
                      {isAiGenerating && (
                        <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-lg flex flex-col gap-1 font-mono text-[8.5px] text-left">
                          <span className="text-cyan-400 font-black animate-pulse uppercase">TRACE COGNITIVE (FORGE-FACTORY) :</span>
                          {aiTrace.map((line, idx) => (
                            <div key={idx} className="text-slate-300 animate-fade-in">
                              • {line}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Success block */}
                      {aiObjectResult && (
                        <div className="bg-cyan-950/20 border border-cyan-500/50 p-3 rounded-xl flex flex-col gap-2 animate-fade-in font-sans text-left">
                          <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-[11px]">
                            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                            ✔️ OBJET MODÉLISÉ PAR L'IA !
                          </div>
                          <div className="bg-slate-950/70 border border-slate-900 p-2.5 rounded-lg flex flex-col gap-1 text-[10px]">
                            <span className="text-slate-300 font-bold text-[11px] block">{aiObjectResult.name}</span>
                            <span className="text-slate-400 leading-snug italic mt-0.5 mb-1.5">"{aiObjectResult.description}"</span>
                            <div className="grid grid-cols-2 gap-1.5 font-mono text-[8.5px] text-slate-400 border-t border-slate-900 pt-1.5">
                              <div>Dimensions: {aiObjectResult.size?.join('x')} m</div>
                              <div>Catégorie: {aiObjectResult.category}</div>
                              <div>Prix: ${aiObjectResult.price}</div>
                              <div className="flex items-center gap-1">
                                Couleur: 
                                <span className="inline-block w-2.5 h-2.5 rounded-full border border-slate-800" style={{ backgroundColor: aiObjectResult.color }} />
                              </div>
                            </div>
                          </div>
                          <p className="text-[8.5px] text-slate-400 leading-relaxed text-center italic">
                            Ajouté au catalogue ! Appuyez sur [Q] en jeu pour faire apparaître ce prop.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. CHARACTER MODELER AI AGENT SECTION */}
                  {modelingTab === 'character' && (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-[9.5px] text-slate-400 leading-normal text-left">
                        👤 L'agent <strong>ether-prism</strong> génère des fiches personnages complètes. Indiquez la profession, l'apparence physique ou le passé RP souhaité.
                      </p>

                      <div className="flex flex-col gap-1.5">
                        <textarea
                          rows={2}
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Ex: une hackeuse rebelle cyber-punk avec des cheveux roses courts, une aura void violette et un costume d'agent"
                          disabled={isAiGenerating}
                          className="w-full bg-slate-950/80 border border-slate-850 hover:border-slate-800 p-2 text-[10.5px] rounded-lg text-white outline-none focus:border-amber-500 resize-none font-sans"
                        />
                        <button
                          onClick={handleModelCharacterAI}
                          disabled={isAiGenerating || !aiPrompt.trim()}
                          className="w-full py-1.5 bg-amber-950/40 border border-amber-800 hover:border-amber-500 text-amber-300 font-bold font-mono text-xs rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAiGenerating ? "⚡ CONCEPTION CRISTALLINE EN COURS..." : "👤 MODÉLISER L'AVATAR (AI AGENT)"}
                        </button>
                      </div>

                      {/* Generation steps loader */}
                      {isAiGenerating && (
                        <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-lg flex flex-col gap-1 font-mono text-[8.5px] text-left">
                          <span className="text-amber-400 font-black animate-pulse uppercase">TRACE COGNITIVE (ETHER-PRISM) :</span>
                          {aiTrace.map((line, idx) => (
                            <div key={idx} className="text-slate-300 animate-fade-in">
                              • {line}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Success block */}
                      {aiCharacterResult && (
                        <div className="bg-amber-950/20 border border-amber-500/50 p-3 rounded-xl flex flex-col gap-2 animate-fade-in font-sans text-left">
                          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-[11px]">
                            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                            ✔️ AVATAR MODÉLISÉ PAR L'IA !
                          </div>
                          <div className="bg-slate-950/70 border border-slate-900 p-2.5 rounded-lg flex flex-col gap-2 text-[10px]">
                            <div>
                              <span className="text-slate-200 font-extrabold text-[11px] block">{aiCharacterResult.name}</span>
                              <span className="text-[8.5px] font-mono text-amber-400 uppercase font-black">{aiCharacterResult.job} ({aiCharacterResult.gender})</span>
                            </div>
                            <p className="text-slate-400 leading-snug italic border-t border-slate-900 pt-1.5">"{aiCharacterResult.story}"</p>
                            <div className="grid grid-cols-2 gap-1.5 font-mono text-[8.5px] text-slate-400 border-t border-slate-900 pt-1.5">
                              <div>Aura: <span className="text-violet-400 uppercase font-black">{aiCharacterResult.aura}</span></div>
                              <div>Statut: {aiCharacterResult.status}</div>
                              <div>Cash: ${aiCharacterResult.cash}</div>
                              <div>Banque: ${aiCharacterResult.bank}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleApplyCharacterAvatar(aiCharacterResult)}
                            className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono text-[9px] rounded-lg transition cursor-pointer"
                          >
                            👤 APPLIQUER COMME MON AVATAR ACTIF
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Forge-Factory & Ether-Weave Integration Control Panel */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-3 font-sans">
                  <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider font-mono">
                    🏍️ COUPLAGE DÔME AGENTS ↔ SÉCURITÉ VÉHICULES
                  </span>
                  
                  {/* Step 1: Forge-Factory */}
                  <div className="flex flex-col gap-1.5 border-b border-slate-800/60 pb-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-200">Étape 1 : Générateur Forge-Factory</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        playerState.forgeFactoryStatus === 'generated'
                          ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/60'
                          : 'bg-slate-950 text-slate-500 border border-slate-900'
                      }`}>
                        {playerState.forgeFactoryStatus === 'generated' ? 'GÉNÉRÉ ✔' : 'EN ATTENTE'}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-normal">
                      Génère les configurations techniques et les courbes de couple/poussée optimales pour l'Hoverboard et le Balai Magique.
                    </p>
                    <button
                      onClick={onRunForgeFactory}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold tracking-wide transition font-mono border ${
                        playerState.forgeFactoryStatus === 'generated'
                          ? 'bg-slate-950/80 border-emerald-800/40 text-emerald-500 cursor-not-allowed'
                          : 'bg-cyan-950/40 border-cyan-800/60 hover:border-cyan-500/80 text-cyan-300 hover:bg-cyan-900/40 cursor-pointer'
                      }`}
                    >
                      {playerState.forgeFactoryStatus === 'generated'
                        ? '⚡ Spécifications techniques Forge-Factory générées'
                        : '⚙️ Lancer Forge-Factory (Générer Specs)'}
                    </button>
                    {playerState.forgeFactoryStatus === 'generated' && (
                      <div className="grid grid-cols-2 gap-2 mt-1 bg-slate-950/50 p-1.5 rounded border border-slate-900 font-mono text-[8px] text-slate-400">
                        <div>
                          <span className="text-cyan-400 font-bold block">🛹 HOVERBOARD STATS :</span>
                          • Poussée: {playerState.hoverboardStats?.power ?? 18} kW<br/>
                          • Vitesse: x{playerState.hoverboardStats?.speed ?? 2.8}<br/>
                          • Masse: {playerState.hoverboardStats?.mass ?? 12} kg
                        </div>
                        <div>
                          <span className="text-amber-400 font-bold block">🧹 BALAI MAGIQUE STATS :</span>
                          • Lévitation: {playerState.broomStats?.power ?? 12} kW<br/>
                          • Vitesse: x{playerState.broomStats?.speed ?? 2.2}<br/>
                          • Masse: {playerState.broomStats?.mass ?? 6} kg
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Ether-Weave */}
                  <div className="flex flex-col gap-1.5 border-b border-slate-800/60 pb-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-200">Étape 2 : Connecteur Ether-Weave</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        playerState.etherWeaveConnected
                          ? 'bg-indigo-950/50 text-indigo-400 border border-indigo-800/60'
                          : 'bg-slate-950 text-slate-500 border border-slate-900'
                      }`}>
                        {playerState.etherWeaveConnected ? 'CONNECTÉ ✔' : 'DÉCONNECTÉ'}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-normal">
                      Établit le pont d'événements physiques et injecte les configurations techniques générées au VehicleSystem actif du serveur.
                    </p>
                    <button
                      onClick={onRunEtherWeave}
                      disabled={playerState.forgeFactoryStatus !== 'generated'}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold tracking-wide transition font-mono border ${
                        playerState.etherWeaveConnected
                          ? 'bg-slate-950/80 border-indigo-800/40 text-indigo-400 cursor-not-allowed'
                          : playerState.forgeFactoryStatus !== 'generated'
                            ? 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed'
                            : 'bg-indigo-950/40 border-indigo-800/60 hover:border-indigo-500/80 text-indigo-300 hover:bg-indigo-900/40 cursor-pointer'
                      }`}
                    >
                      {playerState.etherWeaveConnected
                        ? '🔌 Tissage Ether-Weave complété sur VehicleSystem'
                        : '🔌 Câbler Ether-Weave (Connecter au Système)'}
                    </button>
                  </div>

                  {/* Step 3: Third Eye */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-200">Étape 3 : Audit de Risque Third Eye</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        playerState.thirdEyeRiskValidated
                          ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/60'
                          : 'bg-slate-950 text-slate-500 border border-slate-900'
                      }`}>
                        {playerState.thirdEyeRiskValidated ? 'RISQUE VALIDÉ' : 'NON ÉVALUÉ'}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-normal">
                      Analyse les vecteurs de friction, les boîtes de délimitation de collision du dôme et garantit un évitement des collisions à 100%.
                    </p>
                    <button
                      onClick={onRunThirdEyeCollisionValidation}
                      disabled={!playerState.etherWeaveConnected}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold tracking-wide transition font-mono border ${
                        playerState.thirdEyeRiskValidated
                          ? 'bg-slate-950/80 border-emerald-800/40 text-emerald-400 cursor-not-allowed'
                          : !playerState.etherWeaveConnected
                            ? 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed'
                            : 'bg-emerald-950/40 border-emerald-800/60 hover:border-emerald-500/80 text-emerald-300 hover:bg-emerald-900/40 cursor-pointer'
                      }`}
                    >
                      {playerState.thirdEyeRiskValidated
                        ? '👁️ Validation Third Eye validée avec succès (Risque GREEN)'
                        : '👁️ Évaluer Collision Third Eye (Score Risque)'}
                    </button>
                  </div>
                </div>

                {/* Live logger section */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8.5px] font-bold text-slate-400 font-mono">📋 TRACES D'AUDITS COGNITIFS (LIVE LOGS) :</span>
                    <span className="text-[8px] font-mono text-slate-500">Flux d'archivage</span>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-900 p-2.5 rounded-xl font-mono text-[9px] text-slate-300 flex flex-col gap-1.5 max-h-[11rem] overflow-y-auto pr-1 select-text scrollbar-thin">
                    {playerState.agentLogs && playerState.agentLogs.length > 0 ? (
                      playerState.agentLogs.map((log, idx) => (
                        <div key={idx} className="border-b border-slate-900/40 pb-1 last:border-0 leading-relaxed">
                          <span className="text-indigo-400 font-bold">●</span> {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 italic text-center py-4">
                        Attente d'événements du bus Arcadius...
                      </div>
                    )}
                  </div>
                </div>

                {/* 16 Agents listing */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[8.5px] font-bold text-slate-400 font-mono uppercase">🛡️ LES 16 AGENTS TROXT OFFICIELS :</span>
                  <div className="bg-slate-950/65 border border-slate-900 rounded-xl p-2.5 max-h-[12rem] overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
                    {[
                      { id: "ether-core", emoji: "📏", role: "Standardise les noms, IDs et conventions." },
                      { id: "ether-prism", emoji: "🎨", role: "Transforme les demandes en schémas RP importables." },
                      { id: "ether-forge", emoji: "🛠️", role: "Construit les modules Node et patterns Lua." },
                      { id: "ether-weave", emoji: "🔌", role: "Connecte économie, territoire, maisons et joueurs." },
                      { id: "ether-guard", emoji: "🛡️", role: "Protège les permissions, transactions et anti-abus." },
                      { id: "ether-ui", emoji: "💻", role: "Prépare l'HUD, les menus et l'UX joueur." },
                      { id: "ether-lens", emoji: "🔍", role: "Inspecte les bugs, failles et équilibre le RP." },
                      { id: "ether-sim", emoji: "🧪", role: "Simule les scénarios RP multi-joueurs." },
                      { id: "forge-factory", emoji: "📦", role: "Produit des items, props et configurations en masse." },
                      { id: "ether-deploy", emoji: "🚀", role: "Prépare une livraison stable sans coupure." },
                      { id: "ether-memory", emoji: "📝", role: "Mémorise les décisions, patterns et l'historique." },
                      { id: "troxt-third-eye", emoji: "👁️", role: "Surveille le risque avant exécution." },
                      { id: "arcadius", emoji: "⚡", role: "Bus d'événements priorisé." },
                      { id: "benedictus", emoji: "📜", role: "Contrats et validations structurées." },
                      { id: "momentus", emoji: "⏰", role: "Retry, timeout, concurrence et autosave." },
                      { id: "decaprius", emoji: "🎛️", role: "Commandes, rollback et télémétrie." },
                    ].map((ag) => (
                      <div key={ag.id} className="flex gap-2 items-center bg-slate-900/40 p-2 rounded-lg border border-slate-850/80 hover:border-violet-500/30 transition">
                        <span className="text-sm">{ag.emoji}</span>
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-mono font-bold text-violet-300">{ag.id}</span>
                          <span className="text-[9px] text-slate-400 font-sans leading-snug">{ag.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description of core agents */}
                <div className="bg-slate-900/20 border border-slate-850 p-2 rounded-lg text-[9px] text-slate-400 flex flex-col gap-1 leading-normal">
                  <span>💡 <strong>Cadre TroxT</strong> : 16 modules spécialisés opèrent en dôme pour surveiller le bac à sable, valider les collisions physiques et synchroniser les cycles.</span>
                </div>
              </div>
            )}

            {/* Tab 7 Content: REAL ESTATE & PROPERTY OWNERSHIP */}
            {activeTab === 'realestate' && (
              <div className="flex flex-col gap-2.5 text-xs animate-fade-in text-slate-100">
                <span className="text-[9px] font-black uppercase text-orange-400 tracking-wider font-mono">🏠 ACHAT & GESTION DE PROPRIÉTÉ (RE/MAX PORTNEUF)</span>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Achetez des propriétés d'habitation pour débloquer des clés, des zones de construction privées et verrouiller les portes d'entrée !
                </p>

                {/* List of properties */}
                <div className="flex flex-col gap-2 max-h-[14rem] overflow-y-auto pr-1 font-sans">
                  {[
                    {
                      id: 'villa_nova',
                      name: '🏡 Villa Nova (Premium Estate)',
                      desc: 'Villa de prestige contemporaine avec piscine, baie vitrée géante et étage privé accessible.',
                      price: 1200,
                      coords: 'X: 32, Z: 28'
                    },
                    {
                      id: 'modern_loft',
                      name: '🏢 Modern Loft (Style Industriel)',
                      desc: 'Appartement industriel avec dalles de béton polis et fenêtres noires. Un must-have GMod !',
                      price: 800,
                      coords: 'X: -32, Z: 28'
                    },
                    {
                      id: 'suburban_dream',
                      name: '🏡 Suburban Dream (Pavillon)',
                      desc: 'Pavillon de banlieue classique entouré de pelouse, idéal pour un aménagement de jardin.',
                      price: 400,
                      coords: 'X: 32, Z: -28'
                    }
                  ].map(property => {
                    const isOwned = playerState.boughtPropertyIds?.includes(property.id);
                    const canAfford = (playerState.cash ?? 0) >= property.price;

                    return (
                      <div
                        key={property.id}
                        className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition ${
                          isOwned
                            ? 'bg-orange-950/20 border-orange-500/80 text-white'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-[11px] text-slate-200">
                              {property.name}
                            </span>
                            <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                              📍 Localisation : <strong className="text-slate-300">{property.coords}</strong>
                            </span>
                          </div>
                          
                          {isOwned ? (
                            <span className="text-[8px] bg-orange-600 border border-orange-400 text-white font-black px-2 py-0.5 rounded-full font-mono flex items-center gap-1 uppercase">
                              🔑 POSSÉDÉ
                            </span>
                          ) : (
                            <button
                              onClick={() => onBuyProperty(property.id)}
                              disabled={!canAfford}
                              className={`px-2.5 py-1 text-[9px] font-black rounded-lg border cursor-pointer transition ${
                                canAfford
                                  ? 'bg-orange-600 hover:bg-orange-500 border-orange-400 text-white shadow-md'
                                  : 'bg-slate-800 border-slate-750 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              Acheter ${property.price}
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 leading-normal">
                          {property.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Keychain / Keyring Inventory display */}
                <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-xl flex flex-col gap-1.5">
                  <span className="text-[9px] font-black text-slate-400 font-mono">🔑 TROUSSEAU DE CLÉS (KEYRING INVENTORY) :</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {playerState.boughtPropertyIds && playerState.boughtPropertyIds.length > 0 ? (
                      playerState.boughtPropertyIds.map(houseId => (
                        <div key={houseId} className="bg-orange-950/60 border border-orange-900 px-2 py-1 rounded-lg flex items-center gap-1.5 text-[9px] text-orange-300 font-mono font-bold">
                          🔑 keyring_{houseId}
                        </div>
                      ))
                    ) : (
                      <div className="text-[9px] text-slate-500 italic py-1 font-mono">
                        Votre trousseau est vide. Achetez une propriété pour recevoir ses clés !
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* ─── MIDDLE HUD: DOOR OR BUILD SELECTION HIGHLIGHT ─── */}
      <div className="w-full flex flex-col gap-3 justify-center items-center my-auto">
        {playerState.nearMarchand && (
          <div className="bg-emerald-950/90 border-2 border-emerald-400 px-6 py-4 rounded-2xl flex flex-col items-center gap-2 shadow-2xl animate-bounce">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-lg font-black font-mono animate-pulse">🌿 BOB LE BOTANISTE 🌿</span>
              <span className="text-white font-extrabold text-sm font-mono uppercase tracking-wide">
                Marchand de Cannabis
              </span>
            </div>
            <p className="text-xs text-emerald-200 font-medium">
              Graines premium • Rachat de récolte • Plantation facile !
            </p>
            <p className="text-[11px] text-emerald-300 font-mono border-t border-emerald-900 pt-1.5 w-full text-center">
              Appuyez sur <kbd className="bg-emerald-900 px-2 py-1 rounded text-white font-bold border border-emerald-700 font-mono">E</kbd> pour parler au Marchand !
            </p>
          </div>
        )}

        {playerState.nearCantine && (
          <div className="bg-blue-950/90 border-2 border-blue-400 px-6 py-4 rounded-2xl flex flex-col items-center gap-2 shadow-2xl animate-bounce">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-lg font-black font-mono animate-pulse">⚜️ CANTINE DE PORTNEUF ⚜️</span>
              <span className="text-white font-extrabold text-sm font-mono uppercase tracking-wide">
                Chez Gaston
              </span>
            </div>
            <p className="text-xs text-blue-200 font-medium">
              Friteuse allumée • Poutine, blé d'inde, bière rousse !
            </p>
            <p className="text-[11px] text-blue-300 font-mono border-t border-blue-900 pt-1.5 w-full text-center">
              Appuyez sur <kbd className="bg-blue-900 px-2 py-1 rounded text-white font-bold border border-blue-700 font-mono">E</kbd> pour commander au comptoir !
            </p>
          </div>
        )}

        {playerState.nearGarment && (
          <div className="bg-slate-950/90 border-2 border-amber-500 px-6 py-4 rounded-2xl flex flex-col items-center gap-2 shadow-2xl animate-bounce">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-lg font-black font-mono animate-pulse">BOUTIQUE ÉTHER</span>
              <span className="text-white font-extrabold text-sm font-mono uppercase tracking-wide">
                {playerState.nearGarment.type}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Par <span className="text-amber-400 font-bold">{playerState.nearGarment.brand}</span> • <span className="text-emerald-400 font-bold">{playerState.nearGarment.price}</span>
            </p>
            <p className="text-[11px] text-slate-400 font-mono border-t border-slate-800 pt-1.5 w-full text-center">
              Appuyez sur <kbd className="bg-slate-800 px-2 py-1 rounded text-white font-bold border border-slate-600 font-mono">E</kbd> pour examiner et essayer
            </p>
          </div>
        )}

        {nearDoor && (
          <div className="bg-slate-950/90 border-2 border-indigo-500 px-6 py-4 rounded-2xl flex flex-col items-center gap-2 shadow-2xl animate-bounce">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500 text-white text-xs px-2.5 py-1 rounded-lg font-black font-mono animate-pulse">ACTION</span>
              <span className="text-white font-extrabold text-sm font-mono uppercase tracking-wide">
                Porte de {nearDoor.userData.houseId === 'villa_nova' ? 'Villa Nova' : nearDoor.userData.houseId === 'modern_loft' ? 'Modern Loft' : 'Suburban Dream'}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Appuyez sur <kbd className="bg-slate-800 px-2 py-1 rounded text-white font-bold border border-slate-600 font-mono">E</kbd> pour {nearDoor.userData.isOpen ? 'fermer' : 'ouvrir'} la porte
            </p>
            <div className="flex items-center gap-2 border-t border-slate-800 pt-2 w-full justify-center">
              <span className="text-[11px] text-slate-400 font-mono">Statut : {nearDoor.userData.locked ? '🔒 Verrouillé' : '🔓 Déverrouillé'}</span>
              <button
                onClick={onToggleDoorLock}
                className="ui-interactive pointer-events-auto bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2 py-0.5 rounded text-[10px] font-black font-mono cursor-pointer transition border border-slate-700"
              >
                [L] {nearDoor.userData.locked ? 'DÉVERROUILLER' : 'VERROUILLER'}
              </button>
            </div>
          </div>
        )}

        {/* Placed objects eraser info (when looking at objects but not placing) */}
        {!playerState.isBuilding && highlightedItemName && (
          <div className="bg-slate-950/90 border border-amber-500 px-5 py-3 rounded-xl flex flex-col items-center gap-1 shadow-2xl">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-wider font-mono">Objet Pointé : {highlightedItemName}</span>
            <span className="text-[11px] text-slate-300 font-medium">
              Appuyez sur <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white border border-slate-600 font-mono">X</kbd> ou <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white border border-slate-600 font-mono">Suppr</kbd> pour supprimer cet objet.
            </span>
          </div>
        )}
      </div>

      {/* ─── BOTTOM ROW HUD ─── */}
      <div className="w-full flex justify-between items-end">
        
        {/* Radar & Status meters */}
        <div className="flex items-end gap-4">
          {/* Radar canvas */}
          <div className="relative border-4 border-slate-900 rounded-full overflow-hidden shadow-2xl bg-slate-950">
            <canvas
              ref={mapCanvasRef}
              width={160}
              height={160}
              className="block"
            />
          </div>

          {/* Status Bars (GTA Style horizontal gauges) */}
          <div className="flex flex-col gap-2 bg-slate-950/85 border border-slate-800/80 p-3 rounded-xl shadow-2xl w-48 font-mono">
            {/* CASH DISPLAY */}
            <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-800">
              <span className="text-[10px] font-black text-slate-400 uppercase">Cash</span>
              <span className="text-xl font-black text-emerald-400 font-mono tracking-wide">${playerState.cash.toLocaleString()}</span>
            </div>
            {/* Health */}
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[9px] font-bold text-red-400 uppercase">
                <span className="flex items-center gap-1"><Heart className="w-2.5 h-2.5 fill-red-400" /> Santé</span>
                <span>{playerState.health}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${playerState.health}%` }} />
              </div>
            </div>
            {/* Stamina */}
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[9px] font-bold text-sky-400 uppercase">
                <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5 fill-sky-400" /> Stamina</span>
                <span>{playerState.isSprinting ? 'Sprinting' : '100%'}</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full bg-sky-400 rounded-full ${playerState.isSprinting ? 'animate-pulse' : ''}`} style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Active Builder Status helper */}
        {playerState.isBuilding && activeItem && (
          <div className="bg-slate-950/90 border-2 border-indigo-500/80 p-4 rounded-xl max-w-sm flex flex-col gap-2 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500 rounded-lg text-slate-950">
                <Armchair className="w-4 h-4 text-slate-950 fill-slate-950" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider font-mono">Mode Construction GMod</span>
                <h4 className="text-white font-extrabold text-sm">{activeItem.name}</h4>
              </div>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">{activeItem.description}</p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
              <div className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Largeur: <span className="text-white font-bold">{activeItem.size[0]}m</span>
              </div>
              <div className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Hauteur: <span className="text-white font-bold">{activeItem.size[1]}m</span>
              </div>
              <div className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Snap Grille: <span className="text-white font-bold">{playerState.gridSnapSize}m</span>
              </div>
            </div>
            
            {/* Guide controls */}
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg flex flex-col gap-1 text-[10px] font-mono text-slate-300 mt-1">
              <span className="text-indigo-400 font-bold mb-1 uppercase tracking-wide flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Guide des Contrôles :
              </span>
              <div className="flex justify-between">
                <span>Placer l'objet</span>
                <span className="text-white font-bold">CLIC-GAUCHE</span>
              </div>
              <div className="flex justify-between">
                <span>Tourner (45°)</span>
                <span className="text-white font-bold">TOUCHE [R]</span>
              </div>
              <div className="flex justify-between">
                <span>Changer distance</span>
                <span className="text-white font-bold">MOLETTE SOURIS</span>
              </div>
            </div>
          </div>
        )}

        {/* Dojo Martial Arts Moves Panel [1, 2, 3, 4] */}
        {isDojoVisible && (
          <div className="bg-slate-950/85 border border-slate-800 p-4 rounded-xl flex flex-col gap-2 shadow-2xl max-w-sm pointer-events-auto relative">
            <div className="flex justify-between items-center border-b border-slate-850 pb-1.5 mb-1">
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                🥋 Dojo d'Entraînement
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-bold font-mono">
                  ARTS MARTIAUX
                </span>
                <button
                  onClick={() => setIsDojoVisible(false)}
                  className="p-1 rounded text-slate-500 hover:text-slate-300 transition text-[10px] font-bold cursor-pointer"
                  title="Masquer le panneau"
                >
                  ✕
                </button>
              </div>
            </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onExecuteCombat('punch')}
              className={`p-2 rounded-lg border text-left flex flex-col cursor-pointer transition duration-150 transform hover:scale-[1.02] ${
                playerState.activeCombatMove === 'punch'
                  ? 'bg-red-950 border-red-500 text-red-200 shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-red-500 text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-xs font-extrabold flex items-center gap-1">🥊 Jab Gauche</span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">Touche [1] / [J] • 2.4m</span>
            </button>

            <button
              onClick={() => onExecuteCombat('punch')}
              className={`p-2 rounded-lg border text-left flex flex-col cursor-pointer transition duration-150 transform hover:scale-[1.02] ${
                playerState.activeCombatMove === 'punch'
                  ? 'bg-red-950 border-red-500 text-red-200 shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-red-500 text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-xs font-extrabold flex items-center gap-1">🥊 Crochet Droit</span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">Touche [K] • 2.4m</span>
            </button>

            <button
              onClick={() => onExecuteCombat('kick')}
              className={`p-2 rounded-lg border text-left flex flex-col cursor-pointer transition duration-150 transform hover:scale-[1.02] ${
                playerState.activeCombatMove === 'kick'
                  ? 'bg-amber-950 border-amber-500 text-amber-200 shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-amber-500 text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-xs font-extrabold flex items-center gap-1">⚡ Coup de Pied</span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">Touche [2] / [L] • 2.8m</span>
            </button>

            <button
              onClick={() => onExecuteCombat('headbutt')}
              className={`p-2 rounded-lg border text-left flex flex-col cursor-pointer transition duration-150 transform hover:scale-[1.02] ${
                playerState.activeCombatMove === 'headbutt'
                  ? 'bg-amber-950 border-amber-500 text-amber-200 shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-amber-500 text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-xs font-extrabold flex items-center gap-1">💀 Coup de Tête</span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">Touche [I] • 1.9m</span>
            </button>

            <button
              onClick={() => onExecuteCombat('grab')}
              className={`p-2 rounded-lg border text-left flex flex-col cursor-pointer transition duration-150 transform hover:scale-[1.02] ${
                playerState.activeCombatMove === 'grab'
                  ? 'bg-blue-950 border-blue-500 text-blue-200 shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-blue-500 text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-xs font-extrabold flex items-center gap-1">🧲 Empoigner / Tirer</span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">Touche [U] • 2.0m</span>
            </button>

            <button
              onClick={() => onExecuteCombat('backflip')}
              className={`p-2 rounded-lg border text-left flex flex-col cursor-pointer transition duration-150 transform hover:scale-[1.02] ${
                playerState.activeCombatMove === 'backflip'
                  ? 'bg-purple-950 border-purple-500 text-purple-200 shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-purple-500 text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-xs font-extrabold flex items-center gap-1">🌀 Salto Arrière</span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">Touche [3] • Saut</span>
            </button>

            <button
              onClick={() => onExecuteCombat('sweep')}
              className={`p-2 rounded-lg border text-left flex flex-col cursor-pointer transition duration-150 transform hover:scale-[1.02] ${
                playerState.activeCombatMove === 'sweep'
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-200 shadow-md'
                  : 'bg-slate-900 border-slate-800 hover:border-emerald-500 text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span className="text-xs font-extrabold flex items-center gap-1">🧹 Balayage 360°</span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">Touche [4] • Rotation</span>
            </button>
          </div>

          <div className="text-[9px] text-slate-400 font-mono mt-1 text-center bg-slate-900/60 p-1 rounded border border-slate-850">
            💡 Allez au <span className="text-indigo-400 font-bold">Dojo (Zone Nord-Est)</span> pour frapper les mannequins physiques !
          </div>
          </div>
        )}

        {/* General Controls help card */}
        {isGuideVisible && (
          <div className="bg-slate-950/85 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-1.5 shadow-2xl max-w-xs font-mono text-[10px] relative">
            <span className="text-indigo-400 font-extrabold uppercase tracking-widest border-b border-slate-800 pb-1 mb-1 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5" /> Guide d'Interaction RP</span>
              <button
                onClick={() => setIsGuideVisible(false)}
                className="p-1 rounded text-slate-500 hover:text-slate-300 transition text-[10px] font-bold cursor-pointer"
                title="Masquer le guide"
              >
                ✕
              </button>
            </span>
          <div className="flex justify-between text-slate-300">
            <span>Déplacements</span>
            <span className="text-white font-bold">ZQSD / WASD</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Courir (Sprint)</span>
            <span className="text-white font-bold">SHIFT (MAJ)</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Sauter / Voler haut</span>
            <span className="text-white font-bold">ESPACE</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Voler bas (Balai)</span>
            <span className="text-white font-bold">CTRL-GAUCHE / C</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Coups Speciaux</span>
            <span className="text-amber-400 font-mono font-bold">CLICK-DROIT</span>
          </div>
        </div>
      )}

      </div>

      {/* ─── NOUVEAU MENU MARCHAND ET INVENTAIRE GLISSANT (SPLIT-PANE SIDEBAR) ─── */}
      {(playerState.examinedMarchand || playerState.examinedCantine) && (() => {
        // Define item database
        interface ItemData {
          id: string;
          name: string;
          category: 'Botanique' | 'Consommables' | 'Armes' | 'Meubles';
          weight: number; // in kg
          rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
          effect: string;
          price: number;
          sellPrice: number;
          icon: string;
          description: string;
        }

        const MERCHANT_ITEMS: ItemData[] = [
          // Botanique
          { id: 'weed_seed', name: 'Graine de Cannabis', category: 'Botanique', weight: 0.01, rarity: 'Common', effect: 'Permet de planter un plant de cannabis à vos pieds [E]', price: 15, sellPrice: 10, icon: '🌱', description: 'Une graine de qualité supérieure sélectionnée par Bob.' },
          { id: 'seed_pack', name: 'Pack de 5 Graines', category: 'Botanique', weight: 0.05, rarity: 'Rare', effect: 'Donne 5 graines de cannabis d\'un coup', price: 70, sellPrice: 45, icon: '📦', description: 'Pack économique de graines robustes prêtes à germer.' },
          { id: 'weed_bud', name: 'Tête de Cannabis (Sec)', category: 'Botanique', weight: 0.05, rarity: 'Rare', effect: 'Ressource récoltée à haute valeur de revente', price: 100, sellPrice: 50, icon: '🍁', description: 'Fleurs séchées et résineuses cultivées localement dans le dôme.' },
          
          // Consommables
          { id: 'poutine', name: 'Poutine de Portneuf', category: 'Consommables', weight: 0.8, rarity: 'Epic', effect: 'Restaure 100% de votre Santé !', price: 8, sellPrice: 5, icon: '🍟', description: 'Le classique québécois ultime avec de véritables grains squouich-squouich.' },
          { id: 'corn', name: 'Blé d\'Inde de Neuville', category: 'Consommables', weight: 0.25, rarity: 'Common', effect: 'Restaure 30% de Santé', price: 3, sellPrice: 1, icon: '🌽', description: 'Maïs extra-doux fraîchement récolté de Neuville, beurré et cuit.' },
          { id: 'taffy', name: 'Tire d\'Érable Locale', category: 'Consommables', weight: 0.15, rarity: 'Rare', effect: 'Restaure 40% de Santé', price: 4, sellPrice: 2, icon: '🍁', description: 'Sirop d\'érable pur bouilli et figé sur de la glace pure.' },
          { id: 'beer', name: 'Bière Rousse Boréale', category: 'Consommables', weight: 0.5, rarity: 'Common', effect: 'Restaure 20% Santé + Effet Visuel Drunk de l\'Éther', price: 5, sellPrice: 3, icon: '🍺', description: 'Bière rousse de microbrasserie du terroir de Portneuf.' },
          { id: 'ether_potion', name: 'Fiole d\'Éther Cosmique', category: 'Consommables', weight: 0.1, rarity: 'Legendary', effect: 'Vitesse de Course Folle (+18.5 m/s) pendant 10s !', price: 45, sellPrice: 25, icon: '🔮', description: 'Un condensé gazeux de l\'Éther du dôme de simulation.' },
          { id: 'tourtiere', name: 'Tourtière de Gaston', category: 'Consommables', weight: 1.2, rarity: 'Legendary', effect: 'Restaure 100% Santé + 20% Bonus de points de Vie max !', price: 25, sellPrice: 15, icon: '🥧', description: 'Célèbre tourtière du terroir mijotée avec trois viandes.' },

          // Armes
          { id: 'pipe', name: 'Tuyau de Plomb Rigide', category: 'Armes', weight: 2.2, rarity: 'Common', effect: 'Dégâts de mêlée : +20 HP (Vitesse standard)', price: 60, sellPrice: 30, icon: '🔧', description: 'Solide tuyau métallique parfait pour se faire respecter.' },
          { id: 'bat', name: 'Batte Cloutée', category: 'Armes', weight: 3.5, rarity: 'Rare', effect: 'Dégâts de mêlée : +25 HP (Force d\'impact accrue)', price: 150, sellPrice: 80, icon: '🏏', description: 'Batte de baseball classique customisée avec des pointes acérées.' },
          { id: 'bottle', name: 'Bouteille Cassée', category: 'Armes', weight: 0.4, rarity: 'Common', effect: 'Dégâts de mêlée : +15 HP (Vitesse d\'attaque maximale !)', price: 40, sellPrice: 20, icon: '🍾', description: 'Tranchante et extrêmement légère pour enchaîner les coups.' },
          { id: 'hammer', name: 'Masse de Chantier', category: 'Armes', weight: 10.0, rarity: 'Legendary', effect: 'Dégâts de mêlée : +45 HP (Knockback de zone important !)', price: 300, sellPrice: 150, icon: '🔨', description: 'Lourde masse de démolition. Réservée aux profils à haute force physique.' },
          { id: 'sword', name: 'Épée d\'Honneur en Or', category: 'Armes', weight: 4.8, rarity: 'Legendary', effect: 'Dégâts de mêlée : +60 HP (Portée augmentée !)', price: 450, sellPrice: 220, icon: '⚔️', description: 'Une lame d\'or gravée d\'armoiries cosmiques.' },

          // Meubles
          { id: 'golden_throne', name: 'Trône Royal Doré', category: 'Meubles', weight: 150.0, rarity: 'Legendary', effect: 'Débloque le Trône Doré GMod [Q]', price: 450, sellPrice: 225, icon: '👑', description: 'Le trône ultime sculpté dans l\'or pur d\'EtherWorld.' },
          { id: 'couch_nova', name: 'Canapé Luxury Nova', category: 'Meubles', weight: 65.0, rarity: 'Epic', effect: 'Débloque le Canapé Luxueux GMod [Q]', price: 200, sellPrice: 100, icon: '🛋️', description: 'Un sofa très confortable parfait pour les intérieurs modernes.' },
          { id: 'fridge_chrome', name: 'Frigo Américain Chrome', category: 'Meubles', weight: 110.0, rarity: 'Epic', effect: 'Débloque le Réfrigérateur GMod [Q]', price: 500, sellPrice: 250, icon: '❄️', description: 'Gros réfrigérateur avec distributeur de glaçons.' },
          { id: 'lcd_tv', name: 'Téléviseur OLED 65 pouces', category: 'Meubles', weight: 22.0, rarity: 'Epic', effect: 'Débloque le téléviseur OLED GMod [Q]', price: 300, sellPrice: 150, icon: '📺', description: 'Un écran plat connecté de très grande diagonale.' }
        ];

        const isBob = playerState.examinedMarchand;
        const merchantTitle = isBob ? "🌿 BOB LE BOTANISTE" : "⚜️ GASTON DE PORTNEUF";
        const merchantSubtitle = isBob 
          ? "Dispensaire local de graines & Rachat de têtes à fort taux" 
          : "La roulotte gourmande du terroir • Poutine & Tire d'érable";
        const merchantIcon = isBob ? "🌿" : "🍟";
        const merchantThemeColor = isBob ? "border-emerald-500" : "border-blue-500";
        const merchantHeaderBg = isBob ? "bg-gradient-to-r from-emerald-900 to-teal-950" : "bg-gradient-to-r from-blue-900 to-indigo-950";

        // Current catalog filtered by search and category
        const currentShopCatalog = MERCHANT_ITEMS.filter(item => {
          // Specialization
          const isItemAllowedForBob = item.category === 'Botanique' || item.category === 'Armes';
          const isItemAllowedForGaston = item.category === 'Consommables' || item.category === 'Meubles';
          
          if (isBob && !isItemAllowedForBob) return false;
          if (!isBob && !isItemAllowedForGaston) return false;

          // Filter by category
          if (shopCategoryFilter !== 'All') {
            if (shopCategoryFilter === 'Botanique' && item.category !== 'Botanique') return false;
            if (shopCategoryFilter === 'Consommables' && item.category !== 'Consommables') return false;
            if (shopCategoryFilter === 'Armes' && item.category !== 'Armes') return false;
            if (shopCategoryFilter === 'Meubles' && item.category !== 'Meubles') return false;
          }

          // Filter by search query
          if (shopSearchQuery.trim()) {
            const query = shopSearchQuery.toLowerCase();
            return item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
          }

          return true;
        });

        // Compute Player backpack contents
        const backpackEntries = [
          { item: MERCHANT_ITEMS.find(i => i.id === 'weed_seed')!, qty: playerState.weedSeeds || 0 },
          { item: MERCHANT_ITEMS.find(i => i.id === 'weed_bud')!, qty: playerState.weedBuds || 0 },
          { item: MERCHANT_ITEMS.find(i => i.id === 'poutine')!, qty: localInventory.poutine || 0 },
          { item: MERCHANT_ITEMS.find(i => i.id === 'corn')!, qty: localInventory.corn || 0 },
          { item: MERCHANT_ITEMS.find(i => i.id === 'taffy')!, qty: localInventory.taffy || 0 },
          { item: MERCHANT_ITEMS.find(i => i.id === 'beer')!, qty: localInventory.beer || 0 },
          { item: MERCHANT_ITEMS.find(i => i.id === 'ether_potion')!, qty: localInventory.ether_potion || 0 },
          { item: MERCHANT_ITEMS.find(i => i.id === 'tourtiere')!, qty: localInventory.tourtiere || 0 },
          { item: MERCHANT_ITEMS.find(i => i.id === 'pipe')!, qty: localInventory.pipe || 0 },
          { item: MERCHANT_ITEMS.find(i => i.id === 'bat')!, qty: localInventory.bat || 0 },
          { item: MERCHANT_ITEMS.find(i => i.id === 'bottle')!, qty: localInventory.bottle || 0 },
          { item: MERCHANT_ITEMS.find(i => i.id === 'hammer')!, qty: localInventory.hammer || 0 },
          { item: MERCHANT_ITEMS.find(i => i.id === 'sword')!, qty: localInventory.sword || 0 }
        ].filter(e => e.qty > 0 || e.item.id === 'weed_seed' || e.item.id === 'weed_bud');

        // Calculate total weight of backpack
        const totalBackpackWeight = backpackEntries.reduce((acc, entry) => acc + (entry.item.weight * entry.qty), 0);
        const maxBackpackCapacity = 50.0; // max kg

        // Buy item logic
        const handleBuyItem = (item: ItemData) => {
          if (playerState.cash < item.price) {
            alert(`Pas assez d'argent ! Requis: $${item.price}, Solde: $${playerState.cash}`);
            return;
          }

          // Specialized items:
          if (item.id === 'weed_seed') {
            if (onBuyWeedSeed) onBuyWeedSeed();
            return;
          }
          if (item.id === 'seed_pack') {
            if (onBuySeedPack) onBuySeedPack();
            return;
          }
          if (item.id === 'weed_bud') {
            alert("Vous ne pouvez pas acheter de bourgeons de cannabis séchés, Bob les achète uniquement !");
            return;
          }

          // If Meubles (building props): unlock them for GMod Spawn Menu directly!
          if (item.category === 'Meubles') {
            if (onUnlockFurniture) {
              onUnlockFurniture(item.id, item.price);
            }
            return;
          }

          // If general Consumable or Weapon:
          if (onExecuteConsoleCommand) {
            const res = onExecuteConsoleCommand(`/cash -${item.price}`);
            if (res.success) {
              setLocalInventory(prev => ({
                ...prev,
                [item.id]: (prev[item.id] || 0) + 1
              }));
              onExecuteConsoleCommand(`/echo 🎒 ACHAT : Vous avez acheté 1x ${item.name} pour $${item.price} !`);
            }
          }
        };

        // Sell item logic (including Quick Sell)
        const handleSellItem = (item: ItemData) => {
          // Special cases
          if (item.id === 'weed_seed') {
            if (playerState.weedSeeds > 0) {
              if (onExecuteConsoleCommand) {
                onExecuteConsoleCommand(`/seeds -1`);
                onExecuteConsoleCommand(`/cash 10`);
                onExecuteConsoleCommand(`/echo 💸 REVENTE : Vendu 1x Graine de Cannabis pour +$10.`);
              }
            }
            return;
          }
          if (item.id === 'weed_bud') {
            if (onSellBud) onSellBud();
            return;
          }

          // Backpack custom items
          const currentQty = localInventory[item.id] || 0;
          if (currentQty <= 0) return;

          if (onExecuteConsoleCommand) {
            onExecuteConsoleCommand(`/cash ${item.sellPrice}`);
            setLocalInventory(prev => ({
              ...prev,
              [item.id]: Math.max(0, currentQty - 1)
            }));
            onExecuteConsoleCommand(`/echo 💸 REVENTE : Vendu 1x ${item.name} pour +$${item.sellPrice}.`);
          }
        };

        // Use Consumable logic
        const handleUseConsumable = (item: ItemData) => {
          const currentQty = localInventory[item.id] || 0;
          if (currentQty <= 0) return;

          // Decrement inventory
          setLocalInventory(prev => ({
            ...prev,
            [item.id]: Math.max(0, currentQty - 1)
          }));

          // Trigger standard game-manager side-effect
          if (item.id === 'poutine' || item.id === 'corn' || item.id === 'taffy' || item.id === 'beer') {
            if (onBuyCantineItem) {
              if (onExecuteConsoleCommand) {
                const origCost = item.id === 'poutine' ? 8 : item.id === 'corn' ? 3 : item.id === 'taffy' ? 4 : 5;
                onExecuteConsoleCommand(`/cash ${origCost}`);
                onBuyCantineItem(item.id as any);
              }
            }
          } else if (item.id === 'ether_potion') {
            if (onExecuteConsoleCommand) {
              onExecuteConsoleCommand(`/heal 100`);
              onExecuteConsoleCommand(`/speed 18.5`);
              onExecuteConsoleCommand(`/echo 🔮 ÉTHER : Fiole d'éther consommée ! Vitesse de déplacement décuplée !`);
              
              setTimeout(() => {
                onExecuteConsoleCommand(`/speed 5.0`);
                onExecuteConsoleCommand(`/echo 🔮 ÉTHER : L'effet de l'Éther Cosmique se dissipe.`);
              }, 10000);
            }
          } else if (item.id === 'tourtiere') {
            if (onExecuteConsoleCommand) {
              onExecuteConsoleCommand(`/heal 100`);
              onExecuteConsoleCommand(`/echo 🥧 REPAS : Tourtière mangée ! Vous vous sentez d'une solidité légendaire.`);
            }
          }
        };

        // Equip Weapon logic
        const handleEquipWeapon = (item: ItemData) => {
          if (onExecuteConsoleCommand) {
            onExecuteConsoleCommand(`/setweapon ${item.id}`);
          }
        };

        // Close action
        const handleClosePanel = () => {
          if (isBob && onCloseMarchand) onCloseMarchand();
          if (!isBob && onCloseCantine) onCloseCantine();
        };

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-end z-50 p-0 overflow-hidden font-sans pointer-events-auto">
            {/* Background Escape Clocker */}
            <div className="absolute inset-0 cursor-pointer" onClick={handleClosePanel}></div>

            {/* Slide Out Trading Panel Container */}
            <div className={`relative h-full w-[850px] max-w-full bg-[#050912]/98 border-l border-slate-800 flex flex-col shadow-[-15px_0_45px_rgba(0,0,0,0.9)] animate-slide-in z-50 overflow-hidden`}>
              
              {/* Header */}
              <div className={`${merchantHeaderBg} text-white px-6 py-5 flex justify-between items-center relative border-b-2 border-slate-800`}>
                <div className="absolute top-2 left-3 text-xs opacity-20">{merchantIcon}</div>
                <div className="absolute top-2 right-3 text-xs opacity-20">{merchantIcon}</div>
                
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-2xl border border-white/20">
                    {merchantIcon}
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-wider text-slate-100 font-mono flex items-center gap-2">
                      {merchantTitle}
                    </h3>
                    <p className="text-xs text-slate-300 font-medium font-sans mt-0.5">
                      {merchantSubtitle}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={handleClosePanel}
                  className="bg-slate-950/60 hover:bg-red-600/90 border border-slate-800 hover:border-red-500 text-slate-400 hover:text-white px-4 py-2 rounded-xl transition font-mono font-black text-xs cursor-pointer flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> FERMER [X]
                </button>
              </div>

              {/* SPLIT SCREEN BODY */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950/40">
                
                {/* ─── LEFT COLUMN: MERCHANT SHOP ─── */}
                <div className="w-full md:w-1/2 border-r border-slate-900 flex flex-col overflow-hidden">
                  
                  {/* Shop Top bar with filters and search */}
                  <div className="p-4 bg-[#0a0f1d]/80 border-b border-slate-900 flex flex-col gap-3">
                    
                    {/* Search box */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input 
                        type="text"
                        placeholder="Rechercher un article..."
                        value={shopSearchQuery}
                        onChange={(e) => setShopSearchQuery(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80"
                      />
                    </div>

                    {/* Filter categories */}
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none font-mono text-[10px]">
                      {(['All', 'Botanique', 'Consommables', 'Armes', 'Meubles'] as const).map(cat => {
                        const isSelected = shopCategoryFilter === cat;
                        // Skip irrelevant filters for specialized merchants
                        if (isBob && cat === 'Consommables') return null;
                        if (!isBob && cat === 'Botanique') return null;
                        return (
                          <button
                            key={cat}
                            onClick={() => setShopCategoryFilter(cat)}
                            className={`px-2.5 py-1.5 rounded-lg border transition font-bold whitespace-nowrap cursor-pointer ${
                              isSelected 
                                ? 'bg-indigo-600 border-indigo-500 text-white font-black' 
                                : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {cat === 'All' ? '🌐 TOUT' : cat.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Shop Items List */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 scrollbar-thin">
                    {currentShopCatalog.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 font-mono text-xs">
                        Aucun article correspondant dans cette boutique.
                      </div>
                    ) : (
                      currentShopCatalog.map(item => {
                        const canBuy = playerState.cash >= item.price;
                        const isUnlockedMeuble = item.category === 'Meubles' && playerState.unlockedFurnitureIds?.includes(item.id);

                        return (
                          <div 
                            key={item.id}
                            className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-850 hover:border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-4 transition group cursor-pointer"
                            onMouseEnter={(e) => {
                              setHoveredItem(item);
                              setTooltipPos({ x: e.clientX - 310, y: Math.min(window.innerHeight - 340, e.clientY - 50) });
                            }}
                            onMouseMove={(e) => {
                              setTooltipPos({ x: e.clientX - 310, y: Math.min(window.innerHeight - 340, e.clientY - 50) });
                            }}
                            onMouseLeave={() => setHoveredItem(null)}
                          >
                            <div className="flex gap-3 items-center min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-center text-xl shrink-0">
                                {item.icon}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-black text-slate-200 font-mono truncate leading-tight group-hover:text-indigo-400 transition">
                                    {item.name}
                                  </h4>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5 leading-tight">
                                  {item.description}
                                </p>
                                <span className={`inline-block text-[8px] font-mono font-extrabold mt-1 px-1.5 py-0.2 rounded uppercase ${
                                  item.rarity === 'Legendary' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' :
                                  item.rarity === 'Epic' ? 'bg-purple-950/40 text-purple-400 border border-purple-900/30' :
                                  item.rarity === 'Rare' ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30' :
                                  'bg-slate-950/40 text-slate-400 border border-slate-900'
                                }`}>
                                  {item.rarity} • {item.weight} kg
                                </span>
                              </div>
                            </div>

                            {/* Buy controls */}
                            <div className="shrink-0 flex items-center">
                              {isUnlockedMeuble ? (
                                <span className="text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 px-2 py-1 rounded-lg font-black font-mono">
                                  DÉBLOQUÉ
                                </span>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBuyItem(item);
                                  }}
                                  disabled={!canBuy}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-black transition flex flex-col items-center min-w-[70px] cursor-pointer ${
                                    canBuy 
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md' 
                                      : 'bg-slate-900 border border-slate-850 text-slate-500 disabled:opacity-50'
                                  }`}
                                >
                                  <span>ACHETER</span>
                                  <span className="opacity-90 text-[9px] mt-0.5 font-bold">${item.price}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ─── RIGHT COLUMN: PLAYER INVENTORY BACKPACK ─── */}
                <div className="w-full md:w-1/2 flex flex-col overflow-hidden bg-slate-950/60 relative">
                  
                  {/* Backpack stats banner */}
                  <div className="p-4 bg-[#0a0f1d]/50 border-b border-slate-900 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-indigo-300 font-mono tracking-wider flex items-center gap-1.5">
                        🎒 VOTRE SAC-À-DOS
                      </span>
                      <div className="flex items-center gap-1 font-mono text-emerald-400 font-black text-xs">
                        <Coins className="w-3.5 h-3.5" />
                        <span>${playerState.cash}</span>
                      </div>
                    </div>

                    {/* Weight gauge */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span className="flex items-center gap-1"><Weight className="w-3 h-3 text-slate-500" /> Charge utile :</span>
                        <span className="font-extrabold text-slate-300">{totalBackpackWeight.toFixed(2)} / {maxBackpackCapacity} kg</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            (totalBackpackWeight / maxBackpackCapacity) > 0.8 ? 'bg-red-500' :
                            (totalBackpackWeight / maxBackpackCapacity) > 0.5 ? 'bg-amber-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${Math.min(100, (totalBackpackWeight / maxBackpackCapacity) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* QUICK SELL MODE TOGGLE */}
                    <div className={`p-2.5 rounded-xl border transition duration-300 flex items-center justify-between ${
                      quickSellActive 
                        ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
                        : 'bg-slate-900/40 border-slate-850'
                    }`}>
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black font-mono ${quickSellActive ? 'text-amber-400' : 'text-slate-300'}`}>
                          ⚡ MODE VENTE RAPIDE
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium leading-none mt-0.5">
                          Un clic sur l'inventaire convertit l'objet en cash
                        </span>
                      </div>
                      <button
                        onClick={() => setQuickSellActive(!quickSellActive)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black font-mono transition cursor-pointer border ${
                          quickSellActive 
                            ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md animate-pulse' 
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {quickSellActive ? '🔴 EN COURS' : '⚪ DÉSACTIVÉ'}
                      </button>
                    </div>
                  </div>

                  {/* Backpack Items Grid */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-thin">
                    {backpackEntries.length === 0 ? (
                      <div className="text-center py-16 text-slate-500 font-mono text-xs">
                        Votre sac-à-dos est entièrement vide.
                      </div>
                    ) : (
                      backpackEntries.map(({ item, qty }) => {
                        const isWeapon = item.category === 'Armes';
                        const isConsumable = item.category === 'Consommables';
                        const isSeed = item.id === 'weed_seed';
                        const isBud = item.id === 'weed_bud';
                        const isEquippedWeapon = isWeapon && playerState.currentWeapon === item.id;

                        return (
                          <div
                            key={item.id}
                            className={`border rounded-xl p-3 flex items-center justify-between gap-4 transition group cursor-pointer ${
                              quickSellActive 
                                ? 'bg-amber-950/10 hover:bg-amber-950/20 border-amber-950/60 hover:border-amber-500/60 shadow-inner' 
                                : 'bg-slate-900/20 hover:bg-slate-900/50 border-slate-900 hover:border-slate-850'
                            }`}
                            onMouseEnter={(e) => {
                              setHoveredItem(item);
                              setTooltipPos({ x: e.clientX - 310, y: Math.min(window.innerHeight - 340, e.clientY - 50) });
                            }}
                            onMouseMove={(e) => {
                              setTooltipPos({ x: e.clientX - 310, y: Math.min(window.innerHeight - 340, e.clientY - 50) });
                            }}
                            onMouseLeave={() => setHoveredItem(null)}
                            onClick={() => {
                              if (quickSellActive) {
                                handleSellItem(item);
                              }
                            }}
                          >
                            <div className="flex gap-3 items-center min-w-0">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-xl bg-slate-950/40 border border-slate-850 flex items-center justify-center text-xl shrink-0">
                                  {item.icon}
                                </div>
                                {qty > 1 && (
                                  <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white font-mono font-black text-[9px] px-1.5 rounded-full border border-slate-950 min-w-[16px] text-center">
                                    x{qty}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-slate-200 font-mono truncate leading-none">
                                  {item.name}
                                </h4>
                                <p className="text-[9px] text-slate-400 font-mono mt-1 font-bold">
                                  Poids total : {(item.weight * qty).toFixed(2)} kg
                                </p>
                              </div>
                            </div>

                            {/* Context Actions / Sell buttons */}
                            <div className="shrink-0 flex gap-1.5 items-center">
                              {quickSellActive ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSellItem(item);
                                  }}
                                  disabled={qty <= 0}
                                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-slate-950 font-black font-mono text-[9px] px-2.5 py-1.5 rounded-lg transition flex flex-col items-center min-w-[65px] cursor-pointer"
                                >
                                  <span>VENDRE</span>
                                  <span className="text-[8px] opacity-80 font-bold">+${item.sellPrice}</span>
                                </button>
                              ) : (
                                <>
                                  {/* Seeds action */}
                                  {isSeed && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onPlantWeed) onPlantWeed();
                                      }}
                                      disabled={qty <= 0}
                                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black font-mono text-[9px] px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                    >
                                      PLANTER [E]
                                    </button>
                                  )}

                                  {/* Buds action */}
                                  {isBud && isBob && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSellItem(item);
                                      }}
                                      disabled={qty <= 0}
                                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black font-mono text-[9px] px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                    >
                                      VENDRE 1
                                    </button>
                                  )}

                                  {/* Consumable actions */}
                                  {isConsumable && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUseConsumable(item);
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black font-mono text-[9px] px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                    >
                                      CONSOMMER
                                    </button>
                                  )}

                                  {/* Weapon actions */}
                                  {isWeapon && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEquipWeapon(item);
                                      }}
                                      className={`font-black font-mono text-[9px] px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                                        isEquippedWeapon 
                                          ? 'bg-indigo-950/50 border border-indigo-700/50 text-indigo-400 font-extrabold cursor-default' 
                                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                      }`}
                                    >
                                      {isEquippedWeapon ? 'ÉQUIPÉ' : 'ÉQUIPER'}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Backpack Wallet footer */}
                  <div className="bg-slate-950 p-4 border-t border-slate-900 flex justify-between items-center font-mono">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider flex items-center gap-1">
                      ℹ️ Tip :
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium leading-relaxed italic text-right max-w-xs">
                      En mode Vente Rapide, cliquez sur un objet pour le liquider instantanément !
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Interactive Tooltip Component */}
            {hoveredItem && (
              <div 
                className="fixed bg-[#040811]/98 border-2 border-slate-800 rounded-2xl p-4.5 w-72 shadow-[0_15px_50px_rgba(0,0,0,0.85)] z-[100] pointer-events-none font-sans animate-fade-in flex flex-col border border-indigo-950/60"
                style={{ left: tooltipPos.x, top: tooltipPos.y }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-2xl">{hoveredItem.icon}</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border ${
                    hoveredItem.rarity === 'Legendary' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)] animate-pulse' :
                    hoveredItem.rarity === 'Epic' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
                    hoveredItem.rarity === 'Rare' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' :
                    'bg-slate-800/60 text-slate-400 border-slate-700'
                  }`}>
                    {hoveredItem.rarity}
                  </span>
                </div>
                
                <h4 className="font-extrabold text-white text-sm font-mono leading-tight">{hoveredItem.name}</h4>
                <span className="text-[9px] text-slate-500 font-mono block mt-0.5 uppercase tracking-wider">{hoveredItem.category}</span>
                
                <p className="text-[11px] text-slate-300 mt-2.5 leading-relaxed italic border-t border-slate-900 pt-2 font-sans">
                  "{hoveredItem.description}"
                </p>
                
                <div className="border-t border-slate-900 mt-3 pt-2.5 flex flex-col gap-1.5 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">⚖️ POIDS :</span>
                    <span className="text-white font-bold">{hoveredItem.weight} kg</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500">⚡ EFFETS :</span>
                    <span className="text-emerald-400 font-bold text-right max-w-[150px] leading-tight">{hoveredItem.effect}</span>
                  </div>
                  <div className="flex justify-between mt-1 pt-1.5 border-t border-slate-900">
                    <span className="text-slate-500">💰 PRIX ACHAT :</span>
                    <span className="text-amber-400 font-extrabold">${hoveredItem.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">💸 REVENTE :</span>
                    <span className="text-indigo-400 font-extrabold">${hoveredItem.sellPrice}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* ─── FLOATING ADMIN CONSOLE TOGGLER ─── */}
      <div className="absolute top-24 left-5 flex flex-col gap-2 pointer-events-auto z-45">
        <button
          onClick={() => setIsAdminConsoleOpen(!isAdminConsoleOpen)}
          className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wider flex items-center gap-2 cursor-pointer transition border shadow-2xl duration-300 transform hover:scale-105 ${
            isAdminConsoleOpen
              ? 'bg-red-600 border-red-400 text-white'
              : 'bg-slate-950/90 hover:bg-slate-900 border-indigo-500/60 hover:border-indigo-400 text-indigo-200'
          }`}
        >
          <Terminal className="w-4 h-4 text-indigo-400 animate-pulse" />
          {isAdminConsoleOpen ? 'FERMER LA CONSOLE' : '⚙️ CONSOLE ADMIN'}
        </button>
      </div>

      {/* ─── SLIDING/RETRACTABLE ADMIN DRAWER ─── */}
      {isAdminConsoleOpen && (
        <div className="absolute top-36 left-5 w-80 bg-slate-950/95 border-2 border-indigo-950 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 font-sans pointer-events-auto text-slate-100 z-45 animate-slide-in max-h-[70vh] overflow-y-auto scrollbar-thin">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-900 pb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider font-mono">// TROXT DEVELOPER TERMINAL</span>
            </div>
            <button
              onClick={() => setIsAdminConsoleOpen(false)}
              className="text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded font-mono transition"
            >
              RÉTRACTER [X]
            </button>
          </div>

          {/* Commands Auto-Button Sections (Collapsible / Accordion style) */}
          <div className="flex flex-col gap-2">
            
            {/* Sec 1: Économie */}
            <div className="border border-slate-900 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'eco' ? null : 'eco')}
                className="w-full bg-slate-900/60 hover:bg-slate-900 px-3 py-2 text-left text-[11px] font-bold text-slate-200 flex justify-between items-center font-mono"
              >
                <span className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-amber-400" /> 💰 ÉCONOMIE</span>
                {expandedSection === 'eco' ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {expandedSection === 'eco' && (
                <div className="p-2.5 bg-slate-950/40 flex flex-col gap-1.5 border-t border-slate-900/50">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleRunAdminCommand('cash +5000')}
                      className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-900 px-2 py-1.5 rounded-lg text-[10px] font-mono text-emerald-400 transition cursor-pointer"
                    >
                      💵 +5,000 $
                    </button>
                    <button
                      onClick={() => handleRunAdminCommand('cash +500')}
                      className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-900 px-2 py-1.5 rounded-lg text-[10px] font-mono text-emerald-400 transition cursor-pointer"
                    >
                      💵 +500 $
                    </button>
                    <button
                      onClick={() => handleRunAdminCommand('cash -5000')}
                      className="bg-red-950/40 hover:bg-red-900/60 border border-red-950 px-2 py-1.5 rounded-lg text-[10px] font-mono text-red-400 transition cursor-pointer"
                    >
                      💸 -5,000 $
                    </button>
                    <button
                      onClick={() => handleRunAdminCommand('cash -500')}
                      className="bg-red-950/40 hover:bg-red-900/60 border border-red-950 px-2 py-1.5 rounded-lg text-[10px] font-mono text-red-400 transition cursor-pointer"
                    >
                      💸 -500 $
                    </button>
                  </div>
                  <div className="flex gap-1.5 w-full">
                    <button
                      onClick={() => handleRunAdminCommand('heal 100')}
                      className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2.5 py-1 rounded-lg text-[9px] font-mono text-slate-300 cursor-pointer transition"
                    >
                      ❤️ Max Santé (100%)
                    </button>
                    <button
                      onClick={() => handleRunAdminCommand('heal 10')}
                      className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2.5 py-1 rounded-lg text-[9px] font-mono text-slate-300 cursor-pointer transition"
                    >
                      ❤️ Low HP (10%)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sec 2: Téléportation */}
            <div className="border border-slate-900 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'teleport' ? null : 'teleport')}
                className="w-full bg-slate-900/60 hover:bg-slate-900 px-3 py-2 text-left text-[11px] font-bold text-slate-200 flex justify-between items-center font-mono"
              >
                <span className="flex items-center gap-1.5"><Compass className="w-3.5 h-3.5 text-cyan-400" /> 📍 TÉLÉPORTATION</span>
                {expandedSection === 'teleport' ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {expandedSection === 'teleport' && (
                <div className="p-2.5 bg-slate-950/40 grid grid-cols-2 gap-1.5 border-t border-slate-900/50">
                  {[
                    { label: '🍟 Chez Gaston', cmd: 'teleport cantine' },
                    { label: '⚓ Le Quai', cmd: 'teleport quai' },
                    { label: '🗼 Le Phare', cmd: 'teleport phare' },
                    { label: '⛪ La Chapelle', cmd: 'teleport chapelle' },
                    { label: '🌾 Le Moulin', cmd: 'teleport moulin' },
                    { label: '🏁 Spawn Centre', cmd: 'teleport spawn' },
                  ].map((tp) => (
                    <button
                      key={tp.cmd}
                      onClick={() => handleRunAdminCommand(tp.cmd)}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800/80 px-2 py-1.5 rounded-lg text-[9.5px] font-mono text-cyan-300 text-left truncate transition cursor-pointer"
                    >
                      📍 {tp.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sec 3: Cannabis Farm */}
            <div className="border border-slate-900 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'weed' ? null : 'weed')}
                className="w-full bg-slate-900/60 hover:bg-slate-900 px-3 py-2 text-left text-[11px] font-bold text-slate-200 flex justify-between items-center font-mono"
              >
                <span className="flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5 text-emerald-400" /> 🌿 CANNABIS FARM</span>
                {expandedSection === 'weed' ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {expandedSection === 'weed' && (
                <div className="p-2.5 bg-slate-950/40 grid grid-cols-2 gap-1.5 border-t border-slate-900/50">
                  <button
                    onClick={() => handleRunAdminCommand('seeds +10')}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[9.5px] font-mono text-emerald-400 cursor-pointer transition"
                  >
                    🌱 Graines +10
                  </button>
                  <button
                    onClick={() => handleRunAdminCommand('seeds -10')}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[9.5px] font-mono text-slate-400 cursor-pointer transition"
                  >
                    🌱 Graines -10
                  </button>
                  <button
                    onClick={() => handleRunAdminCommand('buds +15')}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[9.5px] font-mono text-emerald-400 cursor-pointer transition"
                  >
                    🍁 Têtes +15
                  </button>
                  <button
                    onClick={() => handleRunAdminCommand('buds -15')}
                    className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[9.5px] font-mono text-slate-400 cursor-pointer transition"
                  >
                    🍁 Têtes -15
                  </button>
                </div>
              )}
            </div>

            {/* Sec 4: Monde & Physiques */}
            <div className="border border-slate-900 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'phys' ? null : 'phys')}
                className="w-full bg-slate-900/60 hover:bg-slate-900 px-3 py-2 text-left text-[11px] font-bold text-slate-200 flex justify-between items-center font-mono"
              >
                <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-purple-400" /> 🤪 MONDE & PHYSIQUES</span>
                {expandedSection === 'phys' ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {expandedSection === 'phys' && (
                <div className="p-2.5 bg-slate-950/40 flex flex-col gap-1.5 border-t border-slate-900/50">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleRunAdminCommand('gravity 3.5')}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[9.5px] font-mono text-purple-300 cursor-pointer transition"
                    >
                      🌑 Gravité Lune
                    </button>
                    <button
                      onClick={() => handleRunAdminCommand('gravity 19.8')}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[9.5px] font-mono text-slate-400 cursor-pointer transition"
                    >
                      🌎 Gravité Standard
                    </button>
                    <button
                      onClick={() => handleRunAdminCommand('speed 15.0')}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[9.5px] font-mono text-purple-300 cursor-pointer transition"
                    >
                      ⚡ Super Vitesse
                    </button>
                    <button
                      onClick={() => handleRunAdminCommand('speed 5.0')}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[9.5px] font-mono text-slate-400 cursor-pointer transition"
                    >
                      🚶 Vitesse Standard
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 border-t border-slate-900 pt-2 mt-0.5">
                    <button
                      onClick={() => handleRunAdminCommand('gangbeasts on')}
                      className="bg-indigo-950/30 hover:bg-indigo-900/40 border border-indigo-900 px-2 py-1 rounded-lg text-[9px] font-mono text-indigo-300 cursor-pointer transition"
                    >
                      🤪 Gang Beasts ON
                    </button>
                    <button
                      onClick={() => handleRunAdminCommand('gangbeasts off')}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1 rounded-lg text-[9px] font-mono text-slate-400 cursor-pointer transition"
                    >
                      🤪 Gang Beasts OFF
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sec 5: Sécurité & Dôme */}
            <div className="border border-slate-900 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'security' ? null : 'security')}
                className="w-full bg-slate-900/60 hover:bg-slate-900 px-3 py-2 text-left text-[11px] font-bold text-slate-200 flex justify-between items-center font-mono"
              >
                <span className="flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-indigo-400" /> 🛡️ SÉCURITÉ & DÔME</span>
                {expandedSection === 'security' ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {expandedSection === 'security' && (
                <div className="p-2.5 bg-slate-950/40 flex flex-col gap-2 border-t border-slate-900/50">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleRunAdminCommand('unlock_props')}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[9px] font-mono text-indigo-300 cursor-pointer transition"
                    >
                      🛋️ Tout débloquer GMod
                    </button>
                    <button
                      onClick={() => handleRunAdminCommand('unlock_immo')}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[9px] font-mono text-indigo-300 cursor-pointer transition"
                    >
                      🏠 Débloquer Immo
                    </button>
                    <button
                      onClick={() => handleRunAdminCommand('keyrings')}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[9px] font-mono text-indigo-300 cursor-pointer transition"
                    >
                      🔑 Trousseau de Clés
                    </button>
                    <button
                      onClick={() => handleRunAdminCommand('audit')}
                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-1.5 rounded-lg text-[9px] font-mono text-indigo-300 cursor-pointer transition"
                    >
                      🔍 Lancer Audit
                    </button>
                  </div>
                  <div className="flex gap-1.5 border-t border-slate-900 pt-2">
                    <button
                      onClick={() => handleRunAdminCommand('risk GREEN')}
                      className="w-full bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-900 px-2 py-1 rounded-lg text-[9px] font-mono text-emerald-400 font-bold cursor-pointer transition"
                    >
                      🛡️ GREEN
                    </button>
                    <button
                      onClick={() => handleRunAdminCommand('risk RED')}
                      className="w-full bg-red-950/40 hover:bg-red-900/40 border border-red-900 px-2 py-1 rounded-lg text-[9px] font-mono text-red-400 font-bold cursor-pointer transition"
                    >
                      🛡️ RED
                    </button>
                  </div>
                  <button
                    onClick={() => handleRunAdminCommand('clear_props')}
                    className="w-full bg-red-950/40 hover:bg-red-900 border border-red-900/60 text-red-200 hover:text-white font-bold py-1.5 px-3 rounded-lg cursor-pointer transition text-[9px] font-mono flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" /> RÉINITIALISER TOUS LES PROPS GMOD
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Interactive Typed Console logs display */}
          <div className="flex flex-col gap-1.5 bg-slate-950 border border-slate-900 rounded-xl p-2.5">
            <span className="text-[8.5px] font-bold text-slate-400 font-mono uppercase tracking-wider">// JOURNAL DES OPÉRATIONS ADMIN :</span>
            <div className="h-28 overflow-y-auto pr-1 flex flex-col gap-1 font-mono text-[9px] text-slate-300 scrollbar-thin select-text">
              {consoleLogs.map((log, index) => (
                <div key={index} className="leading-snug text-left border-b border-slate-900/30 pb-0.5 last:border-0 font-medium">
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Prompt input field form */}
          <form onSubmit={handleConsoleSubmit} className="flex gap-1.5">
            <input
              type="text"
              value={consoleInput}
              onChange={(e) => setConsoleInput(e.target.value)}
              placeholder="Saisir commande (ex: /cash 1000)..."
              className="flex-1 bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-[10px] font-mono text-white placeholder-slate-600 outline-none"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white rounded-xl px-3 py-1.5 flex items-center justify-center transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
};
